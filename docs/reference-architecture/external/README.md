---
title: External Systems Reference
description: Reference documentation for external systems integrating with Schema Unification Forest
---

Status: Draft (placeholder)  
Audience: Engineers and integrators working on Schema Unification Forest (PF) data ingestion, normalization, and synchronization.

This reference summarizes external systems that PF integrates with or plans to integrate with. It provides high-level descriptions, common API characteristics, and implementation notes (auth, pagination, rate limits, error handling), along with mapping and data-quality considerations.

See also:
- docs/mappings/system-mappings-guide.md — Cross-system field alignment and transformation rules
- docs/schema/schema-pipeline-guide.md — End-to-end generation and validation
- docs/schema/schema-tooling-reference.md — Tooling, generators, validators, and CI
- docs/schema/x-graphql-hints-guide.md — Carrying GraphQL semantics via JSON Schema extensions
- docs/examples/validator-usage.md — Live validator usage examples

## Table of contents

- [Purpose and scope](#1-purpose-and-scope)
- [Systems overview](#2-systems-overview-current-and-prospective)
- [Common ingestion patterns](#3-common-ingestion-patterns)
- [System-by-system details](#4-system-by-system-details-high-level)
  - [Contract Data](#41-contract_data)
  - [Entity Management.gov](#42-samgov)
  - [Treasury API](#43-treasury-api-fiscaltreasurygov)
  - [Legacy Procurement](#44-legacy_procurement)
  - [EASi](#45-intake_process)
  - [Delta Lake](#46-delta-lake)
- [Sample request/response skeletons](#5-sample-requestresponse-skeletons-indicative)
- [Data quality and reconciliation](#6-data-quality-and-reconciliation)
- [Versioning, deprecations, and change management](#7-versioning-deprecations-and-change-management)
- [Security and compliance](#8-security-and-compliance)
- [Integration checklist (per source)](#9-integration-checklist-per-source)
- [Glossary](#10-glossary-initial)
- [Changelog](#11-changelog)

---

## 1) Purpose and scope

- Establish a single place to find upstream system basics (what, how, when).
- Standardize ingestion patterns across sources (auth, pagination, retries).
- Provide pointers for field mapping into the PF canonical schema.
- Capture quirks, rate limits, and change management risks early.

Out of scope (for this initial draft):
- Full endpoint-by-endpoint documentation (link to official docs instead).
- Complete mapping tables (see docs/mappings/system-mappings-guide.md and mapping artifacts).
- Source-specific legal or licensing terms (defer to owning agencies/platforms).

---

## 2) Systems overview (current and prospective)

- Contract Data (Federal Procurement Data System)
  - Procurement award and modification records (historical and active).
  - Often used as core transactional source for contracting.

- Entity Management.gov (Entity/registrant data; awards search APIs)
  - Vendor identity, UEI, exclusions, and registration data.

- Treasury API (fiscal.treasury.gov)
  - Financial datasets and reference data (useful for cross-checks and aggregations).

- Legacy Procurement (Assisted Search / internal enriched dataset)
  - Internal aggregation/enrichment layer (field harmonization; faster lookup patterns).

- EASi (Easy Acquisition System Interface)
  - System-specific award/procurement interfaces used by business units.

- Delta Lake (warehouse/analytical storage)
  - Curated tables for analytics and historical snapshots.

Notes:
- Not every system is simultaneously authoritative; PF aims to maintain canonical semantics and provenance across inputs.
- Some systems serve as enrichment or backfill sources rather than primary truth.

---

## 3) Common ingestion patterns

Authentication
- API keys, OAuth2 client credentials, or mutual TLS (rare).
- Secure storage of credentials in environment-specific secret managers.
- Avoid embedding credentials in code or logs.

Pagination
- Offset/limit (simple but can be slow for deep pages).
- Cursor-based (preferred for large datasets; consistent under write load).
- Time-windowed (e.g., updated_since / created_after for incremental pulls).

Rate limiting and retries
- Respect `429` responses; implement exponential backoff with jitter.
- Include idempotent request strategies for partial failures.
- Use circuit breakers and per-source concurrency controls.

Formats and encodings
- JSON recommended; CSV bulk endpoints sometimes available for historical pulls.
- Normalization of date-time into ISO 8601 UTC where fintake_processble.
- Maintain raw capture (for auditing) before normalization steps.

Error handling
- Categorize retryable vs non-retryable errors (HTTP 5xx vs 4xx).
- Log upstream correlation IDs when provided (e.g., `X-Request-Id`).
- Capture and store minimal diagnostics for reproducible bug reports.

Change detection
- Prefer `updated_at` or equivalent for incremental syncs.
- For systems without reliable change markers, schedule periodic full diff checks (batch windows).

Provenance
- Store minimal upstream source/endpoint and key identifiers.
- When transforms are lossy, consider storing `x-original-value` metadata (planned).

---

## 4) System-by-system details (high-level)

### 4.1 Contract Data

Summary
- Contract award and modification datasets; large historical volume.
- Often the backbone for award analytics and compliance.

Typical base URLs
- Public search and bulk endpoints (see official docs).
- Historical archives may be delivered as flat files or bulk exports.

Auth
- Depends on access tier; some data is public, others require keys or agreements.

Pagination
- Public APIs typically provide paging; for historical backfills, prefer bulk delivery when available.

Common fields (indicative)
- `contractActionID` (maps to PF `piid`)
- `dollarValue` (PF `award_amount` after coercion)
- `principalNAICSCode` (PF `naics_code`)
- `productOrServiceCode` (PF `psc_code`)
- `placeOfPerformance.*` (PF `place_of_performance_*`)
- Vendor information: DUNS/UEI, legal name

Change frequency
- Near-real-time for modern events; historical backfills needed for completeness.

Known issues / quirks
- Inconsistent string vs number formats for currency and counts.
- Date/time timezone ambiguities; normalize to UTC.
- Multiple flags contributing to competition status; see derived field rules.

Mapping hints
- Prioritize PF snake_case canonical fields; add enums via `x-graphql-enum` where stable code lists exist.
- Validate `naics_code` length and `psc_code` case.

---

### 4.2 Entity Management.gov

Summary
- Entity/registrant data (UEI), exclusions, and some awards discovery endpoints.

Typical base URLs
- Public API gateways with developer registration.

Auth
- API keys (per-developer or per-agency).

Pagination
- Cursor-based strongly preferred where available.

Common fields (indicative)
- `uei`, `duns` (legacy), legal name, cage code, registration status.
- Registration dates, expiration, and exclusion flags.

Change frequency
- Frequent updates; use change markers when available.

Known issues / quirks
- Historically mixed DUNS/UEI references — standardize on UEI but keep DUNS for legacy joins.
- Missing or suppressed sensitive fields in public tiers.

Mapping hints
- PF vendor normalization may take Entity Management as primary identity source; ensure `vendor_*` fields are consistently set.

---

### 4.3 Treasury API (fiscal.treasury.gov)

Summary
- Financial reference datasets (e.g., fiscal data, debt holdings, ledger summaries).

Typical base URLs
- `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/...` (see official docs for domains/versions)

Auth
- Many datasets are public; some may require key or registration.

Pagination
- Typically page/offset or record count with filtering.

Common fields (indicative)
- Fiscal year/period markers, treasury account symbols, amounts.

Change frequency
- Periodic (monthly/quarterly) depending on dataset.

Known issues / quirks
- Large result sets; always filter by time range.
- Sometimes CSV bulk is more efficient than paginated JSON.

Mapping hints
- Primarily used for cross-checks and contextual enrichment (not primary PF facts).

---

### 4.4 Legacy Procurement (internal enrichment)

Summary
- Internal aggregation layer providing harmonized procurement views.
- May be used for rapid prototyping or pre-joined convenience.

Access
- Internal-only; follow organizational security policies.

Pagination
- Likely cursor-based or chunked endpoints for large sets.

Mapping hints
- Treat this as a non-authoritative enrichment source; reconcile with Contract Data/Entity Management when conflicts arise.

---

### 4.5 EASi (system interface)

Summary
- Business-unit oriented acquisition interfaces; narrower in scope than Contract Data.

Access
- Internal APIs; environment-specific endpoints (dev/test/prod).

Mapping hints
- Useful for near-real-time operational status; backfill with Contract Data for historical continuity.

---

### 4.6 Delta Lake (warehouse)

Summary
- Analytical storage for curated PF datasets and snapshots.
- Table-format parquet, partitioned by date or other dimensions.

Access
- Data lake tooling and governance policies apply.
- Prefer read-only roles for downstream consumers.

Change frequency
- As ingestion pipelines run; rely on snapshot partitions for point-in-time views.

Mapping hints
- Use as the serving layer for analytics dashboards; ensure parity with canonical JSON Schema.

---

## 5) Sample request/response skeletons (indicative) — see [Validator Usage Examples](../examples/validator-usage.md)

Note: Replace with concrete samples per system and endpoint as integration progresses.

HTTP GET (filter + pagination)
    GET /v1/awards?updated_since=2024-01-01&limit=100&cursor=abc123
    Authorization: Bearer <token>
    Accept: application/json

Sample JSON response (paginated)
    {
      "data": [
        {
          "contractActionID": "12345",
          "dollarValue": "100000",
          "principalNAICSCode": "541330",
          "productOrServiceCode": "D399",
          "placeOfPerformance": { "countryCode": "US", "stateCode": "VA" },
          "vendor": { "uei": "UEI123", "dunsNumber": "000000000", "vendorName": "Acme LLC" },
          "signedDate": "2024-06-01T12:00:00Z"
        }
      ],
      "page_info": {
        "next_cursor": "def456",
        "has_next_page": true
      }
    }

PF normalization (illustrative)
    {
      "piid": "12345",
      "award_amount": 100000,
      "naics_code": "541330",
      "psc_code": "D399",
      "place_of_performance_country": "US",
      "place_of_performance_state": "VA",
      "vendor_info": { "uei": "UEI123", "duns": "000000000", "vendor_name": "Acme LLC" },
      "award_date": "2024-06-01T12:00:00Z"
    }

---

## 6) Data quality and reconciliation

- Missing values: Prefer explicit null, document derivation defaults.
- Duplicate detection: Use composite keys (PIID + modification number).
- Currency & precision: Store as numeric; record original (string) when needed.
- Time consistency: Normalize all recorded timestamps to UTC (preserve original offset when provided).
- Reconciliation: In conflicts, prefer authoritative system; retain provenance.

---

## 7) Versioning, deprecations, and change management

- Track upstream API versions and release notes.
- Add deprecation windows for PF enums or fields; reflect via GraphQL `@deprecated` where appropriate.
- Establish schema migration steps (archive old docs under `docs/archived/` with notices).
- CI gates:
  - Fail when expected generated artifacts are missing.
  - Report coverage and parity results.
  - Optionally detect unexpected mapping diffs.

---

## 8) Security and compliance

- Secrets management: environment-specific secret stores (no secrets in code).
- PII handling: classify fields and enforce least-privilege access.
- Logging: redact secrets; restrict payload logging to sampled subsets with masking.
- Auditing: retain upstream request IDs and minimal metadata for incident analysis.

---

## 9) Integration checklist (per source)

- Access
  - [ ] Credentials provisioned and stored securely
  - [ ] Allowed IPs / firewall rules configured (if applicable)
- Connectivity
  - [ ] Health-check endpoint verified
  - [ ] Retry policy and backoff configured
- Data handling
  - [ ] Pagination strategy confirmed (cursor vs offset)
  - [ ] Incremental sync markers selected (updated_since)
  - [ ] Error taxonomy and retryability mapped
- Normalization
  - [ ] Key casing normalized to PF snake_case
  - [ ] Date/time normalized to UTC ISO 8601
  - [ ] Enumerations crosswalked and documented
- Validation
  - [ ] Ajv structural checks pass
  - [ ] Parity checks (validate-schema-sync) pass
  - [ ] Sample data verified against PF business rules
- Observability
  - [ ] Metrics: request rate, error rate, latency, pagination depth
  - [ ] Alerts configured for error spikes and unusual data volumes

---

## 10) Glossary (initial)

- PIID — Procurement Instrument Identifier
- UEI — Unique Entity Identifier
- PSC — Product and Service Code
- NAICS — North American Industry Classification System
- PF — Schema Unification Forest (this project)

---

## 11) Changelog

- 2024-12 — Placeholder initial draft created (structure, patterns, and stubs).
