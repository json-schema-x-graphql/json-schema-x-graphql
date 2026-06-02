#!/usr/bin/env node

/**
 * Federated Schema Composition & Drift Validator CLI
 *
 * Implements Phase 1 of Issue #84 & #83:
 * 1. Composes local subgraphs using @theguild/federation-composition.
 * 2. Compares the newly composed supergraph AST against the production supergraph.
 * 3. Categorizes changes as safe additions (evolution) vs breaking drifts.
 * 4. Outputs beautiful colorized markdown tables and fails with exit 1 on breaking changes.
 */

const fs = require("fs");
const path = require("path");
const {
  parse,
  buildASTSchema,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isEnumType,
  isInputObjectType,
  isScalarType,
} = require("graphql");
const { composeServices } = require("@theguild/federation-composition");

// Color Utilities
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printSection(title) {
  console.log("\n" + "=".repeat(80));
  log(`🚀 ${title}`, "cyan");
  console.log("=".repeat(80));
}

function parseTypeString(str) {
  str = str.trim();
  if (str.endsWith("!")) {
    return {
      kind: "NON_NULL",
      type: parseTypeString(str.slice(0, -1)),
    };
  }
  if (str.startsWith("[") && str.endsWith("]")) {
    return {
      kind: "LIST",
      type: parseTypeString(str.slice(1, -1)),
    };
  }
  return {
    kind: "NAMED",
    name: str,
  };
}

function isCompatibleOutputType(prod, dev) {
  if (prod.kind === "NON_NULL") {
    if (dev.kind !== "NON_NULL") {
      return false;
    }
    return isCompatibleOutputType(prod.type, dev.type);
  }
  if (dev.kind === "NON_NULL") {
    return isCompatibleOutputType(prod, dev.type);
  }
  if (prod.kind === "LIST") {
    if (dev.kind !== "LIST") {
      return false;
    }
    return isCompatibleOutputType(prod.type, dev.type);
  }
  if (dev.kind === "LIST") {
    return false;
  }
  return prod.name === dev.name;
}

// Breaking Change Detection Class
class DriftDetector {
  constructor(prodSdl, devSdl) {
    this.prodSchema = this.buildSchema(prodSdl, "Production");
    this.devSchema = this.buildSchema(devSdl, "Development (Proposed)");
    this.breakingChanges = [];
    this.safeChanges = [];
  }

  buildSchema(sdl, label) {
    try {
      const ast = parse(sdl);
      return buildASTSchema(ast);
    } catch (err) {
      log(`✗ Error parsing ${label} schema: ${err.message}`, "red");
      throw err;
    }
  }

  getTypeKind(type) {
    if (isObjectType(type)) return "OBJECT";
    if (isInterfaceType(type)) return "INTERFACE";
    if (isUnionType(type)) return "UNION";
    if (isEnumType(type)) return "ENUM";
    if (isInputObjectType(type)) return "INPUT_OBJECT";
    if (isScalarType(type)) return "SCALAR";
    return "UNKNOWN";
  }

  analyze() {
    if (!this.prodSchema || !this.devSchema) return;

    const prodTypes = this.prodSchema.getTypeMap();
    const devTypes = this.devSchema.getTypeMap();

    for (const [typeName, prodType] of Object.entries(prodTypes)) {
      // Ignore built-in GraphQL types
      if (typeName.startsWith("__")) continue;

      const devType = devTypes[typeName];

      // 1. Type Deleted
      if (!devType) {
        this.breakingChanges.push({
          type: "TYPE_REMOVED",
          message: `Type '${typeName}' was removed entirely from the supergraph.`,
          typeName,
        });
        continue;
      }

      // 2. Type Kind Mismatched
      const prodKind = this.getTypeKind(prodType);
      const devKind = this.getTypeKind(devType);
      if (prodKind !== devKind) {
        this.breakingChanges.push({
          type: "TYPE_KIND_CHANGED",
          message: `Type '${typeName}' changed kind from ${prodKind} to ${devKind}.`,
          typeName,
        });
        continue;
      }

      // 3. Granular checks by kind
      if (isObjectType(prodType) || isInterfaceType(prodType)) {
        this.compareFields(typeName, prodType, devType);
      } else if (isEnumType(prodType)) {
        this.compareEnumValues(typeName, prodType, devType);
      } else if (isInputObjectType(prodType)) {
        this.compareInputFields(typeName, prodType, devType);
      }
    }

    // 4. Safe Additions (Evolution)
    for (const [typeName, devType] of Object.entries(devTypes)) {
      if (typeName.startsWith("__")) continue;
      if (!prodTypes[typeName]) {
        this.safeChanges.push({
          type: "TYPE_ADDED",
          message: `Added new type '${typeName}' (${this.getTypeKind(devType)}).`,
          typeName,
        });
      }
    }
  }

  compareFields(typeName, prodType, devType) {
    const prodFields = prodType.getFields();
    const devFields = devType.getFields();

    for (const [fieldName, prodField] of Object.entries(prodFields)) {
      const devField = devFields[fieldName];

      // Field Removed
      if (!devField) {
        this.breakingChanges.push({
          type: "FIELD_REMOVED",
          message: `Field '${typeName}.${fieldName}' was removed from the schema.`,
          typeName,
          fieldName,
        });
        continue;
      }

      // Compare Field Types (Covariant Output Type rules)
      const prodTypeStr = prodField.type.toString();
      const devTypeStr = devField.type.toString();

      if (prodTypeStr !== devTypeStr) {
        const isBreaking = this.isOutputFieldTypeChangeBreaking(prodTypeStr, devTypeStr);
        if (isBreaking) {
          this.breakingChanges.push({
            type: "FIELD_TYPE_CHANGED",
            message: `Field '${typeName}.${fieldName}' changed type from '${prodTypeStr}' to incompatible '${devTypeStr}'.`,
            typeName,
            fieldName,
          });
        } else {
          this.safeChanges.push({
            type: "FIELD_TYPE_EVOLVED",
            message: `Field '${typeName}.${fieldName}' changed type safely from '${prodTypeStr}' to '${devTypeStr}'.`,
            typeName,
            fieldName,
          });
        }
      }
    }

    // Safe Field Additions
    for (const [fieldName, devField] of Object.entries(devFields)) {
      if (!prodFields[fieldName]) {
        this.safeChanges.push({
          type: "FIELD_ADDED",
          message: `Added new field '${typeName}.${fieldName}' of type '${devField.type.toString()}'.`,
          typeName,
          fieldName,
        });
      }
    }
  }

  isOutputFieldTypeChangeBreaking(prod, dev) {
    const prodParsed = parseTypeString(prod);
    const devParsed = parseTypeString(dev);
    return !isCompatibleOutputType(prodParsed, devParsed);
  }

  compareEnumValues(typeName, prodType, devType) {
    const prodValues = prodType.getValues().map((v) => v.name);
    const devValues = devType.getValues().map((v) => v.name);

    for (const val of prodValues) {
      if (!devValues.includes(val)) {
        this.breakingChanges.push({
          type: "ENUM_VALUE_REMOVED",
          message: `Enum value '${typeName}.${val}' was removed.`,
          typeName,
        });
      }
    }

    for (const val of devValues) {
      if (!prodValues.includes(val)) {
        this.safeChanges.push({
          type: "ENUM_VALUE_ADDED",
          message: `Added new enum value '${typeName}.${val}'.`,
          typeName,
        });
      }
    }
  }

  compareInputFields(typeName, prodType, devType) {
    const prodFields = prodType.getFields();
    const devFields = devType.getFields();

    for (const [fieldName, prodField] of Object.entries(prodFields)) {
      const devField = devFields[fieldName];

      // Input field removed is breaking
      if (!devField) {
        this.breakingChanges.push({
          type: "INPUT_FIELD_REMOVED",
          message: `Input field '${typeName}.${fieldName}' was removed.`,
          typeName,
          fieldName,
        });
        continue;
      }

      // Input Type rules (Contravariant: more restrictive is breaking)
      const prodTypeStr = prodField.type.toString();
      const devTypeStr = devField.type.toString();

      if (prodTypeStr !== devTypeStr) {
        const prodParsed = parseTypeString(prodTypeStr);
        const devParsed = parseTypeString(devTypeStr);
        const isCompatibleInput = isCompatibleOutputType(devParsed, prodParsed); // Swapped for Contravariance!

        if (!isCompatibleInput) {
          this.breakingChanges.push({
            type: "INPUT_FIELD_TYPE_CHANGED",
            message: `Input field '${typeName}.${fieldName}' changed type from '${prodTypeStr}' to incompatible '${devTypeStr}'.`,
            typeName,
            fieldName,
          });
        }
      }
    }

    // Input field added: if it is non-null, it's breaking
    for (const [fieldName, devField] of Object.entries(devFields)) {
      if (!prodFields[fieldName]) {
        const devTypeStr = devField.type.toString();
        const devTypeParsed = parseTypeString(devTypeStr);
        if (devTypeParsed.kind === "NON_NULL") {
          this.breakingChanges.push({
            type: "REQUIRED_INPUT_FIELD_ADDED",
            message: `Added new required input field '${typeName}.${fieldName}' of type '${devTypeStr}', which breaks old queries.`,
            typeName,
            fieldName,
          });
        } else {
          this.safeChanges.push({
            type: "INPUT_FIELD_ADDED",
            message: `Added optional input field '${typeName}.${fieldName}' of type '${devTypeStr}'.`,
            typeName,
            fieldName,
          });
        }
      }
    }
  }
}

// Composition & Validation Runner
async function runCompositionAndDriftCheck() {
  const args = process.argv.slice(2);
  const subgraphsDir = args[0] || "output/federation/node";
  const supergraphDir = args[1] || "output/federation/supergraph";

  printSection("Organic Evolution Schema Drift & Composition Check");
  log(`Subgraphs Directory: ${subgraphsDir}`, "blue");
  log(`Supergraph Directory: ${supergraphDir}`, "blue");

  // Examples defined in system configuration
  const examples = [
    {
      name: "apollo-classic",
      subgraphs: ["users", "products", "reviews"],
    },
    {
      name: "strawberry",
      subgraphs: ["books", "reviews"],
    },
  ];

  let hasErrors = false;

  for (const example of examples) {
    printSection(`Analyzing Subgraph Federation Group: ${example.name}`);

    const subgraphs = [];
    let loadFailed = false;

    // Load each subgraph file
    for (const service of example.subgraphs) {
      const fileName = `${example.name}-${service}.graphql`;
      const filePath = path.join(subgraphsDir, fileName);

      if (!fs.existsSync(filePath)) {
        log(`✗ Subgraph file not found: ${filePath}`, "red");
        loadFailed = true;
        continue;
      }

      const schemaContent = fs.readFileSync(filePath, "utf-8");
      subgraphs.push({
        name: service,
        schema: schemaContent,
      });
    }

    if (loadFailed || subgraphs.length === 0) {
      log(`✗ Skipping composition check due to missing subgraph files.`, "yellow");
      hasErrors = true;
      continue;
    }

    // Dry-run supergraph composition
    log(`Composing subgraphs via @theguild/federation-composition...`, "blue");
    const services = subgraphs.map((sg) => ({
      name: sg.name,
      typeDefs: parse(sg.schema),
    }));

    const compositionResult = composeServices(services);

    if (compositionResult.errors && compositionResult.errors.length > 0) {
      log(`✗ Composition failed with ${compositionResult.errors.length} errors:`, "red");
      compositionResult.errors.forEach((err, idx) => {
        log(`  ${idx + 1}. ${err.message}`, "bold");
      });
      hasErrors = true;
      continue;
    }

    const newSupergraphSdl = compositionResult.supergraphSdl;
    log(`✓ Composition successful!`, "green");

    // Output composed supergraph for local hot-reloads
    const supergraphPath = path.join(supergraphDir, `${example.name}-supergraph.graphql`);
    fs.mkdirSync(supergraphDir, { recursive: true });

    // Compare with Baseline Production Supergraph
    if (fs.existsSync(supergraphPath)) {
      log(`Comparing new composed supergraph against production baseline...`, "blue");
      const oldSupergraphSdl = fs.readFileSync(supergraphPath, "utf-8");

      try {
        const detector = new DriftDetector(oldSupergraphSdl, newSupergraphSdl);
        detector.analyze();

        // Print Safe Changes (Evolution)
        if (detector.safeChanges.length > 0) {
          log(`\n🌱 Organic Evolution Safe Additions:`, "green");
          detector.safeChanges.forEach((change) => {
            console.log(`  [SAFE] ${change.message}`);
          });
        }

        // Print Breaking Changes (Drift)
        if (detector.breakingChanges.length > 0) {
          log(`\n🚨 Breaking Drift/Regressions Detected!`, "red");
          detector.breakingChanges.forEach((change) => {
            log(`  [BREAKING] ${change.message}`, "red");
          });
          hasErrors = true;
        } else {
          log(
            `\n✓ No breaking drift detected. Supergraph evolved organically and safely!`,
            "green",
          );
        }
      } catch (err) {
        log(`✗ Failed to run drift detector comparison: ${err.message}`, "red");
        hasErrors = true;
      }
    } else {
      log(
        `ℹ Baseline production supergraph not found at ${supergraphPath}. Treating dev composition as initial baseline.`,
        "yellow",
      );
    }

    // NOTE: Avoid overwriting an existing baseline unless explicitly requested.
    if (!fs.existsSync(supergraphPath) || process.env.UPDATE_SUPERGRAPH_BASELINE === "1") {
      fs.writeFileSync(supergraphPath, newSupergraphSdl, "utf-8");
      log(`Composed Supergraph saved to: ${supergraphPath}`, "green");
    } else {
      const proposedPath = supergraphPath.replace(".graphql", ".proposed.graphql");
      fs.writeFileSync(proposedPath, newSupergraphSdl, "utf-8");
      log(
        `Skipping baseline update for ${supergraphPath} (set UPDATE_SUPERGRAPH_BASELINE=1 to update). Proposed supergraph saved to: ${proposedPath}`,
        "yellow",
      );
    }
  }

  printSection("Governance Review Finished");
  if (hasErrors) {
    log(`✗ Validation Failed! Composition drift or compile errors detected.`, "red");
    process.exit(1);
  } else {
    log(`✓ All validations passed successfully!`, "green");
    process.exit(0);
  }
}

// Run validation script
runCompositionAndDriftCheck().catch((error) => {
  console.error("Fatal exception in composition drift runner:", error);
  process.exit(1);
});
