/**
 * JSON Schema Templates Library
 *
 * Provides a curated set of starter templates for JSON Schema authoring.
 * Each template demonstrates specific patterns and x-graphql extensions.
 */

export interface Template {
  name: string;
  description: string;
  category: string;
  schema: object;
}

export interface TemplateMetadata {
  key: string;
  name: string;
  description: string;
  category: string;
}

/**
 * Get all available template metadata for UI display
 */
export function getTemplateNames(): TemplateMetadata[] {
  return Object.entries(SCHEMA_TEMPLATES).map(([key, value]) => ({
    key,
    name: value.name,
    description: value.description,
    category: value.category,
  }));
}

/**
 * Get template by key
 */
export function getTemplate(key: string): {
  name: string;
  description: string;
  content: string;
  category: string;
} | null {
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
 */
export function getTemplatesByCategory(): Record<
  string,
  Array<{ key: string } & Template>
> {
  const grouped: Record<string, Array<{ key: string } & Template>> = {};
  Object.entries(SCHEMA_TEMPLATES).forEach(([key, value]) => {
    const category = value.category;
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({ key, ...value });
  });
  return grouped;
}

/**
 * Template definitions
 */
export const SCHEMA_TEMPLATES: Record<string, Template> = {
  // ============================================================================
  // GETTING STARTED
  // ============================================================================

  empty: {
    name: "Empty Schema",
    category: "Getting Started",
    description: "Start with a blank schema",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "My Schema",
      type: "object",
      properties: {},
    },
  },

  simple_user: {
    name: "Simple User",
    category: "Getting Started",
    description: "Basic user schema with common fields",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "User",
      description: "A simple user object",
      type: "object",
      "x-graphql-type-name": "User",
      properties: {
        id: {
          type: "string",
          description: "Unique user identifier",
          "x-graphql-type": "ID!",
        },
        name: {
          type: "string",
          description: "Full name of the user",
        },
        email: {
          type: "string",
          format: "email",
          description: "Email address",
        },
        age: {
          type: "integer",
          minimum: 0,
          maximum: 150,
          description: "Age in years",
        },
        isActive: {
          type: "boolean",
          default: true,
          description: "Whether the account is active",
        },
      },
      required: ["id", "name", "email"],
    },
  },

  // ============================================================================
  // BASIC TYPES
  // ============================================================================

  all_scalar_types: {
    name: "All Scalar Types",
    category: "Basic Types",
    description: "Demonstrates all JSON Schema scalar types",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "ScalarExample",
      description: "Example showing all scalar types",
      type: "object",
      properties: {
        stringField: {
          type: "string",
          description: "A text string",
          minLength: 1,
          maxLength: 100,
        },
        integerField: {
          type: "integer",
          description: "A whole number",
          minimum: 0,
        },
        numberField: {
          type: "number",
          description: "A decimal number",
          minimum: 0,
          maximum: 100,
        },
        booleanField: {
          type: "boolean",
          description: "True or false value",
        },
        nullableField: {
          type: ["string", "null"],
          description: "A field that can be null",
        },
      },
      required: ["stringField", "integerField"],
    },
  },

  custom_scalars: {
    name: "Custom Scalars",
    category: "Basic Types",
    description: "DateTime, Email, URL, and other custom scalar types",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "CustomScalars",
      description: "Custom scalar type extensions",
      type: "object",
      "x-graphql-scalars": {
        DateTime: { description: "ISO 8601 datetime string" },
        Date: { description: "ISO 8601 date string (YYYY-MM-DD)" },
        Email: { description: "RFC 5322 email address" },
        URL: { description: "Uniform Resource Locator" },
        JSON: { description: "Arbitrary JSON structure" },
      },
      properties: {
        createdAt: {
          type: "string",
          "x-graphql-type": "DateTime!",
          format: "date-time",
          description: "Timestamp of creation",
        },
        birthDate: {
          type: "string",
          "x-graphql-type": "Date",
          format: "date",
          description: "Date of birth",
        },
        email: {
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
        metadata: {
          type: "object",
          "x-graphql-type": "JSON",
          description: "Arbitrary JSON metadata",
        },
      },
    },
  },

  // ============================================================================
  // ENUMS
  // ============================================================================

  enum_example: {
    name: "Enums & Status",
    category: "Enums",
    description: "User with status and role enums",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "UserWithStatus",
      description: "User with enum-based status and role",
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-graphql-type": "ID!",
        },
        status: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"],
          description: "User account status",
          "x-graphql-type-name": "UserStatus",
        },
        role: {
          type: "string",
          enum: ["ADMIN", "USER", "GUEST", "MODERATOR"],
          description: "User role",
          "x-graphql-type-name": "UserRole",
        },
        accountType: {
          type: "string",
          enum: ["FREE", "PREMIUM", "ENTERPRISE"],
          default: "FREE",
          description: "Subscription tier",
        },
      },
      required: ["id", "status", "role"],
    },
  },

  // ============================================================================
  // NESTED OBJECTS
  // ============================================================================

  nested_objects: {
    name: "Nested Objects",
    category: "Complex Types",
    description: "Objects with nested sub-objects",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Company",
      description: "Company with nested address and contact",
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-graphql-type": "ID!",
        },
        name: {
          type: "string",
          description: "Company name",
        },
        address: {
          type: "object",
          description: "Physical address",
          "x-graphql-type-name": "Address",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zipCode: { type: "string" },
            country: { type: "string" },
          },
          required: ["street", "city"],
        },
        contact: {
          type: "object",
          description: "Primary contact information",
          "x-graphql-type-name": "ContactInfo",
          properties: {
            phone: { type: "string" },
            email: { type: "string", format: "email" },
            website: { type: "string", format: "uri" },
          },
        },
      },
      required: ["id", "name"],
    },
  },

  // ============================================================================
  // ARRAYS
  // ============================================================================

  arrays_example: {
    name: "Arrays & Lists",
    category: "Complex Types",
    description: "Arrays of primitives and objects",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Product",
      description: "Product with tags and reviews",
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-graphql-type": "ID!",
        },
        name: {
          type: "string",
        },
        tags: {
          type: "array",
          description: "Product tags",
          items: {
            type: "string",
          },
        },
        reviews: {
          type: "array",
          description: "Customer reviews",
          items: {
            type: "object",
            "x-graphql-type-name": "Review",
            properties: {
              rating: {
                type: "integer",
                minimum: 1,
                maximum: 5,
              },
              comment: {
                type: "string",
              },
              author: {
                type: "string",
              },
            },
            required: ["rating"],
          },
        },
      },
      required: ["id", "name"],
    },
  },

  // ============================================================================
  // APOLLO FEDERATION
  // ============================================================================

  federation_entity: {
    name: "Federation Entity",
    category: "Federation",
    description: "Apollo Federation entity with @key directive",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Product",
      description: "Federation product entity",
      type: "object",
      "x-graphql-type-name": "Product",
      "x-graphql-directives": [
        {
          name: "key",
          arguments: { fields: "id" },
        },
      ],
      properties: {
        id: {
          type: "string",
          description: "Product ID - federation key",
          "x-graphql-type": "ID!",
        },
        name: {
          type: "string",
          description: "Product name",
        },
        price: {
          type: "number",
          description: "Product price",
        },
      },
      required: ["id", "name"],
    },
  },

  federation_extends: {
    name: "Federation Extend",
    category: "Federation",
    description: "Extend an entity from another subgraph",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "ProductReviews",
      description: "Extends Product entity with reviews",
      type: "object",
      "x-graphql-type-name": "Product",
      "x-graphql-directives": [
        {
          name: "key",
          arguments: { fields: "id" },
        },
      ],
      "x-graphql-federation-entity-extend": true,
      properties: {
        id: {
          type: "string",
          "x-graphql-type": "ID!",
          "x-graphql-directives": [
            {
              name: "external",
              arguments: {},
            },
          ],
        },
        reviews: {
          type: "array",
          description: "Product reviews from review service",
          items: {
            type: "object",
            "x-graphql-type-name": "Review",
            properties: {
              rating: { type: "integer" },
              comment: { type: "string" },
            },
          },
        },
      },
    },
  },

  // ============================================================================
  // ADVANCED PATTERNS
  // ============================================================================

  polymorphic_union: {
    name: "Union Types",
    category: "Advanced",
    description: "Polymorphic types using oneOf (GraphQL unions)",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "SearchResult",
      description: "Search result that can be User, Post, or Comment",
      "x-graphql-type-name": "SearchResult",
      "x-graphql-type-kind": "union",
      oneOf: [
        {
          type: "object",
          title: "User",
          "x-graphql-type-name": "User",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
          },
        },
        {
          type: "object",
          title: "Post",
          "x-graphql-type-name": "Post",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            content: { type: "string" },
          },
        },
        {
          type: "object",
          title: "Comment",
          "x-graphql-type-name": "Comment",
          properties: {
            id: { type: "string" },
            text: { type: "string" },
            author: { type: "string" },
          },
        },
      ],
    },
  },

  interface_example: {
    name: "Interface Types",
    category: "Advanced",
    description: "Interface with implementing types",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Node",
      description: "Node interface - all types have an ID",
      type: "object",
      "x-graphql-type-name": "Node",
      "x-graphql-type-kind": "interface",
      properties: {
        id: {
          type: "string",
          description: "Global unique identifier",
          "x-graphql-type": "ID!",
        },
      },
      required: ["id"],
    },
  },

  // ============================================================================
  // REAL-WORLD EXAMPLES
  // ============================================================================

  blog_post: {
    name: "Blog Post",
    category: "Real-World",
    description: "Complete blog post with author and comments",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "BlogPost",
      description: "A blog post with metadata",
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-graphql-type": "ID!",
        },
        title: {
          type: "string",
          minLength: 1,
          maxLength: 200,
        },
        content: {
          type: "string",
          description: "Post content in markdown",
        },
        author: {
          type: "object",
          "x-graphql-type-name": "Author",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            bio: { type: "string" },
          },
          required: ["id", "name"],
        },
        tags: {
          type: "array",
          items: { type: "string" },
        },
        status: {
          type: "string",
          enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
        },
        publishedAt: {
          type: "string",
          format: "date-time",
          "x-graphql-type": "DateTime",
        },
        viewCount: {
          type: "integer",
          minimum: 0,
          default: 0,
        },
      },
      required: ["id", "title", "content", "author", "status"],
    },
  },

  e_commerce_order: {
    name: "E-commerce Order",
    category: "Real-World",
    description: "Order with items, shipping, and payment",
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Order",
      description: "E-commerce order",
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-graphql-type": "ID!",
        },
        orderNumber: {
          type: "string",
          pattern: "^ORD-[0-9]{8}$",
        },
        customer: {
          type: "object",
          "x-graphql-type-name": "Customer",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
          },
          required: ["id", "name"],
        },
        items: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            "x-graphql-type-name": "OrderItem",
            properties: {
              productId: { type: "string" },
              quantity: { type: "integer", minimum: 1 },
              price: { type: "number", minimum: 0 },
            },
            required: ["productId", "quantity", "price"],
          },
        },
        totalAmount: {
          type: "number",
          minimum: 0,
        },
        status: {
          type: "string",
          enum: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
        },
        createdAt: {
          type: "string",
          format: "date-time",
        },
      },
      required: [
        "id",
        "orderNumber",
        "customer",
        "items",
        "totalAmount",
        "status",
      ],
    },
  },
};

/**
 * Get default template for new projects
 */
export function getDefaultTemplate(): string {
  const template = getTemplate("simple_user");
  return template ? template.content : "{}";
}
