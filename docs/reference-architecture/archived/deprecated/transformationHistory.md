> **⚠️ ARCHIVED DOCUMENTATION**
>
> This document has been archived and is preserved for historical reference only.
>
> See instead: [Schema Pipeline Guide](../../schema-pipeline-guide.md) and [System Mappings Guide](../../system-mappings-guide.md)
>
> Archived: December 2024  
> Reason: Superseded by consolidated mapping & transformation guides

## TransformationHistory Storage

> This is an example of the information that should be stored separately in the ETL job pipeline.

Based on the schema design, `transformationHistory` provides a comprehensive audit trail of all data transformations applied throughout the multi-system integration pipeline. Here's how it's expected to be stored and used:

### 1. Storage Location and Structure

**Primary Storage**: At the root level of the document as a separate object containing detailed transformation records:

```json
{
  "transformationHistory": {
    "logistics_mgmtToAssist": {
      /* transformation details */
    },
    "legacy_procurementToEasi": {
      /* transformation details */
    },
    "intake_processToFpdsPrep": {
      /* transformation details */
    }
  }
}
```

**Cross-Reference**: Links to the `systemMetadata.systemChain` for basic tracking, but provides much more detailed information.

### 2. Transformation Record Structure

Each transformation record follows this comprehensive structure:

```json
{
  "transformationName": {
    "transformationId": "unique-transformation-id",
    "sourceSystem": "Logistics Mgmt",
    "targetSystem": "Legacy Procurement",
    "transformedDate": "2024-01-10T09:00:00Z",
    "transformationVersion": "v2.1.3",
    "executionContext": {
      "userId": "system_migration_user",
      "batchId": "SBA_OPM_MIGRATION_2024_Q1",
      "migrationScope": "SBA and OPM contracts only"
    },
    "inputMetrics": {
      "recordsProcessed": 1247,
      "fieldsEvaluated": 52,
      "dataCompleteness": 0.72
    },
    "transformationResults": {
      "fieldsTransformed": 45,
      "fieldsSkipped": 7,
      "defaultsApplied": 3,
      "businessRulesApplied": [
        "sba_client_defaults",
        "logistics_mgmt_field_mapping"
      ],
      "validationErrors": 1,
      "warnings": 2
    },
    "outputMetrics": {
      "recordsCreated": 1247,
      "fieldsPopulated": 48,
      "dataCompleteness": 0.85
    },
    "fieldLevelChanges": [
      {
        "fieldName": "independentGovernmentEstimate",
        "action": "default_applied",
        "sourceValue": null,
        "targetValue": 1.0,
        "reason": "IGE not available in Logistics Mgmt system"
      }
    ]
  }
}
```

### 3. Detailed Transformation Examples

#### **A. Logistics Mgmt to Legacy Procurement Transformation**

```json
{
  "logistics_mgmtToAssist": {
    "transformationId": "Logistics Mgmt-Legacy Procurement-20240110-001",
    "sourceSystem": "Logistics Mgmt",
    "targetSystem": "Legacy Procurement",
    "transformedDate": "2024-01-10T09:00:00Z",
    "transformationVersion": "v2.1.0",
    "executionContext": {
      "migrationBatch": "SBA_OPM_2024_Q1",
      "contractScope": "Active contracts from approved contract list",
      "templatesTargeted": [
        "01 GSA Acquisition Template - Acquisition Data.xlsx",
        "02 GSA Acquisition Template - Client Data.xlsx",
        "03 GSA Acquisition Template - Award Base In-Process Data.xlsx"
      ]
    },
    "businessRulesApplied": {
      "sba_client_defaults": {
        "applied": true,
        "fieldsAffected": [
          "agencyCode",
          "clientOrganizationName",
          "officeAddress"
        ],
        "defaultValues": {
          "agencyCode": "073-00",
          "clientOrganizationName": "SMALL BUSINESS ADMINISTRATION"
        }
      },
      "logistics_mgmt_field_mapping": {
        "applied": true,
        "mappingRules": 127,
        "successfulMappings": 120,
        "failedMappings": 7
      }
    },
    "fieldTransformations": [
      {
        "sourceField": "data.programNumber",
        "targetField": "acquisitionData.originalAwardPiid",
        "transformationType": "direct_mapping",
        "success": true,
        "dataType": "string"
      },
      {
        "sourceField": "organizationHierarchy.organizationId",
        "targetField": "clientData.agencyCode",
        "transformationType": "nested_extraction",
        "success": true,
        "extractionPath": "hierarchy[0].organizationId"
      }
    ],
    "defaultsApplied": [
      {
        "field": "natureOfAcquisition",
        "defaultValue": "ADMIN_CONTINUE_TRANSFER",
        "reason": "Standard GSA interagency relationship"
      },
      {
        "field": "independentGovernmentEstimate",
        "defaultValue": 1.0,
        "reason": "IGE data not populated in legacy Logistics Mgmt system"
      }
    ],
    "validationResults": {
      "errors": [
        {
          "field": "placeOfPerformance.congressionalDistrict",
          "error": "Missing congressional district data",
          "resolution": "Derived from ZIP code lookup"
        }
      ],
      "warnings": [
        {
          "field": "contractCompleteDate",
          "warning": "Date format inconsistency",
          "resolution": "Standardized to ISO 8601 format"
        }
      ]
    },
    "qualityImprovements": {
      "completenessScoreBefore": 0.72,
      "completenessScoreAfter": 0.85,
      "fieldsEnhanced": 12,
      "dataStandardizationApplied": true
    }
  }
}
```

#### **B. Legacy Procurement to EASi Transformation**

```json
{
  "legacy_procurementToEasi": {
    "transformationId": "Legacy Procurement-Intake Process-20240112-001",
    "sourceSystem": "Legacy Procurement",
    "targetSystem": "Intake Process",
    "transformedDate": "2024-01-12T14:30:00Z",
    "executionContext": {
      "awardPackageProcessing": {
        "ucfRulesApplied": 892,
        "simplifiedRulesApplied": 355,
        "businessLogic": "BAOV <= $250,000 = Simplified, else UCF"
      },
      "clinProcessing": {
        "totalClinsEvaluated": 3247,
        "currentFutureClinsIncluded": 2891,
        "pastPerformanceClinsExcluded": 356,
        "filterRule": "clin.performancePeriod.endDate >= current_date()"
      }
    },
    "templateProcessing": {
      "legacy_procurementTemplatesProcessed": [
        "01 GSA Acquisition Template - Acquisition Data.xlsx",
        "03 GSA Acquisition Template - Award Base In-Process Data.xlsx",
        "04 GSA Acquisition Template - Award Base Line Item Data.xlsx"
      ],
      "intake_processFieldsGenerated": 127,
      "clinLevelDataCreated": true
    },
    "businessRulesApplied": {
      "ucf_award_rules": {
        "contractsProcessed": 892,
        "fieldsGenerated": ["unitPrice", "unitOfMeasure", "notToExceed"],
        "businessLogic": "Contracts > $250K require UCF format with detailed CLIN data"
      },
      "clin_level_mapping": {
        "lineItemsTransformed": 2891,
        "quantityBasedClins": 1847,
        "dollarBasedClins": 891,
        "notSeparatelyPricedClins": 153
      }
    },
    "fieldLevelTransformations": [
      {
        "sourceField": "awardData.lineItems[].unitPrice",
        "targetField": "clin.unitPrice",
        "transformationType": "array_to_individual_records",
        "recordsCreated": 2891,
        "businessRule": "quantity_based_clin_only"
      },
      {
        "sourceField": "awardData.totalContractValue",
        "targetField": "financial.baseAndAllOptions",
        "transformationType": "financial_aggregation",
        "calculation": "sum(baseValue + optionPeriods[])"
      }
    ],
    "contract_dataPreparation": {
      "fieldsPrepped": 15,
      "complianceRulesApplied": [
        "principal_naics_mapping",
        "gfp_indicator_mapping"
      ],
      "reportingReadiness": true
    }
  }
}
```

#### **C. EASi to Contract Data Preparation**

```json
{
  "intake_processToFpdsPrep": {
    "transformationId": "Intake Process-Contract Data-20240115-001",
    "sourceSystem": "Intake Process",
    "targetSystem": "Contract Data_PREP",
    "preparedDate": "2024-01-15T16:20:00Z",
    "complianceContext": {
      "contract_dataReportingRequirements": "Federal Procurement Data System compliance",
      "reportingPeriod": "FY2024_Q2",
      "mandatoryFields": [
        "principalNaicsCode",
        "gfpProvidedUnderThisAction",
        "localAreaSetAside"
      ]
    },
    "fieldMappings": [
      {
        "intake_processSourceField": "naicsCode",
        "contract_dataTargetField": "principalNaicsCode",
        "mappingType": "direct_compliance_mapping",
        "validationRule": "must_be_valid_naics_2022_code"
      },
      {
        "intake_processSourceField": "governmentFurnishedProperty",
        "contract_dataTargetField": "gfpProvidedUnderThisAction",
        "mappingType": "boolean_direct_mapping",
        "complianceNote": "Required for federal procurement reporting"
      }
    ],
    "reportingCompliance": {
      "mandatoryFieldsPopulated": 15,
      "optionalFieldsPopulated": 8,
      "complianceScore": 0.98,
      "reportingReadiness": true
    },
    "dataValidation": {
      "contract_dataSchemaValidation": "passed",
      "businessRuleValidation": "passed",
      "crossSystemConsistency": "verified"
    }
  }
}
```

### 4. Usage Patterns and Applications

#### **A. Audit Trail and Compliance**

```json
{
  "auditTrail": {
    "transformationChain": [
      "Logistics Mgmt → Legacy Procurement (2024-01-10)",
      "Legacy Procurement → EASi (2024-01-12)",
      "EASi → Contract Data Prep (2024-01-15)"
    ],
    "dataLineage": "Complete transformation history maintained",
    "complianceEvidence": "All transformations documented per federal requirements"
  }
}
```

#### **B. Data Quality Tracking**

```json
{
  "qualityProgression": {
    "initialDataQuality": 0.72,
    "postAssistTransformation": 0.85,
    "postEasiTransformation": 0.95,
    "finalReportingReadiness": 0.98,
    "qualityImprovementFactor": 36.1
  }
}
```

#### **C. Performance Monitoring**

```json
{
  "performanceMetrics": {
    "totalTransformationTime": "5 days 7 hours 20 minutes",
    "recordsProcessed": 1247,
    "averageRecordProcessingTime": "6.2 seconds",
    "systemBottlenecks": [
      "CLIN-level processing",
      "Contract Data compliance validation"
    ]
  }
}
```

### 5. Schema Integration Points

#### **Cross-Reference with systemMetadata**

```json
{
  "systemMetadata": {
    "systemChain": [
      {
        "systemName": "Logistics Mgmt",
        "transformationHistoryRef": "logistics_mgmtToAssist"
      }
    ]
  }
}
```

#### **Integration with systemExtensions**

```json
{
  "systemExtensions": {
    "intake_process": [
      {
        "transformationApplied": "legacy_procurementToEasi",
        "businessRuleUsed": "ucf_award_rules",
        "generatedFrom": "legacy_procurement.awardData.lineItems"
      }
    ]
  }
}
```

### 6. Error Recovery and Rollback

```json
{
  "errorRecovery": {
    "rollbackCapability": true,
    "recoveryPoints": [
      "pre_logistics_mgmt_to_legacy_procurement",
      "post_legacy_procurement_validation",
      "pre_intake_process_clin_processing"
    ],
    "rollbackInstructions": "Restore from transformationHistory snapshot"
  }
}
```

This comprehensive `transformationHistory` structure enables full accountability, auditability, and traceability of data as it flows through the Logistics Mgmt → Legacy Procurement → EASi → Contract Data pipeline, supporting both operational needs and federal compliance requirements as documented in the Logistics Mgmt Data to Legacy Procurement and EASi Field Mapping specification [Logistics Mgmt Data to Legacy Procurement and EASi Field Mapping.docx].
