# Unified Model Mapping & Migration Plan

Path: `enterprise-schema-unification/docs/Unified Model-mapping-plan.md`

## Executive summary

You want to retain the current canonical model shape used by the Schema Unification Forest pipeline while adopting the U.S. Spending Unified Model vocabulary (the "Unified Model target"). The preferred approach is to introduce a stable mapping layer from the existing canonical model to Unified Model terms, update generation/composition artifacts to emit both canonical fields and (optionally) Unified Model aliases, and keep provenance and generation steps intact. This document explains mapping principles, a suggested field-level mapping strategy (high-level), and an implementation/migration plan that integrates with the current generators and CI pipeline.

Key outcomes:

- Keep canonical model and generation/canonical-subgraph steps unchanged.
- Add a transform/mapping artifact (JSON) that defines how canonical fields map to Unified Model paths.
- Update schema-generation pipeline to optionally produce Unified Model-named views (SDL + JSON Schema) and mapping metadata.
- Keep provenance and system metadata (system_chain, schema_version, x-source-path) for traceability.

References:

- Existing canonical schema: `src/data/schema_unification.schema.json`
- Existing Contract Data→Unified Model mapping artifact: `resources/USASPENDING/Contract Data-to-Unified Model.json`
- Goal vocabulary: Unified Model as documented at https://www.public_spending.gov/data-dictionary

---

## Principles / Constraints

- Non-breaking: Do not change the canonical JSON Schema shapes or GraphQL types in-place in a way that invalidates current consumers.
- Mapping-first: Introduce a mapping layer that is authoritative for name translations rather than renaming fields across repos.
- Traceability: Maintain `x-source-path` or similar provenance metadata on translated fields so we can trace back to original feed / generator.
- Idempotence: Generation steps must be repeatable and yield stable artifacts. Any additional generation step that creates Unified Model artifacts should run within the same pipeline and be format/lint-friendly.
- CI-friendly: Ensure linting and composition steps continue to pass. New artifacts should be excluded from GraphQL lint where appropriate or included properly.
- Incremental rollout: Allow producing both canonical and Unified Model artifacts side-by-side for testing and consumer migration.

---

## High-level mapping approach

1. Create a single mapping artifact (JSON) that expresses canonical → Unified Model relationships:
   - Mapping file location: `resources/USASPENDING/canonical-to-unified_model.json` (new)
   - Each mapping entry should include:
     - `canonical_path` (dot notation, e.g., `contract_identification.piid`)
     - `unified_model_path` (dot notation, e.g., `award.award_contract_id.piid`)
     - `transform` (optional; name of a transform function or expression)
     - `description` (human friendly)
     - `x-note` / `x-source-path` to reference existing Contract Data→Unified Model mappings when relevant
     - `preserve` flag to indicate whether canonical field should still be output as-is

2. Keep the existing `resources/USASPENDING/Contract Data-to-Unified Model.json` as a source-of-truth for how Contract Data fields map to Unified Model. Use it to validate/seed the new `canonical-to-unified_model.json`.

3. Implement a generation/transform stage (script) which:
   - Loads canonical JSON Schema and the `canonical-to-unified_model.json` mapper.
   - Produces:
     - a machine-readable mapping artifact (used by downstream ETL / translators)
     - optionally an enhanced GraphQL SDL that includes Unified Model-named fields as aliases (GraphQL `@deprecated` or explicit resolver aliases) or a separate Unified Model-named GraphQL type layer
     - optionally an alternate JSON Schema with Unified Model naming (for consumers that prefer Unified Model JSON)
   - Writes mapping provenance into `system_metadata.system_chain` and into generated artifact metadata.

4. Consumers can adopt Unified Model names progressively:
   - Option A: Consumers query canonical fields while mapping layer produces Unified Model labeled outputs (best for minimal disruption).
   - Option B: Compose a Unified Model-named canonical view and run composition/diagnostics to validate federation ownership and invariants.

---

## Example mapping patterns (conceptual)

- One-to-one rename:
  - Canonical: `contract_identification.piid`
  - Unified Model: `award.award_contract_id.piid`
- Nested/structural mapping:
  - Canonical `vendor_info.vendor_uei` → Unified Model `award.vendor.uei`
- Aggregation:
  - Canonical `financial_info.total_contract_value` → Unified Model `award.dollar_values.obligated_amount` (if obligation semantics match)
- Conditional transforms:
  - When canonical units differ (e.g., cents vs dollars), specify `transform: "scale_cents_to_dollars"`

Important: All transforms should be implemented as a small library (JavaScript/Node) referenced in generator scripts (e.g., `scripts/transforms/*`). Keep transforms deterministic and unit-tested.

---

## Suggested mapping categories (apply to canonical subschemas)

Below are the canonical top-level types in `src/data/schema_unification.schema.json` and Unified Model counterpart guidance. Use this as the seed for a mapping matrix.

- `contract_identification` → Unified Model `award.award_contract_id` (PIID, modification numbers, titles)
- `system_metadata` → keep as-is for provenance; add a `unified_model: { mapped: true }` note
- `organization_info` / `agency_info` → Unified Model `award.purchaser_information` / nested `agency`
- `vendor_info` → Unified Model `award.vendor` (uei, vendorName → vendor.uei, vendor.uei_legal_business_name)
- `place_of_performance` → Unified Model `award.place_of_performance` (principal_place/state/country & zip)
- `financial_info` → Unified Model `award.dollar_values` and `award.total_dollar_values` (map obligation vs total)
- `business_classification` → various Unified Model `vendor.socio_economic_indicators`, `vendor.certifications`, `vendor.entity_identifiers`
- `contract_characteristics` → Unified Model `award.contract_data` & `award.competition` (mapping depends on semantics)
- `contacts` → Unified Model `award.contacts` or vendor contact areas depending on role
- `status_info` → Unified Model `award.transaction_information` or dedicated status fields (ensure date format compatibility)

Record ambiguous mappings explicitly in the mapping JSON with human-review required flags.

---

## Implementation plan (concrete steps)

1. Create mapping artifact
   - Add `resources/USASPENDING/canonical-to-unified_model.json` with entries seeded from `resources/USASPENDING/Contract Data-to-Unified Model.json` and `src/data/schema_unification.schema.json`.
   - Provide `description` and `confidence` (e.g., `high | medium | low`) for each mapping entry.

2. Implement a translator module
   - New script: `scripts/generate-unified_model-views.mjs` (or integrate into `scripts/generate-schema-interop.mjs`)
   - Responsibilities:
     - Read canonical JSON Schema + mapping JSON
     - Emit:
       - `generated-schemas/unified_model/` JSON Schema view (Unified Model names)
       - `generated-schemas/unified_model/sdl/` GraphQL SDL view (if requested)
       - `generated-schemas/unified_model/mapping.json` (the resolved mapping including sequence of transforms)
     - Write mapping provenance into `system_metadata.system_chain` for each generated artifact.

3. Update GraphQL generation
   - Option 1 (safe): Produce Unified Model-named GraphQL SDLs as separate artifacts under `generated-schemas/unified_model/` — do not change canonical subgraphs.
   - Option 2 (if desired): Add Unified Model aliases into canonical SDL as computed fields that resolve to canonical data (requires resolver wiring).

4. Tests
   - Unit tests for mapping translations (round-trip canonical → Unified Model).
   - Integration tests: run composition with theGuild on Unified Model SDLs to ensure federation ownership and diagnostics are healthy.

5. CI updates
   - Add a job step to run `scripts/generate-unified_model-views.mjs` within the same validate/generate workflow.
   - Format generated Unified Model artifacts with Prettier and ensure generated output is excluded or handled correctly by ESLint.
   - Optionally fail CI if mapping warnings exist (configurable).

6. Data validation and QA
   - Create a small sample feed → run full pipeline → compare values in canonical and Unified Model outputs.
   - Add data-quality metrics to `system_metadata` (reuse `data_quality` from canonical schema).

7. Rollout
   - Phase 1: Generate Unified Model artifacts, keep canonical production APIs unchanged.
   - Phase 2: Notify downstream teams & provide mapping docs.
   - Phase 3: If consumers adopt Unified Model naming, consider optional GraphQL aliasing or a migration plan to deprecate canonical names over time.

---

## CI / Composition notes

- Composition ownership and diagnostics:
  - If you generate Unified Model SDLs and intend to compose them, update `ownership.json` generation to target the canonical ownership owners but include Unified Model type/field names. The existing composition pipeline can remain intact; only the artifact inputs change.
- Linting:
  - Keep generated Unified Model SDLs in `generated-schemas/unified_model/`. Exclude those from source `graphql-eslint` checks unless you intentionally want to validate them.
- Commit strategy:
  - Similar to previous generator behavior, have `schema-validate-generate` attempt to auto-commit generated Unified Model artifacts, or surface diffs as artifacts for review.

---

## Provenance and auditability

- Each Unified Model-mapped field in the generated artifacts must carry metadata:
  - `x-source-path` → original canonical path (and if applicable the original feed path from `Contract Data-to-Unified Model.json`)
  - `system_metadata.system_chain` entry describing the transformation step (script name, version, timestamp)
- Version mapping:
  - Add `mapping_version` and `mapping_generated_at` to generated artifact top-level metadata; commit mapping JSON to the repo.

---

## Rollback & fallback

- Since canonical artifacts remain unchanged, rollback is straightforward: stop publishing Unified Model artifacts or revert the generator changes.
- Keep mapping artifacts in VCS; changes to mapping should be accompanied by unit tests and a changelog entry.

---

## Deliverables

1. `resources/USASPENDING/canonical-to-unified_model.json` — mapping seed file (review-required)
2. `scripts/generate-unified_model-views.mjs` — transformation script that emits:
   - `generated-schemas/unified_model/unified_model.schema.json`
   - `generated-schemas/unified_model/unified_model.graphql`
   - `generated-schemas/unified_model/mapping-resolved.json` (enriched mapping + transforms)
3. Tests: `test/mappings/*` — unit and integration tests for transforms
4. CI: update `/.github/workflows/schema-validate-generate.yml` to include generation and validation of Unified Model artifacts, plus optional gating on mapping warnings.

---

## Timeline & estimates (rough)

- Create mapping artifact (seed): 1-2 days (includes review)
- Implement generator + transforms library: 2-4 days
- Unit/integration tests + CI adjustments: 1-2 days
- Review / iterate with stakeholders + sample runs: 1-3 days
  Total: ~1–2 weeks end-to-end depending on review cycles.

---

## Migration checklist (short)

- [ ] Seed `canonical-to-unified_model.json` from `Contract Data-to-Unified Model.json` & `schema_unification.schema.json`.
- [ ] Implement transform library & generation script.
- [ ] Emit Unified Model artifacts under `generated-schemas/unified_model/`.
- [ ] Add metadata/provenance fields in generated artifacts.
- [ ] Add unit tests & integration test sample run.
- [ ] Update CI to run the generator and upload diffs/artifacts.
- [ ] Run sample dataset → verify values, dates, units, and socio-economic flags.
- [ ] Stakeholder review; adjust ambiguous mappings; set confidence flags.
- [ ] Decide on aliasing/deprecation strategy for canonical names.

---

## Suggested next actions (what I can do next)

- I can author the initial `resources/USASPENDING/canonical-to-unified_model.json` seeded from `Contract Data-to-Unified Model.json` and `src/data/schema_unification.schema.json`.
- I can implement `scripts/generate-unified_model-views.mjs` to generate JSON Schema + SDL views and mapping-resolved artifacts.
- I can add unit tests for common transforms and wire the generation step into the existing CI workflow.
  Tell me which of these you want me to implement first and whether you prefer:
- "safe" mode (Unified Model artifacts generated but canonical API unchanged), or
- "aggressive" mode (canonical schema SDLs augmented with field aliases).

If you'd like, I can also prepare a short PR that contains a first pass `canonical-to-unified_model.json` and the generation scaffold for review.
