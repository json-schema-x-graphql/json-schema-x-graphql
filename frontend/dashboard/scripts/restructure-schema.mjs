#!/usr/bin/env node

/**
 * Restructure schema_unification.schema.json to use definitions
 * This preserves all fields while making the schema compatible with typeconv and core-types
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const schemaPath = path.join(repoRoot, "src", "data", "schema_unification.schema.json");
const outputPath = path.join(repoRoot, "src", "data", "schema_unification.schema.json"); // Overwrite canonical file
const backupPath = path.join(
  repoRoot,
  "src",
  "data",
  "archived",
  "schema_unification.schema.v1-backup.json",
);

async function restructureSchema() {
  console.log("📖 Reading current schema...");
  const schemaContent = await fs.readFile(schemaPath, "utf8");
  const originalSchema = JSON.parse(schemaContent);

  console.log("💾 Creating backup...");
  await fs.writeFile(backupPath, schemaContent, "utf8");
  console.log(`   ✓ Backup saved: ${path.relative(repoRoot, backupPath)}`);

  console.log("\n🔨 Restructuring schema...");

  // Extract nested object schemas into definitions
  const definitions = {};

  // Helper to extract object type definitions
  function extractDefinition(name, schema, description = null) {
    const def = {
      type: "object",
      ...(description && { description }),
      ...(schema.properties && { properties: schema.properties }),
      ...(schema.required && { required: schema.required }),
    };
    definitions[name] = def;
    console.log(`   ✓ Extracted: ${name}`);
    return def;
  }

  // 1. SystemMetadata and nested objects
  const systemMetadata = originalSchema.properties.systemMetadata;

  // DataQuality definition
  if (systemMetadata.properties.systemChain?.items?.properties?.dataQuality) {
    extractDefinition(
      "DataQuality",
      systemMetadata.properties.systemChain.items.properties.dataQuality,
      "Data quality metrics for system chain entry",
    );
  }

  // SystemChainEntry definition
  const systemChainEntry = {
    type: "object",
    description: "Entry in the system chain showing data flow",
    properties: {
      ...systemMetadata.properties.systemChain.items.properties,
      dataQuality: { $ref: "#/definitions/DataQuality" },
    },
    required: systemMetadata.properties.systemChain.items.required,
  };
  definitions["SystemChainEntry"] = systemChainEntry;
  console.log("   ✓ Extracted: SystemChainEntry");

  // SystemMetadata definition
  definitions["SystemMetadata"] = {
    type: "object",
    description: systemMetadata.description,
    properties: {
      primarySystem: systemMetadata.properties.primarySystem,
      systemChain: {
        type: "array",
        description: systemMetadata.properties.systemChain.description,
        items: { $ref: "#/definitions/SystemChainEntry" },
      },
      schemaVersion: systemMetadata.properties.schemaVersion,
      lastModified: systemMetadata.properties.lastModified,
      globalRecordId: systemMetadata.properties.globalRecordId,
    },
    required: systemMetadata.required,
  };
  console.log("   ✓ Extracted: SystemMetadata");

  // 2. CommonElements nested objects
  const commonElements = originalSchema.properties.commonElements;

  // ContractIdentification
  extractDefinition(
    "ContractIdentification",
    commonElements.properties.contractIdentification,
    "Contract identification information",
  );

  // AgencyInfo (reusable for multiple agencies)
  definitions["AgencyInfo"] = {
    type: "object",
    description: "Agency or department information",
    properties: {
      code: { type: "string", description: "Agency or Department Code" },
      name: { type: "string", description: "Agency or Department Name" },
    },
  };
  console.log("   ✓ Extracted: AgencyInfo");

  // OrganizationInfo
  definitions["OrganizationInfo"] = {
    type: "object",
    description: "Organization information for contracts",
    properties: {
      contractingAgency: {
        allOf: [{ $ref: "#/definitions/AgencyInfo" }, { required: ["code"] }],
      },
      contractingDepartment: { $ref: "#/definitions/AgencyInfo" },
      fundingAgency: { $ref: "#/definitions/AgencyInfo" },
      fundingDepartment: { $ref: "#/definitions/AgencyInfo" },
    },
    required: ["contractingAgency"],
  };
  console.log("   ✓ Extracted: OrganizationInfo");

  // VendorInfo
  extractDefinition("VendorInfo", commonElements.properties.vendorInfo, "Vendor information");

  // PlaceOfPerformance
  extractDefinition(
    "PlaceOfPerformance",
    commonElements.properties.placeOfPerformance,
    "Place of performance location details",
  );

  // FinancialInfo
  extractDefinition(
    "FinancialInfo",
    commonElements.properties.financialInfo,
    "Financial information and values",
  );

  // BusinessClassification
  extractDefinition(
    "BusinessClassification",
    commonElements.properties.businessClassification,
    "Business classification codes and categories",
  );

  // ContractCharacteristics
  extractDefinition(
    "ContractCharacteristics",
    commonElements.properties.contractCharacteristics,
    "Contract characteristics and flags",
  );

  // Contact
  definitions["Contact"] = {
    type: "object",
    description: "Contact information for contract personnel",
    properties: commonElements.properties.contacts.items.properties,
  };
  console.log("   ✓ Extracted: Contact");

  // StatusInfo
  extractDefinition(
    "StatusInfo",
    commonElements.properties.statusInfo,
    "Contract status information",
  );

  // CommonElements
  definitions["CommonElements"] = {
    type: "object",
    description: commonElements.description,
    properties: {
      contractIdentification: { $ref: "#/definitions/ContractIdentification" },
      organizationInfo: { $ref: "#/definitions/OrganizationInfo" },
      vendorInfo: { $ref: "#/definitions/VendorInfo" },
      placeOfPerformance: { $ref: "#/definitions/PlaceOfPerformance" },
      financialInfo: { $ref: "#/definitions/FinancialInfo" },
      businessClassification: { $ref: "#/definitions/BusinessClassification" },
      contractCharacteristics: { $ref: "#/definitions/ContractCharacteristics" },
      contacts: {
        type: "array",
        items: { $ref: "#/definitions/Contact" },
      },
      statusInfo: { $ref: "#/definitions/StatusInfo" },
    },
    required: commonElements.required,
  };
  console.log("   ✓ Extracted: CommonElements");

  // 3. SystemExtensions definitions
  const systemExtensions = originalSchema.properties.systemExtensions;

  // Contract Data Specific types
  definitions["Contract DataAssistanceType"] = {
    type: "object",
    properties: {
      code: { type: "string" },
      value: { type: "string" },
      level: { type: "integer" },
    },
  };
  console.log("   ✓ Extracted: Contract DataAssistanceType");

  definitions["Contract DataApplicantBeneficiaryType"] = {
    type: "object",
    properties: {
      value: { type: "string" },
      code: { type: "string" },
    },
  };
  console.log("   ✓ Extracted: Contract DataApplicantBeneficiaryType");

  definitions["Contract DataEligibility"] = {
    type: "object",
    properties: {
      applicantTypes: {
        type: "array",
        items: { $ref: "#/definitions/Contract DataApplicantBeneficiaryType" },
      },
      beneficiaryTypes: {
        type: "array",
        items: { $ref: "#/definitions/Contract DataApplicantBeneficiaryType" },
      },
      additionalInfo: { type: "string" },
    },
  };
  console.log("   ✓ Extracted: Contract DataEligibility");

  definitions["Contract DataUsage"] = {
    type: "object",
    properties: {
      rules: { type: "string" },
      restrictions: { type: "string" },
      loanTerms: { type: "string" },
      discretionaryFund: { type: "string" },
    },
  };
  console.log("   ✓ Extracted: Contract DataUsage");

  definitions["Contract DataSpecificData"] = {
    type: "object",
    description: "Contract Data-specific data fields",
    properties: {
      programNumber: { type: "string" },
      alternativeNames: {
        type: "array",
        items: { type: "string" },
      },
      objective: { type: "string" },
      website: { type: "string", format: "uri" },
      legacy_procurementanceTypes: {
        type: "array",
        items: { $ref: "#/definitions/Contract DataAssistanceType" },
      },
      eligibility: { $ref: "#/definitions/Contract DataEligibility" },
      usage: { $ref: "#/definitions/Contract DataUsage" },
    },
  };
  console.log("   ✓ Extracted: Contract DataSpecificData");

  definitions["Contract DataExtension"] = {
    type: "object",
    description: "Contract Data-specific field extension",
    properties: {
      fieldName: { type: "string" },
      fieldType: { type: "string" },
      value: {},
      contract_dataSpecific: { $ref: "#/definitions/Contract DataSpecificData" },
    },
  };
  console.log("   ✓ Extracted: Contract DataExtension");

  // Legacy Procurement Specific types
  definitions["AssistAcquisitionData"] = {
    type: "object",
    properties: {
      iaPiidOrUniqueId: {
        type: "string",
        maxLength: 50,
        description: "IA PIID or user-generated unique ID for the Interagency Agreement",
      },
      natureOfAcquisition: {
        type: "string",
        description: "Nature of Acquisition or Relationship between GSA and Requesting Agency",
        default: "ADMIN_CONTINUE_TRANSFER",
      },
    },
    required: ["iaPiidOrUniqueId", "natureOfAcquisition"],
  };
  console.log("   ✓ Extracted: AssistAcquisitionData");

  definitions["AssistOfficeAddress"] = {
    type: "object",
    properties: {
      streetAddress1: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
    },
  };
  console.log("   ✓ Extracted: AssistOfficeAddress");

  definitions["AssistClientData"] = {
    type: "object",
    properties: {
      clientOrganizationName: { type: "string" },
      officeAddress: { $ref: "#/definitions/AssistOfficeAddress" },
    },
    required: ["clientOrganizationName", "officeAddress"],
  };
  console.log("   ✓ Extracted: AssistClientData");

  definitions["AssistAwardData"] = {
    type: "object",
    properties: {
      typeOfIdc: { type: "string" },
      whoCanUseIdc: { type: "string" },
    },
  };
  console.log("   ✓ Extracted: AssistAwardData");

  definitions["AssistSpecificData"] = {
    type: "object",
    description: "Legacy Procurement-specific data fields",
    properties: {
      acquisitionData: { $ref: "#/definitions/AssistAcquisitionData" },
      clientData: { $ref: "#/definitions/AssistClientData" },
      awardData: { $ref: "#/definitions/AssistAwardData" },
    },
  };
  console.log("   ✓ Extracted: AssistSpecificData");

  definitions["AssistExtension"] = {
    type: "object",
    description: "Legacy Procurement-specific field extension",
    properties: {
      fieldName: { type: "string" },
      fieldType: { type: "string" },
      value: {},
      legacy_procurementSpecific: { $ref: "#/definitions/AssistSpecificData" },
    },
  };
  console.log("   ✓ Extracted: AssistExtension");

  // EASi Specific types
  definitions["EasiSpecificData"] = {
    type: "object",
    description: "EASi-specific data fields",
    properties: {
      businessOwner: {
        type: "string",
        description: "EASi Business Owner",
      },
      systemOwner: {
        type: "string",
        description: "EASi System Owner",
      },
      unitPrice: {
        type: "number",
        description: "Unit Price field available at the CLIN level",
      },
      unitOfMeasure: {
        type: "string",
        description: "Unit of Measure field available at the CLIN level",
      },
      optional: {
        type: "string",
        description: "Option Period or Not Applicable",
      },
      notToExceed: {
        type: "string",
        description: "Not to Exceed field",
      },
      notSeparatelyPriced: {
        type: "string",
        description: "Maps to Qualifier field at CLIN level",
      },
    },
  };
  console.log("   ✓ Extracted: EasiSpecificData");

  definitions["EasiExtension"] = {
    type: "object",
    description: "EASi-specific field extension",
    properties: {
      fieldName: { type: "string" },
      fieldType: { type: "string" },
      value: {},
      intake_processSpecific: { $ref: "#/definitions/EasiSpecificData" },
    },
  };
  console.log("   ✓ Extracted: EasiExtension");

  // SystemExtensions
  definitions["SystemExtensions"] = {
    type: "object",
    description: systemExtensions.description,
    properties: {
      contract_data: {
        type: "array",
        description: "Contract Data-specific fields and extensions",
        items: { $ref: "#/definitions/Contract DataExtension" },
      },
      legacy_procurement: {
        type: "array",
        description: "Legacy Procurement-specific fields and extensions",
        items: { $ref: "#/definitions/AssistExtension" },
      },
      intake_process: {
        type: "array",
        description: "EASi-specific fields and extensions",
        items: { $ref: "#/definitions/EasiExtension" },
      },
    },
  };
  console.log("   ✓ Extracted: SystemExtensions");

  // 4. Create the main Contract definition
  definitions["Contract"] = {
    type: "object",
    title: originalSchema.title,
    description: originalSchema.description,
    properties: {
      systemMetadata: { $ref: "#/definitions/SystemMetadata" },
      commonElements: { $ref: "#/definitions/CommonElements" },
      systemExtensions: { $ref: "#/definitions/SystemExtensions" },
    },
    required: originalSchema.required,
  };
  console.log("   ✓ Extracted: Contract (root)");

  // 5. Build the new schema structure
  const newSchema = {
    $schema: originalSchema.$schema,
    $id: "https://github.com/GSA-TTS/enterprise-schema-unification/schemas/contract-v2",
    title: "Enhanced Government Contract Management Schema v2.0",
    description:
      "Restructured schema with definitions for compatibility with standard tooling (typeconv, core-types)",
    definitions,
    $ref: "#/definitions/Contract",
  };

  console.log(`\n✅ Restructured schema with ${Object.keys(definitions).length} definitions`);

  // 6. Write the new schema
  await fs.writeFile(outputPath, JSON.stringify(newSchema, null, 2), "utf8");
  console.log(`\n📄 New schema saved: ${path.relative(repoRoot, outputPath)}`);

  // 7. Validation summary
  console.log("\n📊 Summary:");
  console.log(`   Original properties: ${Object.keys(originalSchema.properties).length}`);
  console.log(`   Definitions created: ${Object.keys(definitions).length}`);
  console.log(`   Backup location: ${path.relative(repoRoot, backupPath)}`);

  console.log("\n✨ Next steps:");
  console.log("   1. Review the new schema: cat src/data/schema_unification.schema.json");
  console.log(
    "   2. Test with typeconv: npx typeconv -f jsc -t gql -o test.graphql src/data/schema_unification.schema.json",
  );
  console.log("   3. Validate: node scripts/validate-schema.js");
  console.log("   4. If satisfied, commit src/data/schema_unification.schema.json");
}

restructureSchema().catch((err) => {
  console.error("\n❌ Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
