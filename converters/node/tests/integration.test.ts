/**
 * Integration tests for JSON Schema <-> GraphQL SDL conversion
 *
 * Tests bidirectional conversion, federation support, and edge cases.
 */

import { describe, test, expect } from '@jest/globals';
import { jsonSchemaToGraphQL, graphqlToJsonSchema, ConversionOptions } from '../src/index.js';

// ============================================================================
// Helper Functions
// ============================================================================

const defaultOptions = (): ConversionOptions => ({
  validate: true,
  includeDescriptions: true,
  preserveFieldOrder: true,
  federationVersion: '2.9',
  prettyPrint: true,
  strictNullable: true,
});

const normalizeSdl = (sdl: string): string => {
  return sdl
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
};

// ============================================================================
// Basic Type Conversion Tests
// ============================================================================

describe('Basic Type Conversion', () => {
  test('converts simple object type', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        User: {
          type: 'object',
          description: 'A user account',
          properties: {
            user_id: {
              type: 'string',
              'x-graphql-field-name': 'id',
              'x-graphql-field-type': 'ID!',
              'x-graphql-field-non-null': true,
            },
            username: {
              type: 'string',
              'x-graphql-field-name': 'username',
              'x-graphql-field-type': 'String!',
              'x-graphql-field-non-null': true,
            },
          },
          required: ['user_id', 'username'],
          'x-graphql-type-name': 'User',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('type User');
    expect(result).toContain('id: ID!');
    expect(result).toContain('username: String!');
  });

  test('converts enum type', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        UserRole: {
          type: 'string',
          enum: ['ADMIN', 'USER', 'GUEST'],
          'x-graphql-type-name': 'UserRole',
          'x-graphql-type-kind': 'ENUM',
          'x-graphql-enum-value-configs': [
            {
              value: 'ADMIN',
              description: 'Administrator with full access',
            },
            {
              value: 'USER',
              description: 'Regular user',
            },
            {
              value: 'GUEST',
              description: 'Guest with limited access',
              deprecated: true,
              deprecationReason: 'Use USER instead',
            },
          ],
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('enum UserRole');
    expect(result).toContain('ADMIN');
    expect(result).toContain('USER');
    expect(result).toContain('GUEST');
  });

  test('converts interface type', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        Node: {
          type: 'object',
          description: 'An object with an ID',
          properties: {
            id: {
              type: 'string',
              'x-graphql-field-name': 'id',
              'x-graphql-field-type': 'ID!',
              'x-graphql-field-non-null': true,
            },
          },
          required: ['id'],
          'x-graphql-type-name': 'Node',
          'x-graphql-type-kind': 'INTERFACE',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('interface Node');
    expect(result).toContain('id: ID!');
  });

  test('converts union type', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        SearchResult: {
          oneOf: [{ $ref: '#/$defs/User' }, { $ref: '#/$defs/Post' }],
          'x-graphql-type-name': 'SearchResult',
          'x-graphql-type-kind': 'UNION',
          'x-graphql-union-types': ['User', 'Post'],
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('union SearchResult = User | Post');
  });

  test('converts input object type', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        CreateUserInput: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              'x-graphql-field-name': 'username',
              'x-graphql-field-type': 'String!',
              'x-graphql-field-non-null': true,
            },
            email: {
              type: 'string',
              format: 'email',
              'x-graphql-field-name': 'email',
              'x-graphql-field-type': 'String!',
              'x-graphql-field-non-null': true,
            },
          },
          required: ['username', 'email'],
          'x-graphql-type-name': 'CreateUserInput',
          'x-graphql-type-kind': 'INPUT_OBJECT',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('input CreateUserInput');
    expect(result).toContain('username: String!');
    expect(result).toContain('email: String!');
  });
});

// ============================================================================
// Apollo Federation Tests
// ============================================================================

describe('Apollo Federation Support', () => {
  test('converts @key directive', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              'x-graphql-field-name': 'id',
              'x-graphql-field-type': 'ID!',
              'x-graphql-field-non-null': true,
            },
          },
          required: ['id'],
          'x-graphql-type-name': 'Product',
          'x-graphql-type-kind': 'OBJECT',
          'x-graphql-federation-keys': [
            {
              fields: 'id',
              resolvable: true,
            },
          ],
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('@key(fields: "id")');
  });

  test('converts @external, @requires, @provides directives', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              'x-graphql-field-name': 'id',
              'x-graphql-field-type': 'ID!',
              'x-graphql-field-non-null': true,
            },
            weight: {
              type: 'number',
              'x-graphql-field-name': 'weight',
              'x-graphql-field-type': 'Float',
              'x-graphql-federation-external': true,
            },
            shipping_estimate: {
              type: 'string',
              'x-graphql-field-name': 'shippingEstimate',
              'x-graphql-field-type': 'String',
              'x-graphql-federation-requires': 'weight',
            },
          },
          'x-graphql-type-name': 'Product',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('@external');
    expect(result).toContain('@requires(fields: "weight")');
  });

  test('converts @shareable directive', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        Product: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              'x-graphql-field-name': 'name',
              'x-graphql-field-type': 'String!',
              'x-graphql-field-non-null': true,
              'x-graphql-federation-shareable': true,
            },
          },
          'x-graphql-type-name': 'Product',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('@shareable');
  });

  test('converts @authenticated directive', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        User: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              'x-graphql-field-name': 'email',
              'x-graphql-field-type': 'String',
              'x-graphql-federation-authenticated': true,
            },
          },
          'x-graphql-type-name': 'User',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('@authenticated');
  });

  test('converts @requiresScopes directive', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        User: {
          type: 'object',
          properties: {
            sensitive_data: {
              type: 'string',
              'x-graphql-field-name': 'sensitiveData',
              'x-graphql-field-type': 'String',
              'x-graphql-federation-requires-scopes': [['admin', 'read:sensitive']],
            },
          },
          'x-graphql-type-name': 'User',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('@requiresScopes');
  });
});

// ============================================================================
// Field Arguments Tests
// ============================================================================

describe('Field Arguments', () => {
  test('converts field with arguments', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        Query: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              'x-graphql-field-name': 'user',
              'x-graphql-field-type': 'User',
              'x-graphql-field-arguments': [
                {
                  name: 'id',
                  type: 'ID!',
                  description: 'User ID',
                },
                {
                  name: 'includeDeleted',
                  type: 'Boolean',
                  defaultValue: false,
                },
              ],
            },
          },
          'x-graphql-type-name': 'Query',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('user(');
    expect(result).toContain('id: ID!');
    expect(result).toContain('includeDeleted: Boolean = false');
  });
});

// ============================================================================
// Bidirectional Conversion Tests
// ============================================================================

describe('Bidirectional Conversion', () => {
  test('round-trip simple type', async () => {
    const originalSdl = `
      type User {
        id: ID!
        username: String!
        email: String
      }
    `;

    // SDL -> JSON
    const jsonResult = await graphqlToJsonSchema(originalSdl, defaultOptions());
    const jsonSchema = JSON.parse(jsonResult);

    // JSON -> SDL
    const regeneratedSdl = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(regeneratedSdl).toContain('type User');
    expect(regeneratedSdl).toContain('id: ID!');
    expect(regeneratedSdl).toContain('username: String!');
  });

  test('round-trip with federation', async () => {
    const originalSdl = `
      type Product @key(fields: "id") {
        id: ID!
        name: String! @shareable
        price: Float
      }
    `;

    // SDL -> JSON
    const jsonResult = await graphqlToJsonSchema(originalSdl, defaultOptions());
    const jsonSchema = JSON.parse(jsonResult);

    // Verify federation metadata is preserved
    expect(jsonSchema.$defs).toBeDefined();
    expect(jsonSchema.$defs.Product).toBeDefined();
    expect(jsonSchema.$defs.Product['x-graphql-federation-keys']).toBeDefined();

    // JSON -> SDL
    const regeneratedSdl = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(regeneratedSdl).toContain('@key(fields: "id")');
    expect(regeneratedSdl).toContain('@shareable');
  });

  test('round-trip with enums', async () => {
    const originalSdl = `
      enum Status {
        ACTIVE
        INACTIVE
        PENDING
      }
    `;

    // SDL -> JSON
    const jsonResult = await graphqlToJsonSchema(originalSdl, defaultOptions());
    const jsonSchema = JSON.parse(jsonResult);

    // JSON -> SDL
    const sdlResult = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(sdlResult).toContain('enum Status');
    expect(sdlResult).toContain('ACTIVE');
    expect(sdlResult).toContain('INACTIVE');
    expect(sdlResult).toContain('PENDING');
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases and Error Handling', () => {
  test('handles invalid JSON schema', async () => {
    const invalidJson = {
      invalid: 'schema',
    };

    const result = await jsonSchemaToGraphQL(invalidJson, defaultOptions());
    expect(result).toBe('');
  });

  test('handles invalid GraphQL SDL', async () => {
    const invalidSdl = 'type User { invalid syntax }';

    await expect(graphqlToJsonSchema(invalidSdl, defaultOptions())).rejects.toThrow();
  });

  test('handles empty schema', async () => {
    const emptyJson = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {},
    };

    const result = await jsonSchemaToGraphQL(emptyJson, defaultOptions());
    expect(result).toBe('');
  });

  test('converts list types', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        User: {
          type: 'object',
          properties: {
            friends: {
              type: 'array',
              items: {
                type: 'string',
              },
              'x-graphql-field-name': 'friends',
              'x-graphql-field-type': '[String!]!',
              'x-graphql-field-non-null': true,
              'x-graphql-field-list-item-non-null': true,
            },
          },
          'x-graphql-type-name': 'User',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('friends: [String!]!');
  });

  test('converts deprecated fields', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        User: {
          type: 'object',
          properties: {
            old_field: {
              type: 'string',
              'x-graphql-field-name': 'oldField',
              'x-graphql-field-type': 'String',
              'x-graphql-field-deprecated': true,
              'x-graphql-field-deprecation-reason': 'Use newField instead',
            },
          },
          'x-graphql-type-name': 'User',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('@deprecated');
    expect(result).toContain('Use newField instead');
  });
});

// ============================================================================
// Performance and Statistics Tests
// ============================================================================

describe('Performance and Statistics', () => {
  test('provides conversion statistics', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              'x-graphql-field-name': 'id',
              'x-graphql-field-type': 'ID!',
              'x-graphql-field-non-null': true,
            },
            username: {
              type: 'string',
              'x-graphql-field-name': 'username',
              'x-graphql-field-type': 'String!',
              'x-graphql-field-non-null': true,
            },
          },
          'x-graphql-type-name': 'User',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toBeDefined();
    // Statistics are not part of the new API, so we just check for a result
    expect(result.length).toBeGreaterThan(0);
  });

  test('conversion completes quickly', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              'x-graphql-field-name': 'id',
              'x-graphql-field-type': 'ID!',
              'x-graphql-field-non-null': true,
            },
          },
          'x-graphql-type-name': 'User',
          'x-graphql-type-kind': 'OBJECT',
        },
      },
    };

    const start = Date.now();
    await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    const duration = Date.now() - start;

    // Should complete in under 100ms
    expect(duration).toBeLessThan(100);
  });
});

// ============================================================================
// Custom Scalars Tests
// ============================================================================

describe('Custom Scalars', () => {
  test('converts custom scalar', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        DateTime: {
          type: 'string',
          format: 'date-time',
          'x-graphql-type-name': 'DateTime',
          'x-graphql-type-kind': 'SCALAR',
          description: 'ISO 8601 date-time string',
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('scalar DateTime');
  });
});

// ============================================================================
// Complex Schema Tests
// ============================================================================

describe('Complex Schemas', () => {
  test('converts complex federated schema', async () => {
    const jsonSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        User: {
          type: 'object',
          description: 'A user in the system',
          properties: {
            user_id: {
              type: 'string',
              'x-graphql-field-name': 'id',
              'x-graphql-field-type': 'ID!',
              'x-graphql-field-non-null': true,
            },
            username: {
              type: 'string',
              'x-graphql-field-name': 'username',
              'x-graphql-field-type': 'String!',
              'x-graphql-field-non-null': true,
              'x-graphql-federation-shareable': true,
            },
            email_address: {
              type: 'string',
              format: 'email',
              'x-graphql-field-name': 'email',
              'x-graphql-field-type': 'String!',
              'x-graphql-field-non-null': true,
              'x-graphql-federation-authenticated': true,
            },
          },
          required: ['user_id', 'username', 'email_address'],
          'x-graphql-type-name': 'User',
          'x-graphql-type-kind': 'OBJECT',
          'x-graphql-federation-keys': [
            {
              fields: 'id',
              resolvable: true,
            },
          ],
        },
      },
    };

    const result = await jsonSchemaToGraphQL(jsonSchema, defaultOptions());
    expect(result).toContain('type User');
    expect(result).toContain('@key(fields: "id")');
    expect(result).toContain('@shareable');
    expect(result).toContain('@authenticated');
  });
});
