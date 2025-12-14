# System Mappings Guide (Placeholder Draft)

Status: Draft  
Audience: Engineers & Data Integrators working on Schema Unification Forest schema ingestion, transformation, and cross-system interoperability.

This guide documents how Schema Unification Forest (PF) maps fields, concepts, and record structures across external procurement-related systems. It is a consolidation of prior scattered mapping notes and implementation logs. Once finalized, this will become the authoritative reference for cross-system alignment.

Related docs:
- `../schema/schema-pipeline-guide.md` — How schemas are generated and validated
- `../schema/schema-v1-vs-v2-guide.md` — Canonical naming + architectural differences
- `../schema/x-graphql-hints-guide.md` — Carrying GraphQL semantics in JSON Schema
- `../external/README.md` — High-level descriptions and API endpoints
- `../schema/schema-tooling-reference.md` — Tooling & pipeline overview
- `../examples/validator-usage.md` — Live validator usage examples

## Table of contents

- [1. Purpose](#1-purpose)
- [2. Scope](#2-scope)
- [3. Canonical Schema Alignment Principles](#3-canonical-schema-alignment-principles)
- [4. Mapping Strategy Overview](#4-mapping-strategy-overview)
- [5. Field Mapping Table (Illustrative)](#5-field-mapping-table-illustrative)
- [6. Transform Rules (Patterns)](#6-transform-rules-patterns)
- [7. Enum Harmonization (Placeholder)](#7-enum-harmonization-placeholder)
- [8. Derived Fields (Examples)](#8-derived-fields-examples)
- [9. Provenance & Auditing (Planned)](#9-provenance--auditing-planned)
- [10. Validation & Parity Checks](#10-validation--parity-checks)
- [11. Versioning & Change Management](#11-versioning--change-management)
- [12. Implementation Checklist (Placeholder)](#12-implementation-checklist-placeholder)
- [13. Future Enhancements (Roadmap Draft)](#13-future-enhancements-roadmap-draft)
- [14. FAQ (Initial Placeholder)](#14-faq-initial-placeholder)
- [15. Contributing](#15-contributing)
- [16. Changelog](#16-changelog)
- [17. Next Steps (for this Placeholder)](#17-next-steps-for-this-placeholder)

---

## 1. Purpose

Cross-system mappings provide:
1. Consistent canonical field naming (snake_case) in PF JSON Schema.
2. Deterministic transformation rules from raw source to curated schema.
3. Traceability for regulatory & audit alignment (e.g., Contract Data acquisition fields).
4. A basis for parity validation (ensuring no silent data loss).
5. A reference for implementing new ingestion connectors or backfills.

---

## 2. Scope

Included systems (initial iteration):
- Contract Data (Federal Procurement Data System)
- Legacy Procurement (Assisted Search / internal enriched dataset)
- EASi (Easy Acquisition System Interface)

Future candidates (to be documented in `../external/README.md`):
- Entity Management.gov entity extracts
- Treasury fiscal endpoints
- Delta Lake warehoused aggregates

---

## 3. Canonical Schema Alignment Principles

| Principle | Description | Example |
|-----------|-------------|---------|
| Snake case canonical | All PF JSON Schema properties use `snake_case`. | `place_of_performance` |
| Stable semantic keys | Prefer field names describing business meaning, not source technical naming. | `vendor_duns` over `DUNSNumber` |
| Source neutrality | PF fields do not embed source prefixes (avoid `contract_data_*`). | Use `award_amount` across sources |
| Explicit enumerations | Normalize external code lists to PF enums (with `x-graphql-enum`). | Status codes: `ACTIVE`, `INACTIVE`, `PENDING` |
| Provenance tracking | Add metadata linking PF field to source field(s). | `x-origin-sources: ["Contract Data:contractActionID"]` (planned extension) |
| Minimal lossy transforms | Avoid dropping precision/timezone or collapsing structured objects. | Preserve nested `vendor_info.address` |

---

## 4. Mapping Strategy Overview

1. Source raw payload → Raw staging JSON.
2. Normalization phase:
   - Key renaming (camelCase / PascalCase → snake_case).
   - Data type coercion (stringified numerics → numbers).
   - Enum harmonization (code → descriptive label).
   - Date-time standardization (convert to ISO 8601 UTC where fintake_processble).
3. Semantic enrichment:
   - Derived fields (e.g., `is_competed` from multiple Contract Data flags).
   - Aggregations (e.g., `total_obligated_amount`).
4. Validation:
   - Structural: conforms to PF JSON Schema.
   - Cross-field invariants (e.g., obligated ≤ awarded).
5. Publication:
   - Stored under canonical `schema_unification.schema.json` lineage.
   - GraphQL generation with hints for unions/interfaces.
6. Parity checks:
   - `validate-schema-sync.mjs` ensures GraphQL field coverage.
   - Custom diff scripts (planned) assert expected mapping completeness.

---

## 5. Field Mapping Table (Illustrative)

| PF Field | Contract Data Source | Legacy Procurement Source | EASi Source | Transform Notes | Enum? | Required? |
|----------|-------------|---------------|-------------|----------------|-------|----------|
| `piid` | `contractActionID` | `contractActionID` | `piid` | Direct copy; trimmed whitespace | No | Yes |
| `award_amount` | `dollarValue` | `obligatedAmount` | `awardAmount` | Coerce to number; prefer obligated if award missing | No | Yes |
| `vendor_duns` | `vendor.dunsNumber` | `vendor.duns` | `supplier.duns` | Normalize length (9/13), pad if needed | No | Conditional |
| `vendor_name` | `vendor.vendorName` | `vendor.name` | `supplier.legalName` | Title-case normalization | No | Yes |
| `place_of_performance_country` | `placeOfPerformance.countryCode` | `place.country` | `performance.countryCode` | ISO 3166 validation; map codes | Yes (CountryCode) | Yes |
| `place_of_performance_state` | `placeOfPerformance.stateCode` | `place.state` | `performance.state` | Uppercase; FIPS validation pre-step | Yes (StateCode) | No |
| `naics_code` | `principalNAICSCode` | `naics.primary` | `classification.naics` | Keep as string; ensure 6-digit | Yes (NAICSCode) | Yes |
| `psc_code` | `productOrServiceCode` | `psc.code` | `classification.psc` | Uppercase; crosswalk to category | Yes (PSCCode) | No |
| `award_date` | `signedDate` | `award.signedDate` | `award.date` | Convert to UTC ISO string | No | Yes |
| `is_competed` | Flags: `extentCompeted`, `solicitationProcedures` | `competition.isCompeted` | `procurement.competitionType` | Derived boolean logic | No | Yes |
| `vendor_info` | Composite vendor object | Composite vendor object | Composite supplier object | Merge & prioritize non-null nested fields | No (object) | Yes |

(Actual table will be expanded with full set and moved into a machine-readable artifact—e.g., `resources/mappings/system-field-mapping.json`.)

---

## 6. Transform Rules (Patterns)

| Rule | Description | Example |
|------|-------------|---------|
| Numeric coercion | Strings of digits converted to numbers; fall back to 0 only if semantically safe. | `"100000"` → `100000` |
| Null consolidation | Multiple candidate sources merged; first non-null wins. | `vendor_name` from Contract Data → Legacy Procurement → EASi |
| Enum normalization | External code sets mapped to PF enum stable names (GraphQL-friendly). | `"A"` → `AWARD` |
| Temporal normalization | Dates converted to ISO 8601 UTC; store original in metadata if needed. | `"2024-07-01T13:05:00-05:00"` → `"2024-07-01T18:05:00Z"` |
| Boolean derivation | Derived from multi-flag logic, ensure explicit True/False (no null). | `is_competed` |
| Structured flattening | Only flatten when nested object carries no additional semantics. | Single-key wrappers |
| Code crosswalk | PSC/NAICS codes linked to category descriptions. | `541330` → `Engineering Services` |

---

## 7. Enum Harmonization (Placeholder)

Each external system may use proprietary or legacy codes. PF centralizes them:

| PF Enum | External Codes | Notes |
|---------|----------------|-------|
| `CountryCode` | ISO codes (Contract Data), internal abbreviations (Legacy Procurement) | Validate via allowlist |
| `StateCode` | USPS / FIPS | FIPS conversion pre-step optional |
| `NAICSCode` | 2–6 digit numeric | Zero-pad to 6 digits |
| `PSCCode` | 4-character alphanumeric | Uppercase canonical |
| `CompetitionStatus` | Contract Data/Legacy Procurement flags | Derived: `COMPETED`, `NOT_COMPETED`, `UNKNOWN` |

`x-graphql-enum` extension is used to attach descriptions, deprecation reasons, and stable GraphQL naming.

---

## 8. Derived Fields (Examples)

| Field | Inputs | Logic |
|-------|--------|-------|
| `is_competed` | `extentCompeted`, `solicitationProcedures` | Combined rule set (documented in future logic appendix) |
| `total_obligated_amount` | Award + modifications list | Sum numeric values; exclude negative adjustments flagged as corrections |
| `vendor_is_small_business` | Size standard, socio-economic codes | Evaluate multi-code set per SBA guidance |
| `place_of_performance_geo` | Country/state/city/postal | Construct normalized geocode object; potential geospatial indexing |

---

## 9. Provenance & Auditing (Planned)

Planned extension keys (placeholder, not yet implemented):

| Extension | Purpose | Example |
|-----------|---------|---------|
| `x-origin-sources` | List of source field strings used to derive value | `["Contract Data:contractActionID", "Intake Process:piid"]` |
| `x-transform-rule` | Machine identifier for applied transform | `"derivation:is_competed:v1"` |
| `x-original-value` | Storage of original raw value (when lossy transform applied) | `"2024-07-01T13:05:00-05:00"` |
| `x-quality-flags` | Indicators for data quality checks | `["range_valid", "format_normalized"]` |

---

## 10. Validation & Parity Checks — see [Validator Usage Examples](../examples/validator-usage.md)

Validation layers:
1. Structural Ajv validation (`validate-schema.mjs`).
2. GraphQL SDL build + optional sample validation (`validate-graphql-vs-jsonschema.mjs`).
3. Name parity and strict pointer mapping (`validate-schema-sync.mjs`).
4. Planned: transform rule coverage audit (ensuring all required derived fields executed).
5. Python supplemental cross-checks (sanity & edge cases).

---

## 11. Versioning & Change Management

| Aspect | Strategy |
|--------|----------|
| Mapping version | Increment semantic version in `resources/mappings/` artifact when fields added/removed |
| Backward compatibility | Deprecate enum values via `@deprecated` before removal |
| Field removals | Mark with `x-graphql-deprecated` (planned) + maintain for ≥1 minor version |
| Rollout | CI gating: new mappings must pass parity + validation before merge |
| Documentation updates | Update this guide and `../external/README.md` simultaneously |

---

## 12. Implementation Checklist (Placeholder)

- [ ] Create machine-readable mapping artifact (JSON).
- [ ] Add provenance extension handling in generators.
- [ ] Implement transform rule registry with test coverage.
- [ ] Add mapping diff CI step (fail if unreviewed changes).
- [ ] Populate full field mapping table.
- [ ] Document derivation logic for each computed field.
- [ ] Complete enum code crosswalk allowlists.
- [ ] Add integration tests for multi-source merge precedence.

---

## 13. Future Enhancements (Roadmap Draft)

| Enhancement | Benefit | Notes |
|-------------|---------|-------|
| Automated provenance injection | Improves traceability | Requires agreed extension spec |
| Multi-system conflict resolver | Deterministic precedence logic | Weighted by data freshness |
| Transformation rule linting | Early detection of regressions | DSL or declarative rule config |
| Code crosswalk API | Central resolution microservice | Useful for front-end autocomplete |
| Temporal anomaly detection | Data quality alerts | Compare award_date vs modification dates |
| Geospatial enrichment | Mapping & region analytics | Use external geocode providers |

---

## 14. FAQ (Initial Placeholder)

| Question | Answer |
|----------|--------|
| Why snake_case? | Aligns canonical JSON Schema and tooling expectations. |
| Why not keep source field names? | Reduces coupling and enables multi-source unification. |
| How are conflicts resolved? | Deterministic precedence (documented in future merge policy section). |
| Can we add new external systems intake_processly? | Yes—introduce new mapping entries, update transform rules, add tests. |
| How do we ensure no data loss? | Parity checks + provenance tracing (planned). |

---

## 15. Contributing

1. Propose mapping changes via PR with:
   - Updated JSON Schema (if adding/removing fields).
   - Mapping artifact diff.
   - Test updates (parity, transform rules).
   - Documentation edits in this guide.
2. Request review from schema maintainer group.
3. Ensure CI passes (generation, validation, coverage thresholds).

---

## 16. Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-12 | Placeholder initial draft created | (pending) |

---

## 17. Next Steps (for this Placeholder)

- Flesh out complete mapping table from existing partial artifacts.
- Add real examples of Contract Data vs Legacy Procurement field transformations.
- Link to actual enum definitions in `schema_unification.schema.json`.
- Incorporate provenance extension spec after team review.

---

> NOTE: This is a placeholder draft. Content will evolve as mappings are formalized and artifacts are added. Replace “planned” sections with concrete specifications as they are implemented.
