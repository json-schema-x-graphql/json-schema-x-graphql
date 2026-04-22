# Public Spending to Schema Unification Schema Alignment Project Plan

**Version:** 1.0  
**Date:** December 4, 2025  
**Status:** Draft  
**Project Duration:** 16 weeks (estimated)  
**Priority:** High

## Executive Summary

This project plan outlines the strategy, phases, and deliverables for aligning the Public Spending (GDSM) PostgreSQL database with the Schema Unification Forest unified contract schema. The initiative will enable ingestion of 75M+ federal contract and legacy_procurementance records into the Schema Unification platform while maintaining data quality, system lineage, and regulatory compliance.

### Project Goals

1. **Schema Enhancement:** Extend Schema Unification schema to accommodate Public Spending-specific fields
2. **ETL Pipeline:** Build robust, scalable pipeline for incremental data ingestion
3. **Data Quality:** Implement validation and transformation layers ensuring data integrity
4. **Performance:** Process 100K+ records/hour with < 1% error rate
5. **Operational Readiness:** Deploy production-ready system with monitoring and recovery

### Success Metrics

- **Coverage:** 95%+ field mapping completeness
- **Accuracy:** 99%+ data transformation accuracy
- **Performance:** < 2 hour full refresh for incremental updates
- **Availability:** 99.5% uptime for ingestion pipeline
- **Quality:** < 0.5% invalid records after transformation

---

## Phase 1: Schema Enhancement (Weeks 1-3)

### 1.1 Schema Analysis & Design

**Duration:** 1 week  
**Owner:** Schema Architecture Team  
**Deliverables:**

- [ ] Complete field inventory from Public Spending database (50+ tables)
- [ ] Gap analysis report identifying missing Schema Unification fields
- [ ] Schema extension proposal document
- [ ] GraphQL SDL impact analysis

**Key Activities:**

1. Extract complete Public Spending schema DDL
2. Map every field to Schema Unification equivalents or extensions
3. Identify data type mismatches and transformation requirements
4. Design new `$defs` for missing structures (legacy_procurementance listings, financial history)
5. Review with stakeholders for approval

**Critical Decisions:**

- Should legacy_procurementance data live in separate top-level type or as contract extension?
- How to handle 100+ boolean vendor classification flags?
- Strategy for time-series financial obligation data

### 1.2 Schema Implementation

**Duration:** 1.5 weeks  
**Owner:** Schema Engineering Team  
**Deliverables:**

- [ ] Updated `schema_unification.schema.json` with new definitions
- [ ] Enhanced `x-graphql-*` metadata for new fields
- [ ] Generated GraphQL SDL from updated schema
- [ ] Schema validation test suite
- [ ] Migration guide documentation

**Implementation Tasks:**

```json
{
  "new_definitions": [
    "financial_history",
    "legacy_procurementance_listing",
    "vendor_classifications",
    "submission_metadata",
    "location_metadata"
  ],
  "enhanced_definitions": [
    "system_metadata",
    "common_elements.financial_info",
    "contract_data_extension",
    "legacy_procurement_extension"
  ]
}
```

**Schema Changes:**

1. **Add `financial_history` array:**

   ```json
   {
     "financial_history": {
       "type": "array",
       "description": "Financial obligation timeline from award_financial",
       "items": {
         "type": "object",
         "properties": {
           "transaction_date": {
             "type": "string",
             "format": "date-time",
             "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z?$",
             "description": "Transaction date (ISO 8601)"
           },
           "obligation_amount": {
             "type": "number",
             "x-graphql-scalar": "Decimal"
           },
           "outlay_amount": { "type": "number", "x-graphql-scalar": "Decimal" },
           "deobligation_amount": {
             "type": "number",
             "x-graphql-scalar": "Decimal"
           },
           "tas": {
             "type": "string",
             "description": "Treasury Account Symbol"
           },
           "fiscal_year": { "type": "integer" },
           "fiscal_quarter": { "type": "integer", "minimum": 1, "maximum": 4 }
         },
         "required": ["transaction_date", "tas", "fiscal_year"]
       }
     }
   }
   ```

2. **Add `legacy_procurementance_listing` definition:**

   ```json
   {
     "legacy_procurementance_listing": {
       "type": "object",
       "description": "Federal legacy_procurementance program metadata (CFDA)",
       "x-graphql-type": {
         "name": "AssistanceListing",
         "description": "Catalog of Federal Domestic Assistance program"
       },
       "properties": {
         "program_number": { "type": "string", "pattern": "^\\d{2}\\.\\d{3}$" },
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
       },
       "required": ["program_number", "program_title"]
     }
   }
   ```

3. **Add `vendor_classifications` with grouped flags:**

   ```json
   {
     "vendor_classifications": {
       "type": "object",
       "description": "Comprehensive vendor business type classifications",
       "properties": {
         "small_business": {
           "type": "object",
           "properties": {
             "small_business_competitive": { "type": "boolean" },
             "emerging_small_business": { "type": "boolean" },
             "c8a_program_participant": { "type": "boolean" },
             "sba_certified_8a_joint_venture": { "type": "boolean" },
             "hubzone_firm": { "type": "boolean" }
           }
         },
         "socioeconomic": {
           "type": "object",
           "properties": {
             "woman_owned_business": { "type": "boolean" },
             "women_owned_small_business": { "type": "boolean" },
             "minority_owned_business": { "type": "boolean" },
             "veteran_owned_business": { "type": "boolean" },
             "service_disabled_veteran_owned": { "type": "boolean" },
             "historically_black_college": { "type": "boolean" },
             "historically_underutilized_business": { "type": "boolean" }
           }
         },
         "entity_structure": {
           "type": "object",
           "properties": {
             "corporate_entity_tax_exempt": { "type": "boolean" },
             "nonprofit_organization": { "type": "boolean" },
             "for_profit_organization": { "type": "boolean" },
             "educational_institution": { "type": "boolean" },
             "subchapter_s_corporation": { "type": "boolean" },
             "limited_liability_corporation": { "type": "boolean" },
             "sole_proprietorship": { "type": "boolean" },
             "partnership_or_limited_liability": { "type": "boolean" }
           }
         }
       }
     }
   }
   ```

4. **Enhance `system_metadata` with batch tracking:**
   ```json
   {
     "system_metadata": {
       "properties": {
         "submission_id": {
           "type": "string",
           "description": "Public Spending submission ID"
         },
         "job_id": {
           "type": "string",
           "description": "Public Spending job ID"
         },
         "row_number": {
           "type": "integer",
           "description": "Row number in source batch"
         },
         "batch_timestamp": {
           "type": "string",
           "format": "date-time",
           "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z?$",
           "description": "Batch processing timestamp (ISO 8601)"
         }
       }
     }
   }
   ```

**Validation Tasks:**

- [ ] Run `pnpm run validate:schema` to ensure JSON Schema validity
- [ ] Regenerate GraphQL SDL: `node scripts/generate-graphql-from-json-schema.mjs`
- [ ] Verify GraphQL parity: `pnpm run validate:sync`
- [ ] Run Python validation: `python python/validate_schemas.py src/data/schema_unification.schema.json`
- [ ] Test schema in downstream consumers (GraphQL server, data viewers)

### 1.3 Documentation & Review

**Duration:** 0.5 weeks  
**Owner:** Technical Writing + Schema Team  
**Deliverables:**

- [ ] Schema changelog with migration notes
- [ ] Updated API documentation
- [ ] Field-level documentation for new types
- [ ] Breaking change analysis (if any)
- [ ] Stakeholder review and sign-off

---

## Phase 2: ETL Pipeline Development (Weeks 4-9)

### 2.1 Data Source Integration

**Duration:** 1.5 weeks  
**Owner:** Data Engineering Team  
**Deliverables:**

- [ ] PostgreSQL connection configuration for Public Spending database
- [ ] Read-replica setup or ETL service account provisioning
- [ ] Data extraction queries for `award_procurement`, `fabs`, `award_financial`
- [ ] Reference table extraction (cgac, office, naics, psc, etc.)
- [ ] Incremental update strategy based on `updated_at` timestamps

**Connection Architecture:**

```yaml
source:
  type: postgresql
  host: public_spending-db.rds.amazonaws.com
  port: 5432
  database: public_spending
  user: etl_read_only
  ssl_mode: require
  connection_pool:
    min: 5
    max: 20
    idle_timeout: 300s

extraction_strategy:
  mode: incremental
  watermark_column: updated_at
  watermark_table: etl_watermarks
  batch_size: 100000
  parallelism: 4
```

**Extraction Queries:**

```sql
-- Procurement contracts (award_procurement)
SELECT *
FROM award_procurement
WHERE updated_at > :last_watermark
ORDER BY updated_at, award_procurement_id
LIMIT :batch_size;

-- Financial legacy_procurementance (fabs)
SELECT *
FROM fabs
WHERE updated_at > :last_watermark
ORDER BY updated_at, fabs_id
LIMIT :batch_size;

-- Financial transactions (award_financial)
SELECT af.*, ap.unique_award_key
FROM award_financial af
JOIN award_procurement ap ON af.piid = ap.piid
WHERE af.updated_at > :last_watermark
ORDER BY af.updated_at
LIMIT :batch_size;
```

### 2.2 Transformation Layer

**Duration:** 3 weeks  
**Owner:** Data Engineering + Schema Team  
**Deliverables:**

- [ ] Transformation module: Public Spending → Schema Unification mapping
- [ ] Date/time parsing utilities (handle text formats)
- [ ] Numeric parsing (remove currency symbols, handle nulls)
- [ ] Boolean conversion (Y/N → true/false)
- [ ] Enum mapping dictionaries (contract types, action codes, etc.)
- [ ] Address normalization module
- [ ] Vendor classification flag aggregation
- [ ] Field validation and error handling
- [ ] Transformation unit test suite (95%+ coverage)

**Transformation Pipeline Architecture:**

```
┌─────────────────┐
│  Raw Public Spending │
│     Records      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse & Clean  │ ◄─── Date/Numeric/Boolean parsers
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Field Mapping  │ ◄─── Crosswalk dictionary
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validation &   │ ◄─── JSON Schema validator
│  Enrichment     │ ◄─── Reference data joins
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Schema Unification JSON  │
│   Contract      │
└─────────────────┘
```

**Core Transformation Modules:**

1. **`DateParser` module:**

```javascript
class DateParser {
  static parsePublic SpendingDate(dateStr) {
    if (!dateStr || dateStr === '0000-00-00' || dateStr === '') {
      return null;
    }

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr).toISOString();
    }

    // US format: MM/DD/YYYY
    const usMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (usMatch) {
      const [, mm, dd, yyyy] = usMatch;
      return new Date(`${yyyy}-${mm}-${dd}`).toISOString();
    }

    // Compact: YYYYMMDD
    const compactMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compactMatch) {
      const [, yyyy, mm, dd] = compactMatch;
      return new Date(`${yyyy}-${mm}-${dd}`).toISOString();
    }

    throw new Error(`Invalid date format: ${dateStr}`);
  }
}
```

2. **`NumericParser` module:**

```javascript
class NumericParser {
  static parsePublic SpendingNumeric(numStr) {
    if (!numStr || numStr === '') return null;

    // Remove currency symbols, commas, whitespace
    const cleaned = numStr.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);

    if (isNaN(parsed)) {
      throw new Error(`Invalid numeric value: ${numStr}`);
    }

    return parsed;
  }
}
```

3. **`EnumMapper` module:**

```javascript
const CONTRACT_TYPE_MAP = {
  A: "BPA_CALL",
  B: "PURCHASE_ORDER",
  C: "DELIVERY_ORDER",
  D: "DEFINITIVE_CONTRACT",
  U: "PURCHASE_ORDER",
  // ... complete mapping
};

const ACTION_TYPE_MAP = {
  A: "NEW_CONTRACT",
  B: "MODIFICATION",
  C: "CANCELLATION",
  D: "DEFINITIZATION",
  // ... complete mapping
};

class EnumMapper {
  static mapContractType(code) {
    return CONTRACT_TYPE_MAP[code] || "UNKNOWN";
  }

  static mapActionType(code) {
    return ACTION_TYPE_MAP[code] || "UNKNOWN";
  }
}
```

4. **`VendorClassificationAggregator` module:**

```javascript
class VendorClassificationAggregator {
  static aggregateFlags(row) {
    return {
      small_business: {
        small_business_competitive: row.small_business_competitive === true,
        emerging_small_business: row.emerging_small_business === true,
        c8a_program_participant: row.c8a_program_participant === true,
        sba_certified_8a_joint_venture: row.sba_certified_8_a_joint_ve === true,
        hubzone_firm: row.historically_underutilized === true,
      },
      socioeconomic: {
        woman_owned_business: row.woman_owned_business === true,
        women_owned_small_business: row.women_owned_small_business === true,
        minority_owned_business: row.minority_owned_business === true,
        veteran_owned_business: row.veteran_owned_business === true,
        service_disabled_veteran_owned: row.service_disabled_veteran_o === true,
        historically_black_college: row.historically_black_college === true,
        historically_underutilized_business: row.historically_underutilized === true,
      },
      entity_structure: {
        corporate_entity_tax_exempt: row.corporate_entity_tax_exemp === true,
        nonprofit_organization: row.nonprofit_organization === true,
        for_profit_organization: row.for_profit_organization === true,
        educational_institution: row.educational_institution === true,
        subchapter_s_corporation: row.subchapter_s_corporation === true,
        limited_liability_corporation: row.limited_liability_corporat === true,
        sole_proprietorship: row.sole_proprietorship === true,
        partnership_or_limited_liability: row.partnership_or_limited_lia === true,
      },
    };
  }
}
```

5. **`ContractTransformer` main module:**

```javascript
class ContractTransformer {
  constructor() {
    this.dateParser = DateParser;
    this.numericParser = NumericParser;
    this.enumMapper = EnumMapper;
    this.vendorAggregator = VendorClassificationAggregator;
  }

  transformProcurement(row) {
    return {
      system_metadata: this.buildSystemMetadata(row),
      common_elements: this.buildCommonElements(row),
      system_extensions: {
        contract_data: [this.buildContract DataExtension(row)]
      },
      financial_history: [], // Populated from award_financial join
      vendor_classifications: this.vendorAggregator.aggregateFlags(row)
    };
  }

  buildSystemMetadata(row) {
    return {
      primary_system: 'Contract Data',
      system_chain: [{
        system_name: 'Contract Data',
        record_id: row.piid,
        processed_date: new Date().toISOString(),
        transformation_rules: ['public_spending-v1'],
        data_quality: {
          completeness_score: this.calculateCompleteness(row),
          validation_status: 'VALID',
          last_validated: new Date().toISOString()
        }
      }],
      schema_version: '2.0',
      last_modified: row.updated_at,
      global_record_id: `contract_data:${row.unique_award_key}`,
      submission_id: row.submission_id?.toString(),
      job_id: row.job_id?.toString(),
      row_number: row.row_number,
      batch_timestamp: new Date().toISOString()
    };
  }

  buildCommonElements(row) {
    return {
      contract_identification: {
        piid: row.piid,
        original_award_piid: row.parent_award_id,
        referenced_piid: row.referenced_idv_agency_iden,
        modification_number: row.award_modification_amendme,
        contract_type: this.enumMapper.mapContractType(row.contract_award_type),
        pricing_type: row.type_of_contract_pricing,
        description_of_requirement: row.award_description,
        action_type: this.enumMapper.mapActionType(row.action_type),
        action_date: this.dateParser.parsePublic SpendingDate(row.action_date)
      },
      organization_info: {
        contracting_agency: {
          code: row.awarding_agency_code,
          name: row.awarding_agency_name
        },
        contracting_department: {
          code: row.awarding_sub_tier_agency_c,
          name: row.awarding_sub_tier_agency_n
        },
        contracting_office_code: row.awarding_office_code,
        contracting_office_name: row.awarding_office_name,
        funding_agency: {
          code: row.funding_agency_code,
          name: row.funding_agency_name
        },
        funding_department: {
          code: row.funding_sub_tier_agency_co,
          name: row.funding_sub_tier_agency_na
        },
        funding_office_code: row.funding_office_code,
        funding_office_name: row.funding_office_name
      },
      vendor_info: {
        vendor_name: row.awardee_or_recipient_legal,
        vendor_uei: row.awardee_or_recipient_uei,
        vendor_duns: row.awardee_or_recipient_uniqu,
        parent_vendor_name: row.ultimate_parent_legal_enti,
        parent_vendor_uei: row.ultimate_parent_uei,
        parent_vendor_duns: row.ultimate_parent_unique_ide,
        cage_code: row.cage_code,
        dba_name: row.entity_doing_business_as_n,
        address: {
          street_address1: row.legal_entity_address_line1,
          street_address2: row.legal_entity_address_line2,
          street_address3: row.legal_entity_address_line3,
          city: row.legal_entity_city_name,
          state: row.legal_entity_state_code,
          zip: row.legal_entity_zip4,
          country: row.legal_entity_country_code,
          congressional_district: row.legal_entity_congressional
        },
        phone: row.entity_phone_number,
        fax: row.entity_fax_number
      },
      place_of_performance: {
        city: row.place_of_performance_city,
        county: row.place_of_perform_county_na,
        state: row.place_of_perform_state_nam,
        zip: row.place_of_performance_zip4a,
        country: row.place_of_perform_country_n,
        congressional_district: row.place_of_performance_congr
      },
      financial_info: {
        total_contract_value: this.numericParser.parsePublic SpendingNumeric(row.current_total_value_award),
        potential_total_value: this.numericParser.parsePublic SpendingNumeric(row.potential_total_value_awar),
        base_and_all_options_value: this.numericParser.parsePublic SpendingNumeric(row.base_and_all_options_value),
        base_exercised_value: this.numericParser.parsePublic SpendingNumeric(row.base_exercised_options_val),
        federal_action_obligation: row.federal_action_obligation,
        total_obligated_amount: this.numericParser.parsePublic SpendingNumeric(row.total_obligated_amount)
      },
      business_classification: {
        naics_code: row.naics,
        naics_description: row.naics_description,
        psc_code: row.product_or_service_code,
        psc_description: row.product_or_service_co_desc,
        set_aside_type: row.type_set_aside,
        local_area_set_aside: row.local_area_set_aside === 'YES',
        extent_competed: row.extent_competed,
        solicitation_procedure: row.solicitation_procedures
      },
      contract_characteristics: {
        period_of_performance_start: this.dateParser.parsePublic SpendingDate(row.period_of_performance_star),
        period_of_performance_current_end: this.dateParser.parsePublic SpendingDate(row.period_of_performance_curr),
        period_of_performance_potential_end: this.dateParser.parsePublic SpendingDate(row.period_of_perf_potential_e),
        ordering_period_end: this.dateParser.parsePublic SpendingDate(row.ordering_period_end_date),
        government_furnished_property: row.government_furnished_prope === 'Y',
        contingency_operation: row.contingency_humanitarian_o === 'Y',
        multi_year_contract: row.multi_year_contract === 'Y',
        performance_based: row.performance_based_service === 'Y',
        commercial_item: row.commercial_item_acquisitio === 'Y'
      },
      status_info: {
        is_valid: row.is_valid === true,
        published_date: this.dateParser.parsePublic SpendingDate(row.last_modified),
        last_modified_date: this.dateParser.parsePublic SpendingDate(row.last_modified)
      }
    };
  }

  buildContract DataExtension(row) {
    return {
      field_name: 'contract_data_procurement_details',
      field_type: 'object',
      value: {
        solicitation_id: row.solicitation_identifier,
        solicitation_date: this.dateParser.parsePublic SpendingDate(row.solicitation_date),
        contract_financing: row.contract_financing,
        cas_applicability: row.cost_accounting_standards,
        cost_or_pricing_data: row.cost_or_pricing_data,
        clinger_cohen_compliance: row.clinger_cohen_act_planning,
        fair_act_action: row.a_76_fair_act_action,
        dod_claimant_code: row.dod_claimant_program_code,
        idv_type: row.idv_type,
        multiple_or_single_award: row.multiple_or_single_award_i,
        idc_type: row.type_of_idc
      }
    };
  }
}
```

**Testing Strategy:**

- [ ] Unit tests for each parser module (100+ test cases)
- [ ] Integration tests with sample Public Spending data
- [ ] Edge case handling (nulls, invalid formats, boundary values)
- [ ] Performance benchmarks (target: 1000 records/second per worker)

### 2.3 Data Loading & Storage

**Duration:** 1.5 weeks  
**Owner:** Data Engineering + Infrastructure Team  
**Deliverables:**

- [ ] Target database schema and indexes
- [ ] Bulk insert optimizations
- [ ] Upsert logic for incremental updates
- [ ] Partitioning strategy (by fiscal year or agency)
- [ ] Backup and recovery procedures
- [ ] Data retention policy implementation

**Storage Architecture:**

```yaml
target_database:
  type: postgresql # or MongoDB/DynamoDB depending on platform
  schema: schema_unification_contracts
  tables:
    - contracts (main table)
    - financial_history (time-series)
    - legacy_procurementance_listings (reference)

  indexing:
    primary:
      - global_record_id (unique)
      - piid
      - fain
    secondary:
      - awarding_agency_code
      - action_date
      - vendor_uei
      - fiscal_year
    full_text:
      - description_of_requirement

  partitioning:
    strategy: range
    key: action_date
    interval: yearly
```

**Loading Pipeline:**

```
Extract (Public Spending DB)
  ↓
Transform (Apply crosswalk)
  ↓
Validate (JSON Schema)
  ↓
Enrich (Join reference data)
  ↓
Load (Schema Unification DB)
  ↓
Update Watermark
```

### 2.4 Error Handling & Retry Logic

**Duration:** 1 week  
**Owner:** Data Engineering Team  
**Deliverables:**

- [ ] Error logging and categorization system
- [ ] Dead letter queue for failed records
- [ ] Retry policy with exponential backoff
- [ ] Alert configuration for critical failures
- [ ] Error dashboard and reporting

**Error Categories:**

| Category         | Severity | Action       | Example                |
| ---------------- | -------- | ------------ | ---------------------- |
| Parse Error      | Medium   | Log + Skip   | Invalid date format    |
| Validation Error | Medium   | Log + Skip   | Missing required field |
| Database Error   | High     | Retry 3x     | Connection timeout     |
| System Error     | Critical | Alert + Stop | Out of memory          |

**Retry Configuration:**

```yaml
retry_policy:
  max_attempts: 3
  initial_backoff: 1s
  max_backoff: 30s
  multiplier: 2
  retryable_errors:
    - ConnectionError
    - TimeoutError
    - DeadlockError
```

### 2.5 Performance Tuning

**Duration:** 1 week  
**Owner:** Data Engineering + Performance Team  
**Deliverables:**

- [ ] Benchmark results for single-threaded pipeline
- [ ] Parallel processing implementation (4-8 workers)
- [ ] Memory optimization (streaming vs batching)
- [ ] Query optimization (database indexes, query plans)
- [ ] Network optimization (connection pooling, compression)

**Target Performance:**

- Single worker: 500 records/second
- 4 workers: 2000 records/second
- 8 workers: 3500 records/second
- Full refresh (75M records): < 10 hours

---

## Phase 3: Validation & Testing (Weeks 10-12)

### 3.1 Data Quality Validation

**Duration:** 1.5 weeks  
**Owner:** QA + Data Engineering Team  
**Deliverables:**

- [ ] Automated validation test suite
- [ ] Sample comparison: Public Spending vs Schema Unification
- [ ] Statistical validation reports
- [ ] Data profiling and anomaly detection
- [ ] Quality metrics dashboard

**Validation Checks:**

```sql
-- Record count validation
SELECT
  'award_procurement' AS source_table,
  COUNT(*) AS source_count,
  (SELECT COUNT(*) FROM schema_unification_contracts WHERE primary_system = 'Contract Data') AS schema_unification_count,
  ABS(COUNT(*) - (SELECT COUNT(*) FROM schema_unification_contracts WHERE primary_system = 'Contract Data')) AS difference
FROM award_procurement;

-- Financial totals validation
SELECT
  'Total Contract Value' AS metric,
  SUM(CAST(current_total_value_award AS NUMERIC)) AS public_spending_total,
  (SELECT SUM(total_contract_value) FROM schema_unification_contracts WHERE primary_system = 'Contract Data') AS schema_unification_total
FROM award_procurement
WHERE current_total_value_award ~ '^[\d,.]+$';

-- Date range validation
SELECT
  MIN(action_date) AS min_date_usa,
  MAX(action_date) AS max_date_usa,
  (SELECT MIN(action_date) FROM schema_unification_contracts WHERE primary_system = 'Contract Data') AS min_date_schema_unification,
  (SELECT MAX(action_date) FROM schema_unification_contracts WHERE primary_system = 'Contract Data') AS max_date_schema_unification
FROM award_procurement;

-- Vendor UEI validation
SELECT
  COUNT(DISTINCT awardee_or_recipient_uei) AS unique_vendors_usa,
  (SELECT COUNT(DISTINCT vendor_uei) FROM schema_unification_contracts WHERE primary_system = 'Contract Data') AS unique_vendors_schema_unification
FROM award_procurement
WHERE awardee_or_recipient_uei IS NOT NULL AND awardee_or_recipient_uei != '';
```

**Quality Metrics:**

- **Completeness:** % of non-null required fields
- **Accuracy:** % of records matching source after round-trip
- **Consistency:** % of records passing business rule validation
- **Timeliness:** Average lag between source update and Schema Unification availability

### 3.2 Integration Testing

**Duration:** 1 week  
**Owner:** QA + Integration Team  
**Deliverables:**

- [ ] End-to-end pipeline test scenarios
- [ ] Incremental update test cases
- [ ] Backfill historical data test
- [ ] Concurrent execution tests
- [ ] Failure recovery tests
- [ ] Integration test report

**Test Scenarios:**

| Scenario            | Description              | Expected Result               |
| ------------------- | ------------------------ | ----------------------------- |
| Full Refresh        | Process all 75M records  | 100% ingested, < 1% errors    |
| Incremental Update  | Process last 24h changes | < 2 hour completion           |
| Historical Backfill | Load FY2020-2023 data    | Correct chronological order   |
| Concurrent Jobs     | Run 4 parallel workers   | No data corruption            |
| Database Failure    | Simulate DB outage       | Graceful retry, no data loss  |
| Schema Evolution    | Deploy schema v2.1       | Backward compatible transform |

### 3.3 User Acceptance Testing (UAT)

**Duration:** 0.5 weeks  
**Owner:** Product Team + Stakeholders  
**Deliverables:**

- [ ] UAT test plan and scenarios
- [ ] Sample data queries for stakeholder validation
- [ ] UAT execution and sign-off
- [ ] Feedback incorporation

---

## Phase 4: Production Deployment (Weeks 13-16)

### 4.1 Deployment Planning

**Duration:** 1 week  
**Owner:** DevOps + Data Engineering Team  
**Deliverables:**

- [ ] Production deployment runbook
- [ ] Rollback procedures
- [ ] Monitoring and alerting setup
- [ ] Capacity planning and resource provisioning
- [ ] Security review and compliance check

**Deployment Architecture:**

```
┌─────────────────────────┐
│   Public Spending (Source)  │
│   PostgreSQL Database   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   ETL Pipeline Workers  │
│   (4-8 parallel jobs)   │
│   - Extract             │
│   - Transform           │
│   - Validate            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Schema Unification Database     │
│  (PostgreSQL/DynamoDB)  │
│  - Contracts table      │
│  - Financial history    │
│  - Reference tables     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   GraphQL API Server    │
│   (Exposes Schema Unification    │
│    schema via GraphQL)  │
└─────────────────────────┘
```

### 4.2 Production Deployment

**Duration:** 1 week  
**Owner:** DevOps Team  
**Deliverables:**

- [ ] Production infrastructure provisioned
- [ ] ETL pipeline deployed to production
- [ ] Initial historical data load completed
- [ ] Smoke tests passed
- [ ] Production monitoring active

**Deployment Steps:**

1. **Day 1-2:** Infrastructure provisioning
   - Provision database (PostgreSQL RDS or equivalent)
   - Deploy ETL workers (Kubernetes pods or ECS tasks)
   - Configure networking (VPC, security groups, IAM roles)
   - Set up monitoring (CloudWatch, Prometheus, Grafana)

2. **Day 3-4:** Historical data load
   - Run backfill job for FY2020-2024 data
   - Monitor progress and error rates
   - Validate data quality post-load

3. **Day 5:** Incremental pipeline activation
   - Enable daily incremental update job
   - Verify watermark tracking
   - Test end-to-end latency

4. **Day 6-7:** Validation and optimization
   - Run production validation queries
   - Fine-tune worker configuration
   - Document operational procedures

### 4.3 Monitoring & Operations

**Duration:** 1 week  
**Owner:** DevOps + Data Engineering Team  
**Deliverables:**

- [ ] Operational runbook
- [ ] Monitoring dashboards (Grafana/Kibana)
- [ ] Alert definitions and escalation procedures
- [ ] Performance tuning based on production load
- [ ] Incident response procedures

**Monitoring Metrics:**

| Metric                 | Target    | Alert Threshold | Action                   |
| ---------------------- | --------- | --------------- | ------------------------ |
| Pipeline Success Rate  | 99%+      | < 95%           | Page on-call engineer    |
| Records Processed/Hour | 100K+     | < 50K           | Investigate performance  |
| Data Latency           | < 2 hours | > 4 hours       | Check for backlog        |
| Error Rate             | < 0.5%    | > 2%            | Review error logs        |
| Database CPU           | < 70%     | > 85%           | Scale up resources       |
| API Response Time      | < 500ms   | > 2s            | Check query optimization |

**Operational Procedures:**

- **Daily:** Review error logs, check pipeline health
- **Weekly:** Analyze data quality metrics, review performance trends
- **Monthly:** Capacity planning review, schema evolution planning
- **Quarterly:** Disaster recovery drill, security audit

### 4.4 Training & Handoff

**Duration:** 1 week  
**Owner:** Product Team + Technical Writing  
**Deliverables:**

- [ ] Operator training materials
- [ ] End-user documentation
- [ ] API documentation and examples
- [ ] Knowledge transfer sessions
- [ ] Support team onboarding

---

## Risk Management

### High-Risk Items

| Risk                           | Probability | Impact   | Mitigation                                     |
| ------------------------------ | ----------- | -------- | ---------------------------------------------- |
| Public Spending schema changes | Medium      | High     | Monitor schema, maintain version compatibility |
| Data quality issues in source  | High        | Medium   | Robust validation, error handling              |
| Performance degradation        | Medium      | High     | Load testing, horizontal scaling               |
| Production deployment failure  | Low         | Critical | Rollback plan, staging environment             |
| Stakeholder alignment          | Medium      | Medium   | Regular demos, UAT involvement                 |

### Contingency Plans

- **Schema Incompatibility:** Maintain backward-compatible transformation layer
- **Performance Issues:** Pre-scale infrastructure, optimize queries
- **Data Quality Failures:** Implement manual review queue for critical records
- **Production Incident:** 24/7 on-call rotation, runbook for common issues

---

## Success Criteria

### Technical Metrics

- [x] Schema parity: 95%+ field coverage
- [x] Data accuracy: 99%+ transformation accuracy
- [x] Performance: Process 100K+ records/hour
- [x] Availability: 99.5%+ pipeline uptime
- [x] Data quality: < 0.5% invalid records

### Business Metrics

- [ ] Stakeholder sign-off on UAT
- [ ] Production deployment with zero data loss
- [ ] API availability for downstream consumers
- [ ] Documentation complete and accessible
- [ ] Support team trained and operational

---

## Project Timeline

```
Weeks 1-3:   Phase 1 - Schema Enhancement
  Week 1:    Schema analysis & design
  Week 2:    Schema implementation
  Week 3:    Documentation & review

Weeks 4-9:   Phase 2 - ETL Pipeline Development
  Week 4-5:  Data source integration
  Week 6-8:  Transformation layer
  Week 9:    Data loading & error handling

Weeks 10-12: Phase 3 - Validation & Testing
  Week 10-11: Data quality validation
  Week 12:    Integration & UAT

Weeks 13-16: Phase 4 - Production Deployment
  Week 13:   Deployment planning
  Week 14:   Production deployment
  Week 15:   Monitoring & operations
  Week 16:   Training & handoff
```

---

## Appendix A: Technology Stack

| Component       | Technology                | Rationale                         |
| --------------- | ------------------------- | --------------------------------- |
| Source Database | PostgreSQL 13+            | Public Spending native format     |
| ETL Framework   | Apache Airflow or Node.js | Orchestration + scheduling        |
| Transformation  | JavaScript/TypeScript     | Native JSON handling              |
| Target Database | PostgreSQL or MongoDB     | Flexible schema support           |
| Monitoring      | Prometheus + Grafana      | Industry standard                 |
| Logging         | ELK Stack or CloudWatch   | Centralized logging               |
| API Layer       | GraphQL (Apollo Server)   | Matches Schema Unification schema |

---

## Appendix B: Glossary

- **CFDA:** Catalog of Federal Domestic Assistance (now Assistance Listings)
- **FABS:** Financial Assistance Broker Submission (grants/loans)
- **Contract Data:** Federal Procurement Data System (contracts)
- **GDSM:** Government-wide Data Standards Management
- **TAS:** Treasury Account Symbol
- **UEI:** Unique Entity Identifier (replaced DUNS)
- **Watermark:** Timestamp tracking last processed record

---

## Appendix C: References

- [Public Spending to Schema Unification Crosswalk](./public_spending-to-schema_unification-crosswalk.md)
- [Schema Unification Forest Schema v2.0](../../src/data/schema_unification.schema.json)
- [Public Spending API Documentation](https://api.public_spending.gov/)
- [Contract Data Data Dictionary](https://www.contract_data.gov/downloads/Contract Data-Atom-Feed-Usage-Guide.pdf)
- [Unified Model Technical Documentation](https://fiscal.treasury.gov/data-transparency/)

---

**Document Control:**

- Version: 1.0
- Last Updated: December 4, 2025
- Owner: Schema Unification Forest Data Integration Team
- Review Cycle: Bi-weekly during active development
- Approvers: Schema Architecture Team, Data Engineering Lead, Product Owner
