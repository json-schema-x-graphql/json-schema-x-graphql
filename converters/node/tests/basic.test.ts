/**
 * Basic tests for JSON Schema <-> GraphQL SDL conversion
 */

import { describe, test, expect } from '@jest/globals';
import { jsonSchemaToGraphQL, graphqlToJsonSchema } from '../src/index.js';

describe('Basic Conversion Tests', () => {
  test('jsonSchemaToGraphQL converts simple object', async () => {
    const jsonSchema = {
      type: 'object',
      'x-graphql-type-name': 'User',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id'],
    };

    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toContain('User');
  });

  test('graphqlToJsonSchema converts simple type', () => {
    const graphqlSDL = `
      type User {
        id: ID!
        name: String
      }
    `;

    const result = graphqlToJsonSchema(graphqlSDL);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('properties');
  });

  test('round-trip conversion preserves structure', async () => {
    const originalSchema = {
      type: 'object',
      'x-graphql-type-name': 'Product',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        price: { type: 'number' },
      },
      required: ['id', 'name'],
    };

    // Convert to GraphQL
    const graphql = await jsonSchemaToGraphQL(originalSchema);
    expect(graphql).toBeDefined();

    // Convert back to JSON Schema
    const jsonResult = graphqlToJsonSchema(graphql);
    expect(jsonResult).toBeDefined();

    const parsedResult = JSON.parse(jsonResult);
    expect(parsedResult).toHaveProperty('properties');
    expect(parsedResult.properties).toHaveProperty('id');
    expect(parsedResult.properties).toHaveProperty('name');
  });

  test('handles x-graphql-type extension', async () => {
    const jsonSchema = {
      type: 'object',
      'x-graphql-type-name': 'User',
      properties: {
        id: {
          type: 'string',
          'x-graphql-type': 'ID!',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toContain('ID');
  });

  test('handles enum types', async () => {
    const jsonSchema = {
      type: 'string',
      'x-graphql-type-name': 'Status',
      enum: ['ACTIVE', 'INACTIVE', 'PENDING'],
    };

    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toBeDefined();
    expect(result).toContain('Status');
  });

  test('handles array types', async () => {
    const jsonSchema = {
      type: 'object',
      'x-graphql-type-name': 'Team',
      properties: {
        members: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toBeDefined();
    expect(result).toContain('Team');
  });

  test('handles nested objects', async () => {
    const jsonSchema = {
      type: 'object',
      'x-graphql-type-name': 'User',
      properties: {
        id: { type: 'string' },
        profile: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toBeDefined();
    expect(result).toContain('User');
  });

  test('handles descriptions', async () => {
    const jsonSchema = {
      type: 'object',
      'x-graphql-type-name': 'User',
      description: 'A user in the system',
      properties: {
        id: {
          type: 'string',
          description: 'Unique identifier',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toBeDefined();
  });

  test('handles required fields', async () => {
    const jsonSchema = {
      type: 'object',
      'x-graphql-type-name': 'User',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        nickname: { type: 'string' },
      },
      required: ['id', 'email'],
    };

    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toBeDefined();
    expect(result).toContain('User');
  });

  test('handles multiple types', async () => {
    const jsonSchema = {
      type: 'object',
      'x-graphql-type-name': 'Document',
      properties: {
        content: {
          type: ['string', 'null'],
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toBeDefined();
  });
});

describe('Federation Support', () => {
  test('handles x-graphql-federation extensions', async () => {
    const jsonSchema = {
      type: 'object',
      'x-graphql-type-name': 'Product',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      'x-graphql-federation': {
        keys: [{ fields: 'id' }],
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toBeDefined();
  });

  test('handles x-graphql-directives', async () => {
    const jsonSchema = {
      type: 'object',
      'x-graphql-type-name': 'User',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
      },
      'x-graphql-directives': [
        {
          name: 'key',
          arguments: { fields: 'id' },
        },
      ],
    };

    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toBeDefined();
  });
});

describe('Error Handling', () => {
  test('handles empty schema gracefully', async () => {
    const jsonSchema = {};

    // Should produce an empty string without throwing
    const result = await jsonSchemaToGraphQL(jsonSchema);
    expect(result).toBe('');
  });

  test('handles invalid GraphQL gracefully', () => {
    const invalidSDL = 'this is not valid graphql!!!';

    expect(() => {
      graphqlToJsonSchema(invalidSDL);
    }).toThrow();
  });

  test('handles null input gracefully', async () => {
    await expect(jsonSchemaToGraphQL(null as any)).rejects.toThrow();
  });
});
