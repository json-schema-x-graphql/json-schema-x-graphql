// @ts-nocheck
import { buildASTSchema } from "graphql";

const schemaAST = {
  kind: "Document",
  definitions: [
    {
      kind: "SchemaDefinition",
      operationTypes: [
        {
          kind: "OperationTypeDefinition",
          operation: "query",
          type: {
            kind: "NamedType",
            name: {
              kind: "Name",
              value: "Query",
            },
          },
        },
      ],
      directives: [],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "key",
      },
      arguments: [
        {
          kind: "InputValueDefinition",
          name: {
            kind: "Name",
            value: "fields",
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "String",
              },
            },
          },
          directives: [],
        },
        {
          kind: "InputValueDefinition",
          name: {
            kind: "Name",
            value: "resolvable",
          },
          type: {
            kind: "NamedType",
            name: {
              kind: "Name",
              value: "Boolean",
            },
          },
          defaultValue: {
            kind: "BooleanValue",
            value: true,
          },
          directives: [],
        },
      ],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "OBJECT",
        },
        {
          kind: "Name",
          value: "INTERFACE",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "requires",
      },
      arguments: [
        {
          kind: "InputValueDefinition",
          name: {
            kind: "Name",
            value: "fields",
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "String",
              },
            },
          },
          directives: [],
        },
      ],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "FIELD_DEFINITION",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "provides",
      },
      arguments: [
        {
          kind: "InputValueDefinition",
          name: {
            kind: "Name",
            value: "fields",
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "String",
              },
            },
          },
          directives: [],
        },
      ],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "FIELD_DEFINITION",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "external",
      },
      arguments: [],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "FIELD_DEFINITION",
        },
        {
          kind: "Name",
          value: "OBJECT",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "shareable",
      },
      arguments: [],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "OBJECT",
        },
        {
          kind: "Name",
          value: "FIELD_DEFINITION",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "tag",
      },
      arguments: [
        {
          kind: "InputValueDefinition",
          name: {
            kind: "Name",
            value: "name",
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "String",
              },
            },
          },
          directives: [],
        },
      ],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "FIELD_DEFINITION",
        },
        {
          kind: "Name",
          value: "INTERFACE",
        },
        {
          kind: "Name",
          value: "OBJECT",
        },
        {
          kind: "Name",
          value: "UNION",
        },
        {
          kind: "Name",
          value: "ARGUMENT_DEFINITION",
        },
        {
          kind: "Name",
          value: "SCALAR",
        },
        {
          kind: "Name",
          value: "ENUM",
        },
        {
          kind: "Name",
          value: "ENUM_VALUE",
        },
        {
          kind: "Name",
          value: "INPUT_OBJECT",
        },
        {
          kind: "Name",
          value: "INPUT_FIELD_DEFINITION",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "extends",
      },
      arguments: [],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "OBJECT",
        },
        {
          kind: "Name",
          value: "INTERFACE",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "link",
      },
      arguments: [
        {
          kind: "InputValueDefinition",
          name: {
            kind: "Name",
            value: "url",
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "String",
              },
            },
          },
          directives: [],
        },
        {
          kind: "InputValueDefinition",
          name: {
            kind: "Name",
            value: "as",
          },
          type: {
            kind: "NamedType",
            name: {
              kind: "Name",
              value: "String",
            },
          },
          directives: [],
        },
        {
          kind: "InputValueDefinition",
          name: {
            kind: "Name",
            value: "import",
          },
          type: {
            kind: "ListType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "String",
              },
            },
          },
          directives: [],
        },
      ],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "SCHEMA",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "inaccessible",
      },
      arguments: [],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "FIELD_DEFINITION",
        },
        {
          kind: "Name",
          value: "OBJECT",
        },
        {
          kind: "Name",
          value: "INTERFACE",
        },
        {
          kind: "Name",
          value: "UNION",
        },
        {
          kind: "Name",
          value: "ARGUMENT_DEFINITION",
        },
        {
          kind: "Name",
          value: "SCALAR",
        },
        {
          kind: "Name",
          value: "ENUM",
        },
        {
          kind: "Name",
          value: "ENUM_VALUE",
        },
        {
          kind: "Name",
          value: "INPUT_OBJECT",
        },
        {
          kind: "Name",
          value: "INPUT_FIELD_DEFINITION",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "override",
      },
      arguments: [
        {
          kind: "InputValueDefinition",
          name: {
            kind: "Name",
            value: "from",
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "String",
              },
            },
          },
          directives: [],
        },
      ],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "FIELD_DEFINITION",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "composeDirective",
      },
      arguments: [
        {
          kind: "InputValueDefinition",
          name: {
            kind: "Name",
            value: "name",
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "String",
              },
            },
          },
          directives: [],
        },
      ],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "SCHEMA",
        },
      ],
    },
    {
      kind: "DirectiveDefinition",
      name: {
        kind: "Name",
        value: "interfaceObject",
      },
      arguments: [],
      repeatable: false,
      locations: [
        {
          kind: "Name",
          value: "OBJECT",
        },
      ],
    },
    {
      kind: "ScalarTypeDefinition",
      name: {
        kind: "Name",
        value: "_FieldSet",
      },
      directives: [],
    },
    {
      kind: "ObjectTypeDefinition",
      description: {
        kind: "StringValue",
        value: "Product review entity",
        block: true,
      },
      name: {
        kind: "Name",
        value: "Review",
      },
      fields: [
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Review unique identifier",
            block: true,
          },
          name: {
            kind: "Name",
            value: "id",
          },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "ID",
              },
            },
          },
          directives: [],
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Review body text",
            block: true,
          },
          name: {
            kind: "Name",
            value: "body",
          },
          arguments: [],
          type: {
            kind: "NamedType",
            name: {
              kind: "Name",
              value: "String",
            },
          },
          directives: [],
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Review author (provides username field)",
            block: true,
          },
          name: {
            kind: "Name",
            value: "author",
          },
          arguments: [],
          type: {
            kind: "NamedType",
            name: {
              kind: "Name",
              value: "User",
            },
          },
          directives: [],
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Product being reviewed",
            block: true,
          },
          name: {
            kind: "Name",
            value: "product",
          },
          arguments: [],
          type: {
            kind: "NamedType",
            name: {
              kind: "Name",
              value: "Product",
            },
          },
          directives: [],
        },
      ],
      interfaces: [],
      directives: [],
    },
    {
      kind: "ObjectTypeDefinition",
      description: {
        kind: "StringValue",
        value: "Extended User type with reviews",
        block: true,
      },
      name: {
        kind: "Name",
        value: "User",
      },
      fields: [
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "User's email address (from Users service)",
            block: true,
          },
          name: {
            kind: "Name",
            value: "email",
          },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "ID",
              },
            },
          },
          directives: [],
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Reviews written by this user",
            block: true,
          },
          name: {
            kind: "Name",
            value: "reviews",
          },
          arguments: [],
          type: {
            kind: "ListType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "Review",
              },
            },
          },
          directives: [],
        },
      ],
      interfaces: [],
      directives: [],
    },
    {
      kind: "ObjectTypeDefinition",
      description: {
        kind: "StringValue",
        value: "Extended Product type with reviews",
        block: true,
      },
      name: {
        kind: "Name",
        value: "Product",
      },
      fields: [
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Universal Product Code (from Products service)",
            block: true,
          },
          name: {
            kind: "Name",
            value: "upc",
          },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "String",
              },
            },
          },
          directives: [],
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Reviews for this product",
            block: true,
          },
          name: {
            kind: "Name",
            value: "reviews",
          },
          arguments: [],
          type: {
            kind: "ListType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "Review",
              },
            },
          },
          directives: [],
        },
      ],
      interfaces: [],
      directives: [],
    },
    {
      kind: "ObjectTypeDefinition",
      name: {
        kind: "Name",
        value: "Query",
      },
      fields: [
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Get a review by ID",
            block: true,
          },
          name: {
            kind: "Name",
            value: "review",
          },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: {
                kind: "Name",
                value: "id",
              },
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: {
                    kind: "Name",
                    value: "ID",
                  },
                },
              },
              directives: [],
            },
          ],
          type: {
            kind: "NamedType",
            name: {
              kind: "Name",
              value: "Review",
            },
          },
          directives: [],
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Get all reviews",
            block: true,
          },
          name: {
            kind: "Name",
            value: "reviews",
          },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: {
                    kind: "Name",
                    value: "Review",
                  },
                },
              },
            },
          },
          directives: [],
        },
      ],
      interfaces: [],
      directives: [],
    },
  ],
};

export default buildASTSchema(schemaAST, {
  assumeValid: true,
  assumeValidSDL: true,
});
