# JSON Schema vs GraphQL SDL: Feature Comparison for Canonical Documentation

## Comparison Table: Feature Loss in Transformation

| Feature Category | JSON Schema → GraphQL | GraphQL → JSON Schema | Impact Assessment |
|-----------------|---------------------|---------------------|-------------------|
| **Type Definitions** | ✅ Fully Preserved | ✅ Fully Preserved | Both handle object types, primitives, arrays |
| **Field Descriptions** | ✅ Maps to descriptions | ⚠️ Limited to `description` field | GraphQL has richer inline documentation |
| **Required Fields** | ✅ `required[]` → `!` | ✅ `!` → `required[]` | Direct mapping possible |
| **Enumerations** | ✅ `enum` → `enum` | ✅ `enum` → `enum` with `type: string` | Slight semantic difference |
| **Union Types** | ⚠️ `oneOf` → `union` (complex) | ✅ `union` → `oneOf` | JSON Schema more verbose |
| **Interface Types** | ❌ No direct equivalent | ⚠️ Becomes shared properties | Loss of polymorphism |
| **Custom Scalars** | ❌ Only format hints | ⚠️ Becomes string with format | GraphQL more expressive |
| **Field Arguments** | ❌ Not applicable | ❌ Lost completely | Only relevant for operations |
| **Directives** | ❌ No equivalent | ❌ Lost completely | Metadata loss |
| **Query/Mutation/Subscription** | ❌ No equivalent | ❌ Lost completely | Operations not data |
| **Input Types** | ⚠️ Regular schemas | ⚠️ Becomes regular object | Semantic difference lost |
| **Relationships** | ⚠️ Via `$ref` only | ✅ Can use `$ref` | GraphQL more explicit |
| **Nullability** | ✅ Via `required` | ✅ Explicit with `!` | GraphQL clearer |
| **Default Values** | ✅ `default` property | ⚠️ Directive-based | JSON Schema clearer |
| **Validation Rules** | ✅ Rich constraints | ❌ Very limited | JSON Schema superior |
| **Pattern Matching** | ✅ `pattern` property | ❌ No equivalent | JSON Schema advantage |
| **Numeric Constraints** | ✅ min/max/multiple | ❌ No equivalent | JSON Schema advantage |
| **Array Constraints** | ✅ minItems/maxItems | ❌ Limited to type | JSON Schema richer |
| **Conditional Logic** | ✅ if/then/else | ❌ No equivalent | JSON Schema advantage |
| **Inheritance** | ⚠️ Via allOf | ✅ Via interfaces | Different paradigms |
| **Deprecation** | ⚠️ Via custom field | ✅ `@deprecated` | GraphQL clearer |
| **Examples** | ✅ `examples` array | ⚠️ In descriptions | JSON Schema structured |

## Detailed Analysis

### Advantages of JSON Schema as Canonical

1. **Richer Validation**
   - Pattern matching for strings
   - Numeric ranges and constraints
   - Array length constraints
   - Complex conditional validation

2. **Better for Data at Rest**
   - Natural fit for document validation
   - Widely supported by tools
   - Can validate JSON files directly

3. **More Flexible Structure**
   - Can model any JSON structure
   - Supports additional properties
   - Better for evolving schemas

4. **Comprehensive Documentation**
   - Examples per field
   - Detailed constraints visible
   - Format specifications

### Advantages of GraphQL SDL as Canonical

1. **Query Semantics**
   - Defines operations, not just data
   - Relationships are first-class
   - Better for API contracts

2. **Type System Features**
   - Interfaces for polymorphism
   - Union types are cleaner
   - Custom scalars with behavior

3. **Developer Experience**
   - More concise and readable
   - Better tooling for APIs
   - Clear nullability

4. **Operational Definitions**
   - Queries, mutations, subscriptions
   - Input vs output types
   - Arguments and variables

## Recommendation

Given your use case and the comparison highlights, I recommend **JSON Schema as the canonical source** with the following approach:

### Primary Reasons:

1. **Data-First Design**: Your schema primarily describes data structures, not API operations
2. **Validation Power**: JSON Schema's validation rules are critical for data quality
3. **Tool Investment**: You already have JSON Schema infrastructure in place
4. **Flexibility**: JSON Schema can model all your data requirements

### Implementation Strategy:

1. **Enhance Core Schema** (Priority 1)
   ```json
   {
     "x-graphql-metadata": {
       "schemaVersion": { "type": "string", "x-graphql-required": true },
       "lastModified": { "type": "string", "format": "date-time", "x-graphql-required": true }
     }
   }
   ```

2. **Add GraphQL-Specific Metadata** (Priority 2)
   ```json
   {
     "x-graphql-operations": {
       "queries": ["contract", "contracts"],
       "mutations": ["triggerDataIngestion"],
       "subscriptions": ["contractUpdated"]
     }
   }
   ```

3. **Enum Enhancement** (Priority 3)
   ```json
   {
     "ContactRole": {
       "type": "string",
       "enum": ["primary", "technical", "administrative", "contracting_officer"],
       "x-graphql-enum": {
         "additional": ["PROGRAM_MANAGER", "COR"],
         "transform": "UPPER_CASE"
       }
     }
   }
   ```

4. **Relationship Mapping** (Priority 4)
   ```json
   {
     "x-graphql-relationships": {
       "relatedContracts": {
         "type": "array",
         "items": { "$ref": "#/definitions/Contract" }
       }
     }
   }
   ```

5. **Union Type Pattern** (Priority 5)
   ```json
   {
     "SystemExtension": {
       "x-graphql-union": "SystemExtension",
       "oneOf": [
         { "$ref": "#/definitions/Contract DataExtension" },
         { "$ref": "#/definitions/AssistExtension" },
         { "$ref": "#/definitions/EasiExtension" }
       ]
     }
   }
   ```

### Benefits of This Approach:

1. **Single Source of Truth**: JSON Schema remains canonical
2. **Lossless Transformation**: Enhanced schema can generate complete GraphQL SDL
3. **Validation Preserved**: Keep all JSON Schema validation rules
4. **Tooling Compatible**: Works with existing JSON Schema tools
5. **Future-Proof**: Can evolve to support new requirements

### Migration Path:

1. Start with current JSON Schema
2. Add `x-graphql-*` extensions incrementally
3. Update generator to recognize extensions
4. Generate GraphQL SDL that matches curated version
5. Validate generated SDL against curated SDL
6. Deprecate manual SDL maintenance

This approach gives you the best of both worlds: JSON Schema's validation power as the canonical source, with enough metadata to generate a complete GraphQL schema that matches your curated version.

## comparison highlights
### Missing top-level surface area
- The generated artifact contains only domain objects; the curated SDL also defines `Query`, `Mutation`, `Subscription`, inputs, filters, sort types, analytics models, mutations, and quality/analytics types. These scaffolding types aren’t in the JSON Schema today, so the generator can’t emit them.
- Relationships (`relatedContracts`, `parentContract`, `analytics`, etc.) live only in the curated SDL; the JSON Schema has no equivalent structures to project.

### Core `Contract` differences
- Fields that are required in the curated SDL (`schemaVersion`, `lastModified`, `contacts`, `[SystemExtension!]!`, etc.) are optional in the generated copy because the JSON Schema doesn’t mark them `required`. Result: `String!` vs `String`, `[Contact!]!` vs `[Contact!]`.
- Entire sections are absent: vendor classifications (`vendorType`, `registrationStatus`, `businessSize`), performance periods, `qualityMetrics`, analytics blocks, and unionized extensions (flattened array of `SystemExtension`). Those objects are simply missing in the JSON Schema.

### Nested types
- `OrganizationInfo` in the generated SDL stops at departments; the curated SDL also models `organizationHierarchy`. The JSON Schema currently lacks that subtree.
- `FinancialInfo` excludes obligations/funding sources/payments; `BusinessClassification` omits `naicsDetails`/`pscDetails`; `ContractCharacteristics` lacks competition/security fields.
- System extensions: the generated SDL exposes a wrapper `SystemExtensions { contract_data legacy_procurement intake_process }` because the JSON Schema groups them. The curated SDL flattens to `[SystemExtension!]!`, and Contract Data types there include `projects`, `relatedPrograms`, `historicalIndex`—none of which exist in the JSON Schema.
- Assist/EASi specifics: the generated SDL stops at the basic attributes the JSON Schema documents; the curated SDL expects richer award data, templates, CLIN structures, and Contract Data field mappings.

### Enums and scalars
- `ContactRole` in JSON Schema has four lowercase values; the curated SDL enum has six uppercase entries (adds `PROGRAM_MANAGER`, `COR`). Same pattern for `ContractStatus` (canonical has `IN_PROGRESS`, `TERMINATED`, etc.).
- Scalars align (`Date`, `DateTime`, `Decimal`, `JSON`), but the generator doesn’t emit custom scalars like `JSON` descriptions.

## transformation updates to consider
1. **Enhance the JSON Schema (preferred long-term)**  
   Add missing properties/arrays to schema_unification.schema.json so the generator can emit richer types:
   - `systemMetadata.schemaVersion/lastModified` should be `required` if you want the GraphQL fields non-null.
   - Introduce structures for analytics, quality metrics, organization hierarchy, vendor classifications, financial obligations, etc., mirroring the curated SDL. The generator already supports nested pointers; once the schema has the data, map it in json-to-graphql.config.mjs.

2. **Extend the mapping config for union flattening**  
   To match `[SystemExtension!]!`, update the generator to:
   - Gather the three arrays under `/systemExtensions/*`, tag each element with its system, and concatenate into a single list.
   - Emit both the wrapper object (if you still need it for parity checks) and a flattened `systemExtensions: [SystemExtension!]!`. This likely means augmenting the generator to support “synthetic” fields that derive from multiple pointers.

3. **Handle enum enrichment**  
   Since JSON Schema enumerations are lowercase and incomplete, add an `extraValues` option in the enum config or post-process to inject canonical values (`PROGRAM_MANAGER`, `COR`, `IN_PROGRESS`, `TERMINATED`). That keeps the generated SDL closer to the authoritative one even if the JSON schema isn’t updated immediately.

4. **Non-null overrides**  
   When the curated SDL keeps a field non-null but the JSON Schema doesn’t require it, add `allowOptionalNonNull: true` (or similar) per field so the generator can emit `!` without flagging a warning. Alternatively, mark those properties as `required` in the JSON Schema.

5. **Synthetic types for GraphQL-only constructs**  
   Decide whether the generated SDL should grow query/mutation scaffolding. If yes, you could teach the generator to inject static definitions (outside of JSON pointers) so reviewers can diff everything in one place. This keeps the generated file self-contained when comparing to the canonical schema.

6. **Documentation follow-up**  
   Capture these gaps in schema-pipeline.md so future contributors know which differences are intentional versus backlog items.

With these adjustments, each regeneration will produce an SDL that more closely mirrors schema_unification.graphql, making diffs far more actionable and spotlighting the remaining deltas that still need schema or config work. Let me know which areas you’d like to tackle first and I can help wire up the config changes.