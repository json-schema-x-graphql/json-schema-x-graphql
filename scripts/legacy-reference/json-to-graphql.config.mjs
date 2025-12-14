const scalars = ["Date", "DateTime", "Decimal", "JSON"];

const typeConfigs = [
  {
    name: "Contract",
    pointer: "/",
    description: "Normalized contract record derived from the JSON Schema.",
    fields: [
      {
        name: "globalRecordId",
        pointer: "/systemMetadata/globalRecordId",
        graphqlType: "ID!",
        description: "Unique global record identifier.",
      },
      {
        name: "primarySystem",
        pointer: "/systemMetadata/primarySystem",
        graphqlType: "SystemType!",
        description: "Primary system for the contract.",
      },
      {
        name: "schemaVersion",
        pointer: "/systemMetadata/schemaVersion",
        graphqlType: "String",
        description: "Schema version.",
      },
      {
        name: "lastModified",
        pointer: "/systemMetadata/lastModified",
        graphqlType: "DateTime",
        description: "Last modified date/time.",
      },
      {
        name: "systemChain",
        pointer: "/systemMetadata/systemChain",
        itemsPointer: "/systemMetadata/systemChain/items",
        graphqlType: "[SystemChainEntry!]!",
        description: "System chain entries for contract lifecycle.",
      },
      {
        name: "piid",
        pointer: "/commonElements/contractIdentification/piid",
        graphqlType: "String!",
        description: "Procurement Instrument Identifier (PIID).",
      },
      {
        name: "originalAwardPiid",
        pointer: "/commonElements/contractIdentification/originalAwardPiid",
        graphqlType: "String",
        description: "Original award PIID.",
      },
      {
        name: "referencedPiid",
        pointer: "/commonElements/contractIdentification/referencedPiid",
        graphqlType: "String",
        description: "Referenced PIID.",
      },
      {
        name: "contractTitle",
        pointer: "/commonElements/contractIdentification/contractTitle",
        graphqlType: "String",
        description: "Title of the contract.",
      },
      {
        name: "contractType",
        pointer: "/commonElements/contractIdentification/contractType",
        graphqlType: "String",
        description: "Type of contract.",
      },
      {
        name: "descriptionOfRequirement",
        pointer: "/commonElements/contractIdentification/descriptionOfRequirement",
        graphqlType: "String",
        description: "Description of requirement.",
      },
      {
        name: "organizationInfo",
        pointer: "/commonElements/organizationInfo",
        graphqlType: "OrganizationInfo!",
        description: "Organization information.",
      },
      {
        name: "vendorInfo",
        pointer: "/commonElements/vendorInfo",
        graphqlType: "VendorInfo",
        description: "Vendor information.",
      },
      {
        name: "placeOfPerformance",
        pointer: "/commonElements/placeOfPerformance",
        graphqlType: "PlaceOfPerformance",
        description: "Place of performance.",
      },
      {
        name: "financialInfo",
        pointer: "/commonElements/financialInfo",
        graphqlType: "FinancialInfo",
        description: "Financial information.",
      },
      {
        name: "businessClassification",
        pointer: "/commonElements/businessClassification",
        graphqlType: "BusinessClassification",
        description: "Business classification.",
      },
      {
        name: "contractCharacteristics",
        pointer: "/commonElements/contractCharacteristics",
        graphqlType: "ContractCharacteristics",
        description: "Contract characteristics.",
      },
      {
        name: "contacts",
        pointer: "/commonElements/contacts",
        itemsPointer: "/commonElements/contacts/items",
        graphqlType: "[Contact!]",
        description: "Contract contacts.",
      },
      {
        name: "statusInfo",
        pointer: "/commonElements/statusInfo",
        graphqlType: "StatusInfo!",
        description: "Status information.",
      },
      {
        name: "systemExtensions",
        pointer: "/systemExtensions",
        graphqlType: "SystemExtensions",
        description: "System extensions.",
      },
    ],
  },
  // ...existing code...
  {
    name: "SystemChainEntry",
    pointer: "/systemMetadata/systemChain/items",
    fields: [
      {
        name: "systemName",
        pointer: "/systemMetadata/systemChain/items/systemName",
        graphqlType: "SystemType!",
      },
      {
        name: "recordId",
        pointer: "/systemMetadata/systemChain/items/recordId",
        graphqlType: "ID!",
      },
      {
        name: "processedDate",
        pointer: "/systemMetadata/systemChain/items/processedDate",
        graphqlType: "DateTime!",
      },
      {
        name: "transformationRules",
        pointer: "/systemMetadata/systemChain/items/transformationRules",
        graphqlType: "[String!]",
      },
      {
        name: "dataQuality",
        pointer: "/systemMetadata/systemChain/items/dataQuality",
        graphqlType: "DataQuality",
      },
    ],
  },
  {
    name: "DataQuality",
    pointer: "/systemMetadata/systemChain/items/dataQuality",
    fields: [
      {
        name: "completenessScore",
        pointer: "/systemMetadata/systemChain/items/dataQuality/completenessScore",
        graphqlType: "Decimal",
      },
      {
        name: "validationErrors",
        pointer: "/systemMetadata/systemChain/items/dataQuality/validationErrors",
        graphqlType: "[String!]",
      },
      {
        name: "lastValidated",
        pointer: "/systemMetadata/systemChain/items/dataQuality/lastValidated",
        graphqlType: "DateTime",
      },
    ],
  },
  {
    name: "OrganizationInfo",
    pointer: "/commonElements/organizationInfo",
    fields: [
      {
        name: "contractingAgency",
        pointer: "/commonElements/organizationInfo/contractingAgency",
        graphqlType: "Agency!",
      },
      {
        name: "contractingDepartment",
        pointer: "/commonElements/organizationInfo/contractingDepartment",
        graphqlType: "Department",
      },
      {
        name: "fundingAgency",
        pointer: "/commonElements/organizationInfo/fundingAgency",
        graphqlType: "Agency",
      },
      {
        name: "fundingDepartment",
        pointer: "/commonElements/organizationInfo/fundingDepartment",
        graphqlType: "Department",
      },
    ],
  },
  {
    name: "Agency",
    pointer: "/commonElements/organizationInfo/contractingAgency",
    fields: [
      {
        name: "code",
        pointer: "/commonElements/organizationInfo/contractingAgency/code",
        graphqlType: "String!",
      },
      {
        name: "name",
        pointer: "/commonElements/organizationInfo/contractingAgency/name",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "Department",
    pointer: "/commonElements/organizationInfo/contractingDepartment",
    fields: [
      {
        name: "code",
        pointer: "/commonElements/organizationInfo/contractingDepartment/code",
        graphqlType: "String",
      },
      {
        name: "name",
        pointer: "/commonElements/organizationInfo/contractingDepartment/name",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "VendorInfo",
    pointer: "/commonElements/vendorInfo",
    fields: [
      {
        name: "vendorName",
        pointer: "/commonElements/vendorInfo/vendorName",
        graphqlType: "String",
      },
      {
        name: "vendorUei",
        pointer: "/commonElements/vendorInfo/vendorUei",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "PlaceOfPerformance",
    pointer: "/commonElements/placeOfPerformance",
    fields: [
      {
        name: "streetAddress",
        pointer: "/commonElements/placeOfPerformance/streetAddress",
        graphqlType: "String",
      },
      {
        name: "city",
        pointer: "/commonElements/placeOfPerformance/city",
        graphqlType: "String",
      },
      {
        name: "county",
        pointer: "/commonElements/placeOfPerformance/county",
        graphqlType: "String",
      },
      {
        name: "state",
        pointer: "/commonElements/placeOfPerformance/state",
        graphqlType: "String",
      },
      {
        name: "zip",
        pointer: "/commonElements/placeOfPerformance/zip",
        graphqlType: "String",
      },
      {
        name: "country",
        pointer: "/commonElements/placeOfPerformance/country",
        graphqlType: "String",
      },
      {
        name: "congressionalDistrict",
        pointer: "/commonElements/placeOfPerformance/congressionalDistrict",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "FinancialInfo",
    pointer: "/commonElements/financialInfo",
    fields: [
      {
        name: "totalContractValue",
        pointer: "/commonElements/financialInfo/totalContractValue",
        graphqlType: "Decimal",
      },
      {
        name: "baseAndAllOptionsValue",
        pointer: "/commonElements/financialInfo/baseAndAllOptionsValue",
        graphqlType: "Decimal",
      },
      {
        name: "independentGovernmentEstimate",
        pointer: "/commonElements/financialInfo/independentGovernmentEstimate",
        graphqlType: "Decimal",
      },
      {
        name: "amountSpentOnProduct",
        pointer: "/commonElements/financialInfo/amountSpentOnProduct",
        graphqlType: "Decimal",
      },
      {
        name: "contractFiscalYear",
        pointer: "/commonElements/financialInfo/contractFiscalYear",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "BusinessClassification",
    pointer: "/commonElements/businessClassification",
    fields: [
      {
        name: "naicsCode",
        pointer: "/commonElements/businessClassification/naicsCode",
        graphqlType: "String",
      },
      {
        name: "naicsDescription",
        pointer: "/commonElements/businessClassification/naicsDescription",
        graphqlType: "String",
      },
      {
        name: "pscCode",
        pointer: "/commonElements/businessClassification/pscCode",
        graphqlType: "String",
      },
      {
        name: "pscDescription",
        pointer: "/commonElements/businessClassification/pscDescription",
        graphqlType: "String",
      },
      {
        name: "categoryOfProduct",
        pointer: "/commonElements/businessClassification/categoryOfProduct",
        graphqlType: "String",
      },
      {
        name: "typeOfProduct",
        pointer: "/commonElements/businessClassification/typeOfProduct",
        graphqlType: "String",
      },
      {
        name: "setAsideType",
        pointer: "/commonElements/businessClassification/setAsideType",
        graphqlType: "String",
      },
      {
        name: "localAreaSetAside",
        pointer: "/commonElements/businessClassification/localAreaSetAside",
        graphqlType: "Boolean",
      },
      {
        name: "coSizeDetermination",
        pointer: "/commonElements/businessClassification/coSizeDetermination",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "ContractCharacteristics",
    pointer: "/commonElements/contractCharacteristics",
    fields: [
      {
        name: "emergencyAcquisition",
        pointer: "/commonElements/contractCharacteristics/emergencyAcquisition",
        graphqlType: "String",
      },
      {
        name: "governmentFurnishedProperty",
        pointer: "/commonElements/contractCharacteristics/governmentFurnishedProperty",
        graphqlType: "Boolean",
      },
      {
        name: "includesCui",
        pointer: "/commonElements/contractCharacteristics/includesCui",
        graphqlType: "Boolean",
      },
      {
        name: "recurringService",
        pointer: "/commonElements/contractCharacteristics/recurringService",
        graphqlType: "Boolean",
      },
      {
        name: "recurringUtilities",
        pointer: "/commonElements/contractCharacteristics/recurringUtilities",
        graphqlType: "Boolean",
      },
    ],
  },
  {
    name: "Contact",
    pointer: "/commonElements/contacts/items",
    fields: [
      { name: "name", pointer: "/commonElements/contacts/items/name", graphqlType: "String" },
      { name: "title", pointer: "/commonElements/contacts/items/title", graphqlType: "String" },
      { name: "email", pointer: "/commonElements/contacts/items/email", graphqlType: "String" },
      { name: "phone", pointer: "/commonElements/contacts/items/phone", graphqlType: "String" },
      { name: "role", pointer: "/commonElements/contacts/items/role", graphqlType: "ContactRole" },
    ],
  },
  {
    name: "StatusInfo",
    pointer: "/commonElements/statusInfo",
    fields: [
      {
        name: "isActive",
        pointer: "/commonElements/statusInfo/isActive",
        graphqlType: "Boolean",
      },
      {
        name: "isLatest",
        pointer: "/commonElements/statusInfo/isLatest",
        graphqlType: "Boolean",
      },
      {
        name: "isFunded",
        pointer: "/commonElements/statusInfo/isFunded",
        graphqlType: "Boolean",
      },
      {
        name: "status",
        pointer: "/commonElements/statusInfo/status",
        graphqlType: "ContractStatus",
      },
      {
        name: "publishedDate",
        pointer: "/commonElements/statusInfo/publishedDate",
        graphqlType: "DateTime",
      },
      {
        name: "lastModifiedDate",
        pointer: "/commonElements/statusInfo/lastModifiedDate",
        graphqlType: "DateTime",
      },
      {
        name: "contractCompleteDate",
        pointer: "/commonElements/statusInfo/contractCompleteDate",
        graphqlType: "Date",
      },
      {
        name: "lastCarDateSigned",
        pointer: "/commonElements/statusInfo/lastCarDateSigned",
        graphqlType: "Date",
      },
    ],
  },
  {
    name: "SystemExtensions",
    pointer: "/systemExtensions",
    fields: [
      {
        name: "contract_data",
        pointer: "/systemExtensions/contract_data",
        itemsPointer: "/systemExtensions/contract_data/items",
        graphqlType: "[Contract DataExtension!]",
      },
      {
        name: "legacy_procurement",
        pointer: "/systemExtensions/legacy_procurement",
        itemsPointer: "/systemExtensions/legacy_procurement/items",
        graphqlType: "[AssistExtension!]",
      },
      {
        name: "intake_process",
        pointer: "/systemExtensions/intake_process",
        itemsPointer: "/systemExtensions/intake_process/items",
        graphqlType: "[EasiExtension!]",
      },
    ],
  },
  {
    name: "Contract DataExtension",
    pointer: "/systemExtensions/contract_data/items",
    fields: [
      {
        name: "fieldName",
        pointer: "/systemExtensions/contract_data/items/fieldName",
        graphqlType: "String",
      },
      {
        name: "fieldType",
        pointer: "/systemExtensions/contract_data/items/fieldType",
        graphqlType: "String",
      },
      {
        name: "value",
        pointer: "/systemExtensions/contract_data/items/value",
        graphqlType: "JSON",
      },
      {
        name: "contract_dataSpecific",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific",
        graphqlType: "Contract DataSpecificData",
      },
    ],
  },
  {
    name: "Contract DataSpecificData",
    pointer: "/systemExtensions/contract_data/items/contract_dataSpecific",
    fields: [
      {
        name: "programNumber",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/programNumber",
        graphqlType: "String",
      },
      {
        name: "alternativeNames",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/alternativeNames",
        graphqlType: "[String!]",
      },
      {
        name: "objective",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/objective",
        graphqlType: "String",
      },
      {
        name: "website",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/website",
        graphqlType: "String",
      },
      {
        name: "legacy_procurementanceTypes",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/legacy_procurementanceTypes",
        itemsPointer: "/systemExtensions/contract_data/items/contract_dataSpecific/legacy_procurementanceTypes/items",
        graphqlType: "[AssistanceType!]",
      },
      {
        name: "eligibility",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/eligibility",
        graphqlType: "Contract DataEligibility",
      },
      {
        name: "usage",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/usage",
        graphqlType: "Contract DataUsage",
      },
    ],
  },
  {
    name: "AssistanceType",
    pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/legacy_procurementanceTypes/items",
    fields: [
      {
        name: "code",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/legacy_procurementanceTypes/items/code",
        graphqlType: "String",
      },
      {
        name: "value",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/legacy_procurementanceTypes/items/value",
        graphqlType: "String",
      },
      {
        name: "level",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/legacy_procurementanceTypes/items/level",
        graphqlType: "Int",
      },
    ],
  },
  {
    name: "Contract DataEligibility",
    pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/eligibility",
    fields: [
      {
        name: "applicantTypes",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/eligibility/applicantTypes",
        itemsPointer: "/systemExtensions/contract_data/items/contract_dataSpecific/eligibility/applicantTypes/items",
        graphqlType: "[EligibilityType!]",
      },
      {
        name: "beneficiaryTypes",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/eligibility/beneficiaryTypes",
        itemsPointer:
          "/systemExtensions/contract_data/items/contract_dataSpecific/eligibility/beneficiaryTypes/items",
        graphqlType: "[EligibilityType!]",
      },
      {
        name: "additionalInfo",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/eligibility/additionalInfo",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "EligibilityType",
    pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/eligibility/applicantTypes/items",
    fields: [
      {
        name: "value",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/eligibility/applicantTypes/items/value",
        graphqlType: "String",
      },
      {
        name: "code",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/eligibility/applicantTypes/items/code",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "Contract DataUsage",
    pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/usage",
    fields: [
      {
        name: "rules",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/usage/rules",
        graphqlType: "String",
      },
      {
        name: "restrictions",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/usage/restrictions",
        graphqlType: "String",
      },
      {
        name: "loanTerms",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/usage/loanTerms",
        graphqlType: "String",
      },
      {
        name: "discretionaryFund",
        pointer: "/systemExtensions/contract_data/items/contract_dataSpecific/usage/discretionaryFund",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "AssistExtension",
    pointer: "/systemExtensions/legacy_procurement/items",
    fields: [
      {
        name: "fieldName",
        pointer: "/systemExtensions/legacy_procurement/items/fieldName",
        graphqlType: "String",
      },
      {
        name: "fieldType",
        pointer: "/systemExtensions/legacy_procurement/items/fieldType",
        graphqlType: "String",
      },
      { name: "value", pointer: "/systemExtensions/legacy_procurement/items/value", graphqlType: "JSON" },
      {
        name: "legacy_procurementSpecific",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific",
        graphqlType: "AssistSpecificData",
      },
    ],
  },
  {
    name: "AssistSpecificData",
    pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific",
    fields: [
      {
        name: "acquisitionData",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/acquisitionData",
        graphqlType: "AssistAcquisitionData",
      },
      {
        name: "clientData",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/clientData",
        graphqlType: "AssistClientData",
      },
      {
        name: "awardData",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/awardData",
        graphqlType: "AssistAwardData",
      },
    ],
  },
  {
    name: "AssistAcquisitionData",
    pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/acquisitionData",
    fields: [
      {
        name: "iaPiidOrUniqueId",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/acquisitionData/iaPiidOrUniqueId",
        graphqlType: "String!",
      },
      {
        name: "natureOfAcquisition",
        pointer:
          "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/acquisitionData/natureOfAcquisition",
        graphqlType: "String!",
      },
    ],
  },
  {
    name: "AssistClientData",
    pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/clientData",
    fields: [
      {
        name: "clientOrganizationName",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/clientData/clientOrganizationName",
        graphqlType: "String!",
      },
      {
        name: "officeAddress",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/clientData/officeAddress",
        graphqlType: "AssistOfficeAddress!",
      },
    ],
  },
  {
    name: "AssistOfficeAddress",
    pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/clientData/officeAddress",
    fields: [
      {
        name: "streetAddress1",
        pointer:
          "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/clientData/officeAddress/streetAddress1",
        graphqlType: "String",
      },
      {
        name: "city",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/clientData/officeAddress/city",
        graphqlType: "String",
      },
      {
        name: "state",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/clientData/officeAddress/state",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "AssistAwardData",
    pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/awardData",
    fields: [
      {
        name: "typeOfIdc",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/awardData/typeOfIdc",
        graphqlType: "String",
      },
      {
        name: "whoCanUseIdc",
        pointer: "/systemExtensions/legacy_procurement/items/legacy_procurementSpecific/awardData/whoCanUseIdc",
        graphqlType: "String",
      },
    ],
  },
  {
    name: "EasiExtension",
    pointer: "/systemExtensions/intake_process/items",
    fields: [
      {
        name: "fieldName",
        pointer: "/systemExtensions/intake_process/items/fieldName",
        graphqlType: "String",
      },
      {
        name: "fieldType",
        pointer: "/systemExtensions/intake_process/items/fieldType",
        graphqlType: "String",
      },
      { name: "value", pointer: "/systemExtensions/intake_process/items/value", graphqlType: "JSON" },
      {
        name: "intake_processSpecific",
        pointer: "/systemExtensions/intake_process/items/intake_processSpecific",
        graphqlType: "EasiSpecificData",
      },
    ],
  },
  {
    name: "EasiSpecificData",
    pointer: "/systemExtensions/intake_process/items/intake_processSpecific",
    fields: [
      {
        name: "businessOwner",
        pointer: "/systemExtensions/intake_process/items/intake_processSpecific/businessOwner",
        graphqlType: "String",
      },
      {
        name: "systemOwner",
        pointer: "/systemExtensions/intake_process/items/intake_processSpecific/systemOwner",
        graphqlType: "String",
      },
      {
        name: "unitPrice",
        pointer: "/systemExtensions/intake_process/items/intake_processSpecific/unitPrice",
        graphqlType: "Decimal",
      },
      {
        name: "unitOfMeasure",
        pointer: "/systemExtensions/intake_process/items/intake_processSpecific/unitOfMeasure",
        graphqlType: "String",
      },
      {
        name: "optional",
        pointer: "/systemExtensions/intake_process/items/intake_processSpecific/optional",
        graphqlType: "String",
      },
      {
        name: "notToExceed",
        pointer: "/systemExtensions/intake_process/items/intake_processSpecific/notToExceed",
        graphqlType: "String",
      },
      {
        name: "notSeparatelyPriced",
        pointer: "/systemExtensions/intake_process/items/intake_processSpecific/notSeparatelyPriced",
        graphqlType: "String",
      },
    ],
  },
];

// Enum configurations (currently empty, but may be populated in future)
export const enumConfigs = [];

// Union configurations (currently empty, but may be populated in future)
export const unionConfigs = [];

export { scalars, typeConfigs };
