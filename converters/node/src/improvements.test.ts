import { jsonSchemaToGraphQL, ConverterOptions } from './converter';
import { camelToSnake, snakeToCamel, convertObjectKeys } from './case-conversion';
import * as fs from 'fs';
import * as path from 'path';

describe('Converter Improvements', () => {
  describe('Case Conversion Utilities', () => {
    test('camelToSnake converts camelCase to snake_case', () => {
      expect(camelToSnake('camelCase')).toBe('camel_case');
      expect(camelToSnake('PascalCase')).toBe('pascal_case');
      expect(camelToSnake('HTTPResponse')).toBe('http_response');
      expect(camelToSnake('http2Protocol')).toBe('http2_protocol');
    });

    test('snakeToCamel converts snake_case to camelCase', () => {
      expect(snakeToCamel('snake_case')).toBe('snakeCase');
      expect(snakeToCamel('http_response')).toBe('httpResponse');
      expect(snakeToCamel('user_profile_data')).toBe('userProfileData');
    });

    test('convertObjectKeys recursively converts keys', () => {
      const input = {
        user_name: 'John',
        user_profile: {
          profile_id: 123,
          avatar_url: 'http://example.com',
        },
        user_tags: ['tag_one', 'tag_two'],
      };

      const result = convertObjectKeys(input, snakeToCamel);
      expect(result).toEqual({
        userName: 'John',
        userProfile: {
          profileId: 123,
          avatarUrl: 'http://example.com',
        },
        userTags: ['tag_one', 'tag_two'],
      });
    });
  });

  describe('$ref Resolution with Case Mismatch', () => {
    test('should resolve $ref with case mismatch', () => {
      const schema = {
        type: 'object',
        'x-graphql-type-name': 'TestType',
        properties: {
          user_info: {
            $ref: '#/$defs/userInfo',
          },
        },
        $defs: {
          userInfo: {
            type: 'object',
            'x-graphql-type-name': 'UserInfo',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type UserInfo');
      expect(result).toContain('name: String');
    });

    test('should handle snake_case ref to camelCase definition', () => {
      const testDataPath = path.join(__dirname, '../../../test-data/case-mismatch.schema.json');
      if (fs.existsSync(testDataPath)) {
        const schema = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
        const result = jsonSchemaToGraphQL(schema);

        // Should contain the types defined in the schema
        expect(result).toContain('type UserInfo');
        expect(result).toContain('type AccountDetails');
        expect(result).toContain('type UserProfile');
      }
    });

    test('should resolve nested $refs with case mismatch', () => {
      const schema = {
        $defs: {
          Address: {
            type: 'object',
            'x-graphql-type-name': 'Address',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
          user_profile: {
            type: 'object',
            'x-graphql-type-name': 'UserProfile',
            properties: {
              name: { type: 'string' },
              home_address: {
                $ref: '#/$defs/Address',
              },
            },
          },
        },
        properties: {
          profile: {
            $ref: '#/$defs/UserProfile',
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type Address');
      expect(result).toContain('type UserProfile');
    });
  });

  describe('Circular Reference Protection', () => {
    test('should handle self-referencing types without error', () => {
      const schema = {
        $defs: {
          Node: {
            type: 'object',
            'x-graphql-type-name': 'Node',
            properties: {
              id: { type: 'string' },
              value: { type: 'string' },
              next: {
                $ref: '#/$defs/Node',
              },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type Node');
      expect(result).toContain('next: Node');
    });

    test('should handle mutual references between types', () => {
      const schema = {
        $defs: {
          Person: {
            type: 'object',
            'x-graphql-type-name': 'Person',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              company: {
                $ref: '#/$defs/Company',
              },
            },
          },
          Company: {
            type: 'object',
            'x-graphql-type-name': 'Company',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              employees: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Person',
                },
              },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type Person');
      expect(result).toContain('type Company');
      expect(result).toContain('company: Company');
      expect(result).toContain('employees: [Person]');
    });

    test('should handle recursive tree structures', () => {
      const schema = {
        $defs: {
          Tree: {
            type: 'object',
            'x-graphql-type-name': 'Tree',
            properties: {
              value: { type: 'string' },
              children: {
                type: 'array',
                items: {
                  $ref: '#/$defs/Tree',
                },
              },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type Tree');
      expect(result).toContain('children: [Tree]');
    });

    test('should process circular-refs.schema.json without errors', () => {
      const testDataPath = path.join(__dirname, '../../../test-data/circular-refs.schema.json');
      if (fs.existsSync(testDataPath)) {
        const schema = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));

        expect(() => {
          const result = jsonSchemaToGraphQL(schema);
          expect(result).toBeTruthy();
        }).not.toThrow();
      }
    });
  });

  describe('Type Filtering', () => {
    test('should exclude Query and Mutation by default', () => {
      const schema = {
        $defs: {
          Query: {
            type: 'object',
            'x-graphql-type-name': 'Query',
            properties: {
              hello: { type: 'string' },
            },
          },
          Mutation: {
            type: 'object',
            'x-graphql-type-name': 'Mutation',
            properties: {
              updateUser: { type: 'string' },
            },
          },
          User: {
            type: 'object',
            'x-graphql-type-name': 'User',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).not.toContain('type Query');
      expect(result).not.toContain('type Mutation');
      expect(result).toContain('type User');
    });

    test('should include operational types when configured', () => {
      const schema = {
        $defs: {
          Query: {
            type: 'object',
            'x-graphql-type-name': 'Query',
            properties: {
              hello: { type: 'string' },
            },
          },
          User: {
            type: 'object',
            'x-graphql-type-name': 'User',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema, {
        includeOperationalTypes: true,
      });

      expect(result).toContain('type Query');
      expect(result).toContain('type User');
    });

    test('should exclude types with Filter suffix by default', () => {
      const schema = {
        $defs: {
          User: {
            type: 'object',
            'x-graphql-type-name': 'User',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          UserFilter: {
            type: 'object',
            'x-graphql-type-name': 'UserFilter',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type User');
      expect(result).not.toContain('type UserFilter');
    });

    test('should exclude types with Connection suffix by default', () => {
      const schema = {
        $defs: {
          User: {
            type: 'object',
            'x-graphql-type-name': 'User',
            properties: {
              id: { type: 'string' },
            },
          },
          UserConnection: {
            type: 'object',
            'x-graphql-type-name': 'UserConnection',
            properties: {
              edges: { type: 'array' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type User');
      expect(result).not.toContain('type UserConnection');
    });

    test('should exclude types with Payload suffix by default', () => {
      const schema = {
        $defs: {
          User: {
            type: 'object',
            'x-graphql-type-name': 'User',
            properties: {
              id: { type: 'string' },
            },
          },
          CreateUserPayload: {
            type: 'object',
            'x-graphql-type-name': 'CreateUserPayload',
            properties: {
              user: { $ref: '#/$defs/User' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type User');
      expect(result).not.toContain('type CreateUserPayload');
    });

    test('should exclude types with multiple configured suffixes', () => {
      const schema = {
        $defs: {
          Product: {
            type: 'object',
            'x-graphql-type-name': 'Product',
            properties: {
              id: { type: 'string' },
            },
          },
          ProductSort: {
            type: 'object',
            'x-graphql-type-name': 'ProductSort',
            properties: {
              field: { type: 'string' },
            },
          },
          ProductFilterInput: {
            type: 'object',
            'x-graphql-type-name': 'ProductFilterInput',
            properties: {
              minPrice: { type: 'number' },
            },
          },
          ProductEdge: {
            type: 'object',
            'x-graphql-type-name': 'ProductEdge',
            properties: {
              cursor: { type: 'string' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type Product');
      expect(result).not.toContain('type ProductSort');
      expect(result).not.toContain('type ProductFilterInput');
      expect(result).not.toContain('type ProductEdge');
    });

    test('should respect custom exclude types option', () => {
      const schema = {
        $defs: {
          User: {
            type: 'object',
            'x-graphql-type-name': 'User',
            properties: {
              id: { type: 'string' },
            },
          },
          Admin: {
            type: 'object',
            'x-graphql-type-name': 'Admin',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema, {
        excludeTypes: ['Admin'],
        includeOperationalTypes: true,
      });

      expect(result).toContain('type User');
      expect(result).not.toContain('type Admin');
    });

    test('should process filtering.schema.json correctly', () => {
      const testDataPath = path.join(__dirname, '../../../test-data/filtering.schema.json');
      if (fs.existsSync(testDataPath)) {
        const schema = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
        const result = jsonSchemaToGraphQL(schema);

        // Should include main types
        expect(result).toContain('type User');
        expect(result).toContain('type Product');

        // Should exclude filtered types
        expect(result).not.toContain('type UserFilter');
        expect(result).not.toContain('type UserConnection');
        expect(result).not.toContain('type CreateUserPayload');
        expect(result).not.toContain('type Query');
        expect(result).not.toContain('type Mutation');
      }
    });

    test('should include operational types when flag is set', () => {
      const testDataPath = path.join(__dirname, '../../../test-data/filtering.schema.json');
      if (fs.existsSync(testDataPath)) {
        const schema = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
        const result = jsonSchemaToGraphQL(schema, {
          includeOperationalTypes: true,
        });

        // Should include operational types
        expect(result).toContain('type Query');
        expect(result).toContain('type Mutation');

        // Should still exclude suffixed types
        expect(result).not.toContain('type UserFilter');
        expect(result).not.toContain('type UserConnection');
      }
    });
  });

  describe('$defs Extraction', () => {
    test('should extract all types from $defs', () => {
      const schema = {
        $defs: {
          User: {
            type: 'object',
            'x-graphql-type-name': 'User',
            properties: {
              id: { type: 'string' },
            },
          },
          Post: {
            type: 'object',
            'x-graphql-type-name': 'Post',
            properties: {
              title: { type: 'string' },
            },
          },
          Comment: {
            type: 'object',
            'x-graphql-type-name': 'Comment',
            properties: {
              text: { type: 'string' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type User');
      expect(result).toContain('type Post');
      expect(result).toContain('type Comment');
    });

    test('should support both $defs and definitions', () => {
      const schema = {
        definitions: {
          User: {
            type: 'object',
            'x-graphql-type-name': 'User',
            properties: {
              id: { type: 'string' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type User');
    });

    test('should handle $defs with references between types', () => {
      const schema = {
        $defs: {
          Author: {
            type: 'object',
            'x-graphql-type-name': 'Author',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          Book: {
            type: 'object',
            'x-graphql-type-name': 'Book',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              author: {
                $ref: '#/$defs/Author',
              },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type Author');
      expect(result).toContain('type Book');
      expect(result).toContain('author: Author');
    });

    test('should respect filtering when extracting from $defs', () => {
      const schema = {
        $defs: {
          User: {
            type: 'object',
            'x-graphql-type-name': 'User',
            properties: {
              id: { type: 'string' },
            },
          },
          UserFilter: {
            type: 'object',
            'x-graphql-type-name': 'UserFilter',
            properties: {
              name: { type: 'string' },
            },
          },
          Query: {
            type: 'object',
            'x-graphql-type-name': 'Query',
            properties: {
              user: { $ref: '#/$defs/User' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema);
      expect(result).toContain('type User');
      expect(result).not.toContain('type UserFilter');
      expect(result).not.toContain('type Query');
    });
  });

  describe('Integration Tests', () => {
    test('should handle complex schema with all features', () => {
      const schema = {
        $defs: {
          User: {
            type: 'object',
            'x-graphql-type-name': 'User',
            description: 'A user in the system',
            properties: {
              id: { type: 'string' },
              user_name: { type: 'string' },
              profile: {
                $ref: '#/$defs/user_profile',
              },
              friends: {
                type: 'array',
                items: {
                  $ref: '#/$defs/User',
                },
              },
            },
            required: ['id', 'user_name'],
          },
          user_profile: {
            type: 'object',
            'x-graphql-type-name': 'UserProfile',
            properties: {
              bio: { type: 'string' },
              avatar_url: { type: 'string' },
            },
          },
          UserFilter: {
            type: 'object',
            'x-graphql-type-name': 'UserFilter',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      };

      const result = jsonSchemaToGraphQL(schema, {
        includeDescriptions: true,
      });

      // Should include main types
      expect(result).toContain('type User');
      expect(result).toContain('type UserProfile');

      // Should handle case mismatch
      expect(result).toContain('profile: UserProfile');

      // Should handle circular references
      expect(result).toContain('friends: [User]');

      // Should exclude filtered types
      expect(result).not.toContain('type UserFilter');

      // Should include descriptions
      expect(result).toContain('A user in the system');
    });
  });
});
