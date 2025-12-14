#!/usr/bin/env node

/**
 * Test script to evaluate core-types libraries for schema conversion
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function testCoreTypes() {
  console.log('🧪 Testing core-types conversion...\n');
  
  try {
    // Dynamic imports
    const { jsonSchemaToCoreTypes, coreTypesToJsonSchema } = await import('core-types-json-schema');
    const { coreTypesToGraphQL, graphqlToCoreTypes } = await import('core-types-graphql');
    
    // Test 1: JSON Schema → Core Types → GraphQL
    console.log('📄 Test 1: JSON Schema → GraphQL');
    const jsonSchemaPath = path.join(repoRoot, 'src', 'data', 'schema_unification.schema.json');
    const jsonSchemaContent = await fs.readFile(jsonSchemaPath, 'utf8');
    const jsonSchema = JSON.parse(jsonSchemaContent);
    
    console.log('  ✓ Loaded JSON Schema');
    
    const coreTypesFromJson = jsonSchemaToCoreTypes(jsonSchema, {
      filename: 'schema_unification.schema.json',
    });
    
    console.log(`  ✓ Converted to Core Types (${coreTypesFromJson.types.length} types)`);
    
    const graphqlFromJson = coreTypesToGraphQL(coreTypesFromJson, {
      userPackage: false,
      noDescriptions: false,
    });
    
    const outputPath1 = path.join(repoRoot, 'generated-schemas', 'test.core-types-from-json.graphql');
    await fs.writeFile(outputPath1, graphqlFromJson);
    console.log(`  ✓ Generated GraphQL: ${path.relative(repoRoot, outputPath1)}\n`);
    
    // Test 2: GraphQL → Core Types → JSON Schema
    console.log('📄 Test 2: GraphQL → JSON Schema');
    const graphqlPath = path.join(repoRoot, 'src', 'data', 'schema_unification.graphql');
    const graphqlContent = await fs.readFile(graphqlPath, 'utf8');
    
    console.log('  ✓ Loaded GraphQL SDL');
    
    const coreTypesFromGraphql = graphqlToCoreTypes(graphqlContent, {
      filename: 'schema_unification.graphql',
    });
    
    console.log(`  ✓ Converted to Core Types (${coreTypesFromGraphql.types.length} types)`);
    
    const jsonSchemaFromGraphql = coreTypesToJsonSchema(coreTypesFromGraphql, {
      userPackage: false,
      includeSourceFiles: false,
    });
    
    const outputPath2 = path.join(repoRoot, 'generated-schemas', 'test.core-types-from-graphql.json');
    await fs.writeFile(outputPath2, JSON.stringify(jsonSchemaFromGraphql, null, 2));
    console.log(`  ✓ Generated JSON Schema: ${path.relative(repoRoot, outputPath2)}\n`);
    
    console.log('✅ Success! Generated files:');
    console.log(`   - ${path.relative(repoRoot, outputPath1)}`);
    console.log(`   - ${path.relative(repoRoot, outputPath2)}`);
    console.log('\n📊 Next steps:');
    console.log(`   diff generated-schemas/schema_unification.from-json.graphql ${path.relative(repoRoot, outputPath1)}`);
    console.log(`   diff generated-schemas/schema_unification.from-graphql.json ${path.relative(repoRoot, outputPath2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testCoreTypes();
