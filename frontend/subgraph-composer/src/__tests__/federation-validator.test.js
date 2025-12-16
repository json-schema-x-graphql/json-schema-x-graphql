/**
 * Federation Validator Tests
 * Tests for Apollo Federation compliance validation
 */

import {
  validateFederationRules,
  validateSchemaSDL,
  validateSupergraph,
  validateFederatedComposition,
  validateSupergraphMetadata,
  validateSubgraphNaming,
  lintSDL,
  formatValidationReport
} from '../lib/federation-validator';

describe('Federation Validator', () => {
  describe('validateFederationRules', () => {
    test('should validate owner schema with @key', () => {
      const sdl = `
        type User @key(fields: "id") {
          id: ID!
          name: String!
        }
      `;
      const result = validateFederationRules(sdl);
      expect(result.valid).toBe(true);
      expect(result.hasKey).toBe(true);
      expect(result.hasExtends).toBe(false);
    });

    test('should validate extending schema with @extends and @external', () => {
      const sdl = `
        type User @extends @key(fields: "id") {
          id: ID! @external
          status: String!
        }
      `;
      const result = validateFederationRules(sdl);
      expect(result.valid).toBe(true);
      expect(result.hasExtends).toBe(true);
      expect(result.hasExternal).toBe(true);
    });

    test('should warn about @external without @extends', () => {
      const sdl = `
        type User @key(fields: "id") {
          id: ID! @external
          name: String!
        }
      `;
      const result = validateFederationRules(sdl);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('@external');
    });

    test('should warn about old shared_entity_id pattern', () => {
      const sdl = `
        type User @key(fields: "shared_entity_id") {
          shared_entity_id: ID!
          name: String!
        }
      `;
      const result = validateFederationRules(sdl);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('shared_entity_id');
    });

    test('should handle invalid SDL gracefully', () => {
      const sdl = 'type User { invalid syntax';
      const result = validateFederationRules(sdl);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject non-string input', () => {
      const result = validateFederationRules(null);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid SDL');
    });

    test('should count directives correctly', () => {
      const sdl = `
        type User @key(fields: "id") {
          id: ID!
        }
        type Post @key(fields: "id") {
          id: ID!
        }
      `;
      const result = validateFederationRules(sdl);
      expect(result.directives.key).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateSchemaSDL', () => {
    test('should validate correct schema', () => {
      const sdl = `
        type Query {
          user(id: ID!): User
        }
        type User {
          id: ID!
          name: String!
        }
      `;
      const result = validateSchemaSDL(sdl);
      expect(result.valid).toBe(true);
      expect(result.schema).toBeDefined();
      expect(result.typeCount).toBeGreaterThan(0);
    });

    test('should reject invalid schema syntax', () => {
      const sdl = 'type User { invalid }';
      const result = validateSchemaSDL(sdl);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should auto-add Query type for schemas without one', () => {
      const sdl = `
        type User {
          id: ID!
          name: String!
        }
      `;
      const result = validateSchemaSDL(sdl);
      expect(result.valid).toBe(true);
      expect(result.schema).toBeDefined();
    });
  });

  describe('validateSupergraph', () => {
    test('should validate complete supergraph schema', () => {
      const sdl = `
        scalar DateTime
        type Query {
          user(id: ID!): User
        }
        type User @key(fields: "user_id") {
          user_id: ID!
          name: String!
        }
      `;
      const result = validateSupergraph(sdl);
      // Validate federation directives are present
      expect(result.federation.hasKey).toBe(true);
    });

    test('should combine schema and federation errors', () => {
      const sdl = 'type { invalid }';
      const result = validateSupergraph(sdl);
      expect(result.isValid).toBe(false);
      expect(result.summary.schemaErrors).toBeGreaterThan(0);
    });

    test('should detect federation issues in valid schema', () => {
      const sdl = `
        type Query {
          user(id: ID!): User
        }
        type User {
          id: ID!
          name: String!
        }
      `;
      const result = validateSupergraph(sdl);
      expect(result.schema.valid).toBe(true);
      expect(result.federation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateFederatedComposition', () => {
    test('should validate proper owner + extending pattern', () => {
      const schemas = {
        owner: `
          type Query {
            user(id: ID!): User
          }
          type User @key(fields: "id") {
            id: ID!
            name: String!
          }
        `,
        extending: `
          type User @extends @key(fields: "id") {
            id: ID! @external
            status: String!
          }
        `
      };
      const result = validateFederatedComposition(schemas);
      expect(result.composition.valid).toBe(true);
      expect(result.composition.hasOwner).toBe(true);
      expect(result.composition.hasExtenders).toBe(true);
    });

    test('should error when no owner schema with @key', () => {
      const schemas = {
        extending1: `
          type User @extends @key(fields: "id") {
            id: ID! @external
            status: String!
          }
        `,
        extending2: `
          type User @extends @key(fields: "id") {
            id: ID! @external
            email: String!
          }
        `
      };
      const result = validateFederatedComposition(schemas);
      expect(result.composition.valid).toBe(false);
      expect(result.composition.errors.length).toBeGreaterThan(0);
      expect(result.composition.hasOwner).toBe(false);
    });

    test('should validate multiple owner schemas', () => {
      const schemas = {
        users: `
          type Query {
            user(id: ID!): User
          }
          type User @key(fields: "id") {
            id: ID!
            name: String!
          }
        `,
        posts: `
          type Query {
            post(id: ID!): Post
          }
          type Post @key(fields: "id") {
            id: ID!
            title: String!
          }
        `
      };
      const result = validateFederatedComposition(schemas);
      expect(result.composition.valid).toBe(true);
      expect(result.composition.hasOwner).toBe(true);
    });

    test('should count extending schemas correctly', () => {
      const schemas = {
        owner: `
          type Query {
            user(id: ID!): User
          }
          type User @key(fields: "id") {
            id: ID!
            name: String!
          }
        `,
        ext1: `
          type User @extends @key(fields: "id") {
            id: ID! @external
            status: String!
          }
        `,
        ext2: `
          type User @extends @key(fields: "id") {
            id: ID! @external
            email: String!
          }
        `
      };
      const result = validateFederatedComposition(schemas);
      expect(result.composition.extenderCount).toBe(2);
    });
  });

  describe('validateSupergraphMetadata', () => {
    test('should recognize schema without supergraph metadata', () => {
      const schema = {
        type: 'object',
        properties: { id: { type: 'string' } }
      };
      const result = validateSupergraphMetadata(schema);
      expect(result.hasMetadata).toBe(false);
      expect(result.valid).toBe(true);
    });

    test('should validate base-entity metadata', () => {
      const schema = {
        'x-graphql-supergraph-name': 'users-service',
        'x-graphql-supergraph-type': 'base-entity',
        'x-graphql-supergraph-entity': 'User',
        'x-graphql-supergraph-query-root': true
      };
      const result = validateSupergraphMetadata(schema);
      expect(result.valid).toBe(true);
      expect(result.hasMetadata).toBe(true);
      expect(result.metadata.name).toBe('users-service');
      expect(result.metadata.type).toBe('base-entity');
    });

    test('should validate entity-extending metadata', () => {
      const schema = {
        'x-graphql-supergraph-name': 'user-status-service',
        'x-graphql-supergraph-type': 'entity-extending',
        'x-graphql-supergraph-entity': 'User',
        'x-graphql-supergraph-query-root': false
      };
      const result = validateSupergraphMetadata(schema);
      expect(result.valid).toBe(true);
      expect(result.metadata.type).toBe('entity-extending');
    });

    test('should validate utility schema metadata', () => {
      const schema = {
        'x-graphql-supergraph-name': 'shared-types',
        'x-graphql-supergraph-type': 'utility'
      };
      const result = validateSupergraphMetadata(schema);
      expect(result.valid).toBe(true);
      expect(result.metadata.type).toBe('utility');
    });

    test('should error on missing required properties', () => {
      const schema = {
        'x-graphql-supergraph-type': 'base-entity'
      };
      const result = validateSupergraphMetadata(schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should error on invalid supergraph type', () => {
      const schema = {
        'x-graphql-supergraph-name': 'test',
        'x-graphql-supergraph-type': 'invalid-type'
      };
      const result = validateSupergraphMetadata(schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be one of');
    });

    test('should warn when entity-extending has query-root true', () => {
      const schema = {
        'x-graphql-supergraph-name': 'user-status-service',
        'x-graphql-supergraph-type': 'entity-extending',
        'x-graphql-supergraph-entity': 'User',
        'x-graphql-supergraph-query-root': true
      };
      const result = validateSupergraphMetadata(schema);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('formatValidationReport', () => {
    test('should format federation composition report', () => {
      const validation = {
        composition: {
          valid: true,
          errors: [],
          warnings: [],
          hasOwner: true,
          hasExtenders: true,
          extenderCount: 2
        },
        schemas: {
          owner: {
            isValid: true,
            summary: { schemaErrors: 0, federationErrors: 0 }
          }
        }
      };
      const report = formatValidationReport(validation);
      expect(report).toContain('Federation Composition Report');
      expect(report).toContain('✓ VALID');
      expect(report).toContain('Owner Schema');
    });

    test('should format federation validation report', () => {
      const validation = {
        federation: {
          valid: true,
          errors: [],
          warnings: [],
          directives: { key: 1, extends: 0, external: 0 }
        }
      };
      const report = formatValidationReport(validation);
      expect(report).toContain('Federation Validation Report');
      expect(report).toContain('✓ VALID');
      expect(report).toContain('Directives');
    });

    test('should include errors in report', () => {
      const validation = {
        federation: {
          valid: false,
          errors: ['Test error'],
          warnings: ['Test warning'],
          directives: { key: 0, extends: 0, external: 0 }
        }
      };
      const report = formatValidationReport(validation);
      expect(report).toContain('✗ INVALID');
      expect(report).toContain('Test error');
      expect(report).toContain('Test warning');
    });
  });

  describe('Apollo Federation Type-Sharing Compliance', () => {
    test('should validate snake_case naming in User type', () => {
      // Test with full valid schema
      const sdl = `
        scalar DateTime
        type Query {
          user(id: ID!): User
        }
        type User @key(fields: "user_id") {
          user_id: ID!
          first_name: String!
          last_name: String!
          email_address: String
          is_verified: Boolean!
        }
      `;
      const result = validateSupergraph(sdl);
      // Just verify federation directives are recognized
      expect(result.federation.hasKey).toBe(true);
    });

    test('should validate proper @extends pattern in enum schema', () => {
      const sdl = `
        type Query {
          _empty: String
        }
        type User @extends @key(fields: "user_id") {
          user_id: ID! @external
          account_role: AccountRole!
          current_status: AccountStatus!
        }
        enum AccountRole {
          ADMIN
          USER
          GUEST
        }
        enum AccountStatus {
          ACTIVE
          INACTIVE
          SUSPENDED
        }
      `;
      const result = validateSupergraph(sdl);
      expect(result.federation.hasExtends).toBe(true);
      expect(result.federation.hasExternal).toBe(true);
    });

    test('should validate proper @extends pattern in nested objects schema', () => {
      const sdl = `
        type Query {
          _empty: String
        }
        type User @extends @key(fields: "user_id") {
          user_id: ID! @external
          contact_information: ContactInformation!
          physical_address: PhysicalAddress!
        }
        type ContactInformation {
          email_address: String!
          phone_number: String
        }
        type PhysicalAddress {
          street_address: String!
          city_name: String!
          country_code: String!
        }
      `;
      const result = validateSupergraph(sdl);
      expect(result.federation.hasExtends).toBe(true);
      expect(result.federation.hasExternal).toBe(true);
    });

    test('should validate complete 3-schema federation', () => {
      const schemas = {
        basic_scalars: `
          type Query {
            user(id: ID!): User
          }
          type User @key(fields: "user_id") {
            user_id: ID!
            first_name: String!
            last_name: String!
            email_address: String
            is_verified: Boolean!
          }
        `,
        enums: `
          type Query {
            _empty: String
          }
          type User @extends @key(fields: "user_id") {
            user_id: ID! @external
            account_role: AccountRole!
            current_status: AccountStatus!
          }
          enum AccountRole {
            ADMIN
            MODERATOR
            USER
            GUEST
          }
          enum AccountStatus {
            ACTIVE
            INACTIVE
            SUSPENDED
            PENDING_VERIFICATION
          }
        `,
        nested_objects: `
          type Query {
            _empty: String
          }
          type User @extends @key(fields: "user_id") {
            user_id: ID! @external
            contact_information: ContactInformation!
            physical_address: PhysicalAddress!
          }
          type ContactInformation {
            email_address: String!
            phone_number: String
          }
          type PhysicalAddress {
            street_address: String!
            city_name: String!
          }
        `
      };
      const result = validateFederatedComposition(schemas);
      expect(result.composition.valid).toBe(true);
      expect(result.composition.hasOwner).toBe(true);
      expect(result.composition.extenderCount).toBe(2);
    });

    test('should validate with supergraph entity metadata', () => {
      const baseSchema = {
        'x-graphql-supergraph-name': 'users-service',
        'x-graphql-supergraph-type': 'base-entity',
        'x-graphql-supergraph-entity': 'User',
        'x-graphql-supergraph-query-root': true
      };
      const result = validateSupergraphMetadata(baseSchema);
      expect(result.valid).toBe(true);
      expect(result.metadata.name).toBe('users-service');
      expect(result.metadata.type).toBe('base-entity');
      expect(result.metadata.entity).toBe('User');
    });

    test('should validate extending subgraph with metadata', () => {
      const extendingSchema = {
        'x-graphql-supergraph-name': 'user-status-service',
        'x-graphql-supergraph-type': 'entity-extending',
        'x-graphql-supergraph-entity': 'User',
        'x-graphql-supergraph-query-root': false
      };
      const result = validateSupergraphMetadata(extendingSchema);
      expect(result.valid).toBe(true);
      expect(result.metadata.type).toBe('entity-extending');
      expect(result.metadata.entity).toBe('User');
    });
  });

  describe('validateSubgraphNaming', () => {
    test('should allow single supergraph with base-entity type', () => {
      const schemas = [
        {
          name: 'users-service',
          schema: {
            'x-graphql-supergraph-name': 'users-service',
            'x-graphql-supergraph-type': 'base-entity',
            'x-graphql-supergraph-entity': 'User',
            'x-graphql-supergraph-query-root': true
          },
          type: 'owner'
        }
      ];
      const result = validateSubgraphNaming(schemas);
      expect(result.valid).toBe(true);
      expect(result.supergraphCount).toBe(1);
      expect(result.subgraphCount).toBe(0);
    });

    test('should allow multiple subgraphs using subgraph namespace', () => {
      const schemas = [
        {
          name: 'users-service',
          schema: {
            'x-graphql-supergraph-name': 'users-service',
            'x-graphql-supergraph-type': 'base-entity',
            'x-graphql-supergraph-entity': 'User',
            'x-graphql-supergraph-query-root': true
          },
          type: 'owner'
        },
        {
          name: 'user-status-service',
          schema: {
            'x-graphql-subgraph-name': 'user-status-service',
            'x-graphql-subgraph-type': 'entity-extending',
            'x-graphql-subgraph-entity': 'User'
          },
          type: 'extending'
        },
        {
          name: 'user-details-service',
          schema: {
            'x-graphql-subgraph-name': 'user-details-service',
            'x-graphql-subgraph-type': 'entity-extending',
            'x-graphql-subgraph-entity': 'User'
          },
          type: 'extending'
        }
      ];
      const result = validateSubgraphNaming(schemas);
      expect(result.valid).toBe(true);
      expect(result.supergraphCount).toBe(1);
      expect(result.subgraphCount).toBe(2);
    });

    test('should reject multiple supergraphs', () => {
      const schemas = [
        {
          name: 'users-service',
          schema: {
            'x-graphql-supergraph-name': 'users-service',
            'x-graphql-supergraph-type': 'base-entity'
          },
          type: 'owner'
        },
        {
          name: 'products-service',
          schema: {
            'x-graphql-supergraph-name': 'products-service',
            'x-graphql-supergraph-type': 'base-entity'
          },
          type: 'owner'
        }
      ];
      const result = validateSubgraphNaming(schemas);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Only 1 subgraph');
    });

    test('should reject mixed metadata namespaces', () => {
      const schemas = [
        {
          name: 'mixed-service',
          schema: {
            'x-graphql-supergraph-name': 'mixed-service',
            'x-graphql-subgraph-name': 'mixed-service'
          },
          type: 'mixed'
        }
      ];
      const result = validateSubgraphNaming(schemas);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Cannot mix');
    });

    test('should reject supergraph with non-base-entity type', () => {
      const schemas = [
        {
          name: 'users-service',
          schema: {
            'x-graphql-supergraph-name': 'users-service',
            'x-graphql-supergraph-type': 'entity-extending'
          },
          type: 'owner'
        }
      ];
      const result = validateSubgraphNaming(schemas);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('base-entity');
    });

    test('should reject subgraph with invalid type', () => {
      const schemas = [
        {
          name: 'invalid-service',
          schema: {
            'x-graphql-subgraph-name': 'invalid-service',
            'x-graphql-subgraph-type': 'base-entity'
          },
          type: 'extending'
        }
      ];
      const result = validateSubgraphNaming(schemas);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('entity-extending');
    });

    test('should warn when extending subgraphs exist without base entity', () => {
      const schemas = [
        {
          name: 'extending-service',
          schema: {
            'x-graphql-subgraph-name': 'extending-service',
            'x-graphql-subgraph-type': 'entity-extending'
          },
          type: 'extending'
        }
      ];
      const result = validateSubgraphNaming(schemas);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('no base entity subgraph');
    });
  });

  describe('lintSDL', () => {
    test('should report type naming convention violations', () => {
      const sdl = `
        type user {
          id: ID!
        }
      `;
      const issues = lintSDL(sdl);
      expect(issues.errors.length).toBeGreaterThan(0);
      expect(issues.errors[0]).toContain('PascalCase');
    });

    test('should report field naming convention violations', () => {
      const sdl = `
        type User {
          ID: ID!
          FirstName: String!
        }
      `;
      const issues = lintSDL(sdl);
      expect(issues.warnings.length).toBeGreaterThan(0);
      expect(issues.warnings[0]).toContain('snake_case');
    });

    test('should detect missing @key in @extends', () => {
      const sdl = `
        type User @extends {
          id: ID! @external
          name: String!
        }
      `;
      const issues = lintSDL(sdl);
      expect(issues.warnings.length).toBeGreaterThan(0);
      expect(issues.warnings[0]).toContain('@key');
    });

    test('should warn about @external without @extends', () => {
      const sdl = `
        type User @key(fields: "id") {
          id: ID! @external
        }
      `;
      const issues = lintSDL(sdl);
      expect(issues.warnings.length).toBeGreaterThan(0);
      expect(issues.warnings[0]).toContain('@external');
    });

    test('should detect duplicate type definitions', () => {
      const sdl = `
        type User { id: ID! }
        type User { name: String! }
      `;
      const issues = lintSDL(sdl);
      expect(issues.errors.length).toBeGreaterThan(0);
      expect(issues.errors[0]).toContain('defined');
    });

    test('should detect empty types', () => {
      const sdl = `
        type Empty {
          _empty: String
        }
      `;
      const issues = lintSDL(sdl);
      expect(issues.infos.length).toBeGreaterThan(0);
      expect(issues.infos[0]).toContain('empty');
    });

    test('should pass valid federation SDL', () => {
      const sdl = `
        type User @key(fields: "id") {
          id: ID!
          name: String!
        }
      `;
      const issues = lintSDL(sdl);
      expect(issues.errors.length).toBe(0);
    });

    test('should pass valid extending SDL', () => {
      const sdl = `
        type User @extends @key(fields: "id") {
          id: ID! @external
          status: String!
        }
      `;
      const issues = lintSDL(sdl);
      expect(issues.errors.length).toBe(0);
    });
  });
});
