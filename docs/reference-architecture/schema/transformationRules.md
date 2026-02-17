## TransformationRules Storage and Usage in the Schema

Based on the schema design, `transformationRules` are expected to be stored and used as follows:

### 1. Storage Location and Structure

**Primary Storage**: In the `systemMetadata.systemChain` array, where each system entry contains:

```json
{
  "transformationRules": ["rule_name_1", "rule_name_2", "rule_name_3"]
}
```

**Extended Storage**: In system-specific extensions and transformation history sections for detailed rule application tracking.

### 2. Rule Naming Convention

TransformationRules follow a structured naming pattern:

- `{source_system}_to_{target_system}_{rule_type}`
- `{business_context}_{rule_category}`
- `{field_specific}_{transformation_type}`

**Examples from the EASi instance:**

```json
"transformationRules": [
  "logistics_mgmt_to_legacy_procurement_mapping",           // System-to-system mapping
  "sba_client_defaults",              // Business rule with defaults
  "legacy_procurement_template_processing",       // Template-based processing
  "ucf_simplified_rules",             // Business logic rules
  "legacy_procurement_to_intake_process_clin_mapping",      // Field-level mapping
  "contract_data_field_preparation",           // Compliance preparation
  "boolean_direct_mapping",           // Data type transformation
  "current_future_clins_only"         // Business filtering rule
]
```

### 3. Rule Categories and Types

#### **A. System Integration Rules**

```yaml
# YAML representation of transformation rules
logistics_mgmt_to_legacy_procurement_mapping:
  type: "system_integration"
  source: "Logistics Mgmt"
  target: "Legacy Procurement"
  description: "Maps Logistics Mgmt fields to Legacy Procurement template structure"
  fieldMappings:
    - source: "data.programNumber"
      target: "acquisitionData.originalAwardPiid"
    - source: "organizationHierarchy.organizationId"
      target: "clientData.agencyCode"

legacy_procurement_to_intake_process_clin_mapping:
  type: "system_integration"
  source: "Legacy Procurement"
  target: "Intake Process"
  description: "Transforms Legacy Procurement award data to EASi CLIN structure"
  businessLogic:
    - "Apply UCF/Simplified format rules based on contract value"
    - "Create CLIN records for current and future performance periods only"
```

#### **B. Business Logic Rules**

```yaml
ucf_simplified_rules:
  type: "business_logic"
  description: "Determines award package format based on BAOV"
  conditions:
    - if: "baseAndAllOptionsValue <= 250000"
      then: "format = 'Simplified'"
    - else: "format = 'UCF'"

sba_client_defaults:
  type: "default_assignment"
  scope: "SBA contracts"
  defaults:
    agencyCode: "073-00"
    clientOrganizationName: "SMALL BUSINESS ADMINISTRATION"
    natureOfAcquisition: "ADMIN_CONTINUE_TRANSFER"
```

#### **C. Data Transformation Rules**

```yaml
boolean_direct_mapping:
  type: "data_transformation"
  description: "Direct boolean field mapping between systems"
  transformations:
    - source: "awardData.governmentFurnishedProperty"
      target: "contract_data.gfpProvidedUnderThisAction"
      type: "boolean_passthrough"

current_future_clins_only:
  type: "data_filtering"
  description: "Include only current or future performance period CLINs"
  filter: "clin.performancePeriod.endDate >= current_date()"
```

### 4. Usage Patterns

#### **During Data Transformation**

```json
{
  "transformationExecution": {
    "ruleName": "logistics_mgmt_to_legacy_procurement_mapping",
    "executedAt": "2024-01-10T09:00:00Z",
    "inputData": {
      "system": "Logistics Mgmt",
      "recordCount": 1,
      "fieldCount": 52
    },
    "ruleApplication": {
      "fieldsTransformed": 45,
      "defaultsApplied": 3,
      "validationErrors": 1
    },
    "outputData": {
      "system": "Legacy Procurement",
      "template": "01 GSA Acquisition Template - Acquisition Data.xlsx",
      "recordCount": 1,
      "fieldCount": 48
    }
  }
}
```

#### **In System Extensions**

```json
{
  "systemExtensions": {
    "intake_process": [
      {
        "fieldName": "unitPrice",
        "transformationRule": "legacy_procurement_line_item_to_clin_pricing",
        "mappingSource": "legacy_procurement.awardData.lineItems[].unitPrice",
        "businessLogic": ["quantity_based_clin_only", "exclude_nsp_items"]
      }
    ]
  }
}
```

### 5. Rule Resolution and Execution Order

**Rule Dependencies**: Rules can reference other rules for complex transformations:

```json
{
  "transformationRules": [
    "logistics_mgmt_to_legacy_procurement_mapping", // Step 1: Basic field mapping
    "sba_client_defaults", // Step 2: Apply defaults
    "legacy_procurement_template_validation" // Step 3: Validate template completeness
  ]
}
```

**Execution Context**: Rules are executed within specific system contexts with access to:

- Source system data structure
- Target system schema requirements
- Business rule parameters
- Default value definitions
- Validation requirements

### 6. Error Handling and Validation

```json
{
  "ruleExecution": {
    "ruleName": "contract_data_field_preparation",
    "status": "partial_success",
    "errorsEncountered": [
      {
        "field": "principalNaicsCode",
        "error": "Source field empty",
        "resolution": "Applied default from business classification"
      }
    ],
    "warningsGenerated": [
      {
        "field": "independentGovernmentEstimate",
        "warning": "Value defaulted to 1.0 - verify with contracting officer"
      }
    ]
  }
}
```

### 7. Rule Versioning and Maintenance

TransformationRules support versioning for schema evolution:

```json
{
  "transformationRules": [
    "logistics_mgmt_to_legacy_procurement_mapping_v2.1", // Versioned rule
    "sba_client_defaults_2024", // Year-specific rule
    "contract_data_compliance_updated" // Updated for new requirements
  ]
}
```

This approach allows the schema to maintain a complete audit trail of how data transforms between systems while providing flexibility for complex business rules and ensuring compliance with government contracting requirements as documented in the Logistics Mgmt Data to Legacy Procurement and EASi Field Mapping specification [Logistics Mgmt Data to Legacy Procurement and EASi Field Mapping.docx].
