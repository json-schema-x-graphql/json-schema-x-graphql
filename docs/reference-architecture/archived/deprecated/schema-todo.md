> **⚠️ ARCHIVED DOCUMENTATION**
>
> This document has been archived and is preserved for historical reference only.
>
> See instead: [Schema Pipeline Guide](../../schema-pipeline-guide.md) and [System Mappings Guide](../../system-mappings-guide.md)
>
> Archived: December 2024  
> Reason: Superseded by consolidated pipeline & mappings guides
Capturing what we need to do to keep a JSON Schema authoritative while reliably generating a high-fidelity GraphQL SDL.

## roadmap at a glance
1. Establish source of truth and auto-generation boundaries.  
2. Close schema coverage gaps so SDL parity is fintake_processble.  
3. Enhance the generator to express richer GraphQL constructs.  
4. Wire validation + CI guards to catch drift early.  
5. Document ownership and operational playbooks.

## 1. Authoritative source & artifacts
- **Declare JSON Schema as canonical** in an ADR/README note, with GraphQL SDL marked as derived.
- **Inventory required downstream artifacts**: generated SDL, GraphQL introspection JSON, TypeScript types, etc.
- **Define an automated pipeline** (`pnpm run generate:schema:interop`) as the only supported regeneration path; block manual edits to generated files via `.gitattributes` or lint checks.

## 2. Expand JSON Schema coverage
- **Gap analysis**: diff canonical SDL vs generated SDL and list missing fields/objects/enums (organization hierarchy, analytics, CLIN data, etc.).
- **Schema updates**: add the missing structures to schema_unification.schema.json. For required GraphQL fields (`String!`), mark them `"required"` in JSON Schema; add enum values to match GraphQL (uppercased or via metadata).
- **Schema modularization**: consider splitting the monolith into definitions files or using `$ref`s to keep it maintainable as it grows.
- **Metadata for non-structural cues**: if some GraphQL features (unions, interface semantics, directives) aren’t expressible in JSON Schema, encode hints in `x-graphql-*` custom keywords to guide generation.

## 3. Generator enhancements
- **Config-driven mapping** (json-to-graphql.config.mjs): keep types/enums/union definitions declarative. Add:
  - Non-null overrides (`forceNonNull`, `allowOptionalNonNull`).
  - Synthetic fields aggregating multiple JSON pointers (flattening system extensions).
  - Support for interface/union flattening, default field descriptions, custom scalars.
- **Enum enrichment**: allow extra values or casing transforms; optionally read from schema annotations.
- **Query/mutation scaffolding**: inject static definitions or read from a supplemental YAML to emit operation types, inputs, and enums not present in the JSON Schema.
- **Warnings-as-errors toggle**: fail generation if expected schema pointers disappear.

## 4. Validation & CI
- **Local checks**: extend `validate:schema`, `validate:graphql`, `validate:sync` to include:
  - JSON Schema linting (Ajv strict mode).
  - GraphQL SDL diff vs regenerated file (ensure checked-in reflects latest generation).
  - Pointer mapping coverage (every GraphQL field has a JSON pointer).
- **CI pipeline**: add a workflow step that runs generation + validation; fail if diffs aren’t committed or validation errors arise.
- **Test fixtures**: maintain representative JSON samples to assert both JSON Schema and SDL accept/validate them.

## 5. Documentation & governance
- **Playbook** (schema-pipeline.md):
  - How to add a field (edit JSON Schema → run generator → run validations).
  - How to extend mapping config and interpret warnings.
  - Known limitations / backlog items.
- **Change log**: record schema-breaking vs additive changes.
- **Ownership**: assign review responsibilities; ensure PR template includes “regenerated artifacts?” checklist.
- **Release process**: for versioned schemas, tag releases and publish generated SDL alongside the JSON Schema.

## follow-up backlog
- Automate publishing of schema + SDL artifacts (e.g., GitHub release asset).
- Explore generating TypeScript types or clients alongside SDL for consistency.
- Consider schema evolution tooling (OpenAPI-like diffing) to flag breaking JSON Schema updates before they propagate to GraphQL.

With this plan, contributors update the JSON Schema first, rerun the generator, and the validations/CI guardrails ensure the SDL stays aligned and production-ready.

- [ ] **Restore top-level operations**
  - [ ] Model query/mutation/subscription types (contract search, analytics, quality, reference data) in JSON Schema or a sidecar config so the generator can emit `Query`, `Mutation`, `Subscription`, plus all related input/filter/pagination types.
  - [ ] Add schema entries for shared enums (`SortDirection`, `ContractSortField`, `AnalyticsGroupBy`, `TimeGranularity`, etc.) and wire them into the generator’s enum configs.

- [ ] **Match `Contract` surface**
  - [ ] Mark `schemaVersion`, `lastModified`, `systemChain`, `contacts`, `statusInfo`, `qualityMetrics`, `relatedContracts`, `analytics`, etc., as required or optional to match `!` semantics.
  - [ ] Extend JSON Schema with missing sections: `qualityMetrics`, `relatedContracts`, `parentContract`, `childContracts`, `analytics`.
  - [ ] Ensure `systemExtensions` can flatten to `[SystemExtension!]!` rather than nested `{ contract_data, legacy_procurement, intake_process }`.

- [ ] **Fill nested object gaps**
  - [ ] Organization tree: add `organizationHierarchy`, with IDs, parents, and child arrays.
  - [ ] Vendor info: include `vendorType`, `socioEconomicCategories`, `registrationStatus`, `businessSize`.
  - [ ] Place of performance: introduce `coordinates`.
  - [ ] Financial info: add `obligations`, `fundingSources`, `paymentHistory`.
  - [ ] Business classification: include nested GraphQL types (`NAICSCode`, `PSCCode`, `SizeStandards`).
  - [ ] Contract characteristics: add `competitionType`, `contractVehicle`, `securityRequirements`, `includesCui`, `recurring*`.
  - [ ] Status info: include `periodOfPerformance`, `PerformancePeriod`, `OptionPeriod`.

- [ ] **System extensions parity**
  - [ ] Contract Data: add `projects`, `relatedPrograms`, `historicalIndex`, richer `AssistanceType` structure (including `parent`, `children`, `elementId`).
  - [ ] Assist: restore `AssistTemplate`, full `AssistAwardData` numeric/boolean fields.
  - [ ] Intake Process: add `clinData`, `contract_dataFieldMappings`, nested `CLINData`, `CLINType` enum.

- [ ] **Analytics and quality models**
  - [ ] Introduce JSON Schema definitions for `ContractQualityMetrics`, `QualityIssue`, `QualityTrend`, `QualityIssueCategory`, etc.
  - [ ] Add `ContractAnalytics`, `CompetitionMetrics`, `PerformanceMetrics`, `TrendAnalysis`, `SeasonalPattern`, `ForecastProjection`.

- [ ] **Enum alignment**
  - [ ] Update JSON Schema enums to include every GraphQL value (e.g., `ContractStatus` adds `IN_PROGRESS`, `TERMINATED`; `ContactRole` adds `PROGRAM_MANAGER`, `COR`), or extend generator config to inject missing values.
  - [ ] Ensure enum casing matches the GraphQL upper-case style; document transformation rules.

- [ ] **Generator improvements**
  - [ ] Enhance json-to-graphql.config.mjs to support flattening `systemExtensions` into a union-typed array.
  - [ ] Allow per-field overrides to force non-null (`forceNonNull`) when JSON Schema can’t mark it required yet.
  - [ ] Support synthetic fields/types for GraphQL-only constructs (operations, connections) via supplemental config.

- [ ] **Validation + CI**
  - [ ] Update `validate:sync` strict config to cover all new mappings.
  - [ ] Fail CI when generated SDL differs from checked-in canonical SDL or when a mapped pointer is missing.

- [ ] **Documentation**
  - [ ] Capture this parity backlog in schema-pipeline.md (status column per section).
  - [ ] Add guidance for updating JSON Schema and generator together to avoid drift.


  ```graphql
  johnhjediny@FCOH2J-V23VQ05P enterprise-schema-unification % diff -u src/data/schema_unification.graphql generated-schemas/petrif
ied.from-json.graphql | head -n 200
--- src/data/schema_unification.graphql  2025-10-03 08:38:04
+++ generated-schemas/schema_unification.from-json.graphql       2025-10-03 14:51:59
@@ -1,570 +1,181 @@
-# Common Core GraphQL Schema
-# Version 2.0 - Government Contract Management Integration
+# Auto-generated from src/data/schema_unification.schema.json. Do not edit manually.
 
-scalar DateTime
 scalar Date
-scalar JSON
+scalar DateTime
 scalar Decimal
+scalar JSON
 
-# Root Query Type
-type Query {
-  # Contract Queries
-  contract(id: ID!): Contract
-  contracts(
-    filter: ContractFilter
-    pagination: PaginationInput
-    sort: [ContractSortInput!]
-  ): ContractConnection!
-
-  # System-Specific Queries
-  contract_dataPrograms(filter: Contract DataFilter): [Contract DataProgram!]!
-  legacy_procurementContracts(filter: AssistFilter): [AssistContract!]!
-  intake_processContracts(filter: EasiFilter): [EasiContract!]!
-
-  # Analytics and Reporting
-  contractAnalytics(
-    timeRange: TimeRangeInput!
-    groupBy: [AnalyticsGroupBy!]!
-  ): [AnalyticsResult!]!
-
-  # Data Quality and Monitoring
-  dataQualityMetrics(
-    systemName: SystemType
-    timeRange: TimeRangeInput
-  ): DataQualityMetrics!
-
-  # Reference Data
-  agencies: [Agency!]!
-  naicsCodes(search: String): [NAICSCode!]!
-  pscCodes(search: String): [PSCCode!]!
-}
-
-# Mutations for data operations
-type Mutation {
-  # Data ingestion triggers
-  triggerDataIngestion(input: IngestionTriggerInput!): IngestionResult!
-
-  # Data quality operations
-  runQualityCheck(input: QualityCheckInput!): QualityCheckResult!
-
-  # Manual data corrections
-  correctContractData(input: ContractCorrectionInput!): Contract!
-}
-
-# Subscriptions for real-time updates
-type Subscription {
-  # Real-time data quality updates
-  qualityMetricsUpdated(systemName: SystemType): DataQualityMetrics!
-
-  # Contract data changes
-  contractUpdated(contractId: ID!): Contract!
-
-  # System health monitoring
-  systemHealthUpdated: SystemHealth!
-}
-
-# Input Types for Filtering and Pagination
-input ContractFilter {
-  piid: String
-  piidContains: String
-  contractingAgencyCode: String
-  fundingAgencyCode: String
-  vendorName: String
-  vendorUei: String
-  contractValue: DecimalRange
-  fiscalYear: String
-  fiscalYearRange: [String!]
-  status: ContractStatus
-  isActive: Boolean
-  primarySystem: SystemType
-  dateRange: DateRangeInput
-  naicsCode: String
-  pscCode: String
-  setAsideType: String
-  emergencyAcquisition: Boolean
-  qualityScoreMin: Float
-}
-
-input DecimalRange {
-  min: Decimal
-  max: Decimal
-}
-
-input DateRangeInput {
-  startDate: Date!
-  endDate: Date!
-}
-
-input PaginationInput {
-  first: Int
-  after: String
-  last: Int
-  before: String
-}
-
-input ContractSortInput {
-  field: ContractSortField!
-  direction: SortDirection!
-}
-
-enum ContractSortField {
-  PIID
-  CONTRACT_VALUE
-  AWARD_DATE
-  LAST_MODIFIED
-  VENDOR_NAME
-  AGENCY_NAME
-  QUALITY_SCORE
-}
-
-enum SortDirection {
-  ASC
-  DESC
-}
-
-type ContractConnection {
-  edges: [ContractEdge!]!
-  pageInfo: PageInfo!
-  totalCount: Int!
-}
-
-type ContractEdge {
-  node: Contract!
-  cursor: String!
-}
-
-type PageInfo {
-  hasNextPage: Boolean!
-  hasPreviousPage: Boolean!
-  startCursor: String
-  endCursor: String
-}
-
-# System-Specific Filter Inputs
-input Contract DataFilter {
-  programNumber: String
-  programNumberContains: String
-  legacy_procurementanceType: String
-  isActive: Boolean
-  isFunded: Boolean
-  publishedAfter: DateTime
-  objectiveContains: String
-}
-
-input AssistFilter {
-  originalAwardPiid: String
-  iaPiidOrUniqueId: String
-  natureOfAcquisition: String
-  clientOrganizationName: String
-  agencyCode: String
-  templateName: String
-  totalContractValueRange: DecimalRange
-}
-
-input EasiFilter {
-  piid: String
-  businessOwner: String
-  systemOwner: String
-  unitPriceRange: DecimalRange
-  clinType: CLINType
-  hasCurrentClins: Boolean
-}
-
-input TimeRangeInput {
-  startDate: DateTime!
-  endDate: DateTime!
-  granularity: TimeGranularity
-}
-
-enum TimeGranularity {
-  HOUR
-  DAY
-  WEEK
-  MONTH
-  QUARTER
-  YEAR
-}
-
-enum AnalyticsGroupBy {
-  FISCAL_YEAR
-  AGENCY
-  VENDOR
-  NAICS_CODE
-  PSC_CODE
-  CONTRACT_TYPE
johnhjediny@FCOH2J-V23VQ05P enterprise-schema-unification % diff -u src/data/schema_unification.graphql generated-schemas/petrif
ied.from-json.graphql | tail -n 200
 
+type AssistOfficeAddress {
+  streetAddress1: String
+  city: String
+  state: String
+}
+
 type AssistAwardData {
   typeOfIdc: String
   whoCanUseIdc: String
-  independentGovernmentEstimate: Decimal
-  totalContractValue: Decimal
-  naicsCode: String
-  pscCode: String
-  emergencyAcquisition: String
-  governmentFurnishedProperty: Boolean
-  includesCui: Boolean
-  recurringService: Boolean
-  recurringUtilities: Boolean
-  setAsideForLocalFirms: Boolean
 }
 
-type AssistTemplate {
-  templateName: String!
-  templateVersion: String!
-  processedDate: DateTime!
-  recordCount: Int!
-}
-
 type EasiExtension {
-  fieldName: String!
-  fieldType: String!
+  fieldName: String
+  fieldType: String
   value: JSON
-  intake_processSpecific: EasiSpecificData!
+  intake_processSpecific: EasiSpecificData
 }
 
 type EasiSpecificData {
+  """
+  EASi Business Owner
+  """
   businessOwner: String
+  """
+  EASi System Owner
+  """
   systemOwner: String
+  """
+  Unit Price field available at the CLIN level
+  """
   unitPrice: Decimal
+  """
+  Unit of Measure field available at the CLIN level
+  """
   unitOfMeasure: String
+  """
+  Option Period or Not Applicable
+  """
   optional: String
+  """
+  Not to Exceed field
+  """
   notToExceed: String
+  """
+  Maps to Qualifier field at CLIN level
+  """
   notSeparatelyPriced: String
-  clinData: [CLINData!]!
-  contract_dataFieldMappings: [Contract DataFieldMapping!]!
 }
 
-type CLINData {
-  clinNumber: String!
-  clinType: CLINType!
-  unitPrice: Decimal
-  quantity: Int
-  extendedAmount: Decimal!
-  performancePeriod: PerformancePeriod
-  optional: String
-  notToExceed: String
-  notSeparatelyPriced: Boolean!
-}
-
-enum CLINType {
-  QUANTITY_BASED
-  DOLLAR_BASED
-  NOT_SEPARATELY_PRICED
-}
-
-type Contract DataFieldMapping {
-  intake_processFieldName: String!
-  contract_dataFieldName: String!
-  mappingRule: String!
-  transformationApplied: String
-}
-
-# Quality Metrics
-type ContractQualityMetrics {
-  overallScore: Float!
-  completenessScore: Float!
-  validityScore: Float!
-  consistencyScore: Float!
-  timelinessScore: Float!
-  enrichmentScore: Float!
-  certificationLevel: QualityCertificationLevel!
-  analyticsReadiness: AnalyticsReadiness!
-  qualityIssues: [QualityIssue!]!
-  lastQualityCheck: DateTime!
-}
-
-enum QualityCertificationLevel {
-  PREMIUM
-  CERTIFIED
-  STANDARD
-  BASIC
-}
-
-enum AnalyticsReadiness {
-  READY
-  CONDITIONAL
-  NOT_READY
-}
-
-type QualityIssue {
-  issueId: ID!
-  severity: QualitySeverity!
-  category: QualityIssueCategory!
-  fieldName: String
-  description: String!
-  recommendation: String
-  detectedAt: DateTime!
-}
-
-enum QualityIssueCategory {
-  NULL_VALUE
-  FORMAT_ERROR
-  RANGE_VIOLATION
-  CONSISTENCY_ERROR
-  BUSINESS_RULE_VIOLATION
-  REFERENCE_DATA_MISSING
-}
-
-# Contract Analytics
-type ContractAnalytics {
-  totalValue: Decimal!
-  averageActionValue: Decimal
-  contractDurationDays: Int
-  totalActions: Int!
-  uniqueVendors: Int!
-  competitionMetrics: CompetitionMetrics!
-  performanceMetrics: PerformanceMetrics!
-  trendAnalysis: TrendAnalysis!
-}
-
-type CompetitionMetrics {
-  competitionType: CompetitionType!
-  competitorCount: Int
-  winRate: Float
-  averageBidAmount: Decimal
-}
-
-type PerformanceMetrics {
-  onTimeDeliveryRate: Float
-  budgetVariance: Float
-  qualityRating: Float
-  customerSatisfaction: Float
-}
-
-type TrendAnalysis {
-  valueGrowthRate: Float
-  volumeGrowthRate: Float
-  seasonalPatterns: [SeasonalPattern!]!
-  forecastProjections: [ForecastProjection!]!
-}
-
-type SeasonalPattern {
-  period: String!
-  averageValue: Decimal!
-  volumeCount: Int!
-  trend: TrendDirection!
-}
-
-enum TrendDirection {
-  INCRIntake ProcessNG
-  DECRIntake ProcessNG
-  STABLE
-  VOLATILE
-}
-
-type ForecastProjection {
-  periodEnd: Date!
-  projectedValue: Decimal!
-  confidence: Float!
-  methodology: String!
-}
+"""
+System-specific extensions projected from the normalized schema.
+"""
+union SystemExtension = Contract DataExtension | AssistExtension | EasiExtension
```