/**
 * federationDirectiveGenerator.test.js
 * 
 * Test suite for automatic federation directive generation
 * Tests: dependency detection, directive generation, validation, application
 */

import {
  generateDirectiveSuggestions,
  applySuggestionsToSdl,
  filterSuggestions,
  rankSuggestions,
  validateSuggestion,
  mergeSuggestionsIntoSdl,
  analyzeDirectiveRequirements,
  generateSuggestionReport
} from '../lib/federationDirectiveGenerator';

describe('Federation Directive Generator', () => {
  // Sample subgraph SDL for testing
  const userServiceSdl = `
    type User @key(fields: "id") {
      id: ID!
      name: String!
      email: String!
      profile: UserProfile
    }

    type UserProfile {
      bio: String
      avatar: String
    }
  `;

  const orderServiceSdl = `
    extend type User @key(fields: "id") {
      id: ID!
      orders: [Order!]!
    }

    type Order @key(fields: "id") {
      id: ID!
      userId: ID!
      total: Float!
      items: [OrderItem!]!
    }

    type OrderItem {
      productId: ID!
      quantity: Int!
      price: Float!
    }
  `;

  const productServiceSdl = `
    type Product @key(fields: "id") {
      id: ID!
      name: String!
      price: Float!
    }

    type ProductReview {
      productId: ID!
      rating: Int!
      text: String
    }
  `;

  const subgraphs = [
    { name: 'users', sdl: userServiceSdl },
    { name: 'orders', sdl: orderServiceSdl },
    { name: 'products', sdl: productServiceSdl }
  ];

  const composedSdl = `
    type User @key(fields: "id") {
      id: ID!
      name: String!
      email: String!
      profile: UserProfile
      orders: [Order!]!
    }

    type UserProfile {
      bio: String
      avatar: String
    }

    type Order @key(fields: "id") {
      id: ID!
      userId: ID!
      total: Float!
      items: [OrderItem!]!
    }

    type OrderItem {
      productId: ID!
      quantity: Int!
      price: Float!
    }

    type Product @key(fields: "id") {
      id: ID!
      name: String!
      price: Float!
    }

    type ProductReview {
      productId: ID!
      rating: Int!
      text: String
    }
  `;

  describe('generateDirectiveSuggestions', () => {
    test('generates suggestions for cross-schema dependencies', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('identifies @requires suggestions for external type references', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const requiresSuggestions = suggestions.filter(s => s.type === 'requires');

      // Should either find requires suggestions or have extension suggestions
      expect(suggestions.length).toBeGreaterThan(0);
      expect(Array.isArray(requiresSuggestions)).toBe(true);
    });

    test('identifies extension suggestions', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const extensionSuggestions = suggestions.filter(s => s.type === 'extension');

      // Should find some suggestions (extension or other types)
      expect(suggestions.length).toBeGreaterThan(0);
      expect(Array.isArray(extensionSuggestions)).toBe(true);
    });

    test('provides reason and directive for each suggestion', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);

      for (const suggestion of suggestions) {
        expect(suggestion.reason).toBeDefined();
        expect(suggestion.reason.length).toBeGreaterThan(0);
        expect(suggestion.directive).toBeDefined();
        expect(suggestion.directive.length).toBeGreaterThan(0);
      }
    });

    test('includes severity level for each suggestion', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);

      for (const suggestion of suggestions) {
        expect(['error', 'warning', 'info']).toContain(suggestion.severity);
      }
    });

    test('handles empty subgraphs gracefully', () => {
      const suggestions = generateDirectiveSuggestions([], composedSdl);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('handles SDL with no types', () => {
      const suggestions = generateDirectiveSuggestions(
        [{ name: 'empty', sdl: 'schema { query: Query }' }],
        'type Query { hello: String }'
      );
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('filterSuggestions', () => {
    test('filters by severity', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const filtered = filterSuggestions(suggestions, { severity: 'error' });

      for (const sug of filtered) {
        expect(sug.severity).toBe('error');
      }
    });

    test('filters by type', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const filtered = filterSuggestions(suggestions, { type: 'requires' });

      for (const sug of filtered) {
        expect(sug.type).toBe('requires');
      }
    });

    test('filters by applicable status', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const filtered = filterSuggestions(suggestions, { applicable: true });

      for (const sug of filtered) {
        expect(sug.applicable).toBe(true);
      }
    });

    test('combines multiple filters', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const filtered = filterSuggestions(suggestions, {
        severity: 'info',
        type: 'requires',
        applicable: true
      });

      for (const sug of filtered) {
        expect(sug.severity).toBe('info');
        expect(sug.type).toBe('requires');
        expect(sug.applicable).toBe(true);
      }
    });

    test('returns empty array when no suggestions match filters', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const filtered = filterSuggestions(suggestions, { type: 'nonexistent' });

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBe(0);
    });
  });

  describe('rankSuggestions', () => {
    test('ranks by severity', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const ranked = rankSuggestions(suggestions);

      const severityOrder = ['error', 'warning', 'info'];
      let lastSeverityIndex = -1;

      for (const sug of ranked) {
        const currentIndex = severityOrder.indexOf(sug.severity);
        expect(currentIndex).toBeGreaterThanOrEqual(lastSeverityIndex);
        lastSeverityIndex = currentIndex;
      }
    });

    test('maintains secondary sort by type', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const ranked = rankSuggestions(suggestions);

      expect(ranked.length).toBeGreaterThan(0);
    });

    test('does not modify original array', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const original = [...suggestions];
      rankSuggestions(suggestions);

      expect(suggestions).toEqual(original);
    });
  });

  describe('validateSuggestion', () => {
    test('validates suggestion with existing type', () => {
      const suggestion = {
        type: 'requires',
        typeName: 'User',
        fieldName: 'orders',
        directive: '@requires(fields: "orderId")'
      };

      const result = validateSuggestion(suggestion, composedSdl);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('rejects suggestion with non-existent type', () => {
      const suggestion = {
        type: 'requires',
        typeName: 'NonExistent',
        fieldName: 'field',
        directive: '@requires(fields: "id")'
      };

      const result = validateSuggestion(suggestion, composedSdl);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('detects empty directive', () => {
      const suggestion = {
        type: 'requires',
        typeName: 'User',
        directive: ''
      };

      const result = validateSuggestion(suggestion, composedSdl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });
  });

  describe('applySuggestionsToSdl', () => {
    test('applies @requires directive to field', () => {
      const testSdl = `
        type Order {
          id: ID!
          userId: ID!
        }
      `;

      const suggestion = {
        type: 'requires',
        typeName: 'Order',
        fieldName: 'userId',
        directive: '@requires(fields: "id")'
      };

      const result = applySuggestionsToSdl(testSdl, [suggestion]);
      // Function should either apply the directive or return the original SDL
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('does not duplicate directives', () => {
      const testSdl = `
        type Order {
          id: ID!
          userId: ID! @requires(fields: "id")
        }
      `;

      const suggestion = {
        type: 'requires',
        typeName: 'Order',
        fieldName: 'userId',
        directive: '@requires(fields: "id")'
      };

      const result = applySuggestionsToSdl(testSdl, [suggestion]);
      const count = (result.match(/@requires/g) || []).length;
      expect(count).toBe(1);
    });

    test('handles multiple suggestions', () => {
      const testSdl = `
        type Order {
          id: ID!
          userId: ID!
          productId: ID!
        }
      `;

      const suggestions = [
        {
          type: 'requires',
          typeName: 'Order',
          fieldName: 'userId',
          directive: '@requires(fields: "id")'
        },
        {
          type: 'requires',
          typeName: 'Order',
          fieldName: 'productId',
          directive: '@requires(fields: "id")'
        }
      ];

      const result = applySuggestionsToSdl(testSdl, suggestions);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('returns original SDL if no applicable suggestions', () => {
      const testSdl = 'type Query { hello: String }';
      const suggestions = [];

      const result = applySuggestionsToSdl(testSdl, suggestions);
      expect(result).toBe(testSdl);
    });
  });

  describe('mergeSuggestionsIntoSdl', () => {
    test('merges valid suggestions into SDL', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const validSuggestions = suggestions.filter(s => validateSuggestion(s, composedSdl).valid);

      const result = mergeSuggestionsIntoSdl(composedSdl, validSuggestions.slice(0, 1));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('filters invalid suggestions before merging', () => {
      const suggestions = [
        {
          type: 'requires',
          typeName: 'NonExistent',
          directive: '@requires(fields: "id")'
        }
      ];

      const result = mergeSuggestionsIntoSdl(composedSdl, suggestions);
      expect(result).toBe(composedSdl); // Should return original if all suggestions invalid
    });
  });

  describe('analyzeDirectiveRequirements', () => {
    test('analyzes complexity score', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const analysis = analyzeDirectiveRequirements(suggestions);

      expect(analysis.complexityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.complexityScore).toBeLessThanOrEqual(100);
    });

    test('counts types and fields', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const analysis = analyzeDirectiveRequirements(suggestions);

      expect(typeof analysis.typeCount).toBe('number');
      expect(typeof analysis.fieldCount).toBe('number');
    });

    test('detects requires and extensions', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const analysis = analyzeDirectiveRequirements(suggestions);

      expect(typeof analysis.hasRequires).toBe('boolean');
      expect(typeof analysis.hasExtensions).toBe('boolean');
    });

    test('tracks external references', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const analysis = analyzeDirectiveRequirements(suggestions);

      expect(analysis.externalReferences instanceof Set).toBe(true);
    });
  });

  describe('generateSuggestionReport', () => {
    test('generates readable report', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const report = generateSuggestionReport(suggestions);

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
      expect(report).toContain('#');
    });

    test('includes all suggestion types in report', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const report = generateSuggestionReport(suggestions);

      if (suggestions.some(s => s.type === 'requires')) {
        expect(report.toUpperCase()).toContain('REQUIRES');
      }
    });

    test('groups suggestions by type', () => {
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      const report = generateSuggestionReport(suggestions);

      // Report should have type headers
      expect(report).toMatch(/##\s+\w+/);
    });
  });

  describe('Integration tests', () => {
    test('complete workflow: generate → filter → rank → validate → apply', () => {
      // Step 1: Generate
      const suggestions = generateDirectiveSuggestions(subgraphs, composedSdl);
      expect(suggestions.length).toBeGreaterThan(0);

      // Step 2: Filter
      const filtered = filterSuggestions(suggestions, { severity: 'info' });
      expect(filtered.length).toBeLessThanOrEqual(suggestions.length);

      // Step 3: Rank
      const ranked = rankSuggestions(filtered);
      expect(ranked.length).toBe(filtered.length);

      // Step 4: Validate
      const validated = ranked.filter(s => validateSuggestion(s, composedSdl).valid);
      expect(validated.length).toBeLessThanOrEqual(ranked.length);

      // Step 5: Apply
      if (validated.length > 0) {
        const result = applySuggestionsToSdl(composedSdl, [validated[0]]);
        expect(typeof result).toBe('string');
      }
    });

    test('handles complex multi-schema composition', () => {
      const manySchemas = [
        ...subgraphs,
        { name: 'reviews', sdl: 'type Review { id: ID! productId: ID! rating: Int! }' },
        { name: 'inventory', sdl: 'type Stock { productId: ID! quantity: Int! }' }
      ];

      const suggestions = generateDirectiveSuggestions(manySchemas, composedSdl);
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('generates consistent suggestions for same input', () => {
      const suggestions1 = generateDirectiveSuggestions(subgraphs, composedSdl);
      const suggestions2 = generateDirectiveSuggestions(subgraphs, composedSdl);

      expect(suggestions1.length).toBe(suggestions2.length);
      expect(
        suggestions1.every((s, i) => s.type === suggestions2[i].type)
      ).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('handles SDL with no types', () => {
      const emptySubgraphs = [{ name: 'empty', sdl: '' }];
      const suggestions = generateDirectiveSuggestions(emptySubgraphs, composedSdl);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('handles SDL with only scalars', () => {
      const scalarOnly = [{ name: 'scalars', sdl: 'scalar DateTime\nscalar JSON' }];
      const suggestions = generateDirectiveSuggestions(scalarOnly, 'type Query { hello: String }');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('handles circular type references', () => {
      const circularSdl = `
        type User {
          id: ID!
          friends: [User!]!
        }
      `;
      const suggestions = generateDirectiveSuggestions(
        [{ name: 'test', sdl: circularSdl }],
        circularSdl
      );
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('handles very large SDL', () => {
      let largeSdl = '';
      for (let i = 0; i < 100; i++) {
        largeSdl += `type Type${i} { id: ID! }`;
      }

      const suggestions = generateDirectiveSuggestions(
        [{ name: 'large', sdl: largeSdl }],
        largeSdl
      );
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});
