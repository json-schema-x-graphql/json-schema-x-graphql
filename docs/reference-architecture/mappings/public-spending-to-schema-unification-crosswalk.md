# Public Spending SQL to Schema Unification Schema Crosswalk

**Version:** 1.0  
**Date:** December 4, 2025  
**Status:** Draft

## Executive Summary

This document provides a detailed crosswalk mapping between the Public Spending PostgreSQL database schema (GDSM) and the Schema Unification Forest unified contract schema. The mapping identifies direct field correspondences, transformation requirements, and gaps requiring resolution.

### Key Findings

- **Public Spending Primary Tables:** 50+ tables including `award_procurement`, `award_financial_legacy_procurementance` (FABS), and reference tables
- **Schema Unification Schema:** Unified `Contract` type with nested `common_elements` and `system_extensions`
- **Mapping Coverage:** ~85% direct field mapping, 15% requiring transformation or new field definitions
- **Critical Gaps:** Assistance listing data, financial obligation tracking, agency hierarchy relationships

---

## Schema Architecture Comparison

### Public Spending (GDSM) Architecture

```
Public Spending Database
├── award_procurement (Procurement contracts - Contract Data data)
├── award_financial_legacy_procurementance (FABS - Grants/loans/legacy_procurementance)
├── award_financial (Financial obligation data)
├── appropriation (Budget/TAS data)
├── Reference Tables
│   ├── cgac (Agency codes)
│   ├── office (Office hierarchy)
│   ├── naics (Industry codes)
│   ├── psc (Product service codes)
│   ├── legacy_procurementance_listing (CFDA programs)
│   └── country_code, state_code, county_code (Location)
└── Metadata Tables
    ├── submission (Data submissions)
    ├── job (ETL jobs)
    └── certify_history (Certification tracking)
```

### Schema Unification Schema Architecture

```
Schema Unification Contract Schema
├── Contract (Root type)
│   ├── system_metadata (Provenance & lineage)
│   ├── common_elements (Cross-system normalized fields)
│   │   ├── contract_identification
│   │   ├── organization_info
│   │   ├── vendor_info
│   │   ├── place_of_performance
│   │   ├── financial_info
│   │   ├── business_classification
│   │   ├── contract_characteristics
│   │   └── status_info
│   └── system_extensions (System-specific fields)
│       ├── contract_data (Contract Data-specific)
│       ├── legacy_procurement (Legacy Procurement-specific)
│       └── intake_process (EASi-specific)
```

---

## Detailed Field Mappings

### 1. Contract Identification

| Public Spending Field        | Schema Unification Path                                              | Transformation            | Notes                                     |
| ---------------------------- | -------------------------------------------------------------------- | ------------------------- | ----------------------------------------- |
| `piid`                       | `common_elements.contract_identification.piid`                       | Direct                    | Primary contract ID                       |
| `parent_award_id`            | `common_elements.contract_identification.original_award_piid`        | Direct                    | IDV/parent reference                      |
| `referenced_idv_agency_iden` | `common_elements.contract_identification.referenced_piid`            | Combine with modification | Referenced contract                       |
| `award_modification_amendme` | `common_elements.contract_identification.modification_number`        | Direct                    | Modification/amendment number             |
| `fain`                       | `common_elements.contract_identification.fain`                       | Direct                    | Federal Award ID (legacy_procurementance) |
| `uri`                        | `common_elements.contract_identification.uri`                        | Direct                    | Unique Record Identifier                  |
| `contract_award_type`        | `common_elements.contract_identification.contract_type`              | Map to enum               | Contract type classification              |
| `type_of_contract_pricing`   | `common_elements.contract_identification.pricing_type`               | Map to enum               | Pricing mechanism                         |
| `award_description`          | `common_elements.contract_identification.description_of_requirement` | Direct                    | SOW/description                           |
| `action_type`                | `common_elements.contract_identification.action_type`                | Map to enum               | Award/mod/cancellation                    |
| `action_date`                | `common_elements.contract_identification.action_date`                | Parse date                | Transaction date                          |

**Transformation Rules:**

- Parse `action_date` from text to ISO 8601 date-time
- Map `contract_award_type` codes to Schema Unification enum values
- Concatenate `referenced_idv_agency_iden` + `award_modification_amendme` for full reference

### 2. Organization Information

| Public Spending Field        | Schema Unification Path                                         | Transformation | Notes                 |
| ---------------------------- | --------------------------------------------------------------- | -------------- | --------------------- |
| `awarding_agency_code`       | `common_elements.organization_info.contracting_agency_code`     | Direct         | Awarding agency       |
| `awarding_agency_name`       | `common_elements.organization_info.contracting_agency_name`     | Direct         | Agency name           |
| `awarding_sub_tier_agency_c` | `common_elements.organization_info.contracting_department_code` | Direct         | Sub-tier code         |
| `awarding_sub_tier_agency_n` | `common_elements.organization_info.contracting_department_name` | Direct         | Sub-tier name         |
| `awarding_office_code`       | `common_elements.organization_info.contracting_office_code`     | Direct         | Office code           |
| `awarding_office_name`       | `common_elements.organization_info.contracting_office_name`     | Direct         | Office name           |
| `funding_agency_code`        | `common_elements.organization_info.funding_agency_code`         | Direct         | Funding agency        |
| `funding_agency_name`        | `common_elements.organization_info.funding_agency_name`         | Direct         | Funding agency name   |
| `funding_sub_tier_agency_co` | `common_elements.organization_info.funding_department_code`     | Direct         | Funding sub-tier      |
| `funding_sub_tier_agency_na` | `common_elements.organization_info.funding_department_name`     | Direct         | Funding sub-tier name |
| `funding_office_code`        | `common_elements.organization_info.funding_office_code`         | Direct         | Funding office code   |
| `funding_office_name`        | `common_elements.organization_info.funding_office_name`         | Direct         | Funding office name   |

**Reference Data:**

- Join with `cgac` table for complete agency hierarchy
- Join with `office` table for office details
- Handle agency code changes over time via effective dating

### 3. Vendor Information

| Public Spending Field        | Schema Unification Path                                      | Transformation | Notes                    |
| ---------------------------- | ------------------------------------------------------------ | -------------- | ------------------------ |
| `awardee_or_recipient_legal` | `common_elements.vendor_info.vendor_name`                    | Direct         | Legal entity name        |
| `awardee_or_recipient_uei`   | `common_elements.vendor_info.vendor_uei`                     | Direct         | Unique Entity ID (UEI)   |
| `awardee_or_recipient_uniqu` | `common_elements.vendor_info.vendor_duns`                    | Direct         | Legacy DUNS (deprecated) |
| `ultimate_parent_legal_enti` | `common_elements.vendor_info.parent_vendor_name`             | Direct         | Parent company name      |
| `ultimate_parent_uei`        | `common_elements.vendor_info.parent_vendor_uei`              | Direct         | Parent UEI               |
| `ultimate_parent_unique_ide` | `common_elements.vendor_info.parent_vendor_duns`             | Direct         | Parent DUNS (legacy)     |
| `cage_code`                  | `common_elements.vendor_info.cage_code`                      | Direct         | CAGE code                |
| `entity_doing_business_as_n` | `common_elements.vendor_info.dba_name`                       | Direct         | DBA name                 |
| `legal_entity_address_line1` | `common_elements.vendor_info.address.street_address1`        | Direct         | Address line 1           |
| `legal_entity_address_line2` | `common_elements.vendor_info.address.street_address2`        | Direct         | Address line 2           |
| `legal_entity_address_line3` | `common_elements.vendor_info.address.street_address3`        | Direct         | Address line 3           |
| `legal_entity_city_name`     | `common_elements.vendor_info.address.city`                   | Direct         | City                     |
| `legal_entity_state_code`    | `common_elements.vendor_info.address.state`                  | Direct         | State code               |
| `legal_entity_state_descrip` | `common_elements.vendor_info.address.state_name`             | Direct         | State name               |
| `legal_entity_zip4`          | `common_elements.vendor_info.address.zip`                    | Parse ZIP+4    | ZIP code                 |
| `legal_entity_congressional` | `common_elements.vendor_info.address.congressional_district` | Direct         | Congressional district   |
| `legal_entity_country_code`  | `common_elements.vendor_info.address.country`                | Direct         | Country code             |
| `legal_entity_country_name`  | `common_elements.vendor_info.address.country_name`           | Direct         | Country name             |
| `entity_phone_number`        | `common_elements.vendor_info.phone`                          | Direct         | Phone number             |
| `entity_fax_number`          | `common_elements.vendor_info.fax`                            | Direct         | Fax number               |

**Business Classification Flags (Boolean):**
Map 100+ boolean vendor classification fields to structured vendor types:

```json
{
  "small_business": "small_business_competitive",
  "woman_owned": "woman_owned_business",
  "minority_owned": "minority_owned_business",
  "veteran_owned": "veteran_owned_business",
  "8a_program": "c8a_program_participant",
  "hubzone": "historically_underutilized",
  "sdvosb": "service_disabled_veteran_o"
}
```

### 4. Place of Performance

| Public Spending Field        | Schema Unification Path                                       | Transformation | Notes                  |
| ---------------------------- | ------------------------------------------------------------- | -------------- | ---------------------- |
| `place_of_performance_city`  | `common_elements.place_of_performance.city`                   | Direct         | PoP city               |
| `place_of_perform_county_na` | `common_elements.place_of_performance.county`                 | Direct         | PoP county             |
| `place_of_perform_state_nam` | `common_elements.place_of_performance.state`                  | Direct         | PoP state              |
| `place_of_performance_zip4a` | `common_elements.place_of_performance.zip`                    | Parse ZIP+4    | PoP ZIP                |
| `place_of_perform_country_n` | `common_elements.place_of_performance.country`                | Direct         | PoP country            |
| `place_of_perform_country_c` | `common_elements.place_of_performance.country_code`           | Direct         | PoP country code       |
| `place_of_performance_congr` | `common_elements.place_of_performance.congressional_district` | Direct         | PoP district           |
| `place_of_performance_locat` | `common_elements.place_of_performance.location_code`          | Direct         | Combined location code |

**Reference Data:**

- Join with `cd_city_grouped`, `cd_county_grouped`, `cd_state_grouped` for demographic data
- Join with `cd_zips_grouped` for ZIP-level congressional district mapping
- Handle historical changes via `cd_zips_grouped_historical`

### 5. Financial Information

| Public Spending Field        | Schema Unification Path                                     | Transformation | Notes                  |
| ---------------------------- | ----------------------------------------------------------- | -------------- | ---------------------- |
| `current_total_value_award`  | `common_elements.financial_info.total_contract_value`       | Parse numeric  | Current total value    |
| `potential_total_value_awar` | `common_elements.financial_info.potential_total_value`      | Parse numeric  | Potential value        |
| `base_and_all_options_value` | `common_elements.financial_info.base_and_all_options_value` | Parse numeric  | Base + options         |
| `base_exercised_options_val` | `common_elements.financial_info.base_exercised_value`       | Parse numeric  | Exercised value        |
| `federal_action_obligation`  | `common_elements.financial_info.federal_action_obligation`  | Direct         | Transaction obligation |
| `total_obligated_amount`     | `common_elements.financial_info.total_obligated_amount`     | Direct         | Cumulative obligation  |
| `face_value_loan_guarantee`  | `common_elements.financial_info.loan_face_value`            | Direct         | Loan/guarantee value   |
| `original_loan_subsidy_cost` | `common_elements.financial_info.loan_subsidy_cost`          | Direct         | Subsidy cost           |
| `non_federal_funding_amount` | `common_elements.financial_info.non_federal_funding`        | Direct         | Cost share             |

**Award Financial Linkage:**

- Join `award_procurement` → `award_financial` via `unique_award_key`
- Aggregate financial transactions by TAS (Treasury Account Symbol)
- Track obligations, outlays, and de-obligations over time

### 6. Business Classification

| Public Spending Field        | Schema Unification Path                                          | Transformation | Notes                |
| ---------------------------- | ---------------------------------------------------------------- | -------------- | -------------------- |
| `naics`                      | `common_elements.business_classification.naics_code`             | Direct         | NAICS code           |
| `naics_description`          | `common_elements.business_classification.naics_description`      | Direct         | NAICS description    |
| `product_or_service_code`    | `common_elements.business_classification.psc_code`               | Direct         | PSC code             |
| `product_or_service_co_desc` | `common_elements.business_classification.psc_description`        | Direct         | PSC description      |
| `type_set_aside`             | `common_elements.business_classification.set_aside_type`         | Map to enum    | Set-aside type       |
| `local_area_set_aside`       | `common_elements.business_classification.local_area_set_aside`   | Parse boolean  | Local set-aside flag |
| `extent_competed`            | `common_elements.business_classification.extent_competed`        | Map to enum    | Competition extent   |
| `solicitation_procedures`    | `common_elements.business_classification.solicitation_procedure` | Map to enum    | Solicitation method  |

### 7. Contract Characteristics

| Public Spending Field        | Schema Unification Path                                                        | Transformation | Notes                |
| ---------------------------- | ------------------------------------------------------------------------------ | -------------- | -------------------- |
| `period_of_performance_star` | `common_elements.contract_characteristics.period_of_performance_start`         | Parse date     | PoP start            |
| `period_of_performance_curr` | `common_elements.contract_characteristics.period_of_performance_current_end`   | Parse date     | Current end          |
| `period_of_perf_potential_e` | `common_elements.contract_characteristics.period_of_performance_potential_end` | Parse date     | Potential end        |
| `ordering_period_end_date`   | `common_elements.contract_characteristics.ordering_period_end`                 | Parse date     | Ordering end         |
| `government_furnished_prope` | `common_elements.contract_characteristics.government_furnished_property`       | Parse boolean  | GFP flag             |
| `contingency_humanitarian_o` | `common_elements.contract_characteristics.contingency_operation`               | Parse boolean  | Contingency flag     |
| `multi_year_contract`        | `common_elements.contract_characteristics.multi_year_contract`                 | Parse boolean  | Multi-year flag      |
| `performance_based_service`  | `common_elements.contract_characteristics.performance_based`                   | Parse boolean  | PBS flag             |
| `commercial_item_acquisitio` | `common_elements.contract_characteristics.commercial_item`                     | Parse boolean  | Commercial item flag |

### 8. Status Information

| Public Spending Field        | Schema Unification Path                            | Transformation  | Notes           |
| ---------------------------- | -------------------------------------------------- | --------------- | --------------- |
| `last_modified`              | `common_elements.status_info.last_modified_date`   | Parse date-time | Last update     |
| `created_at`                 | `common_elements.status_info.created_at`           | Direct          | Record creation |
| `updated_at`                 | `common_elements.status_info.updated_at`           | Direct          | Record update   |
| `is_valid`                   | `common_elements.status_info.is_valid`             | Direct          | Validation flag |
| `correction_delete_indicatr` | `common_elements.status_info.correction_indicator` | Map to enum     | Correction type |

---

## System-Specific Extensions

### Contract Data Extensions

Public Spending `award_procurement` fields not in common elements should map to `system_extensions.contract_data[]`:

| Public Spending Field        | Extension Path                           | Notes                     |
| ---------------------------- | ---------------------------------------- | ------------------------- |
| `solicitation_identifier`    | `contract_data.solicitation_id`          | Solicitation number       |
| `solicitation_date`          | `contract_data.solicitation_date`        | Solicitation release date |
| `contract_financing`         | `contract_data.contract_financing`       | Financing type            |
| `cost_accounting_standards`  | `contract_data.cas_applicability`        | CAS applicability         |
| `cost_or_pricing_data`       | `contract_data.cost_or_pricing_data`     | Truth in Negotiations     |
| `clinger_cohen_act_planning` | `contract_data.clinger_cohen_compliance` | IT compliance             |
| `a_76_fair_act_action`       | `contract_data.fair_act_action`          | A-76 action               |
| `dod_claimant_program_code`  | `contract_data.dod_claimant_code`        | DoD program               |
| `idv_type`                   | `contract_data.idv_type`                 | IDV classification        |
| `multiple_or_single_award_i` | `contract_data.multiple_or_single_award` | Multiple/single award     |
| `type_of_idc`                | `contract_data.idc_type`                 | IDC type                  |

### FABS (Financial Assistance) Extensions

Public Spending `fabs` table should map to legacy_procurementance-specific extension:

| Public Spending FABS Field              | Extension Path                                   | Notes               |
| --------------------------------------- | ------------------------------------------------ | ------------------- |
| `legacy_procurementance_type`           | `legacy_procurement.legacy_procurementance_type` | Assistance category |
| `legacy_procurementance_listing_number` | `legacy_procurement.cfda_number`                 | CFDA/AL number      |
| `funding_opportunity_number`            | `legacy_procurement.funding_opportunity_number`  | FON                 |
| `funding_opportunity_goals`             | `legacy_procurement.funding_opportunity_goals`   | Opportunity goals   |
| `sai_number`                            | `legacy_procurement.sai_number`                  | SAI number          |
| `business_funds_indicator`              | `legacy_procurement.business_funds_indicator`    | Business funds flag |
| `business_types`                        | `legacy_procurement.business_types`              | Business type codes |

### Assistance Listing Reference

Join `fabs.legacy_procurementance_listing_number` → `legacy_procurementance_listing.program_number` for rich program metadata:

| Assistance Listing Field          | Schema Unification Path                           | Notes              |
| --------------------------------- | ------------------------------------------------- | ------------------ |
| `program_title`                   | `legacy_procurement.program_title`                | Program name       |
| `popular_name`                    | `legacy_procurement.program_popular_name`         | Common name        |
| `objectives`                      | `legacy_procurement.program_objectives`           | Program objectives |
| `types_of_legacy_procurementance` | `legacy_procurement.legacy_procurementance_types` | Types array        |
| `applicant_eligibility`           | `legacy_procurement.applicant_eligibility`        | Eligibility rules  |
| `beneficiary_eligibility`         | `legacy_procurement.beneficiary_eligibility`      | Beneficiary rules  |
| `website_address`                 | `legacy_procurement.program_website`              | Program URL        |

---

## Data Transformation Requirements

### 1. Date/Time Parsing

**Challenge:** Public Spending stores dates as `text` fields in various formats.

```sql
-- Common date formats in Public Spending
'YYYY-MM-DD'          -- ISO 8601
'MM/DD/YYYY'          -- US format
'YYYYMMDD'            -- Compact
''                    -- Empty string (NULL)
'0000-00-00'          -- Invalid placeholder
```

**Solution:**

```javascript
function parsePublic SpendingDate(dateStr) {
  if (!dateStr || dateStr === '0000-00-00') return null;

  // Try ISO format first
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return new Date(dateStr).toISOString();

  // Try US format
  const usMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (usMatch) {
    const [, mm, dd, yyyy] = usMatch;
    return new Date(`${yyyy}-${mm}-${dd}`).toISOString();
  }

  // Try compact format
  const compactMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, yyyy, mm, dd] = compactMatch;
    return new Date(`${yyyy}-${mm}-${dd}`).toISOString();
  }

  return null;
}
```

### 2. Numeric Parsing

**Challenge:** Numeric fields stored as `text` with currency symbols, commas, and invalid values.

```sql
-- Numeric variations in Public Spending
'1234567.89'          -- Standard
'$1,234,567.89'       -- Formatted
''                    -- Empty (NULL)
'0'                   -- Zero
'0.00'                -- Explicit zero
```

**Solution:**

```javascript
function parsePublic SpendingNumeric(numStr) {
  if (!numStr || numStr === '') return null;

  // Remove currency symbols and commas
  const cleaned = numStr.replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
}
```

### 3. Boolean Parsing

**Challenge:** Boolean values represented as `text` 'Y'/'N', '', or actual PostgreSQL `boolean`.

```javascript
function parsePublic SpendingBoolean(val) {
  if (typeof val === 'boolean') return val;
  if (!val || val === '') return null;
  return val.toUpperCase() === 'Y' || val === 'true' || val === '1';
}
```

### 4. Enum Mapping

**Challenge:** Public Spending uses freeform codes; Schema Unification uses typed enums.

Example: Contract Type Mapping

| Public Spending Code | Schema Unification Enum | Description            |
| -------------------- | ----------------------- | ---------------------- |
| `A`                  | `BPA_CALL`              | BPA Call               |
| `B`                  | `PURCHASE_ORDER`        | Purchase Order         |
| `C`                  | `DELIVERY_ORDER`        | Delivery Order (IDC)   |
| `D`                  | `DEFINITIVE_CONTRACT`   | Definitive Contract    |
| `U`                  | `PURCHASE_ORDER`        | Purchase Order (Micro) |

**Implementation:**

```javascript
const CONTRACT_TYPE_MAP = {
  A: "BPA_CALL",
  B: "PURCHASE_ORDER",
  C: "DELIVERY_ORDER",
  D: "DEFINITIVE_CONTRACT",
  U: "PURCHASE_ORDER",
  // ... full mapping
};

function mapContractType(code) {
  return CONTRACT_TYPE_MAP[code] || "UNKNOWN";
}
```

### 5. Address Normalization

**Challenge:** Multiple address fields need combining and standardizing.

```javascript
function normalizeAddress(vendor) {
  return {
    street_address1: vendor.legal_entity_address_line1 || null,
    street_address2: vendor.legal_entity_address_line2 || null,
    street_address3: vendor.legal_entity_address_line3 || null,
    city: vendor.legal_entity_city_name || vendor.legal_entity_foreign_city,
    state: vendor.legal_entity_state_code || vendor.legal_entity_foreign_provi,
    zip: combineZip(vendor.legal_entity_zip5, vendor.legal_entity_zip_last4),
    country: vendor.legal_entity_country_code,
    congressional_district: vendor.legal_entity_congressional,
  };
}

function combineZip(zip5, zip4) {
  if (!zip5) return null;
  return zip4 ? `${zip5}-${zip4}` : zip5;
}
```

---

## Critical Gaps & Resolutions

### Gap 1: Financial Obligation Timeline

**Problem:** Public Spending tracks detailed obligation history via `award_financial` table with TAS-level granularity. Schema Unification schema has simple financial totals.

**Recommendation:**
Add `financial_history` array to Schema Unification `common_elements`:

```json
{
  "financial_history": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "transaction_date": { "type": "string", "format": "date-time" },
        "obligation_amount": { "type": "number" },
        "outlay_amount": { "type": "number" },
        "deobligation_amount": { "type": "number" },
        "tas": { "type": "string" },
        "fiscal_year": { "type": "integer" },
        "fiscal_quarter": { "type": "integer" }
      }
    }
  }
}
```

### Gap 2: Submission & Job Metadata

**Problem:** Public Spending tracks data provenance via `submission_id` and `job_id`. Schema Unification `system_metadata` tracks system source but not batch lineage.

**Recommendation:**
Enhance `system_metadata` with batch tracking:

```json
{
  "system_metadata": {
    "properties": {
      "submission_id": { "type": "string" },
      "job_id": { "type": "string" },
      "row_number": { "type": "integer" },
      "batch_timestamp": { "type": "string", "format": "date-time" }
    }
  }
}
```

### Gap 3: Assistance Listing (CFDA) Programs

**Problem:** Public Spending has rich `legacy_procurementance_listing` reference table with 70+ fields describing federal legacy_procurementance programs. Schema Unification has no equivalent structure.

**Recommendation:**
Create new `AssistanceListing` type and reference in FABS extensions:

```json
{
  "$defs": {
    "legacy_procurementance_listing": {
      "type": "object",
      "properties": {
        "program_number": { "type": "string" },
        "program_title": { "type": "string" },
        "popular_name": { "type": "string" },
        "federal_agency": { "type": "string" },
        "objectives": { "type": "string" },
        "types_of_legacy_procurementance": {
          "type": "array",
          "items": { "type": "string" }
        },
        "applicant_eligibility": { "type": "string" },
        "beneficiary_eligibility": { "type": "string" },
        "website_address": { "type": "string", "format": "uri" }
      }
    }
  }
}
```

### Gap 4: Vendor Business Type Flags

**Problem:** Public Spending has 100+ boolean flags for vendor classifications (small business, woman-owned, minority-owned, etc.). Schema Unification has limited vendor classification.

**Recommendation:**
Add `vendor_classifications` object with grouped flags:

```json
{
  "vendor_classifications": {
    "type": "object",
    "properties": {
      "small_business": {
        "small_business_competitive": { "type": "boolean" },
        "emerging_small_business": { "type": "boolean" },
        "8a_program_participant": { "type": "boolean" },
        "sba_certified_8a_joint_venture": { "type": "boolean" }
      },
      "socioeconomic": {
        "woman_owned_business": { "type": "boolean" },
        "minority_owned_business": { "type": "boolean" },
        "veteran_owned_business": { "type": "boolean" },
        "service_disabled_veteran_owned": { "type": "boolean" },
        "historically_underutilized_business": { "type": "boolean" },
        "historically_black_college": { "type": "boolean" }
      },
      "entity_type": {
        "corporate_entity_tax_exempt": { "type": "boolean" },
        "nonprofit_organization": { "type": "boolean" },
        "for_profit_organization": { "type": "boolean" },
        "educational_institution": { "type": "boolean" }
      }
    }
  }
}
```

### Gap 5: Location Reference Data

**Problem:** Public Spending joins to `cd_*_grouped` tables for congressional district and demographic data. Schema Unification stores simple location strings.

**Recommendation:**
Add optional `location_metadata` for enriched place data:

```json
{
  "place_of_performance_metadata": {
    "type": "object",
    "properties": {
      "congressional_district_current": { "type": "string" },
      "congressional_district_historical": {
        "type": "array",
        "items": { "type": "string" }
      },
      "population": { "type": "integer" },
      "median_income": { "type": "number" }
    }
  }
}
```

---

## Implementation Considerations

### Data Volume

- Public Spending `award_procurement`: ~50M+ rows
- Public Spending `fabs`: ~25M+ rows
- Schema Unification target: ~75M+ contract records

### Performance Optimization

1. **Batch Processing:** Process in 100K record chunks
2. **Parallel Processing:** Distribute by fiscal year or agency
3. **Incremental Updates:** Track `updated_at` timestamps for delta processing
4. **Indexing Strategy:**
   - Primary: `piid`, `fain`, `unique_award_key`
   - Secondary: `awarding_agency_code`, `action_date`, `vendor_uei`

### Data Quality Checks

```sql
-- Validate PIIDs are non-null
SELECT COUNT(*) FROM award_procurement WHERE piid IS NULL OR piid = '';

-- Check date validity
SELECT COUNT(*) FROM award_procurement
WHERE action_date !~ '^\d{4}-\d{2}-\d{2}$';

-- Validate numeric parsing
SELECT COUNT(*) FROM award_procurement
WHERE current_total_value_award !~ '^[\d,.$]+$';

-- Verify UEI format (12 alphanumeric)
SELECT COUNT(*) FROM award_procurement
WHERE awardee_or_recipient_uei !~ '^[A-Z0-9]{12}$';
```

---

## Next Steps

See companion document: **[Public Spending to Schema Unification Alignment Project Plan](./public_spending-alignment-project-plan.md)**

1. Schema enhancement (add missing fields)
2. ETL pipeline development
3. Data validation and testing
4. Incremental migration strategy
5. Production deployment

---

## References

- [Public Spending Data Dictionary](https://files.public_spending.gov/docs/Public Spending_Data_Dictionary.pdf)
- [Contract Data Data Dictionary](https://www.contract_data.gov/downloads/Contract Data-Atom-Feed-Usage-Guide.pdf)
- [Schema Unification Forest Schema v2.0](../../src/data/schema_unification.schema.json)
- [GDSM Technical Documentation](https://fiscal.treasury.gov/data-transparency/)

---

**Document Control:**

- Version: 1.0
- Last Updated: December 4, 2025
- Owner: Schema Unification Forest Schema Working Group
- Review Cycle: Quarterly
