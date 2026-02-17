# Scripts API Reference

Complete programmatic API documentation for all generator, validator, and helper scripts in the Schema Unification Forest project.

## Table of Contents

- [Generator Scripts](#generator-scripts)
  - [generate-graphql-from-json-schema.mjs](#generate-graphql-from-json-schemamjs)
  - [generate-graphql-json-schema.mjs](#generate-graphql-json-schemamjs)
  - [generate-graphql-json-schema-v2.mjs](#generate-graphql-json-schema-v2mjs)
  - [generate-schema-interop.mjs](#generate-schema-interopmjs)
- [Validator Scripts](#validator-scripts)
  - [validate-schema.mjs](#validate-schemamjs)
  - [validate-graphql-vs-jsonschema.mjs](#validate-graphql-vs-jsonschemamjs)
  - [validate-schema-sync.mjs](#validate-schema-syncmjs)
- [Helper Modules](#helper-modules)
  - [helpers/case-conversion.mjs](#helperscase-conversionmjs)
  - [helpers/format-json.mjs](#helpersformat-jsonmjs)
  - [helpers/generate-graphql-json-schema-helpers.mjs](#helpersgenerate-graphql-json-schema-helpersmjs)
  - [lib/graphql-hints.mjs](#libgraphql-hintsmjs)

---

## Generator Scripts

### generate-graphql-from-json-schema.mjs

Generate GraphQL SDL from JSON Schema with support for multiple systems.

#### Exported Functions

##### `generateFromJSONSchema(options)`

Generate GraphQL SDL from JSON Schema with extensive configuration options.

**Parameters:**

- `options` (Object):
  - `schemaPath` (string, optional): Path to input JSON Schema file (defaults to `src/data/schema_unification.schema.json`)
  - `outputPath` (string, optional): Path to output GraphQL SDL file (defaults to `generated-schemas/schema_unification.from-json.graphql`)
  - `outputBaseName` (string, optional): Base name for output files (derived from schema filename by default)
  - `includeDescriptions` (boolean, optional): Include descriptions in SDL (default: true)
  - `includeFederationDirectives` (boolean, optional): Add Federation directives (default: false)

**Returns:** `Promise<string>` - Path to the generated GraphQL SDL file

**Throws:** `Error` - If schema file doesn't exist or JSON parsing fails

**Example:**

```javascript
import { generateFromJSONSchema } from "./scripts/generate-graphql-from-json-schema.mjs";

// Generate with default options
const outputPath = await generateFromJSONSchema();
console.log("Generated:", outputPath);

// Generate from custom schema
const legacy_procurementPath = await generateFromJSONSchema({
  schemaPath: "src/data/legacy_procurement.schema.json",
  outputBaseName: "legacy_procurement",
});
```

#### CLI Usage

```bash
# Generate from default schema
node scripts/generate-graphql-from-json-schema.mjs

# Generate from custom schema
node scripts/generate-graphql-from-json-schema.mjs --schema src/data/legacy_procurement.schema.json

# Custom output base name
node scripts/generate-graphql-from-json-schema.mjs --schema src/data/logistics_mgmt.schema.json --out-base logistics_mgmt
```

---

### generate-graphql-json-schema.mjs

Generate JSON Schema from GraphQL SDL (reverse conversion).

#### Exported Functions

##### `generateFromSDL(sdlFilePath, jsonSchemaFilePath, outPath, inputCase, outputCase)`

Convert GraphQL SDL to JSON Schema format with case conversion support.

**Parameters:**

- `sdlFilePath` (string, optional): Path to input GraphQL SDL file (defaults to `generated-schemas/schema_unification.supergraph.graphql`)
- `jsonSchemaFilePath` (string, optional): Path to canonical JSON Schema for definitions (defaults to `src/data/schema_unification.schema.json`)
- `outPath` (string, optional): Path to output JSON Schema file (defaults to `generated-schemas/schema_unification.from-graphql.json`)
- `inputCase` (string, optional): Input field name case style - `'camel'` or `'snake'` (default: `'camel'`)
- `outputCase` (string, optional): Output field name case style - `'camel'` or `'snake'` (default: `'snake'`)

**Returns:** `Promise<string>` - Path to the generated JSON Schema file

**Throws:** `Error` - If SDL file doesn't exist or GraphQL parsing fails

**Example:**

```javascript
import { generateFromSDL } from "./scripts/generate-graphql-json-schema.mjs";

// Generate with default options (camel -> snake)
const outputPath = await generateFromSDL();

// Generate with custom paths and case conversion
const customPath = await generateFromSDL(
  "generated-schemas/custom.graphql",
  "src/data/schema_unification.schema.json",
  "output/custom.schema.json",
  "camel",
  "snake",
);
```

#### Key Features

- **Federation Support:** Automatically handles Federation directives (`@key`, `@external`, `@shareable`)
- **Case Conversion:** Bidirectional camelCase ↔ snake_case conversion
- **Reference Resolution:** Resolves `$ref` pointers from canonical JSON Schema
- **Dual Output:** Writes to both `generated-schemas/` and `src/data/generated/`

---

### generate-graphql-json-schema-v2.mjs

Generate JSON Schema from V2 GraphQL SDL with x-graphql extensions support.

#### Exported Functions

##### `generateV2(options)`

Convert V2 GraphQL SDL (with x-graphql-\* extensions) to JSON Schema format.

**Parameters:**

- `options` (Object):
  - `schemaFile` (string, optional): Path to input V2 GraphQL SDL file (defaults to `src/data/schema_unification.target.graphql`)
  - `outPath` (string, optional): Path to output JSON Schema file (defaults to `generated-schemas/schema_unification.v2.from-graphql.json`)

**Returns:** `Promise<string>` - Path to the generated JSON Schema file

**Throws:** `Error` - If SDL file cannot be read or GraphQL parsing fails

**Example:**

```javascript
import { generateV2 } from "./scripts/generate-graphql-json-schema-v2.mjs";

// Generate with default paths
const outputPath = await generateV2();

// Generate with custom paths
const customPath = await generateV2({
  schemaFile: "src/data/custom.target.graphql",
  outPath: "generated-schemas/custom.v2.json",
});
```

#### Key Features

- **Fallback Support:** Falls back to canonical SDL if V2 target SDL is not found
- **Extension Hints:** Processes x-graphql-\* extensions for enhanced type information
- **Federation Directives:** Injects Federation directive definitions automatically

---

### generate-schema-interop.mjs

Orchestrate the complete schema interop generation pipeline.

#### Exported Functions

##### `runInteropGeneration(options)`

Run the complete schema interop generation pipeline, orchestrating multiple generators.

**Parameters:**

- `options` (Object):
  - `outputDir` (string, optional): Output directory for generated files (defaults to `generated-schemas/`)
  - `skipV2` (boolean, optional): Skip V2 generation even if target SDL exists (default: false)
  - `verbose` (boolean, optional): Enable verbose logging (default: true)

**Returns:** `Promise<string[]>` - Array of paths to generated files

**Throws:** `Error` - If any generator script fails

**Example:**

```javascript
import { runInteropGeneration } from "./scripts/generate-schema-interop.mjs";

// Run full pipeline with defaults
const outputs = await runInteropGeneration();
console.log("Generated:", outputs);

// Run with custom output directory
const customOutputs = await runInteropGeneration({
  outputDir: "custom-output",
  verbose: true,
  skipV2: false,
});
```

#### Pipeline Steps

1. **Field Mapping:** Generate camelCase ↔ snake_case mapping (`generate-field-mapping.mjs`)
2. **Subgraphs:** Generate subgraphs from system-specific schemas (`generate-all-subgraphs.mjs`)
3. **Supergraph:** Compose subgraphs into supergraph (`generate-supergraph.mjs`)
4. **GraphQL → JSON:** Convert supergraph SDL to JSON Schema (`generate-graphql-json-schema.mjs`)
5. **JSON → GraphQL:** Convert JSON Schema to GraphQL SDL (`generate-graphql-from-json-schema.mjs`)
6. **V2 Generation:** Generate V2 JSON Schema if target SDL exists (`generate-graphql-json-schema-v2.mjs`)

#### CLI Usage

```bash
# Run full pipeline
node scripts/generate-schema-interop.mjs

# Or use the npm script
pnpm run generate:schema:interop
```

---

## Validator Scripts

### validate-schema.mjs

Validate JSON Schema files using AJV with draft-2020-12 support.

#### Exported Functions

##### `validateFiles(options)`

Validate JSON Schema files and collect results.

**Parameters:**

- `options` (Object):
  - `schemaFile` (string, optional): Path to schema file to validate (defaults to `src/data/schema_unification.schema.json`)
  - `files` (Array<Object>, optional): Array of file descriptors to validate
    - Each object: `{ name: string, path: string, validateSchema: boolean }`

**Returns:** `Object` - Validation results

- `totalErrors` (number): Total number of validation errors
- `fileResults` (Object): Per-file validation details
- `mainFileValid` (boolean): Whether the main schema file is valid

**Throws:** `Error` - If schema file cannot be compiled or validation fails critically

**Example:**

```javascript
import { validateFiles } from "./scripts/validate-schema.mjs";

// Validate default schema
const results = await validateFiles();
if (results.totalErrors > 0) {
  console.error("Validation failed:", results);
  throw new Error("Schema validation failed");
}

// Validate custom schema
const customResults = await validateFiles({
  schemaFile: "src/data/legacy_procurement.schema.json",
  files: [
    {
      name: "legacy_procurement.schema.json",
      path: "src/data/legacy_procurement.schema.json",
      validateSchema: true,
    },
  ],
});
```

#### Key Features

- **Draft 2020-12 Support:** Uses AJV 2020 build when available
- **External Schema Loading:** Automatically loads referenced schemas (contract_data, legacy_procurement, intake_process, logistics_mgmt, public_spending)
- **Detailed Diagnostics:** Reports $ref targets and compilation errors
- **Fallback Handling:** Falls back to canonical schema if requested schema not found

---

### validate-graphql-vs-jsonschema.mjs

Validate GraphQL SDL builds and validate data against JSON Schema.

#### Exported Classes

##### `SchemaSyncManager`

Manager class for validating GraphQL SDL and JSON data.

**Constructor:**

```javascript
new SchemaSyncManager(graphqlSchemaSDL, jsonSchema, (externalSchemas = []));
```

**Parameters:**

- `graphqlSchemaSDL` (string): GraphQL SDL string
- `jsonSchema` (Object): Parsed JSON Schema object
- `externalSchemas` (Array<Object>, optional): Additional schemas for $ref resolution

**Methods:**

###### `ensureGraphQLSchemaBuilds()`

Verify GraphQL SDL parses and builds successfully.

**Returns:** `boolean` - true if SDL builds successfully

**Throws:** `Error` - If SDL parsing or building fails

###### `validateGraphQLResponse(data)`

Validate JSON data against the JSON Schema.

**Parameters:**

- `data` (Object): JSON data to validate

**Returns:** `boolean` - true if data is valid

**Throws:** `Error` - If validation fails (error includes `validationErrors` property)

#### Exported Functions

##### `validateParity(graphqlSchemaSDL, jsonSchema, sampleData)`

Validate GraphQL SDL builds and optionally validate sample data.

**Parameters:**

- `graphqlSchemaSDL` (string): GraphQL SDL string
- `jsonSchema` (Object): Parsed JSON Schema object
- `sampleData` (Object|null, optional): Optional sample JSON to validate

**Returns:** `Object` - Validation results

- `sdlBuilds` (boolean): Whether SDL parsed and built successfully
- `sampleValid` (boolean|null): Whether sample data validated (null if no data provided)

**Throws:** `Error` - If SDL fails to parse/build or sample validation fails

**Example:**

```javascript
import { validateParity } from "./scripts/validate-graphql-vs-jsonschema.mjs";
import fs from "fs";

const sdl = fs.readFileSync(
  "generated-schemas/schema_unification.supergraph.graphql",
  "utf8",
);
const jsonSchema = JSON.parse(
  fs.readFileSync("src/data/schema_unification.schema.json", "utf8"),
);
const sampleData = {
  /* your test data */
};

const result = await validateParity(sdl, jsonSchema, sampleData);
console.log("SDL builds:", result.sdlBuilds);
console.log("Sample valid:", result.sampleValid);
```

---

### validate-schema-sync.mjs

Bi-directional validation between GraphQL SDL and JSON Schema field names.

#### Exported Functions

##### `validateSync(options)`

Validate field name synchronization between GraphQL SDL and JSON Schema.

**Parameters:**

- `options` (Object):
  - `sdlPath` (string, optional): Path to GraphQL SDL file
  - `jsonSchemaPath` (string, optional): Path to JSON Schema file
  - `verbose` (boolean, optional): Enable detailed logging
  - `strict` (boolean, optional): Enable strict mode (fail on missing fields)

**Returns:** `Object` - Sync validation results

- `missingInJson` (Set<string>): Fields in GraphQL but not in JSON Schema
- `missingInGraphQL` (Set<string>): Properties in JSON Schema but not in GraphQL
- `totalMismatches` (number): Total number of mismatches

**Throws:** `Error` - If files cannot be read or parsing fails

**Example:**

```javascript
import { validateSync } from "./scripts/validate-schema-sync.mjs";

// Validate with defaults
const results = await validateSync();
if (results.totalMismatches > 0) {
  console.warn("Field mismatches found:", results);
}

// Strict validation (throws on mismatches)
const strictResults = await validateSync({ strict: true });
```

#### CLI Usage

```bash
# Standard sync check
node scripts/validate-schema-sync.mjs

# Strict mode (exit 1 on mismatches)
node scripts/validate-schema-sync.mjs --strict

# Verbose output
node scripts/validate-schema-sync.mjs --verbose

# Or use the npm scripts
pnpm run validate:sync          # Standard
pnpm run validate:sync:strict   # Strict mode
```

---

## Helper Modules

### helpers/case-conversion.mjs

Case conversion utilities for field names.

#### Exported Functions

##### `camelToSnake(str)`

Convert CamelCase or camelCase to snake_case.

**Parameters:**

- `str` (string): String to convert

**Returns:** `string` - snake_case string

**Example:**

```javascript
import { camelToSnake } from "./scripts/helpers/case-conversion.mjs";

camelToSnake("vendorInfo"); // 'vendor_info'
camelToSnake("ContractID"); // 'contract_id'
camelToSnake("USASpending"); // 'usa_spending'
```

##### `snakeToCamel(str)`

Convert snake_case to camelCase.

**Parameters:**

- `str` (string): String to convert

**Returns:** `string` - camelCase string

**Example:**

```javascript
import { snakeToCamel } from "./scripts/helpers/case-conversion.mjs";

snakeToCamel("vendor_info"); // 'vendorInfo'
snakeToCamel("contract_id"); // 'contractId'
snakeToCamel("usa_spending"); // 'usaSpending'
```

##### `convertObjectKeys(obj, converter)`

Recursively convert object keys using a converter function.

**Parameters:**

- `obj` (any): Object, array, or primitive to convert
- `converter` (Function): Function to convert each key (e.g., `camelToSnake`)

**Returns:** `any` - Converted object/array/primitive

**Example:**

```javascript
import {
  convertObjectKeys,
  camelToSnake,
} from "./scripts/helpers/case-conversion.mjs";

const camelData = {
  vendorInfo: {
    companyName: "Acme Corp",
    contactPerson: "John Doe",
  },
};

const snakeData = convertObjectKeys(camelData, camelToSnake);
// {
//   vendor_info: {
//     company_name: 'Acme Corp',
//     contact_person: 'John Doe'
//   }
// }
```

##### `convertGraphQLFields(sdl, converter)`

Convert GraphQL field names in SDL string using a converter.

**Parameters:**

- `sdl` (string): GraphQL SDL string
- `converter` (Function): Function to convert each field name

**Returns:** `string` - SDL with converted field names

**Example:**

```javascript
import {
  convertGraphQLFields,
  camelToSnake,
} from "./scripts/helpers/case-conversion.mjs";

const sdl = `
type Contract {
  contractId: ID!
  vendorInfo: VendorInfo
}
`;

const snakeSdl = convertGraphQLFields(sdl, camelToSnake);
// type Contract {
//   contract_id: ID!
//   vendor_info: VendorInfo
// }
```

---

### helpers/format-json.mjs

JSON formatting utilities using Prettier.

#### Exported Functions

##### `formatJson(obj)`

Format an object as prettified JSON using Prettier.

**Parameters:**

- `obj` (any): Object to format

**Returns:** `string` - Formatted JSON string ready to write to disk

**Example:**

```javascript
import { formatJson } from "./scripts/helpers/format-json.mjs";
import fs from "fs/promises";

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: { name: { type: "string" } },
};

const formatted = await formatJson(schema);
await fs.writeFile("output.json", formatted);
```

---

### helpers/generate-graphql-json-schema-helpers.mjs

Shared helpers for GraphQL ↔ JSON Schema conversion.

#### Exported Functions

##### `isBuiltInScalar(name)`

Check if a type name is a built-in GraphQL scalar.

**Parameters:**

- `name` (string): Type name to check

**Returns:** `boolean` - true if built-in scalar (String, Int, Float, Boolean, ID, Date, DateTime, JSON, Decimal)

##### `shouldIncludeType(type)`

Determine if a GraphQL type should be included in JSON Schema output.

**Parameters:**

- `type` (Object): GraphQL type object

**Returns:** `boolean` - true if type should be included

**Exclusions:**

- Types starting with `__` (introspection types)
- Query, Mutation, Subscription, PageInfo
- Types ending with: Filter, Sort, SortInput, FilterInput, Args, Connection, Edge, Payload, Result, Response, PaginationInput
- Input object types

##### `ensureDefinition(namedType, ctx)`

Ensure a type definition exists in the generation context.

**Parameters:**

- `namedType` (Object): GraphQL type object
- `ctx` (Object): Generation context
  - `definitions` (Map): Map of type name to JSON Schema definition
  - `building` (Set): Set of types currently being built (prevents cycles)
  - `schema` (GraphQLSchema): GraphQL schema object

**Returns:** `void` - Mutates ctx.definitions

##### `buildEnumDefinition(enumType)`

Build JSON Schema definition for a GraphQL enum.

**Parameters:**

- `enumType` (Object): GraphQL enum type

**Returns:** `Object` - JSON Schema enum definition

**Example:**

```javascript
{
  type: 'string',
  enum: ['VALUE1', 'VALUE2', 'VALUE3'],
  description: 'Enum description'
}
```

##### `buildUnionDefinition(unionType, ctx)`

Build JSON Schema definition for a GraphQL union.

**Parameters:**

- `unionType` (Object): GraphQL union type
- `ctx` (Object): Generation context

**Returns:** `Object` - JSON Schema union definition

**Example:**

```javascript
{
  anyOf: [
    { $ref: '#/definitions/Type1' },
    { $ref: '#/definitions/Type2' }
  ],
  description: 'Union description'
}
```

##### `buildObjectDefinition(objectType, ctx)`

Build JSON Schema definition for a GraphQL object/interface.

**Parameters:**

- `objectType` (Object): GraphQL object or interface type
- `ctx` (Object): Generation context

**Returns:** `Object` - JSON Schema object definition

##### `convertGraphQLType(graphqlType, ctx)`

Convert a GraphQL type reference to JSON Schema type reference.

**Parameters:**

- `graphqlType` (Object): GraphQL type (may be wrapped in NonNull/List)
- `ctx` (Object): Generation context

**Returns:** `Object` - JSON Schema type definition or $ref

**Example:**

```javascript
// String! -> { type: 'string' }
// [String!]! -> { type: 'array', items: { type: 'string' } }
// Contract -> { $ref: '#/definitions/Contract' }
```

##### `createContext(schema)`

Create a generation context object.

**Parameters:**

- `schema` (GraphQLSchema): GraphQL schema object

**Returns:** `Object` - Generation context

- `definitions` (Map): Empty definitions map
- `building` (Set): Empty building set
- `schema` (GraphQLSchema): Passed schema

---

### lib/graphql-hints.mjs

Shared GraphQL hints processing library for x-graphql-\* extensions.

#### Exported Functions

##### `parseHintExtensions(schema)`

Parse all x-graphql-\* extensions from a JSON Schema.

**Parameters:**

- `schema` (Object): JSON Schema object with x-graphql-\* extensions

**Returns:** `Object` - Parsed hint configuration

- `scalars` (Map<string, Object>): Custom scalar definitions
- `enums` (Map<string, Object>): Enum configurations
- `unions` (Map<string, Object>): Union configurations
- `scalarFields` (Map<string, string>): Field-level scalar overrides
- `requiredFields` (Map<string, boolean>): Field-level required flags
- `operations` (Object): Root operations (queries, mutations, subscriptions)
- `pagination` (Object): Relay-style pagination configuration

**Example:**

```javascript
import { parseHintExtensions } from "./scripts/lib/graphql-hints.mjs";
import fs from "fs";

const schema = JSON.parse(
  fs.readFileSync("src/data/schema_unification.schema.json", "utf8"),
);
const hints = parseHintExtensions(schema);

console.log("Custom scalars:", Array.from(hints.scalars.keys()));
console.log("Enums:", Array.from(hints.enums.keys()));
console.log("Operations:", hints.operations);
```

##### `generateEnhancedSDL(baseSDL, schema, options)`

Generate enhanced GraphQL SDL by applying x-graphql-\* extensions.

**Parameters:**

- `baseSDL` (string): Base GraphQL SDL string
- `schema` (Object): JSON Schema object with x-graphql-\* extensions
- `options` (Object, optional):
  - `includeCustomScalars` (boolean): Include custom scalar definitions (default: true)
  - `includeOperations` (boolean): Include root operations (default: true)
  - `includePagination` (boolean): Include pagination types (default: true)
  - `includeDescriptions` (boolean): Include descriptions (default: true)

**Returns:** `string` - Enhanced GraphQL SDL

**Example:**

```javascript
import { generateEnhancedSDL } from "./scripts/lib/graphql-hints.mjs";
import fs from "fs";

const baseSDL = fs.readFileSync("generated-schemas/base.graphql", "utf8");
const schema = JSON.parse(
  fs.readFileSync("src/data/schema_unification.schema.json", "utf8"),
);

const enhancedSDL = generateEnhancedSDL(baseSDL, schema, {
  includeCustomScalars: true,
  includeOperations: true,
  includePagination: false,
});

fs.writeFileSync("generated-schemas/enhanced.graphql", enhancedSDL);
```

##### `buildEnumSDL(enumConfig)`

Build GraphQL SDL for an enum from configuration.

**Parameters:**

- `enumConfig` (Object):
  - `name` (string): Enum type name
  - `description` (string, optional): Enum description
  - `values` (Object): Map of value key to value config
    - `name` (string): Value identifier
    - `description` (string, optional): Value description
    - `deprecated` (string, optional): Deprecation reason

**Returns:** `string` - Enum SDL fragment

##### `addCustomScalarsSDL(scalarsMap)`

Generate SDL for custom scalar declarations.

**Parameters:**

- `scalarsMap` (Map<string, Object>): Map of scalar name to config

**Returns:** `string` - Scalar declarations SDL

##### `addOperationsSDL(operationsConfig)`

Generate SDL for root operations (Query, Mutation, Subscription).

**Parameters:**

- `operationsConfig` (Object):
  - `queries` (Object, optional): Query fields
  - `mutations` (Object, optional): Mutation fields
  - `subscriptions` (Object, optional): Subscription fields

**Returns:** `string` - Operations SDL

##### `addPaginationTypesSDL(paginationConfig)`

Generate SDL for Relay-style pagination types.

**Parameters:**

- `paginationConfig` (Object): Pagination configuration

**Returns:** `string` - Pagination types SDL (Connection, Edge, PageInfo)

##### `enhanceUnionDescriptions(sdl, unionsMap)`

Enhance union type descriptions in SDL.

**Parameters:**

- `sdl` (string): GraphQL SDL
- `unionsMap` (Map<string, Object>): Map of union name to config

**Returns:** `string` - Enhanced SDL with union descriptions

##### `applyScalarFieldReplacements(sdl, scalarFieldMap)`

Replace field types with custom scalars based on x-graphql-scalar hints.

**Parameters:**

- `sdl` (string): GraphQL SDL
- `scalarFieldMap` (Map<string, string>): Map of field path to scalar type

**Returns:** `string` - SDL with scalar replacements applied

##### `applyRequiredFieldNonNull(sdl, requiredFieldMap)`

Apply NonNull wrappers to fields based on x-graphql-required hints.

**Parameters:**

- `sdl` (string): GraphQL SDL
- `requiredFieldMap` (Map<string, boolean>): Map of field path to required flag

**Returns:** `string` - SDL with NonNull wrappers applied

##### `collectSchemaHintMeta(schema)`

Collect metadata about all x-graphql-\* extensions in a schema.

**Parameters:**

- `schema` (Object): JSON Schema object

**Returns:** `Object` - Metadata summary

- `scalarCount` (number): Number of custom scalars
- `enumCount` (number): Number of enums
- `unionCount` (number): Number of unions
- `operationCount` (number): Number of operations
- `paginationEnabled` (boolean): Whether pagination is configured

---

## Usage Examples

### Complete Interop Pipeline

```javascript
import { runInteropGeneration } from "./scripts/generate-schema-interop.mjs";
import { validateFiles } from "./scripts/validate-schema.mjs";
import { validateParity } from "./scripts/validate-graphql-vs-jsonschema.mjs";
import { validateSync } from "./scripts/validate-schema-sync.mjs";
import fs from "fs/promises";

async function fullPipeline() {
  // Step 1: Validate source schemas
  console.log("Validating source schemas...");
  const validationResults = await validateFiles();
  if (validationResults.totalErrors > 0) {
    throw new Error("Schema validation failed");
  }

  // Step 2: Generate all artifacts
  console.log("Generating interop artifacts...");
  const outputs = await runInteropGeneration({
    verbose: true,
    skipV2: false,
  });
  console.log("Generated:", outputs);

  // Step 3: Validate GraphQL ↔ JSON Schema parity
  console.log("Validating parity...");
  const sdl = await fs.readFile(
    "generated-schemas/schema_unification.supergraph.graphql",
    "utf8",
  );
  const jsonSchema = JSON.parse(
    await fs.readFile("src/data/schema_unification.schema.json", "utf8"),
  );
  const parityResults = await validateParity(sdl, jsonSchema);
  console.log("Parity check:", parityResults);

  // Step 4: Validate field name synchronization
  console.log("Validating field sync...");
  const syncResults = await validateSync({ verbose: true });
  if (syncResults.totalMismatches > 0) {
    console.warn("Field mismatches:", syncResults);
  }

  console.log("✅ Full pipeline complete!");
}

fullPipeline().catch(console.error);
```

### Custom System Schema Generation

```javascript
import { generateFromJSONSchema } from "./scripts/generate-graphql-from-json-schema.mjs";
import { validateFiles } from "./scripts/validate-schema.mjs";

async function generateCustomSystem(systemName) {
  const schemaPath = `src/data/${systemName}.schema.json`;

  // Validate the schema first
  const results = await validateFiles({
    schemaFile: schemaPath,
    files: [
      {
        name: `${systemName}.schema.json`,
        path: schemaPath,
        validateSchema: true,
      },
    ],
  });

  if (results.totalErrors > 0) {
    throw new Error(`${systemName} schema validation failed`);
  }

  // Generate GraphQL SDL
  const outputPath = await generateFromJSONSchema({
    schemaPath,
    outputBaseName: systemName,
    includeFederationDirectives: true,
  });

  console.log(`Generated ${systemName} SDL:`, outputPath);
  return outputPath;
}

// Generate legacy_procurement system SDL
generateCustomSystem("legacy_procurement").catch(console.error);
```

### Case Conversion Workflow

```javascript
import {
  camelToSnake,
  snakeToCamel,
  convertObjectKeys,
} from "./scripts/helpers/case-conversion.mjs";

// Convert API response from camelCase to snake_case for storage
const apiResponse = {
  contractId: "12345",
  vendorInfo: {
    companyName: "Acme Corp",
    contactEmail: "contact@acme.com",
  },
};

const dbRecord = convertObjectKeys(apiResponse, camelToSnake);
// {
//   contract_id: '12345',
//   vendor_info: {
//     company_name: 'Acme Corp',
//     contact_email: 'contact@acme.com'
//   }
// }

// Convert database record from snake_case to camelCase for API response
const apiOutput = convertObjectKeys(dbRecord, snakeToCamel);
```

---

## Testing

All exported functions have comprehensive unit tests in `__tests__/` directory:

- **Generators:** `__tests__/scripts/generators/`
- **Validators:** `__tests__/scripts/validators/`
- **Helpers:** `__tests__/helpers/`

Run tests:

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test __tests__/scripts/generators/generate-graphql-from-json-schema.test.mjs

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test:watch
```

Current test coverage: **44.24%** overall (215 passing tests)

- Generators: 65 tests
- Validators: 29 tests
- Helpers: 73 tests (88.88% coverage)

---

## Related Documentation

- [Scripts Overview](./README.md) - High-level overview and CLI commands
- [Schema Pipeline Guide](../docs/schema-pipeline-guide.md) - Workflow and architecture
- [Schema V1 vs V2 Guide](../docs/schema-v1-vs-v2-guide.md) - Version differences
- [Schema Tooling Reference](../docs/schema-tooling-reference.md) - Tool descriptions

---

**Last Updated:** December 2024  
**Maintainer:** Development Team
