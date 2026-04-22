#!/usr/bin/env node

/**
 * Convert V1 Schema (Nested) to V2 Schema (Definitions-based)
 *
 * This script extracts reusable types from the nested V1 schema structure
 * and creates a V2 schema with a definitions section for tooling compatibility.
 *
 * V1 Structure: Deeply nested objects inline
 * V2 Structure: Named definitions with $ref pointers
 *
 * Usage:
 *   node scripts/convert-v1-to-v2.mjs [input] [output]
 *   node scripts/convert-v1-to-v2.mjs src/data/schema_unification.schema.json src/data/schema_unification.schema.json
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

/**
 * Extract reusable type definitions from nested schema
 */
function extractDefinitions(schema) {
  const definitions = {};

  // Helper to create a definition from a nested object
  function extractObject(obj, name) {
    if (!obj || typeof obj !== "object" || obj.type !== "object") {
      return null;
    }

    const definition = {
      type: "object",
      description: obj.description || `${name} information`,
    };

    if (obj.properties) {
      definition.properties = {};
      for (const [propName, propDef] of Object.entries(obj.properties)) {
        definition.properties[propName] = { ...propDef };
      }
    }

    if (obj.required && obj.required.length > 0) {
      definition.required = [...obj.required];
    }

    return definition;
  }

  // Extract from systemMetadata
  if (schema.properties?.systemMetadata?.properties) {
    const sysProps = schema.properties.systemMetadata.properties;

    // SystemChainEntry
    if (sysProps.systemChain?.items) {
      const chainEntry = sysProps.systemChain.items;
      definitions.SystemChainEntry = extractObject(chainEntry, "SystemChainEntry");

      // DataQuality (nested in SystemChainEntry)
      if (chainEntry.properties?.dataQuality) {
        definitions.DataQuality = extractObject(chainEntry.properties.dataQuality, "DataQuality");
      }
    }

    // SystemMetadata itself
    definitions.SystemMetadata = {
      type: "object",
      description: schema.properties.systemMetadata.description,
      properties: {
        primarySystem: { ...sysProps.primarySystem },
        systemChain: {
          type: "array",
          description: sysProps.systemChain.description,
          items: { $ref: "#/definitions/SystemChainEntry" },
        },
        schemaVersion: { ...sysProps.schemaVersion },
        lastModified: { ...sysProps.lastModified },
        globalRecordId: { ...sysProps.globalRecordId },
      },
      required: ["primarySystem", "systemChain", "globalRecordId"],
    };
  }

  // Extract from commonElements
  if (schema.properties?.commonElements?.properties) {
    const common = schema.properties.commonElements.properties;

    // ContractIdentification
    if (common.contractIdentification) {
      definitions.ContractIdentification = extractObject(
        common.contractIdentification,
        "ContractIdentification",
      );
    }

    // AgencyInfo (used by multiple fields)
    definitions.AgencyInfo = {
      type: "object",
      description: "Agency or department information",
      properties: {
        code: {
          type: "string",
          description: "Agency or Department Code",
        },
        name: {
          type: "string",
          description: "Agency or Department Name",
        },
      },
    };

    // OrganizationInfo
    if (common.organizationInfo) {
      definitions.OrganizationInfo = {
        type: "object",
        description: common.organizationInfo.description,
        properties: {
          contractingAgency: { $ref: "#/definitions/AgencyInfo" },
          contractingDepartment: { $ref: "#/definitions/AgencyInfo" },
          fundingAgency: { $ref: "#/definitions/AgencyInfo" },
          fundingDepartment: { $ref: "#/definitions/AgencyInfo" },
        },
        required: ["contractingAgency"],
      };
    }

    // VendorInfo
    if (common.vendorInfo) {
      definitions.VendorInfo = extractObject(common.vendorInfo, "VendorInfo");
    }

    // PlaceOfPerformance
    if (common.placeOfPerformance) {
      definitions.PlaceOfPerformance = extractObject(
        common.placeOfPerformance,
        "PlaceOfPerformance",
      );
    }

    // FinancialInfo
    if (common.financialInfo) {
      definitions.FinancialInfo = extractObject(common.financialInfo, "FinancialInfo");
    }

    // BusinessClassification
    if (common.businessClassification) {
      definitions.BusinessClassification = extractObject(
        common.businessClassification,
        "BusinessClassification",
      );
    }

    // ContractCharacteristics
    if (common.contractCharacteristics) {
      definitions.ContractCharacteristics = extractObject(
        common.contractCharacteristics,
        "ContractCharacteristics",
      );
    }

    // Contact
    if (common.contacts?.items) {
      definitions.Contact = extractObject(common.contacts.items, "Contact");
    }

    // StatusInfo
    if (common.statusInfo) {
      definitions.StatusInfo = extractObject(common.statusInfo, "StatusInfo");
    }
  }

  // Extract system extensions
  if (schema.properties?.systemExtensions?.properties) {
    const extensions = schema.properties.systemExtensions.properties;

    // ContractDataExtension
    if (extensions.contract_data?.items) {
      definitions.ContractDataExtension = {
        type: "object",
        description: "Contract Data-specific fields and extensions",
        properties: {
          fieldName: { type: "string" },
          fieldType: { type: "string" },
          value: {},
          contract_dataSpecific:
            extensions.contract_data.items.properties?.contract_dataSpecific || {},
        },
      };
    }

    // AssistExtension
    if (extensions.legacy_procurement?.items) {
      definitions.AssistExtension = {
        type: "object",
        description: "Legacy Procurement-specific fields and extensions",
        properties: {
          fieldName: { type: "string" },
          fieldType: { type: "string" },
          value: {},
          legacy_procurementSpecific:
            extensions.legacy_procurement.items.properties?.legacy_procurementSpecific || {},
        },
      };
    }

    // EasiExtension
    if (extensions.intake_process?.items) {
      definitions.EasiExtension = {
        type: "object",
        description: "EASi-specific fields and extensions",
        properties: {
          fieldName: { type: "string" },
          fieldType: { type: "string" },
          value: {},
          intake_processSpecific:
            extensions.intake_process.items.properties?.intake_processSpecific || {},
        },
      };
    }
  }

  // Create main Contract type
  definitions.Contract = {
    type: "object",
    description: "Government contract with metadata and system-specific extensions",
    properties: {
      systemMetadata: { $ref: "#/definitions/SystemMetadata" },
      contractIdentification: { $ref: "#/definitions/ContractIdentification" },
      organizationInfo: { $ref: "#/definitions/OrganizationInfo" },
      vendorInfo: { $ref: "#/definitions/VendorInfo" },
      placeOfPerformance: { $ref: "#/definitions/PlaceOfPerformance" },
      financialInfo: { $ref: "#/definitions/FinancialInfo" },
      businessClassification: { $ref: "#/definitions/BusinessClassification" },
      contractCharacteristics: {
        $ref: "#/definitions/ContractCharacteristics",
      },
      contacts: {
        type: "array",
        items: { $ref: "#/definitions/Contact" },
      },
      statusInfo: { $ref: "#/definitions/StatusInfo" },
      contract_dataExtensions: {
        type: "array",
        items: { $ref: "#/definitions/ContractDataExtension" },
      },
      legacy_procurementExtensions: {
        type: "array",
        items: { $ref: "#/definitions/AssistExtension" },
      },
      intake_processExtensions: {
        type: "array",
        items: { $ref: "#/definitions/EasiExtension" },
      },
    },
    required: ["systemMetadata", "contractIdentification", "organizationInfo", "statusInfo"],
  };

  return definitions;
}

/**
 * Add GraphQL extensions to definitions
 */
function addGraphQLExtensions(definitions) {
  // Add scalars
  const scalars = {
    DateTime: {
      description: "ISO 8601 date-time string (YYYY-MM-DDTHH:mm:ss.sssZ)",
      serialize: "String",
    },
    Date: {
      description: "ISO 8601 date string (YYYY-MM-DD)",
      serialize: "String",
    },
    Decimal: {
      description: "High-precision decimal number for currency and financial values",
      serialize: "Float",
    },
    JSON: {
      description: "Arbitrary JSON value",
      serialize: "JSON",
    },
    Email: {
      description: "Valid email address",
      serialize: "String",
    },
    URI: {
      description: "Valid URI/URL",
      serialize: "String",
    },
  };

  // Add enum for SystemType
  definitions.SystemType = {
    type: "string",
    enum: ["Contract Data", "Legacy Procurement", "Intake Process", "Logistics Mgmt"],
    "x-graphql-enum": {
      name: "SystemType",
      description: "Source system types",
      values: {
        contract_data: {
          name: "Contract Data",
          description: "Federal Procurement Data System - Next Generation",
        },
        legacy_procurement: {
          name: "Legacy Procurement",
          description: "Award System for Streamlined IT Transactions",
        },
        intake_process: {
          name: "Intake Process",
          description: "Enterprise Acquisition System for Infrastructure",
        },
        logistics_mgmt: {
          name: "Logistics Mgmt",
          description: "Contract Award Lifecycle Management",
        },
      },
    },
  };

  // Add enum for ContactRole
  definitions.ContactRole = {
    type: "string",
    enum: ["primary", "technical", "administrative", "contracting_officer"],
    "x-graphql-enum": {
      name: "ContactRole",
      description: "Contact role types",
      values: {
        primary: { name: "PRIMARY", description: "Primary contact" },
        technical: { name: "TECHNICAL", description: "Technical contact" },
        administrative: {
          name: "ADMINISTRATIVE",
          description: "Administrative contact",
        },
        contracting_officer: {
          name: "CONTRACTING_OFFICER",
          description: "Contracting officer",
        },
      },
    },
  };

  // Add enum for ContractStatus
  definitions.ContractStatus = {
    type: "string",
    enum: ["draft", "published", "awarded", "completed", "cancelled"],
    "x-graphql-enum": {
      name: "ContractStatus",
      description: "Contract status values",
      values: {
        draft: { name: "DRAFT", description: "Draft contract" },
        published: { name: "PUBLISHED", description: "Published contract" },
        awarded: { name: "AWARDED", description: "Awarded contract" },
        completed: { name: "COMPLETED", description: "Completed contract" },
        cancelled: { name: "CANCELLED", description: "Cancelled contract" },
      },
    },
  };

  // Update SystemMetadata to use SystemType enum
  if (definitions.SystemMetadata?.properties?.primarySystem) {
    definitions.SystemMetadata.properties.primarySystem = {
      $ref: "#/definitions/SystemType",
    };
  }

  // Update SystemChainEntry to use SystemType enum
  if (definitions.SystemChainEntry?.properties?.systemName) {
    definitions.SystemChainEntry.properties.systemName = {
      $ref: "#/definitions/SystemType",
      "x-graphql-required": true,
    };
  }

  // Update Contact to use ContactRole enum
  if (definitions.Contact?.properties?.role) {
    definitions.Contact.properties.role = {
      $ref: "#/definitions/ContactRole",
    };
  }

  // Update StatusInfo to use ContractStatus enum
  if (definitions.StatusInfo?.properties?.status) {
    definitions.StatusInfo.properties.status = {
      $ref: "#/definitions/ContractStatus",
    };
  }

  // Apply x-graphql-scalar to date/datetime fields
  function applyScalarTypes(obj) {
    if (!obj || typeof obj !== "object") return;

    if (obj.properties) {
      for (const [key, prop] of Object.entries(obj.properties)) {
        if (prop.format === "date-time") {
          prop["x-graphql-scalar"] = "DateTime";
        } else if (prop.format === "date") {
          prop["x-graphql-scalar"] = "Date";
        } else if (prop.format === "email") {
          prop["x-graphql-scalar"] = "Email";
        } else if (prop.format === "uri") {
          prop["x-graphql-scalar"] = "URI";
        } else if (
          prop.type === "number" &&
          (key.includes("value") || key.includes("amount") || key.includes("price"))
        ) {
          prop["x-graphql-scalar"] = "Decimal";
        }

        // Recurse into nested objects
        if (prop.type === "object") {
          applyScalarTypes(prop);
        }
      }
    }
  }

  // Apply scalars to all definitions
  for (const def of Object.values(definitions)) {
    applyScalarTypes(def);
  }

  // Add union for system extensions
  definitions.SystemExtension = {
    "x-graphql-union": {
      name: "SystemExtension",
      description: "Union of system-specific extensions",
      types: ["ContractDataExtension", "AssistExtension", "EasiExtension"],
    },
    oneOf: [
      { $ref: "#/definitions/ContractDataExtension" },
      { $ref: "#/definitions/AssistExtension" },
      { $ref: "#/definitions/EasiExtension" },
    ],
  };

  return scalars;
}

/**
 * Add GraphQL operations
 */
function addGraphQLOperations() {
  return {
    queries: {
      contract: {
        type: "Contract",
        description: "Fetch a single contract by global ID",
        args: {
          id: {
            type: "ID!",
            description: "Global record identifier",
          },
        },
      },
      contractByPiid: {
        type: "Contract",
        description: "Fetch a contract by PIID",
        args: {
          piid: {
            type: "String!",
            description: "Procurement Instrument Identifier",
          },
        },
      },
      contracts: {
        type: "[Contract!]!",
        description: "List all contracts with optional filtering",
        args: {
          limit: {
            type: "Int",
            description: "Maximum number of results",
            default: 100,
          },
          offset: {
            type: "Int",
            description: "Number of results to skip",
            default: 0,
          },
        },
      },
      contractsBySystem: {
        type: "[Contract!]!",
        description: "List contracts by source system",
        args: {
          system: {
            type: "SystemType!",
            description: "Source system to filter by",
          },
        },
      },
    },
    mutations: {
      triggerDataIngestion: {
        type: "Boolean",
        description: "Trigger data ingestion from a source system",
        args: {
          system: {
            type: "SystemType!",
            description: "Source system to ingest from",
          },
          batchDate: {
            type: "String",
            description: "Optional batch date to process",
          },
        },
      },
    },
  };
}

/**
 * Convert V1 schema to V2 format
 */
function convertV1ToV2(v1Schema) {
  console.log("🔄 Converting V1 schema to V2 format...");

  // Extract definitions
  console.log("  ├─ Extracting type definitions...");
  const definitions = extractDefinitions(v1Schema);
  console.log(`  ├─ Extracted ${Object.keys(definitions).length} type definitions`);

  // Add GraphQL extensions
  console.log("  ├─ Adding GraphQL extensions...");
  const scalars = addGraphQLExtensions(definitions);
  console.log(`  ├─ Added ${Object.keys(scalars).length} custom scalars`);

  // Add GraphQL operations
  console.log("  ├─ Adding GraphQL operations...");
  const operations = addGraphQLOperations();
  console.log(
    `  ├─ Added ${Object.keys(operations.queries).length} queries and ${Object.keys(operations.mutations).length} mutations`,
  );

  // Build V2 schema
  const v2Schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://github.com/GSA-TTS/enterprise-schema-unification/schemas/contract-v2-graphql",
    title: "Enhanced Government Contract Management Schema v2.0 with GraphQL Extensions",
    description:
      "Restructured schema with definitions for compatibility with standard tooling (typeconv, core-types) and x-graphql-* extensions for automated GraphQL SDL generation",
    "x-graphql-scalars": scalars,
    "x-graphql-operations": operations,
    definitions,
    $ref: "#/definitions/Contract",
  };

  console.log("  └─ V2 schema created successfully!");

  return v2Schema;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || path.join(repoRoot, "src", "data", "schema_unification.schema.json");
  const outputPath =
    args[1] || path.join(repoRoot, "src", "data", "schema_unification.schema.v2-generated.json");

  console.log("🚀 V1 to V2 Schema Converter\n");
  console.log(`📖 Input:  ${path.relative(repoRoot, inputPath)}`);
  console.log(`📝 Output: ${path.relative(repoRoot, outputPath)}\n`);

  try {
    // Read V1 schema
    const v1Content = await fs.readFile(inputPath, "utf-8");
    const v1Schema = JSON.parse(v1Content);

    // Convert to V2
    const v2Schema = convertV1ToV2(v1Schema);

    // Write V2 schema (prettified)
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    // lazy-load prettier helper to avoid loading in tests that don't need it
    const { formatJson } = await import("./helpers/format-json.mjs");
    const outputText = await Promise.resolve(formatJson(v2Schema));
    await fs.writeFile(outputPath, outputText, "utf-8");

    console.log(`\n✨ Success! V2 schema written to: ${path.relative(repoRoot, outputPath)}`);
    console.log(`📊 File size: ${(JSON.stringify(v2Schema).length / 1024).toFixed(2)} KB`);
    console.log(`📏 Definitions: ${Object.keys(v2Schema.definitions).length}`);
    console.log(`📏 Scalars: ${Object.keys(v2Schema["x-graphql-scalars"]).length}`);
    console.log(`📏 Queries: ${Object.keys(v2Schema["x-graphql-operations"].queries).length}`);
    console.log(`📏 Mutations: ${Object.keys(v2Schema["x-graphql-operations"].mutations).length}`);

    console.log("\n💡 Next steps:");
    console.log("  1. Review the generated schema");
    console.log("  2. Test with: node scripts/generate-graphql-custom.mjs");
    console.log("  3. Compare with existing v2-graphql.json");
    console.log("  4. Update as needed");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { convertV1ToV2, extractDefinitions, addGraphQLExtensions, addGraphQLOperations };
