---
title: "Schema Unification V1 Schema - Entity Relationship Diagram"
description: "Entity relationship diagram showing the V1 core data model structure"
version: "1.0"
---

# Schema Unification V1 Schema - Entity Relationship Diagram

This diagram illustrates the entity relationship model for the V1 Schema Unification schema, showing the normalized structure for government contract data across Contract Data, Legacy Procurement, EASi, and Logistics Mgmt systems.

## Key Features

- **Normalized Schema** - Core metadata with versioning
- **Common Elements** - Shared fields across all systems
- **System-Specific Sections** - Dedicated sections for Contract Data, Legacy Procurement, EASi, and Logistics Mgmt
- **Relational Structure** - Clear foreign key relationships

## Entity Relationship Diagram

```mermaid
erDiagram
    NORMALIZED_SCHEMA {
        string schemaVersion "Schema version number for compatibility tracking"
        string sourceSystem "Source system: Contract Data, Legacy Procurement, Intake Process, or Logistics Mgmt"
        datetime lastModified "Timestamp of last record modification"
        string recordId PK "Unique identifier across all systems"
        decimal completenessScore "Data quality score from 0-1"
        datetime lastValidated "Timestamp of last data validation"
    }

    COMMON_ELEMENTS {
        string recordId PK "FK to NORMALIZED_SCHEMA - Record identifier"
        string contractTitle "Title or description of the contract"
        string contractType "Type of contract instrument"
        string contractingAgencyCode "Code identifying contracting agency"
        string contractingAgencyName "Name of contracting agency"
        string vendorName "Name of vendor providing goods/services"
        string vendorUei "Vendor Unique Entity Identifier"
        boolean isActive "Whether the contract is currently active"
        boolean isLatest "Whether this is the latest version"
        boolean isFunded "Whether the contract is currently funded"
    }

    CONTRACT_IDENTIFICATION {
        string piid PK "Procurement Instrument Identifier"
        string originalAwardPiid "Original Award PIID for reference tracking"
        string referencedPiid "Referenced PIID for related contracts"
        string contractTitle "Title or description of the contract"
        string contractType "Type of contract instrument"
        string descriptionOfRequirement "Detailed description of contract requirements"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    ORGANIZATION_INFO {
        string orgId PK "Organization record identifier"
        string contractingAgencyCode "Code for agency handling contract"
        string contractingAgencyName "Name of contracting agency"
        string contractingDepartmentCode "Code for contracting department"
        string contractingDepartmentName "Name of contracting department"
        string fundingAgencyCode "Code for agency providing funding"
        string fundingAgencyName "Name of funding agency"
        string fundingDepartmentCode "Code for funding department"
        string fundingDepartmentName "Name of funding department"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    VENDOR_INFO {
        string vendorId PK "Vendor record identifier"
        string vendorName "Legal name of vendor organization"
        string vendorUei "Unique Entity Identifier in Entity Management"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    PLACE_OF_PERFORMANCE {
        string perfId PK "Performance location identifier"
        string streetAddress "Street address where work performed"
        string city "City where contract work carried out"
        string county "County for performance location"
        string state "State where contract work performed"
        string zip "ZIP code for performance location"
        string country "Country where work delivered"
        string congressionalDistrict "Congressional district for location"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    FINANCIAL_INFO {
        string finId PK "Financial record identifier"
        decimal totalContractValue "Total contract value including modifications"
        decimal baseAndAllOptionsValue "Base contract plus all option periods"
        decimal independentGovernmentEstimate "IGE amount for procurement"
        decimal amountSpentOnProduct "Amount spent on specific products"
        string contractFiscalYear "Fiscal year when contract awarded"
        string reportSubmittedFiscalYear "Fiscal year when report submitted"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    BUSINESS_CLASSIFICATION {
        string bizId PK "Business classification identifier"
        string naicsCode "NAICS classification code"
        string naicsDescription "NAICS code description"
        string pscCode "Product Service Code identifier"
        string pscDescription "PSC detailed description"
        string categoryOfProduct "General product category classification"
        string typeOfProduct "Specific product type being contracted"
        string setAsideType "Type of set-aside program applied"
        boolean localAreaSetAside "Whether local area set-aside applies"
        string coSizeDetermination "Contracting Officer size determination"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    CONTRACT_CHARACTERISTICS {
        string charId PK "Contract characteristics identifier"
        string emergencyAcquisition "Emergency acquisition classification"
        boolean governmentFurnishedProperty "Whether GFP provided under action"
        boolean includesCui "Includes Controlled Unclassified Information"
        boolean recurringService "Whether involves recurring services"
        boolean recurringUtilities "Whether involves recurring utilities"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    Contract Data_SPECIFIC {
        string contract_dataId PK "Contract Data-specific data identifier"
        string programNumber "Federal program number"
        array alternativeNames "Alternative program names"
        string objective "Program objective description"
        string website "Program website URL"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    Legacy Procurement_SPECIFIC {
        string legacy_procurementId PK "Legacy Procurement-specific data identifier"
        string iaPiidOrUniqueId "IA PIID or unique identifier"
        string natureOfAcquisition "Nature of acquisition relationship"
        string clientOrganizationName "Client organization name"
        string typeOfIdc "Type of IDC"
        string whoCanUseIdc "Who can use the IDC"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    Intake Process_SPECIFIC {
        string intake_processId PK "EASi-specific data identifier"
        string businessOwner "EASi Business Owner"
        string systemOwner "EASi System Owner"
        decimal unitPrice "Unit Price at CLIN level"
        string unitOfMeasure "Unit of Measure"
        string optional "Option Period or Not Applicable"
        string notToExceed "Not to Exceed field"
        string notSeparatelyPriced "Maps to Qualifier at CLIN level"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    Logistics Mgmt_SPECIFIC {
        string logistics_mgmtId PK "Logistics Mgmt-specific data identifier"
        string logistics_mgmtField1 "Logistics Mgmt-specific field 1"
        string logistics_mgmtField2 "Logistics Mgmt-specific field 2"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }

    NORMALIZED_SCHEMA ||--|| COMMON_ELEMENTS : contains
    COMMON_ELEMENTS ||--|| CONTRACT_IDENTIFICATION : includes
    COMMON_ELEMENTS ||--|| ORGANIZATION_INFO : includes
    COMMON_ELEMENTS ||--|| VENDOR_INFO : includes
    COMMON_ELEMENTS ||--|| PLACE_OF_PERFORMANCE : includes
    COMMON_ELEMENTS ||--|| FINANCIAL_INFO : includes
    COMMON_ELEMENTS ||--|| BUSINESS_CLASSIFICATION : includes
    COMMON_ELEMENTS ||--|| CONTRACT_CHARACTERISTICS : includes
    COMMON_ELEMENTS ||--o| Contract Data_SPECIFIC : "may have Contract Data data"
    COMMON_ELEMENTS ||--o| Legacy Procurement_SPECIFIC : "may have Legacy Procurement data"
    COMMON_ELEMENTS ||--o| Intake Process_SPECIFIC : "may have EASi data"
    COMMON_ELEMENTS ||--o| Logistics Mgmt_SPECIFIC : "may have Logistics Mgmt data"
```

## Key Entities

### Core Structure

- **NORMALIZED_SCHEMA** - Root entity containing schema version, source system, and data quality metrics
- **COMMON_ELEMENTS** - Central hub for shared contract data across all systems

### Standard Sections

- **CONTRACT_IDENTIFICATION** - PIID, contract title, and requirement descriptions
- **ORGANIZATION_INFO** - Contracting and funding agency/department information
- **VENDOR_INFO** - Vendor identification and Entity Management registration
- **PLACE_OF_PERFORMANCE** - Geographic location details
- **FINANCIAL_INFO** - Contract values, IGE, and fiscal year information
- **BUSINESS_CLASSIFICATION** - NAICS, PSC codes, and set-aside programs
- **CONTRACT_CHARACTERISTICS** - Emergency acquisition, GFP, CUI flags

### System-Specific Extensions

- **Contract Data_SPECIFIC** - Federal Procurement Data System fields
- **Legacy Procurement_SPECIFIC** - Legacy Procurement system interagency agreement fields
- **Intake Process_SPECIFIC** - EASi system CLIN-level pricing fields
- **Logistics Mgmt_SPECIFIC** - Logistics Mgmt system placeholder fields

## Design Principles

1. **Single Source of Truth** - One normalized schema for all systems
2. **System Flexibility** - Optional system-specific sections
3. **Data Quality** - Built-in completeness scoring and validation
4. **Version Tracking** - Schema version and last modified timestamps
5. **Relational Integrity** - Clear foreign key relationships

## Related Documentation

- [V1 Schema Documentation](schema_unification.schema.json)
- [V1 vs V2 Comparison](V1-VS-V2-SCHEMA-COMPARISON)
- [V1 vs V2 Quick Reference](V1-VS-V2-QUICK-REFERENCE)
- [Schema Pipeline](schema-pipeline)

---

_This is the V1 (Stable) schema diagram. For the enhanced V2 schema with system chain tracking, see [V2 Entity Relationship Diagram](schema_unification-v2-diagram)._
