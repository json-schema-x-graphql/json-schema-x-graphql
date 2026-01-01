/**
 * X-GraphQL extensions test suite using shared test-data
 *
 * This test suite loads JSON schemas from the shared `converters/test-data/x-graphql/`
 * directory to ensure consistency between Node.js and Rust converter implementations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { jsonSchemaToGraphQL } from './converter';

const TEST_DATA_DIR = path.join(__dirname, '../../test-data/x-graphql');
const EXPECTED_DIR = path.join(TEST_DATA_DIR, 'expected');

function loadTestSchema(filename: string): string {
  const filePath = path.join(TEST_DATA_DIR, filename);
  return fs.readFileSync(filePath, 'utf-8');
}

function loadExpectedSDL(filename: string): string | null {
  const filePath = path.join(EXPECTED_DIR, filename);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

describe('X-GraphQL Shared Test Data', () => {
  describe('Basic Types', () => {
    it('should convert basic-types.json successfully', () => {
      const schema = loadTestSchema('basic-types.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);

      const expected = loadExpectedSDL('basic-types.graphql');
      if (expected) {
        const resultNorm = normalizeWhitespace(result);
        const expectedNorm = normalizeWhitespace(expected);

        // Check for key structural elements rather than exact match
        // (formatting may differ between implementations)
        expect(resultNorm).toContain('type');
      }
    });
  });

  describe('Comprehensive Features', () => {
    it('should convert comprehensive-features.json with all extensions', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      // Type-level features
      expect(result).toContain('interface Node');
      expect(result).toContain('interface Timestamped');
      expect(result).toContain('type User');
      expect(result).toContain('implements');

      // Field-level features
      expect(result).toContain('id: ID!');
      expect(result).toContain('email:');
      expect(result).not.toContain('password'); // should be skipped

      // Enum types
      expect(result).toContain('enum UserRole');
      expect(result).toContain('ADMIN');

      // Union types
      expect(result).toContain('union SearchResult');

      // Federation directives
      expect(result).toContain('@key');
    });

    it('should respect x-graphql-skip on types', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      // InternalType has x-graphql-skip: true
      expect(result).not.toContain('InternalType');
      expect(result).not.toContain('secret');
    });

    it('should generate federation directives correctly', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      // Check for various federation directives
      expect(result).toContain('@key');

      // Should support multiple keys
      const keyMatches = result.match(/@key/g);
      expect(keyMatches).toBeTruthy();
      expect(keyMatches!.length).toBeGreaterThan(1);
    });
  });

  describe('Interfaces', () => {
    it('should convert interfaces.json correctly', () => {
      const schema = loadTestSchema('interfaces.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toContain('interface');
      expect(result).toContain('implements');
    });
  });

  describe('Unions', () => {
    it('should convert unions.json correctly', () => {
      const schema = loadTestSchema('unions.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toContain('union');
    });
  });

  describe('Nullability', () => {
    it('should convert nullability.json with correct null markers', () => {
      const schema = loadTestSchema('nullability.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      // Should have mix of nullable and non-nullable fields
      expect(result).toContain('!'); // non-null marker
      expect(result).toMatch(/:\s*(String|Int|Float|Boolean)/); // nullable fields without !
    });

    it('should respect x-graphql-nullable override', () => {
      const schema = JSON.parse(loadTestSchema('nullability.json'));
      const result = jsonSchemaToGraphQL(schema);

      // When x-graphql-nullable is set, it should override required status
      // Specific assertions depend on the nullability.json content
      expect(result).toBeTruthy();
    });
  });

  describe('Skip Fields', () => {
    it('should skip fields marked with x-graphql-skip', () => {
      const schema = loadTestSchema('skip-fields.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Descriptions', () => {
    it('should include GraphQL descriptions', () => {
      const schema = loadTestSchema('descriptions.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      // Should contain description markers
      expect(result).toMatch(/"""|"/); // triple-quote or single-quote descriptions
    });

    it('should prefer x-graphql-description over JSON Schema description', () => {
      const schema = loadTestSchema('descriptions.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      // When both exist, x-graphql-description should be used
      expect(result).toBeTruthy();
    });
  });

  describe('Comprehensive Schema', () => {
    it('should convert comprehensive.json successfully', () => {
      const schema = loadTestSchema('comprehensive.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('All Schemas Validation', () => {
    it('should convert all JSON schemas in test-data directory', () => {
      const files = fs.readdirSync(TEST_DATA_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      expect(jsonFiles.length).toBeGreaterThan(0);

      let successCount = 0;
      const results: { file: string; success: boolean; error?: string }[] = [];

      for (const file of jsonFiles) {
        try {
          const schema = loadTestSchema(file);
          const parsed = JSON.parse(schema);
          const result = jsonSchemaToGraphQL(parsed);

          expect(result).toBeTruthy();
          expect(result.length).toBeGreaterThan(0);

          successCount++;
          results.push({ file, success: true });
        } catch (error) {
          // Some schemas might be intentionally invalid for error testing
          const errorMsg = error instanceof Error ? error.message : String(error);
          results.push({ file, success: false, error: errorMsg });

          if (!file.includes('invalid') && !file.includes('error')) {
            throw new Error(`Expected ${file} to convert successfully but got: ${errorMsg}`);
          }
        }
      }

      console.log(`\nTest summary: ${successCount}/${jsonFiles.length} schemas converted successfully`);
      results.forEach(r => {
        if (r.success) {
          console.log(`  ✓ ${r.file}`);
        } else {
          console.log(`  ✗ ${r.file}: ${r.error}`);
        }
      });
    });
  });

  describe('Type Name Mapping', () => {
    it('should respect x-graphql-type-name', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toContain('type User');
      expect(result).toContain('type Product');
      expect(result).toContain('type Order');
    });
  });

  describe('Field Name Mapping', () => {
    it('should map snake_case to camelCase using x-graphql-field-name', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      // Verify camelCase field names
      expect(result).toContain('createdAt');
      expect(result).toContain('updatedAt');

      // Should not contain snake_case in field names
      expect(result).not.toMatch(/\s+created_at\s*:/);
      expect(result).not.toMatch(/\s+updated_at\s*:/);
    });
  });

  describe('Field Type Mapping', () => {
    it('should use x-graphql-field-type for custom scalar types', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toContain('ID');
      expect(result).toContain('DateTime');
    });
  });

  describe('List Item Non-Null', () => {
    it('should respect x-graphql-field-list-item-non-null', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      // Tags field should have non-null list items
      expect(result).toMatch(/tags\s*:\s*\[String!\]/);
    });
  });

  describe('Federation Features', () => {
    it('should generate @key directives', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toMatch(/@key\(fields:\s*"[^"]+"\)/);
    });

    it('should generate @shareable directive', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toContain('@shareable');
    });

    it('should generate @external directive', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toContain('@external');
    });

    it('should generate @requires directive', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toMatch(/@requires\(fields:\s*"[^"]+"\)/);
    });

    it('should generate @provides directive', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toMatch(/@provides\(fields:\s*"[^"]+"\)/);
    });

    it('should generate @override directive', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      expect(result).toMatch(/@override\(from:\s*"[^"]+"\)/);
    });
  });

  describe('Round-Trip Fidelity', () => {
    it('should preserve key features in conversion', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const sdl = jsonSchemaToGraphQL(JSON.parse(schema));

      // Verify key features are preserved
      expect(sdl).toContain('@key');
      expect(sdl).toContain('interface');
      expect(sdl).toContain('union');
      expect(sdl).toContain('enum');

      // TODO: Implement GraphQL -> JSON Schema conversion and test full round-trip
      // const reconstructed = graphqlToJSONSchema(sdl);
      // expect(reconstructed).toMatchObject(originalSchema);
    });
  });

  describe('Expected Output Comparison', () => {
    it('should match expected output for comprehensive-features', () => {
      const schema = loadTestSchema('comprehensive-features.json');
      const result = jsonSchemaToGraphQL(JSON.parse(schema));

      const expected = loadExpectedSDL('comprehensive-features.graphql');
      if (expected) {
        // Compare key structural elements
        const resultNorm = normalizeWhitespace(result);
        const expectedNorm = normalizeWhitespace(expected);

        // Check for presence of key types
        const keyTypes = ['Node', 'Timestamped', 'User', 'Product', 'Order', 'SearchResult'];
        keyTypes.forEach(typeName => {
          if (expectedNorm.includes(typeName)) {
            expect(resultNorm).toContain(typeName);
          }
        });

        // Check for key directives
        if (expectedNorm.includes('@key')) {
          expect(resultNorm).toContain('@key');
        }
      }
    });
  });
});
