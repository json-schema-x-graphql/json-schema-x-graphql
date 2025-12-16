/**
 * Pre-built schema templates for quick start
 * 
 * Users can select these from the dropdown to instantly populate
 * a new schema with a working example.
 */

export const SCHEMA_TEMPLATES = {
    ast_json_output: {
      import ast_json_output from './templates/ast_json_output.json' assert { type: 'json' };
      import adr_small_inline from './templates/adr_small_inline.json' assert { type: 'json' };
      import federation_auto from './templates/federation_auto.json' assert { type: 'json' };
      import sanitization_coverage from './templates/sanitization_coverage.json' assert { type: 'json' };
      import fuzz_edge_cases from './templates/fuzz_edge_cases.json' assert { type: 'json' };
      import id_strategy_all_strings from './templates/id_strategy_all_strings.json' assert { type: 'json' };
      import complex_schema from './templates/complex_schema.json' assert { type: 'json' };
      import ref_target from './templates/ref_target.json' assert { type: 'json' };
      import adr_ref_naming_collision from './templates/adr_ref_naming_collision.json' assert { type: 'json' };
      import federation_auto_options from './templates/federation_auto_options.json' assert { type: 'json' };

      export const SCHEMA_TEMPLATES = {
        ast_json_output: {
          name: 'AST JSON Output',
          description: 'Test schema: AstJsonFixture',
          schema: ast_json_output
        },
        adr_small_inline: {
          name: 'ADR Small Inline',
          description: 'Test schema: SmallInline',
          schema: adr_small_inline
        },
        federation_auto: {
          name: 'Federation Auto',
          description: 'Test schema: FederatedThing',
          schema: federation_auto
        },
        sanitization_coverage: {
          name: 'Sanitization Coverage',
          description: 'Test schema: Naming convention and identifier sanitization',
          schema: sanitization_coverage
        },
        fuzz_edge_cases: {
          name: 'Fuzz Edge Cases',
          description: 'Test schema: Edge cases and parsing pitfalls',
          schema: fuzz_edge_cases
        },
        id_strategy_all_strings: {
          name: 'ID Strategy All Strings',
          description: 'Test schema: AllStringsId',
          schema: id_strategy_all_strings
        },
        complex_schema: {
          name: 'Complex Test Schema',
          description: 'Test schema: ComplexTestSchema (comprehensive features)',
          schema: complex_schema
        },
        ref_target: {
          name: 'Reference Target',
          description: 'Test schema: ExternalRefTarget',
          schema: ref_target
        },
        adr_ref_naming_collision: {
          name: 'ADR Ref Naming Collision',
          description: 'Test schema: RefNamingCollision',
          schema: adr_ref_naming_collision
        },
        federation_auto_options: {
          name: 'Federation Auto Options',
          description: 'Test options for federation auto',
          schema: federation_auto_options
        }
      };
        },
        lastName: {
          type: 'string',
          description: "User's last name",
        },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest'],
          description: 'User role for access control',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'suspended'],
          description: 'Current user status',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Account creation timestamp',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Last profile update',
        },
      },
      required: ['id', 'username', 'email'],
    },

  contract_data: {
    name: 'Contract Data (FPDS)',
    description: 'Federal Procurement Data System canonical contract schema',
    schema: JSON.parse('{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"contract_data.schema.json","title":"Contract Data Canonical Schema","description":"Canonical, snake_case JSON Schema for the Federal Procurement Data System (Contract Data). This schema represents the complete Contract Data dataset with 600+ fields organized by functional domain. Designed to auto-generate a valid GraphQL SDL subgraph via x-graphql-* hints.","type":"object","x-graphql-enums":{"SystemName":{"description":"Enumeration of system identifiers","values":["Legacy Procurement","Intake Process","Logistics Mgmt","Contract Data","PRISM"]}},"x-graphql-scalars":{"DateTime":{"description":"ISO 8601 date-time string (YYYY-MM-DDTHH:mm:ss.sssZ)"},"Date":{"description":"ISO 8601 date string (YYYY-MM-DD)"},"Decimal":{"description":"Decimal number as string to preserve precision"},"Email":{"description":"Email address conforming to RFC 5322 (simplified)"},"URI":{"description":"Uniform Resource Identifier or URL string"}},"x-graphql-operations":{"queries":{"contract_dataRecord":{"description":"Fetch a single Contract Data record by PIID and agency code","args":{"piid":{"type":"String!","description":"Procurement Instrument Identifier"},"agency_code":{"type":"String","description":"Agency code for disambiguation"}},"type":"FpdsRecord"},"contract_dataRecords":{"description":"Return a list of Contract Data records (non-paginated)","type":"[FpdsRecord!]!"}}},"properties":{"contract_data_record":{"$ref":"#/$defs/FpdsRecord"}},"$defs":{}}')
  },

  intake_process: {
    name: 'Intake Process',
    description: 'Canonical schema for the Intake Process system',
    schema: JSON.parse('{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"intake_process.schema.json","title":"Intake Process Canonical Schema","description":"Canonical, snake_case JSON Schema for the Intake Process system. Provides x-graphql-* hints for automatic GraphQL SDL subgraph generation without altering the underlying structural semantics.","type":"object","x-graphql-enums":{"SystemName":{"description":"Enumeration of system identifiers","values":["Legacy Procurement","Intake Process","Logistics Mgmt","Contract Data","PRISM"]}},"x-graphql-scalars":{"date_time":{"description":"ISO 8601 date-time string (YYYY-MM-DDTHH:mm:ss.sssZ)","serialize":"String"},"date":{"description":"ISO 8601 date string (YYYY-MM-DD)","serialize":"String"},"decimal":{"description":"High-precision decimal number","serialize":"Float"},"json":{"description":"Arbitrary JSON value","serialize":"JSON"},"email":{"description":"Valid email address","serialize":"String"},"uri":{"description":"Valid URI/URL","serialize":"String"}},"x-graphql-operations":{"queries":{"intake_process_record":{"type":"EasiRecord","description":"Fetch a single Intake Process record by composite key (business_owner + system_owner) or source_record_id.","args":{"business_owner":{"type":"String","description":"Business owner identifier or name."},"system_owner":{"type":"String","description":"System owner identifier or name."},"source_record_id":{"type":"ID","description":"Direct source record identifier for precise lookup."}}},"intake_process_records":{"type":"[EasiRecord!]!","description":"Return a list of Intake Process records (non-paginated snapshot)."}}},"properties":{"intake_process_record":{"$ref":"#/$defs/intake_process_record","description":"Root Intake Process entity."}},"$defs":{}}')
  },

  logistics_mgmt: {
    name: 'Logistics Mgmt',
    description: 'Procurement data schema for solicitations and requisitions',
    schema: JSON.parse('{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"logistics_mgmt.schema.json","title":"Procurement Data Schema","description":"JSON Schema for Solicitation and Requisition data, including mappings from source fields for GraphQL SDL translation.\n\nNOTE: This schema has been updated to accept flexible types. Numeric and boolean fields accept both their strict type and string representations to accommodate API response variations.\n\nNOTE: This schema has been updated to accept flexible types. Numeric and boolean fields accept both their strict type and string representations to accommodate API response variations.","type":"object","x-graphql-enums":{"SystemName":{"description":"Enumeration of system identifiers","values":["Legacy Procurement","Intake Process","Logistics Mgmt","Contract Data","PRISM"]},"UnipricedFlag":{"description":"Indicates whether items are unpriced","values":["Y","N","UNKNOWN"]}},"x-graphql-scalars":{"Date":{"description":"Calendar date in ISO 8601 format (YYYY-MM-DD)."},"DateTime":{"description":"Timestamp in ISO 8601 format (includes time and optional offset)."},"Time":{"description":"Time in HH:mm:ss format"},"Decimal":{"description":"Arbitrary precision decimal represented as a string to avoid float rounding issues."},"Email":{"description":"Email address conforming to RFC 5322 (simplified)."},"URI":{"description":"Uniform Resource Identifier or URL string."},"JSON":{"description":"Arbitrary JSON value serialized as a string."}},"x-graphql-operations":{"queries":{"_empty":{"type":"String","description":"Placeholder query for library-only subgraph"}}},"properties":{"solicitation":{"$ref":"#/$defs/Solicitation"},"requisition":{"$ref":"#/$defs/Requisition"}},"$defs":{}}')
  },

  legacy_procurement: {
    name: 'Legacy Procurement',
    description: 'Canonical schema for the Legacy Procurement system',
    schema: JSON.parse('{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"legacy_procurement.schema.json","title":"Legacy Procurement Canonical Schema","description":"Canonical, snake_case JSON Schema for the Legacy Procurement system. Designed to auto-generate a valid GraphQL SDL subgraph via x-graphql-* hints without changing the structure. This schema defines a root AssistRecord entity with associated metadata and Legacy Procurement-specific domain fields.","type":"object","x-graphql-enums":{"SystemName":{"description":"Enumeration of system identifiers","values":["Legacy Procurement","Intake Process","Logistics Mgmt","Contract Data","PRISM"]}},"x-graphql-scalars":{"date_time":{"description":"ISO 8601 date-time string (YYYY-MM-DDTHH:mm:ss.sssZ)","serialize":"String"},"date":{"description":"ISO 8601 date string (YYYY-MM-DD)","serialize":"String"},"decimal":{"description":"High-precision decimal number for amounts","serialize":"Float"},"json":{"description":"Arbitrary JSON value","serialize":"JSON"},"email":{"description":"Valid email address","serialize":"String"},"uri":{"description":"Valid URI/URL","serialize":"String"}},"x-graphql-operations":{"queries":{"legacy_procurement_record":{"type":"AssistRecord","description":"Fetch a single Legacy Procurement record by IA PIID or unique ID","args":{"ia_piid_or_unique_id":{"type":"String!","description":"Interagency agreement PIID or the Legacy Procurement unique identifier"},"source_record_id":{"type":"ID","description":"Optional source record identifier for disambiguation"}}},"legacy_procurement_records":{"type":"[AssistRecord!]!","description":"Return a list of Legacy Procurement records (non-paginated)"}}},"properties":{"legacy_procurement_record":{"$ref":"#/$defs/legacy_procurement_record","description":"Root Legacy Procurement entity"}},"$defs":{}}')
  },

  public_spending: {
    name: 'Public Spending',
    description: 'Canonical schema for Public Spending (GDSM) procurement contract data',
    schema: JSON.parse('{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"public_spending.schema.json","title":"Public Spending Procurement Schema","description":"Canonical schema for Public Spending (GDSM) procurement contract data from award_procurement table","x-graphql-scalars":{"DateTime":{"description":"ISO 8601 date-time string (YYYY-MM-DDTHH:mm:ss.sssZ)"},"Date":{"description":"ISO 8601 date string (YYYY-MM-DD)"},"Decimal":{"description":"High-precision decimal number"}},"x-graphql-operations":{"queries":{"public_spendingProcurement":{"description":"Fetch a single Public Spending procurement record by PIID","args":{"piid":{"type":"String!","description":"Procurement Instrument Identifier"}},"type":"Public SpendingProcurement"},"public_spendingProcurements":{"description":"Return a list of Public Spending procurement records","type":"[Public SpendingProcurement!]!"}}},"type":"object","properties":{"public_spending_procurement":{"$ref":"#/$defs/Public SpendingProcurement"}},"$defs":{}}')
  },

  schema_unification: {
    import ast_json_output from './templates/ast_json_output.json';
    import adr_small_inline from './templates/adr_small_inline.json';
    import federation_auto from './templates/federation_auto.json';
    import sanitization_coverage from './templates/sanitization_coverage.json';
    import fuzz_edge_cases from './templates/fuzz_edge_cases.json';
    import id_strategy_all_strings from './templates/id_strategy_all_strings.json';
    import complex_schema from './templates/complex_schema.json';
    import ref_target from './templates/ref_target.json';
    import adr_ref_naming_collision from './templates/adr_ref_naming_collision.json';
    import federation_auto_options from './templates/federation_auto_options.json';

    export const SCHEMA_TEMPLATES = {
      ast_json_output: {
        name: 'AST JSON Output',
        description: 'Test schema: AstJsonFixture',
        schema: ast_json_output
      },
      adr_small_inline: {
        name: 'ADR Small Inline',
        description: 'Test schema: SmallInline',
        schema: adr_small_inline
      },
      federation_auto: {
        name: 'Federation Auto',
        description: 'Test schema: FederatedThing',
        schema: federation_auto
      },
      sanitization_coverage: {
        name: 'Sanitization Coverage',
        description: 'Test schema: Naming convention and identifier sanitization',
        schema: sanitization_coverage
      },
      fuzz_edge_cases: {
        name: 'Fuzz Edge Cases',
        description: 'Test schema: Edge cases and parsing pitfalls',
        schema: fuzz_edge_cases
      },
      id_strategy_all_strings: {
        name: 'ID Strategy All Strings',
        description: 'Test schema: AllStringsId',
        schema: id_strategy_all_strings
      },
      complex_schema: {
        name: 'Complex Test Schema',
        description: 'Test schema: ComplexTestSchema (comprehensive features)',
        schema: complex_schema
      },
      ref_target: {
        name: 'Reference Target',
        description: 'Test schema: ExternalRefTarget',
        schema: ref_target
      },
      adr_ref_naming_collision: {
        name: 'ADR Ref Naming Collision',
        description: 'Test schema: RefNamingCollision',
        schema: adr_ref_naming_collision
      },
      federation_auto_options: {
        name: 'Federation Auto Options',
        description: 'Test options for federation auto',
        schema: federation_auto_options
      },
        },
        description: {
          type: 'string',
          description: 'Detailed product description',
        },
        category: {
          type: 'string',
          enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'other'],
          description: 'Product category',
        },
        price: {
          type: 'number',
          description: 'Current selling price',
        },
        cost: {
          type: 'number',
          description: 'Cost price (for profit calculation)',
        },
        currency: {
          type: 'string',
          enum: ['USD', 'EUR', 'GBP', 'JPY'],
          description: 'Currency code',
        },
        stock: {
          type: 'integer',
          description: 'Current inventory quantity',
        },
        sku: {
          type: 'string',
          description: 'Stock keeping unit',
        },
        images: {
          type: 'array',
          description: 'Product image URLs',
          items: {
            type: 'string',
          },
        },
        tags: {
          type: 'array',
          description: 'Search and categorization tags',
          items: {
            type: 'string',
          },
        },
        rating: {
          type: 'number',
          description: 'Average customer rating (0-5)',
        },
        reviews: {
          type: 'integer',
          description: 'Number of customer reviews',
        },
        published: {
          type: 'boolean',
          description: 'Whether product is visible to customers',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'When product was added to catalog',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Last catalog update',
        },
      },
      required: ['id', 'name', 'price', 'category'],
    },
  },

  blank: {
    name: 'Blank Schema',
    description: 'Start with an empty template',
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'CustomType',
      type: 'object',
      properties: {
        id: {
          type: 'string',
          'x-graphql-type': 'ID',
        },
      },
      required: ['id'],
    },
  },
};

/**
 * Get all available template names
 */
export function getTemplateNames() {
  return Object.keys(SCHEMA_TEMPLATES).map((key) => ({
    key,
    name: SCHEMA_TEMPLATES[key].name,
    description: SCHEMA_TEMPLATES[key].description,
  }));
}

/**
 * Get a template by key
 */
export function getTemplate(key) {
  const template = SCHEMA_TEMPLATES[key];
  if (!template) {
    throw new Error(`Template not found: ${key}`);
  },
  return {
    name: template.name,
    content: JSON.stringify(template.schema, null, 2),
  };
}

/**
 * Get default template
 */
export function getDefaultTemplate() {
  return getTemplate('blank');
}
