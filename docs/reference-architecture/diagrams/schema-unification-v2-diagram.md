---
title: "Schema Unification V2 Schema - Entity Relationship Diagram"
description: "Entity relationship diagram showing the enhanced V2 data model with system chain tracking"
version: "2.0"
---

# Schema Unification V2 Schema - Entity Relationship Diagram

This diagram illustrates the enhanced V2 entity relationship model for the Schema Unification schema, featuring system chain tracking, data quality metrics, and typed system extensions for government contract data.

## Key Enhancements in V2

- **System Chain Tracking** - Track data flow through multiple systems
- **Data Quality Metrics** - Per-system quality scoring and validation
- **Typed Extensions** - Strongly-typed system-specific extensions
- **Enhanced Metadata** - Global record IDs and modification tracking
- **Hierarchical Structure** - Clear separation of common and system-specific data

## Entity Relationship Diagram

```mermaid
---
config:
  layout: elk
---
erDiagram
    CONTRACT {
        string globalRecordId PK "Global unique identifier across all systems"
        string schemaVersion "Schema version (2.0)"
    }
    
    SYSTEM_METADATA {
        string globalRecordId PK "FK to CONTRACT"
        string primarySystem "Primary source: Contract Data, Legacy Procurement, Intake Process, Logistics Mgmt"
        string schemaVersion "Version 2.0"
        datetime lastModified "Last modification timestamp"
    }
    
    SYSTEM_CHAIN_ENTRY {
        string chainId PK "System chain entry identifier"
        string globalRecordId FK "FK to SYSTEM_METADATA"
        string systemName "System in chain: Contract Data, Legacy Procurement, Intake Process, Logistics Mgmt"
        string recordId "System-specific record ID"
        datetime processedDate "When data was processed"
        array transformationRules "Applied transformation rules"
    }
    
    DATA_QUALITY {
        string qualityId PK "Data quality record identifier"
        string chainId FK "FK to SYSTEM_CHAIN_ENTRY"
        decimal completenessScore "Score 0-1"
        array validationErrors "List of validation errors"
        datetime lastValidated "Last validation timestamp"
    }
    
    COMMON_ELEMENTS {
        string commonId PK "Common elements identifier"
        string globalRecordId FK "FK to CONTRACT"
    }
    
    CONTRACT_IDENTIFICATION {
        string identId PK "Contract identification identifier"
        string commonId FK "FK to COMMON_ELEMENTS"
        string piid "Procurement Instrument Identifier"
        string originalAwardPiid "Original Award PIID"
        string referencedPiid "Referenced PIID for related contracts"
        string contractTitle "Title or description of contract"
        string contractType "Type of contract instrument"
        string descriptionOfRequirement "Detailed description"
    }
    
    ORGANIZATION_INFO {
        string orgId PK "Organization info identifier"
        string commonId FK "FK to COMMON_ELEMENTS"
    }
    
    AGENCY_INFO_CONTRACTING {
        string agencyId PK "Contracting agency identifier"
        string orgId FK "FK to ORGANIZATION_INFO"
        string code "Agency or Department Code"
        string name "Agency or Department Name"
        string role "contracting_agency"
    }
    
    AGENCY_INFO_FUNDING {
        string agencyId PK "Funding agency identifier"
        string orgId FK "FK to ORGANIZATION_INFO"
        string code "Agency or Department Code"
        string name "Agency or Department Name"
        string role "funding_agency"
    }
    
    AGENCY_INFO_CONTRACTING_DEPT {
        string deptId PK "Contracting dept identifier"
        string orgId FK "FK to ORGANIZATION_INFO"
        string code "Department Code"
        string name "Department Name"
        string role "contracting_department"
    }
    
    AGENCY_INFO_FUNDING_DEPT {
        string deptId PK "Funding dept identifier"
        string orgId FK "FK to ORGANIZATION_INFO"
        string code "Department Code"
        string name "Department Name"
        string role "funding_department"
    }
    
    VENDOR_INFO {
        string vendorId PK "Vendor info identifier"
        string commonId FK "FK to COMMON_ELEMENTS"
        string vendorName "Name of vendor providing goods/services"
        string vendorUei "Vendor Unique Entity Identifier"
    }
    
    PLACE_OF_PERFORMANCE {
        string perfId PK "Performance location identifier"
        string commonId FK "FK to COMMON_ELEMENTS"
        string streetAddress "Street address where work performed"
        string city "City where contract work carried out"
        string county "County for performance location"
        string state "State where contract work performed"
        string zip "ZIP code for performance location"
        string country "Country where work delivered"
        string congressionalDistrict "Congressional district"
    }
    
    FINANCIAL_INFO {
        string finId PK "Financial record identifier"
        string commonId FK "FK to COMMON_ELEMENTS"
        decimal totalContractValue "Total value including modifications"
        decimal baseAndAllOptionsValue "Base plus all option periods"
        decimal independentGovernmentEstimate "IGE amount"
        decimal amountSpentOnProduct "Amount spent on products"
        string contractFiscalYear "Fiscal year when awarded"
    }
    
    BUSINESS_CLASSIFICATION {
        string bizId PK "Business classification identifier"
        string commonId FK "FK to COMMON_ELEMENTS"
        string naicsCode "NAICS classification code"
        string naicsDescription "NAICS code description"
        string pscCode "Product Service Code"
        string pscDescription "PSC detailed description"
        string categoryOfProduct "General product category"
        string typeOfProduct "Specific product type"
        string setAsideType "Set-aside program type"
        boolean localAreaSetAside "Local area set-aside flag"
        string coSizeDetermination "CO size determination"
    }
    
    CONTRACT_CHARACTERISTICS {
        string charId PK "Contract characteristics identifier"
        string commonId FK "FK to COMMON_ELEMENTS"
        string emergencyAcquisition "Emergency acquisition classification"
        boolean governmentFurnishedProperty "GFP provided flag"
        boolean includesCui "Includes CUI flag"
        boolean recurringService "Recurring services flag"
        boolean recurringUtilities "Recurring utilities flag"
    }
    
    CONTACT {
        string contactId PK "Contact identifier"
        string commonId FK "FK to COMMON_ELEMENTS"
        string name "Contact name"
        string title "Contact title"
        string email "Contact email address"
        string phone "Contact phone number"
        string role "primary, technical, administrative, contracting_officer"
    }
    
    STATUS_INFO {
        string statusId PK "Status info identifier"
        string commonId FK "FK to COMMON_ELEMENTS"
        boolean isActive "Currently active flag"
        boolean isLatest "Latest version flag"
        boolean isFunded "Currently funded flag"
        string status "draft, published, awarded, completed, cancelled"
        datetime publishedDate "When published"
        datetime lastModifiedDate "Last modification date"
        date contractCompleteDate "Contract completion date"
        date lastCarDateSigned "Last CAR signed date"
    }
    
    SYSTEM_EXTENSIONS {
        string extId PK "System extensions identifier"
        string globalRecordId FK "FK to CONTRACT"
    }
    
    Contract Data_EXTENSION {
        string contract_dataExtId PK "Contract Data extension identifier"
        string extId FK "FK to SYSTEM_EXTENSIONS"
        string fieldName "Field name"
        string fieldType "Field type"
        string value "Field value"
    }
    
    Contract Data_SPECIFIC_DATA {
        string contract_dataDataId PK "Contract Data specific data identifier"
        string contract_dataExtId FK "FK to Contract Data_EXTENSION"
        string programNumber "Program number"
        array alternativeNames "Alternative names"
        string objective "Program objective"
        string website "Program website URL"
    }
    
    Contract Data_Legacy ProcurementANCE_TYPE {
        string legacy_procurementTypeId PK "Contract Data legacy_procurementance type identifier"
        string contract_dataDataId FK "FK to Contract Data_SPECIFIC_DATA"
        string code "Assistance type code"
        string value "Assistance type value"
        integer level "Assistance level"
    }
    
    Contract Data_ELIGIBILITY {
        string eligId PK "Contract Data eligibility identifier"
        string contract_dataDataId FK "FK to Contract Data_SPECIFIC_DATA"
        string additionalInfo "Additional eligibility info"
    }
    
    Contract Data_APPLICANT_BENEFICIARY_TYPE {
        string abTypeId PK "Applicant/Beneficiary type ID"
        string eligId FK "FK to Contract Data_ELIGIBILITY"
        string value "Type value"
        string code "Type code"
        string typeCategory "applicant or beneficiary"
    }
    
    Contract Data_USAGE {
        string usageId PK "Contract Data usage identifier"
        string contract_dataDataId FK "FK to Contract Data_SPECIFIC_DATA"
        string rules "Usage rules"
        string restrictions "Usage restrictions"
        string loanTerms "Loan terms if applicable"
        string discretionaryFund "Discretionary fund info"
    }
    
    Legacy Procurement_EXTENSION {
        string legacy_procurementExtId PK "Legacy Procurement extension identifier"
        string extId FK "FK to SYSTEM_EXTENSIONS"
        string fieldName "Field name"
        string fieldType "Field type"
        string value "Field value"
    }
    
    Legacy Procurement_SPECIFIC_DATA {
        string legacy_procurementDataId PK "Legacy Procurement specific data identifier"
        string legacy_procurementExtId FK "FK to Legacy Procurement_EXTENSION"
    }
    
    Legacy Procurement_ACQUISITION_DATA {
        string acqId PK "Legacy Procurement acquisition data identifier"
        string legacy_procurementDataId FK "FK to Legacy Procurement_SPECIFIC_DATA"
        string iaPiidOrUniqueId "IA PIID or unique ID"
        string natureOfAcquisition "Nature of acquisition relationship"
    }
    
    Legacy Procurement_CLIENT_DATA {
        string clientId PK "Legacy Procurement client data identifier"
        string legacy_procurementDataId FK "FK to Legacy Procurement_SPECIFIC_DATA"
        string clientOrganizationName "Client organization name"
    }
    
    Legacy Procurement_OFFICE_ADDRESS {
        string officeAddrId PK "Legacy Procurement office address identifier"
        string clientId FK "FK to Legacy Procurement_CLIENT_DATA"
        string streetAddress1 "Office street address"
        string city "Office city"
        string state "Office state"
    }
    
    Legacy Procurement_AWARD_DATA {
        string awardId PK "Legacy Procurement award data identifier"
        string legacy_procurementDataId FK "FK to Legacy Procurement_SPECIFIC_DATA"
        string typeOfIdc "Type of IDC"
        string whoCanUseIdc "Who can use IDC"
    }
    
    Intake Process_EXTENSION {
        string intake_processExtId PK "EASi extension identifier"
        string extId FK "FK to SYSTEM_EXTENSIONS"
        string fieldName "Field name"
        string fieldType "Field type"
        string value "Field value"
    }
    
    Intake Process_SPECIFIC_DATA {
        string intake_processDataId PK "EASi specific data identifier"
        string intake_processExtId FK "FK to Intake Process_EXTENSION"
        string businessOwner "EASi Business Owner"
        string systemOwner "EASi System Owner"
        decimal unitPrice "Unit Price at CLIN level"
        string unitOfMeasure "Unit of Measure at CLIN level"
        string optional "Option Period or Not Applicable"
        string notToExceed "Not to Exceed field"
        string notSeparatelyPriced "Maps to Qualifier at CLIN level"
    }
    
    CONTRACT ||--|| SYSTEM_METADATA : contains
    CONTRACT ||--|| COMMON_ELEMENTS : contains
    CONTRACT ||--o| SYSTEM_EXTENSIONS : "may contain"
    
    SYSTEM_METADATA ||--|{ SYSTEM_CHAIN_ENTRY : "tracks through"
    SYSTEM_CHAIN_ENTRY ||--o| DATA_QUALITY : "has quality metrics"
    
    COMMON_ELEMENTS ||--|| CONTRACT_IDENTIFICATION : includes
    COMMON_ELEMENTS ||--|| ORGANIZATION_INFO : includes
    COMMON_ELEMENTS ||--o| VENDOR_INFO : includes
    COMMON_ELEMENTS ||--o| PLACE_OF_PERFORMANCE : includes
    COMMON_ELEMENTS ||--o| FINANCIAL_INFO : includes
    COMMON_ELEMENTS ||--o| BUSINESS_CLASSIFICATION : includes
    COMMON_ELEMENTS ||--o| CONTRACT_CHARACTERISTICS : includes
    COMMON_ELEMENTS ||--o{ CONTACT : "may have multiple"
    COMMON_ELEMENTS ||--|| STATUS_INFO : includes
    
    ORGANIZATION_INFO ||--|| AGENCY_INFO_CONTRACTING : "has contracting agency"
    ORGANIZATION_INFO ||--o| AGENCY_INFO_FUNDING : "may have funding agency"
    ORGANIZATION_INFO ||--o| AGENCY_INFO_CONTRACTING_DEPT : "may have contracting dept"
    ORGANIZATION_INFO ||--o| AGENCY_INFO_FUNDING_DEPT : "may have funding dept"
    
    SYSTEM_EXTENSIONS ||--o{ Contract Data_EXTENSION : "may have Contract Data extensions"
    SYSTEM_EXTENSIONS ||--o{ Legacy Procurement_EXTENSION : "may have Legacy Procurement extensions"
    SYSTEM_EXTENSIONS ||--o{ Intake Process_EXTENSION : "may have EASi extensions"
    
    Contract Data_EXTENSION ||--o| Contract Data_SPECIFIC_DATA : contains
    Contract Data_SPECIFIC_DATA ||--o{ Contract Data_Legacy ProcurementANCE_TYPE : "may have types"
    Contract Data_SPECIFIC_DATA ||--o| Contract Data_ELIGIBILITY : "may have eligibility"
    Contract Data_SPECIFIC_DATA ||--o| Contract Data_USAGE : "may have usage"
    Contract Data_ELIGIBILITY ||--o{ Contract Data_APPLICANT_BENEFICIARY_TYPE : "has applicants/beneficiaries"
    
    Legacy Procurement_EXTENSION ||--o| Legacy Procurement_SPECIFIC_DATA : contains
    Legacy Procurement_SPECIFIC_DATA ||--o| Legacy Procurement_ACQUISITION_DATA : "may have acquisition data"
    Legacy Procurement_SPECIFIC_DATA ||--o| Legacy Procurement_CLIENT_DATA : "may have client data"
    Legacy Procurement_SPECIFIC_DATA ||--o| Legacy Procurement_AWARD_DATA : "may have award data"
    Legacy Procurement_CLIENT_DATA ||--|| Legacy Procurement_OFFICE_ADDRESS : "has office address"
    
    Intake Process_EXTENSION ||--o| Intake Process_SPECIFIC_DATA : contains
```

## V2 Key Entities

### Core Structure (Enhanced)

- **CONTRACT** - Root entity with global unique identifier
- **SYSTEM_METADATA** - Enhanced metadata with primary system tracking
- **SYSTEM_CHAIN_ENTRY** - NEW: Tracks data flow through multiple systems
- **DATA_QUALITY** - NEW: Per-system quality metrics and validation

### Common Elements (Restructured)

- **COMMON_ELEMENTS** - Central hub linking to all common sections
- **CONTRACT_IDENTIFICATION** - PIID and contract details
- **ORGANIZATION_INFO** - NEW: Hierarchical organization with 4 agency types
  - AGENCY_INFO_CONTRACTING
  - AGENCY_INFO_FUNDING
  - AGENCY_INFO_CONTRACTING_DEPT
  - AGENCY_INFO_FUNDING_DEPT
- **VENDOR_INFO** - Vendor identification
- **PLACE_OF_PERFORMANCE** - Location details
- **FINANCIAL_INFO** - Financial data
- **BUSINESS_CLASSIFICATION** - Classification codes
- **CONTRACT_CHARACTERISTICS** - Contract flags
- **CONTACT** - NEW: Multiple contacts with roles
- **STATUS_INFO** - NEW: Enhanced status with lifecycle dates

### System Extensions (Typed)

#### Contract Data Extension Tree
- **Contract Data_EXTENSION** → **Contract Data_SPECIFIC_DATA**
  - **Contract Data_Legacy ProcurementANCE_TYPE** - Assistance types with levels
  - **Contract Data_ELIGIBILITY** - Eligibility criteria
    - **Contract Data_APPLICANT_BENEFICIARY_TYPE** - Applicant/beneficiary types
  - **Contract Data_USAGE** - Usage rules and restrictions

#### Legacy Procurement Extension Tree
- **Legacy Procurement_EXTENSION** → **Legacy Procurement_SPECIFIC_DATA**
  - **Legacy Procurement_ACQUISITION_DATA** - IA PIID and acquisition nature
  - **Legacy Procurement_CLIENT_DATA** - Client organization
    - **Legacy Procurement_OFFICE_ADDRESS** - Office location
  - **Legacy Procurement_AWARD_DATA** - IDC type and usage

#### EASi Extension Tree
- **Intake Process_EXTENSION** → **Intake Process_SPECIFIC_DATA**
  - Business/system owners
  - CLIN-level pricing (unitPrice, unitOfMeasure)
  - Option and qualifier fields

## V2 Design Improvements

### 1. System Chain Tracking
Track data lineage as it flows through multiple systems:
```
Contract Data → Legacy Procurement → EASi → Schema Unification
```
Each step records:
- System name
- System-specific record ID
- Processing timestamp
- Transformation rules applied

### 2. Data Quality Metrics
Per-system quality tracking:
- Completeness score (0-1)
- Validation errors list
- Last validation timestamp

### 3. Typed Extensions
Strongly-typed system-specific data:
- Field name, type, and value
- Nested specific data structures
- Type safety for tooling

### 4. Hierarchical Organization
Clear parent-child relationships:
- Organization → Multiple Agency types
- Extensions → Specific data → Nested structures

### 5. Enhanced Status Tracking
Lifecycle management:
- Status enum (draft, published, awarded, completed, cancelled)
- Published date
- Last modified date
- Contract complete date
- Last CAR signed date

## V1 vs V2 Comparison

| Feature | V1 | V2 |
|---------|----|----|
| System Tracking | Source system only | Full system chain |
| Data Quality | Completeness score | Per-system quality metrics |
| Extensions | Flat system sections | Typed hierarchical extensions |
| Organization | Single level | Hierarchical with roles |
| Contacts | Not structured | Multiple contacts with roles |
| Status | Basic flags | Enhanced lifecycle tracking |
| Global IDs | recordId | globalRecordId |

## Related Documentation

- [V2 Schema Documentation](V1-VS-V2-SCHEMA-COMPARISON)
- [V1 vs V2 Quick Reference](V1-VS-V2-QUICK-REFERENCE)
- [Schema Restructuring Success](SCHEMA-RESTRUCTURING-SUCCESS)
- [V1 Entity Relationship Diagram](schema_unification-v1-diagram)

---

*This is the V2 (Draft) schema diagram with enhanced tracking and typed extensions. For the stable V1 schema, see [V1 Entity Relationship Diagram](schema_unification-v1-diagram).*
