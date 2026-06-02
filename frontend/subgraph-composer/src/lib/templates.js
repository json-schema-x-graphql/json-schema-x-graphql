/**
 * Curated Template Library
 *
 * This module provides a comprehensive set of valid JSON Schema templates
 * that showcase the full range of converter capabilities and data model types.
 * Each template demonstrates specific GraphQL patterns and x-graphql extensions.
 */

/**
 * Get all available template metadata for UI display
 * @returns {Array<{key: string, name: string, description: string, category: string}>}
 */
export function getTemplateNames() {
  return Object.entries(SCHEMA_TEMPLATES).map(([key, value]) => ({
    key,
    name: value.name,
    description: value.description,
    category: value.category || "General",
  }));
}

/**
 * Get template by key
 * @param {string} key - Template key
 * @returns {{name: string, description: string, content: string, category?: string}}
 */
export function getTemplate(key) {
  const t = SCHEMA_TEMPLATES[key];
  if (!t) return null;
  return {
    name: t.name,
    description: t.description,
    content: JSON.stringify(t.schema, null, 2),
    category: t.category,
  };
}

/**
 * Get all templates grouped by category
 * @returns {Object<string, Array>}
 */
export function getTemplatesByCategory() {
  const grouped = {};
  Object.entries(SCHEMA_TEMPLATES).forEach(([key, value]) => {
    const category = value.category || "General";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({ key, ...value });
  });
  return grouped;
}

export const SCHEMA_TEMPLATES = {
  // ============================================================================
  // BASIC TYPES & SCALARS
  // ============================================================================

  basic_scalars: {
    name: "User Entity (Owner - Scalars)",
    category: "Federation",
    description:
      "Federation owner subgraph - defines base User entity with @key. Other subgraphs extend this type.",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "User Entity - Owner Subgraph",
      description: "Base User entity definition with federation @key. This is the owner subgraph.",
      "x-graphql-supergraph-name": "users-service",
      "x-graphql-supergraph-type": "base-entity",
      "x-graphql-supergraph-entity": "User",
      "x-graphql-supergraph-query-root": true,
      type: "object",
      "x-graphql-type-name": "User",
      "x-graphql-type-kind": "type",
      "x-graphql-directives": [
        {
          name: "key",
          arguments: { fields: '"user_id"' },
        },
      ],
      properties: {
        user_id: {
          type: "string",
          description: "Unique user identifier - federation key",
          "x-graphql-type": "ID!",
          format: "uuid",
        },
        first_name: {
          type: "string",
          description: "First name with constraints",
          "x-graphql-type": "String!",
          minLength: 1,
          maxLength: 100,
        },
        last_name: {
          type: "string",
          description: "Last name with constraints",
          "x-graphql-type": "String!",
          minLength: 1,
          maxLength: 100,
        },
        email_address: {
          type: "string",
          description: "Email address",
          "x-graphql-type": "String",
          format: "email",
        },
        age_in_years: {
          type: "integer",
          description: "Age as integer",
          "x-graphql-type": "Int",
          minimum: 0,
          maximum: 150,
        },
        account_rating: {
          type: "number",
          description: "Decimal rating",
          "x-graphql-type": "Float",
          minimum: 0,
          maximum: 5,
        },
        is_verified: {
          type: "boolean",
          description: "Account verification status",
          "x-graphql-type": "Boolean!",
          default: false,
        },
      },
      required: ["user_id", "first_name", "last_name"],
    },
  },

  custom_scalars: {
    name: "Custom Scalars",
    category: "Basic Types",
    description: "DateTime, Date, Email, URL, JSON, Decimal custom scalar types",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Custom Scalars",
      description: "Custom scalar type extensions",
      type: "object",
      "x-graphql-scalars": {
        DateTime: { description: "ISO 8601 datetime string" },
        Date: { description: "ISO 8601 date string (YYYY-MM-DD)" },
        Email: { description: "RFC 5322 email address" },
        URL: { description: "Uniform Resource Locator" },
        JSON: { description: "Arbitrary JSON structure" },
        Decimal: { description: "High-precision decimal number" },
      },
      properties: {
        created_at: {
          type: "string",
          "x-graphql-type": "DateTime!",
          format: "date-time",
          description: "Timestamp of creation",
        },
        birth_date: {
          type: "string",
          "x-graphql-type": "Date",
          format: "date",
          description: "Date of birth",
        },
        contact_email: {
          type: "string",
          "x-graphql-type": "Email",
          format: "email",
          description: "Contact email",
        },
        website: {
          type: "string",
          "x-graphql-type": "URL",
          format: "uri",
          description: "Website URL",
        },
        price: {
          type: "string",
          "x-graphql-type": "Decimal",
          pattern: "^\\d+(\\.\\d+)?$",
          description: "Price as decimal string",
        },
        attributes: {
          type: "object",
          "x-graphql-type": "JSON",
          description: "Arbitrary JSON attributes",
        },
      },
    },
  },

  // ============================================================================
  // ENUMS & CONSTRAINED VALUES
  // ============================================================================

  enums: {
    name: "User Status (Extending - Enums)",
    category: "Federation",
    description: "Federation extending subgraph - adds enum fields to the User entity via @extends",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "User Status - Extending Subgraph",
      description:
        "Extended User entity with enum-based status fields. Uses @extends to add to owner type.",
      "x-graphql-subgraph-name": "user-status-service",
      "x-graphql-subgraph-type": "entity-extending",
      "x-graphql-subgraph-entity": "User",
      "x-graphql-subgraph-query-root": false,
      type: "object",
      "x-graphql-type-name": "User",
      "x-graphql-directives": [
        {
          name: "extends",
        },
        {
          name: "key",
          arguments: { fields: '"user_id"' },
        },
      ],
      "x-graphql-enums": {
        AccountRole: {
          description: "User account role in system",
          values: ["ADMIN", "MODERATOR", "USER", "GUEST"],
        },
        AccountStatus: {
          description: "User account status",
          values: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"],
        },
        VerificationLevel: {
          description: "Account verification level",
          values: ["UNVERIFIED", "EMAIL_VERIFIED", "TWO_FACTOR_ENABLED", "FULLY_VERIFIED"],
        },
      },
      properties: {
        user_id: {
          type: "string",
          description: "Reference to owner User - federation key",
          "x-graphql-type": "ID!",
          "x-graphql-directives": [
            {
              name: "external",
            },
          ],
          format: "uuid",
        },
        account_role: {
          type: "string",
          enum: ["ADMIN", "MODERATOR", "USER", "GUEST"],
          "x-graphql-type": "AccountRole!",
          description: "User account role",
        },
        current_status: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"],
          "x-graphql-type": "AccountStatus!",
          description: "Current account status",
        },
        verification_level: {
          type: "string",
          enum: ["UNVERIFIED", "EMAIL_VERIFIED", "TWO_FACTOR_ENABLED", "FULLY_VERIFIED"],
          "x-graphql-type": "VerificationLevel!",
          description: "Current verification level",
        },
        is_email_verified: {
          type: "boolean",
          "x-graphql-type": "Boolean!",
          description: "Whether email has been verified",
          default: false,
        },
        is_two_factor_enabled: {
          type: "boolean",
          "x-graphql-type": "Boolean!",
          description: "Whether two-factor authentication is enabled",
          default: false,
        },
      },
      required: ["user_id", "account_role", "current_status", "verification_level"],
    },
  },

  // ============================================================================
  // ARRAYS & COLLECTIONS
  // ============================================================================

  arrays: {
    name: "Arrays & Collections",
    category: "Collections",
    description: "Array types with items, uniqueItems, and x-graphql type annotations",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Arrays Example",
      description: "Collection types and nested arrays",
      type: "object",
      properties: {
        tags: {
          type: "array",
          "x-graphql-type": "[String!]!",
          description: "List of string tags",
          items: { type: "string" },
          uniqueItems: true,
          minItems: 1,
        },
        scores: {
          type: "array",
          "x-graphql-type": "[Int!]",
          description: "List of scores",
          items: { type: "integer", minimum: 0, maximum: 100 },
        },
        categories: {
          type: "array",
          "x-graphql-type": "[Category!]!",
          description: "List of category objects",
          items: {
            type: "object",
            "x-graphql-type-name": "Category",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
            },
            required: ["id", "name"],
          },
        },
      },
      required: ["tags", "categories"],
    },
  },

  // ============================================================================
  // NESTED OBJECTS & COMPOSITION
  // ============================================================================

  nested_objects: {
    name: "User Profile Details (Extending - Nested)",
    category: "Federation",
    description:
      "Federation extending subgraph - adds nested object fields to the User entity via @extends",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "User Details - Extending Subgraph",
      description:
        "Extended User entity with nested object structures. Uses @extends to add to owner type.",
      "x-graphql-subgraph-name": "user-details-service",
      "x-graphql-subgraph-type": "entity-extending",
      "x-graphql-subgraph-entity": "User",
      "x-graphql-subgraph-query-root": false,
      type: "object",
      "x-graphql-type-name": "User",
      "x-graphql-directives": [
        {
          name: "extends",
        },
        {
          name: "key",
          arguments: { fields: '"user_id"' },
        },
      ],
      properties: {
        user_id: {
          type: "string",
          description: "Reference to owner User - federation key",
          "x-graphql-type": "ID!",
          "x-graphql-directives": [
            {
              name: "external",
            },
          ],
          format: "uuid",
        },
        contact_information: {
          type: "object",
          "x-graphql-type-name": "ContactInformation",
          description: "User contact details",
          properties: {
            email_address: {
              type: "string",
              format: "email",
              description: "Primary email address",
            },
            phone_number: {
              type: "string",
              pattern: "^\\+?[0-9]{10,15}$",
              description: "Primary phone number",
            },
            preferred_contact_method: {
              type: "string",
              enum: ["email", "phone", "sms"],
              description: "Preferred method of contact",
            },
          },
        },
        physical_address: {
          type: "object",
          "x-graphql-type-name": "PhysicalAddress",
          description: "Physical mailing address",
          properties: {
            street_address: {
              type: "string",
              description: "Street address line",
            },
            city_name: {
              type: "string",
              description: "City or municipality",
            },
            state_province: {
              type: "string",
              description: "State or province",
            },
            postal_code: {
              type: "string",
              description: "Postal or zip code",
            },
            country_code: {
              type: "string",
              pattern: "^[A-Z]{2}$",
              description: "ISO 3166-1 alpha-2 country code",
            },
          },
          required: ["street_address", "city_name", "country_code"],
        },
        profile_metadata: {
          type: "object",
          "x-graphql-type-name": "ProfileMetadata",
          description: "User profile metadata and timestamps",
          properties: {
            account_created_date: {
              type: "string",
              format: "date-time",
              description: "When the account was created",
            },
            last_login_timestamp: {
              type: "string",
              format: "date-time",
              description: "When user last logged in",
            },
            total_login_count: {
              type: "integer",
              minimum: 0,
              description: "Total number of logins",
            },
            bio_text: {
              type: "string",
              maxLength: 500,
              description: "User biography or profile text",
            },
          },
        },
      },
      required: ["user_id", "contact_information", "physical_address"],
    },
  },

  // ============================================================================
  // TYPE REFERENCES & COMPOSITION
  // ============================================================================

  references: {
    name: "Type References & Composition",
    category: "Advanced",
    description: "JSON Schema $ref for reusable type definitions and composition",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "References Example",
      description: "Reusable definitions with $ref",
      type: "object",
      properties: {
        author: { $ref: "#/$defs/Person" },
        editor: { $ref: "#/$defs/Person" },
        contributors: {
          type: "array",
          items: { $ref: "#/$defs/Person" },
        },
        metadata: { $ref: "#/$defs/Metadata" },
      },
      required: ["author"],
      $defs: {
        Person: {
          type: "object",
          "x-graphql-type-name": "Person",
          description: "A person entity",
          properties: {
            id: { type: "string", "x-graphql-type": "ID!" },
            name: { type: "string", "x-graphql-type": "String!" },
            email: { type: "string", "x-graphql-type": "Email" },
          },
          required: ["id", "name"],
        },
        Metadata: {
          type: "object",
          "x-graphql-type-name": "Metadata",
          description: "Document metadata",
          properties: {
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            version: { type: "integer" },
          },
        },
      },
    },
  },

  // ============================================================================
  // FEDERATION PATTERNS
  // ============================================================================

  federation_basic: {
    name: "Federation - Basic Subgraph",
    category: "Apollo Federation",
    description: "Basic Apollo Federation @key directive with x-graphql extensions",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Federation - Basic User Subgraph",
      type: "object",
      "x-graphql-type-name": "User",
      "x-graphql-type-kind": "type",
      "x-graphql-directives": [
        {
          name: "key",
          arguments: { fields: '"id"' },
        },
      ],
      properties: {
        id: {
          type: "string",
          "x-graphql-type": "ID!",
          description: "User ID",
        },
        username: {
          type: "string",
          "x-graphql-type": "String!",
          description: "Unique username",
        },
        email: {
          type: "string",
          "x-graphql-type": "Email",
          format: "email",
        },
      },
      required: ["id", "username"],
    },
  },

  federation_extended: {
    name: "Federation - Extended Type",
    category: "Apollo Federation",
    description: "Federation @extends and @external directives for subgraph composition",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Federation - Extended Order Subgraph",
      type: "object",
      "x-graphql-type-name": "Order",
      "x-graphql-directives": [
        {
          name: "key",
          arguments: { fields: '"id"' },
        },
        {
          name: "extends",
        },
      ],
      properties: {
        id: {
          type: "string",
          "x-graphql-type": "ID!",
          "x-graphql-directives": [{ name: "external" }],
          description: "Order ID (from other subgraph)",
        },
        user_id: {
          type: "string",
          "x-graphql-type": "ID!",
          "x-graphql-directives": [
            {
              name: "requires",
              arguments: { fields: '"id"' },
            },
          ],
          description: "Associated user",
        },
        total_amount: {
          type: "number",
          "x-graphql-type": "Float!",
          description: "Order total",
        },
        items: {
          type: "array",
          "x-graphql-type": "[OrderItem!]!",
          items: {
            type: "object",
            "x-graphql-type-name": "OrderItem",
            properties: {
              product_id: { type: "string" },
              quantity: { type: "integer" },
              price: { type: "number" },
            },
          },
        },
      },
      required: ["id", "total_amount"],
    },
  },

  federation_shareable: {
    name: "Federation - Shareable Fields",
    category: "Apollo Federation",
    description: "Federation @shareable directive for fields available in multiple subgraphs",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Federation - Shared Product Subgraph",
      type: "object",
      "x-graphql-type-name": "Product",
      "x-graphql-directives": [
        {
          name: "key",
          arguments: { fields: '"id"' },
        },
      ],
      properties: {
        id: {
          type: "string",
          "x-graphql-type": "ID!",
          "x-graphql-directives": [{ name: "shareable" }],
        },
        name: {
          type: "string",
          "x-graphql-type": "String!",
          "x-graphql-directives": [{ name: "shareable" }],
        },
        description: {
          type: "string",
          "x-graphql-type": "String",
          "x-graphql-directives": [{ name: "shareable" }],
        },
        price: {
          type: "number",
          "x-graphql-type": "Float!",
          description: "This subgraph owns pricing",
        },
      },
      required: ["id", "name", "price"],
    },
  },

  // ============================================================================
  // REAL-WORLD PATTERNS
  // ============================================================================

  ecommerce: {
    name: "E-Commerce Product Catalog",
    category: "Real-World",
    description: "Complete e-commerce product with inventory, reviews, categories",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "E-Commerce Product",
      type: "object",
      "x-graphql-type-name": "Product",
      "x-graphql-directives": [{ name: "key", arguments: { fields: '"id"' } }],
      "x-graphql-enums": {
        ProductStatus: {
          description: "Product availability status",
          values: ["ACTIVE", "DISCONTINUED", "PENDING", "DRAFT"],
        },
      },
      properties: {
        id: { type: "string", "x-graphql-type": "ID!" },
        sku: { type: "string", "x-graphql-type": "String!" },
        name: { type: "string", "x-graphql-type": "String!" },
        description: { type: "string", "x-graphql-type": "String" },
        price: {
          type: "number",
          "x-graphql-type": "Float!",
          minimum: 0,
        },
        currency: {
          type: "string",
          enum: ["USD", "EUR", "GBP"],
          "x-graphql-type": "String!",
          default: "USD",
        },
        status: {
          type: "string",
          enum: ["ACTIVE", "DISCONTINUED", "PENDING", "DRAFT"],
          "x-graphql-type": "ProductStatus!",
          default: "DRAFT",
        },
        stock: {
          type: "object",
          "x-graphql-type-name": "Stock",
          properties: {
            quantity: { type: "integer", minimum: 0 },
            reserved: { type: "integer", minimum: 0 },
            available: { type: "integer", minimum: 0 },
          },
        },
        categories: {
          type: "array",
          "x-graphql-type": "[String!]!",
          items: { type: "string" },
        },
        images: {
          type: "array",
          "x-graphql-type": "[ProductImage!]",
          items: {
            type: "object",
            "x-graphql-type-name": "ProductImage",
            properties: {
              url: { type: "string", format: "uri" },
              alt_text: { type: "string" },
              is_primary: { type: "boolean" },
            },
          },
        },
        reviews: {
          type: "array",
          "x-graphql-type": "[Review!]",
          items: {
            type: "object",
            "x-graphql-type-name": "Review",
            properties: {
              id: { type: "string" },
              rating: { type: "integer", minimum: 1, maximum: 5 },
              comment: { type: "string" },
              author: { type: "string" },
              created_at: { type: "string", format: "date-time" },
            },
          },
        },
      },
      required: ["id", "sku", "name", "price", "status"],
    },
  },

  blog_post: {
    name: "Blog Post with Comments",
    category: "Real-World",
    description: "Blog post structure with nested comments, tags, and metadata",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Blog Post",
      type: "object",
      "x-graphql-type-name": "Post",
      properties: {
        id: { type: "string", "x-graphql-type": "ID!" },
        title: { type: "string", "x-graphql-type": "String!" },
        slug: { type: "string", "x-graphql-type": "String!" },
        content: { type: "string", "x-graphql-type": "String!" },
        excerpt: { type: "string", "x-graphql-type": "String" },
        author: {
          type: "object",
          "x-graphql-type-name": "Author",
          properties: {
            id: { type: "string", "x-graphql-type": "ID!" },
            name: { type: "string", "x-graphql-type": "String!" },
            email: { type: "string", format: "email" },
          },
        },
        tags: {
          type: "array",
          "x-graphql-type": "[String!]",
          items: { type: "string" },
        },
        published: { type: "boolean", "x-graphql-type": "Boolean!" },
        published_at: {
          type: "string",
          "x-graphql-type": "DateTime",
          format: "date-time",
        },
        updated_at: {
          type: "string",
          "x-graphql-type": "DateTime!",
          format: "date-time",
        },
        comments: {
          type: "array",
          "x-graphql-type": "[Comment!]",
          items: {
            type: "object",
            "x-graphql-type-name": "Comment",
            properties: {
              id: { type: "string", "x-graphql-type": "ID!" },
              author_name: { type: "string", "x-graphql-type": "String!" },
              author_email: { type: "string", format: "email" },
              content: { type: "string", "x-graphql-type": "String!" },
              approved: { type: "boolean", "x-graphql-type": "Boolean!" },
              created_at: {
                type: "string",
                "x-graphql-type": "DateTime!",
                format: "date-time",
              },
              replies: {
                type: "array",
                "x-graphql-type": "[CommentReply!]",
                items: {
                  type: "object",
                  "x-graphql-type-name": "CommentReply",
                  properties: {
                    id: { type: "string" },
                    author_name: { type: "string" },
                    content: { type: "string" },
                    created_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      required: ["id", "title", "slug", "content", "author", "published", "updated_at"],
    },
  },

  // ============================================================================
  // ADVANCED PATTERNS
  // ============================================================================

  nullable_fields: {
    name: "Nullable & Optional Fields",
    category: "Advanced",
    description: "Demonstrates null semantics and optional vs required fields",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Nullable Fields",
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-graphql-type": "ID!",
          description: "Always required",
        },
        name: {
          type: "string",
          "x-graphql-type": "String!",
          description: "Non-null string",
        },
        nickname: {
          type: "string",
          "x-graphql-type": "String",
          description: "Optional string (nullable)",
        },
        email: {
          type: ["string", "null"],
          "x-graphql-type": "Email",
          description: "Email or null",
        },
        tags: {
          type: "array",
          "x-graphql-type": "[String!]!",
          items: { type: "string" },
          description: "Non-empty list of non-null strings",
        },
        attributes: {
          type: "array",
          "x-graphql-type": "[String]",
          items: { type: "string" },
          description: "List of nullable strings",
        },
      },
      required: ["id", "name"],
    },
  },

  pagination: {
    name: "Pagination & Filtering",
    category: "Advanced",
    description: "Pagination, sorting, and filtering patterns with x-graphql-arguments",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Paginated List",
      type: "object",
      properties: {
        items: {
          type: "array",
          "x-graphql-type": "[Item!]!",
          "x-graphql-arguments": {
            limit: { "x-graphql-type": "Int", default: 10 },
            offset: { "x-graphql-type": "Int", default: 0 },
            sort_by: { "x-graphql-type": "String", default: "created_at" },
            sort_order: { "x-graphql-type": "String", default: "DESC" },
          },
          items: {
            type: "object",
            "x-graphql-type-name": "Item",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              created_at: { type: "string", format: "date-time" },
            },
          },
        },
        total_count: {
          type: "integer",
          "x-graphql-type": "Int!",
          description: "Total number of items",
        },
        has_next: {
          type: "boolean",
          "x-graphql-type": "Boolean!",
          description: "Whether there are more pages",
        },
        current_page: {
          type: "integer",
          "x-graphql-type": "Int!",
          description: "Current page number",
        },
      },
      required: ["items", "total_count", "has_next", "current_page"],
    },
  },
};
