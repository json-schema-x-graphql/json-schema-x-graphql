# Common Core Schema to Treasury FMR Data Elements Crosswalk

## Overview

This crosswalk maps fields from our Common Core Schema to the Treasury's Financial Management Reference (FMR) Data Elements API. The FMR provides standardized data elements for federal financial management and reporting.

https://fiscal.treasury.gov/data-registry/index.html
https://fiscaldata.treasury.gov/api-documentation/
https://github.com/fedspendingtransparency/public_spending-api

## API Reference Information

- **Base URL**: `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/reference/data_registry/fmr_data_elements`
- **Purpose**: Federal financial reporting standardization
- **Scope**: Financial management data elements across federal agencies

## Field Mapping Categories

### 1. Financial Data Elements

| Common Core Field                             | FMR Data Element          | FMR Field Name           | Mapping Type  | Notes                                           |
| --------------------------------------------- | ------------------------- | ------------------------ | ------------- | ----------------------------------------------- |
| `financialInfo.totalContractValue`            | Award Amount              | `award_amount`           | Direct        | Total contract value for federal reporting      |
| `financialInfo.baseAndAllOptionsValue`        | Base Contract Value       | `base_contract_value`    | Direct        | Base award plus all option periods              |
| `financialInfo.independentGovernmentEstimate` | Government Estimate       | `government_estimate`    | Direct        | IGE for procurement actions                     |
| `financialInfo.amountSpentOnProduct`          | Obligation Amount         | `obligation_amount`      | Direct        | Amount obligated for specific products/services |
| `financialInfo.contractFiscalYear`            | Fiscal Year               | `fiscal_year`            | Direct        | FY when contract was awarded                    |
| `financialInfo.obligations[].fiscalYear`      | Reporting Fiscal Year     | `reporting_fiscal_year`  | Array Mapping | Multi-year obligation reporting                 |
| `financialInfo.obligations[].amount`          | Obligation by Fiscal Year | `fiscal_year_obligation` | Array Mapping | Annual obligation amounts                       |

### 2. Agency and Organization Elements

| Common Core Field                             | FMR Data Element        | FMR Field Name            | Mapping Type | Notes                        |
| --------------------------------------------- | ----------------------- | ------------------------- | ------------ | ---------------------------- |
| `organizationInfo.contractingAgency.code`     | Contracting Agency Code | `contracting_agency_code` | Direct       | Federal agency identifier    |
| `organizationInfo.contractingAgency.name`     | Contracting Agency Name | `contracting_agency_name` | Direct       | Official agency name         |
| `organizationInfo.fundingAgency.code`         | Funding Agency Code     | `funding_agency_code`     | Direct       | Agency providing funding     |
| `organizationInfo.fundingAgency.name`         | Funding Agency Name     | `funding_agency_name`     | Direct       | Funding agency official name |
| `organizationInfo.contractingDepartment.code` | Department Code         | `department_code`         | Direct       | Department/bureau identifier |
| `organizationInfo.contractingDepartment.name` | Department Name         | `department_name`         | Direct       | Department/bureau name       |

### 3. Contract Identification Elements

| Common Core Field                          | FMR Data Element          | FMR Field Name              | Mapping Type | Notes                            |
| ------------------------------------------ | ------------------------- | --------------------------- | ------------ | -------------------------------- |
| `contractIdentification.piid`              | Procurement Instrument ID | `procurement_instrument_id` | Direct       | Primary contract identifier      |
| `contractIdentification.originalAwardPiid` | Original Award ID         | `original_award_id`         | Direct       | Base award reference             |
| `contractIdentification.contractType`      | Contract Type Code        | `contract_type_code`        | Enumeration  | Standardized contract type codes |
| `systemMetadata.globalRecordId`            | Unique Transaction ID     | `unique_transaction_id`     | Derived      | Global identifier for reporting  |

### 4. Vendor and Business Partner Elements

| Common Core Field                          | FMR Data Element         | FMR Field Name             | Mapping Type | Notes                               |
| ------------------------------------------ | ------------------------ | -------------------------- | ------------ | ----------------------------------- |
| `vendorInfo.vendorName`                    | Vendor Name              | `vendor_name`              | Direct       | Legal business name                 |
| `vendorInfo.vendorUei`                     | Unique Entity Identifier | `unique_entity_identifier` | Direct       | Entity Management.gov UEI           |
| `businessClassification.naicsCode`         | NAICS Code               | `naics_code`               | Direct       | Industry classification             |
| `businessClassification.setAsideType`      | Set Aside Type           | `set_aside_type`           | Enumeration  | Small business set-aside categories |
| `businessClassification.localAreaSetAside` | Local Area Preference    | `local_area_preference`    | Boolean      | Geographic preference indicator     |

### 5. Geographic and Location Elements

| Common Core Field                          | FMR Data Element       | FMR Field Name           | Mapping Type | Notes                            |
| ------------------------------------------ | ---------------------- | ------------------------ | ------------ | -------------------------------- |
| `placeOfPerformance.state`                 | Performance State      | `performance_state_code` | Direct       | State where work performed       |
| `placeOfPerformance.city`                  | Performance City       | `performance_city`       | Direct       | City of performance              |
| `placeOfPerformance.zip`                   | Performance ZIP        | `performance_zip_code`   | Direct       | ZIP code of performance location |
| `placeOfPerformance.congressionalDistrict` | Congressional District | `congressional_district` | Direct       | Political boundary identifier    |
| `placeOfPerformance.country`               | Country Code           | `country_code`           | Direct       | Country of performance           |

### 6. Compliance and Regulatory Elements

| Common Core Field                                     | FMR Data Element       | FMR Field Name                  | Mapping Type  | Notes                      |
| ----------------------------------------------------- | ---------------------- | ------------------------------- | ------------- | -------------------------- |
| `contractCharacteristics.emergencyAcquisition`        | Emergency Indicator    | `emergency_acquisition_flag`    | Boolean       | Emergency procurement flag |
| `contractCharacteristics.governmentFurnishedProperty` | GFP Indicator          | `government_furnished_property` | Boolean       | GFP provided flag          |
| `contractCharacteristics.includesCui`                 | CUI Indicator          | `controlled_unclassified_info`  | Boolean       | Security classification    |
| `compliance.auditRequirements[].questionCode`         | Audit Requirement Code | `audit_requirement_code`        | Array Mapping | Federal audit requirements |

### 7. Status and Temporal Elements

| Common Core Field                          | FMR Data Element       | FMR Field Name           | Mapping Type | Notes                     |
| ------------------------------------------ | ---------------------- | ------------------------ | ------------ | ------------------------- |
| `statusInfo.status`                        | Contract Status        | `contract_status_code`   | Enumeration  | Lifecycle status          |
| `statusInfo.publishedDate`                 | Award Date             | `award_date`             | Direct       | Date contract was awarded |
| `statusInfo.lastModifiedDate`              | Last Modified Date     | `last_modified_date`     | Direct       | Most recent modification  |
| `statusInfo.contractCompleteDate`          | Completion Date        | `completion_date`        | Direct       | Contract completion date  |
| `statusInfo.periodOfPerformance.startDate` | Performance Start Date | `performance_start_date` | Direct       | Work start date           |
| `statusInfo.periodOfPerformance.endDate`   | Performance End Date   | `performance_end_date`   | Direct       | Work completion date      |

## Crosswalk Implementation

### Python Mapping Functions

```python
# File: /Workspace/Shared/common_core/crosswalk/fmr_mapping.py

from pyspark.sql import DataFrame
from pyspark.sql.functions import *
from pyspark.sql.types import *
import json

class FMRCrosswalk:
    """Maps Common Core Schema fields to Treasury FMR Data Elements"""

    def __init__(self):
        self.fmr_mapping = self._load_fmr_mappings()

    def _load_fmr_mappings(self):
        """Load FMR field mappings configuration"""
        return {
            # Financial mappings
            "financial_elements": {
                "award_amount": "total_contract_value",
                "base_contract_value": "base_and_all_options_value",
                "government_estimate": "independent_government_estimate",
                "obligation_amount": "amount_spent_on_product",
                "fiscal_year": "contract_fiscal_year"
            },

            # Agency mappings
            "agency_elements": {
                "contracting_agency_code": "contracting_agency_code",
                "contracting_agency_name": "contracting_agency_name",
                "funding_agency_code": "funding_agency_code",
                "funding_agency_name": "funding_agency_name",
                "department_code": "contracting_department_code",
                "department_name": "contracting_department_name"
            },

            # Contract identification mappings
            "contract_elements": {
                "procurement_instrument_id": "piid",
                "original_award_id": "original_award_piid",
                "contract_type_code": "contract_type",
                "unique_transaction_id": "global_record_id"
            },

            # Vendor mappings
            "vendor_elements": {
                "vendor_name": "vendor_name",
                "unique_entity_identifier": "vendor_uei",
                "naics_code": "naics_code",
                "set_aside_type": "set_aside_type",
                "local_area_preference": "local_area_set_aside"
            },

            # Geographic mappings
            "geographic_elements": {
                "performance_state_code": "performance_state",
                "performance_city": "performance_city",
                "performance_zip_code": "performance_zip",
                "congressional_district": "performance_congressional_district",
                "country_code": "performance_country"
            },

            # Compliance mappings
            "compliance_elements": {
                "emergency_acquisition_flag": "emergency_acquisition",
                "government_furnished_property": "government_furnished_property",
                "controlled_unclassified_info": "includes_cui"
            },

            # Status mappings
            "status_elements": {
                "contract_status_code": "status",
                "award_date": "published_date",
                "last_modified_date": "last_modified_date",
                "completion_date": "contract_complete_date"
            }
        }

    def transform_to_fmr_format(self, df: DataFrame) -> DataFrame:
        """Transform Common Core DataFrame to FMR format"""

        # Create FMR-compliant structure
        fmr_df = df.select(
            # Financial Elements
            col("total_contract_value").alias("award_amount"),
            col("base_and_all_options_value").alias("base_contract_value"),
            col("independent_government_estimate").alias("government_estimate"),
            col("amount_spent_on_product").alias("obligation_amount"),
            col("contract_fiscal_year").alias("fiscal_year"),

            # Agency Elements
            col("contracting_agency_code").alias("contracting_agency_code"),
            col("contracting_agency_name").alias("contracting_agency_name"),
            col("funding_agency_code").alias("funding_agency_code"),
            col("funding_agency_name").alias("funding_agency_name"),
            col("contracting_department_code").alias("department_code"),
            col("contracting_department_name").alias("department_name"),

            # Contract Elements
            col("piid").alias("procurement_instrument_id"),
            col("original_award_piid").alias("original_award_id"),
            col("contract_type").alias("contract_type_code"),
            col("global_record_id").alias("unique_transaction_id"),

            # Vendor Elements
            col("vendor_name").alias("vendor_name"),
            col("vendor_uei").alias("unique_entity_identifier"),
            col("naics_code").alias("naics_code"),
            col("set_aside_type").alias("set_aside_type"),
            col("local_area_set_aside").alias("local_area_preference"),

            # Geographic Elements
            col("performance_state").alias("performance_state_code"),
            col("performance_city").alias("performance_city"),
            col("performance_zip").alias("performance_zip_code"),
            col("performance_congressional_district").alias("congressional_district"),
            col("performance_country").alias("country_code"),

            # Compliance Elements
            when(col("emergency_acquisition").isNotNull(), True).otherwise(False).alias("emergency_acquisition_flag"),
            col("government_furnished_property").alias("government_furnished_property"),
            col("includes_cui").alias("controlled_unclassified_info"),

            # Status Elements
            col("status").alias("contract_status_code"),
            col("published_date").alias("award_date"),
            col("last_modified_date").alias("last_modified_date"),
            col("contract_complete_date").alias("completion_date"),

            # Metadata
            current_timestamp().alias("fmr_export_timestamp"),
            lit("common_core_v2.0").alias("source_schema_version")
        )

        return fmr_df

    def validate_fmr_compliance(self, df: DataFrame) -> DataFrame:
        """Validate data against FMR requirements"""

        validation_df = df.withColumn("fmr_validation",
            struct(
                # Required field validations
                when(col("procurement_instrument_id").isNull(), "Missing PIID")
                    .otherwise("Valid").alias("piid_validation"),

                when(col("contracting_agency_code").isNull(), "Missing Agency Code")
                    .otherwise("Valid").alias("agency_validation"),

                when(col("award_amount").isNull() | (col("award_amount") <= 0), "Invalid Award Amount")
                    .otherwise("Valid").alias("amount_validation"),

                when(col("fiscal_year").isNull(), "Missing Fiscal Year")
                    .otherwise("Valid").alias("fiscal_year_validation"),

                # Data quality checks
                when(col("vendor_name").isNull(), "Missing Vendor Name")
                    .otherwise("Valid").alias("vendor_validation"),

                when(col("performance_state_code").isNull(), "Missing Performance State")
                    .otherwise("Valid").alias("location_validation"
            )
        )

        return validation_df

# Usage example
fmr_crosswalk = FMRCrosswalk()
```

### SQL Transformation Views

```sql
-- File: /Workspace/Shared/sql/fmr_crosswalk_views.sql (continued)

-- Create FMR-compliant view of Common Core data
CREATE OR REPLACE VIEW common_core_catalog.gold.fmr_data_elements AS
SELECT
    -- Financial Elements
    total_contract_value AS award_amount,
    base_and_all_options_value AS base_contract_value,
    independent_government_estimate AS government_estimate,
    amount_spent_on_product AS obligation_amount,
    contract_fiscal_year AS fiscal_year,

    -- Agency Elements
    contracting_agency_code,
    contracting_agency_name,
    funding_agency_code,
    funding_agency_name,
    contracting_department_code AS department_code,
    contracting_department_name AS department_name,

    -- Contract Elements
    piid AS procurement_instrument_id,
    original_award_piid AS original_award_id,
    contract_type AS contract_type_code,
    global_record_id AS unique_transaction_id,

    -- Vendor Elements
    vendor_name,
    vendor_uei AS unique_entity_identifier,
    naics_code,
    set_aside_type,
    local_area_set_aside AS local_area_preference,

    -- Geographic Elements
    performance_state AS performance_state_code,
    performance_city,
    performance_zip AS performance_zip_code,
    performance_congressional_district AS congressional_district,
    performance_country AS country_code,

    -- Compliance Elements
    CASE WHEN emergency_acquisition IS NOT NULL THEN TRUE ELSE FALSE END AS emergency_acquisition_flag,
    government_furnished_property,
    includes_cui AS controlled_unclassified_info,

    -- Status Elements
    status AS contract_status_code,
    published_date AS award_date,
    last_modified_date,
    contract_complete_date AS completion_date,

    -- Performance Period Elements
    CASE
        WHEN status_info_json:periodOfPerformance.startDate IS NOT NULL
        THEN status_info_json:periodOfPerformance.startDate::DATE
    END AS performance_start_date,
    CASE
        WHEN status_info_json:periodOfPerformance.endDate IS NOT NULL
        THEN status_info_json:periodOfPerformance.endDate::DATE
    END AS performance_end_date,

    -- Audit and Compliance Tracking
    CASE WHEN contacts IS NOT NULL THEN TRUE ELSE FALSE END AS has_contact_info,
    is_active AS active_status,
    is_latest AS current_version_flag,
    is_funded AS funding_status,

    -- ETL Metadata for FMR Reporting
    etl_created_at AS fmr_record_created,
    etl_updated_at AS fmr_record_updated,
    etl_batch_id AS fmr_batch_identifier,
    current_timestamp() AS fmr_export_timestamp,
    'common_core_v2.0' AS source_schema_version

FROM common_core_catalog.gold.common_core_contracts
WHERE is_latest = TRUE
  AND is_active = TRUE;

-- Create aggregated financial summary view for FMR reporting
CREATE OR REPLACE VIEW common_core_catalog.gold.fmr_financial_summary AS
SELECT
    contract_fiscal_year AS fiscal_year,
    contracting_agency_code,
    contracting_agency_name,
    COUNT(*) AS total_contracts,
    SUM(total_contract_value) AS total_contract_value_sum,
    SUM(base_and_all_options_value) AS total_baov_sum,
    SUM(amount_spent_on_product) AS total_obligations_sum,
    AVG(total_contract_value) AS average_contract_value,
    COUNT(CASE WHEN emergency_acquisition IS NOT NULL THEN 1 END) AS emergency_acquisitions_count,
    COUNT(CASE WHEN local_area_set_aside = TRUE THEN 1 END) AS local_set_aside_count,
    COUNT(CASE WHEN government_furnished_property = TRUE THEN 1 END) AS gfp_contracts_count,
    current_timestamp() AS report_generated_at
FROM common_core_catalog.gold.fmr_data_elements
GROUP BY contract_fiscal_year, contracting_agency_code, contracting_agency_name
ORDER BY fiscal_year DESC, contracting_agency_code;
```
