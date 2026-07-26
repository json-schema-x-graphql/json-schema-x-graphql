/**
 * Schema analysis module.
 *
 * Computes statistics, structural metrics, diffs, and coverage
 * reports for JSON Schemas. Mirrors the Rust implementation in
 * `converters/rust/src/analysis/mod.rs`.
 */

export interface DefinitionStats {
  name: string;
  kind: string;
  fieldCount: number;
  requiredCount: number;
  nullableCount: number;
  description: string | undefined;
  hasFederationKey: boolean;
  hasSkipFields: boolean;
}

export interface SchemaStats {
  totalDefinitions: number;
  byKind: Record<string, number>;
  definitions: DefinitionStats[];
  totalFields: number;
  maxDepth: number;
  federatedTypes: string[];
  allFieldNames: Set<string>;
  uniqueFieldCount: number;
  refCount: number;
}

/** Compute statistics for a JSON Schema. */
export function computeStats(schema: any): SchemaStats {
  const stats: SchemaStats = {
    totalDefinitions: 0,
    byKind: {},
    definitions: [],
    totalFields: 0,
    maxDepth: 0,
    federatedTypes: [],
    allFieldNames: new Set(),
    uniqueFieldCount: 0,
    refCount: 0,
  };

  if (!schema || typeof schema !== "object") return stats;
  const obj = schema as Record<string, unknown>;
  const defs = (obj["$defs"] ?? obj["definitions"]) as
    Record<string, unknown> | undefined;
  if (!defs) return stats;

  stats.totalDefinitions = Object.keys(defs).length;

  for (const [name, defSchema] of Object.entries(defs)) {
    const defStats = computeDefinitionStats(name, defSchema);
    stats.byKind[defStats.kind] = (stats.byKind[defStats.kind] ?? 0) + 1;
    stats.totalFields += defStats.fieldCount;
    if (defStats.hasFederationKey) {
      stats.federatedTypes.push(name);
    }
    for (const fieldName of collectFieldNames(defSchema)) {
      stats.allFieldNames.add(fieldName);
    }
    stats.definitions.push(defStats);
  }

  stats.uniqueFieldCount = stats.allFieldNames.size;
  stats.refCount = countRefs(schema);
  stats.maxDepth = computeMaxDepth(schema, 0);

  return stats;
}

function computeDefinitionStats(name: string, defSchema: any): DefinitionStats {
  const stats: DefinitionStats = {
    name,
    kind: "UNKNOWN",
    fieldCount: 0,
    requiredCount: 0,
    nullableCount: 0,
    description: undefined,
    hasFederationKey: false,
    hasSkipFields: false,
  };

  if (!defSchema || typeof defSchema !== "object") return stats;
  const obj = defSchema as Record<string, unknown>;
  stats.description = obj.description as string | undefined;

  // Determine kind
  stats.kind = determineKind(obj);

  // Federation key presence
  const federation = obj["x-graphql-federation"] as
    Record<string, unknown> | undefined;
  stats.hasFederationKey =
    "x-graphql-federation-keys" in obj ||
    "x-graphql-federation-key" in obj ||
    !!(federation && "keys" in federation);

  // Field-level stats
  const properties = obj["properties"] as Record<string, unknown> | undefined;
  if (properties) {
    stats.fieldCount = Object.keys(properties).length;
    const required = (obj["required"] as unknown[] | undefined) ?? [];
    stats.requiredCount = Array.isArray(required) ? required.length : 0;
    stats.nullableCount = Math.max(0, stats.fieldCount - stats.requiredCount);

    // Skip field check
    stats.hasSkipFields = Object.values(properties).some(
      (v) => (v as Record<string, unknown>)["x-graphql-skip"] === true,
    );
  }

  return stats;
}

function determineKind(obj: Record<string, unknown>): string {
  // x-graphql-type-kind takes precedence
  const explicitKind = obj["x-graphql-type-kind"] as string | undefined;
  if (explicitKind) return explicitKind;

  // x-graphql-enum indicates enum
  if ("x-graphql-enum" in obj) return "ENUM";

  // x-graphql-scalar indicates scalar
  if ("x-graphql-scalar" in obj) return "SCALAR";

  // x-graphql-union indicates union
  if ("x-graphql-union" in obj) return "UNION";

  // Standard JSON Schema type
  const t = obj["type"];
  if (typeof t === "string") return t.toUpperCase();
  if (Array.isArray(t)) {
    for (const v of t) {
      if (v !== "null" && typeof v === "string") return v.toUpperCase();
    }
  }

  return "UNKNOWN";
}

function collectFieldNames(defSchema: any): Set<string> {
  const names = new Set<string>();
  if (!defSchema || typeof defSchema !== "object") return names;
  const properties = (defSchema as Record<string, unknown>)["properties"] as
    Record<string, unknown> | undefined;
  if (!properties) return names;
  for (const key of Object.keys(properties)) {
    names.add(key);
  }
  return names;
}

function countRefs(value: any): number {
  let count = 0;
  countRefsRecursive(value, (c) => (count += c));
  return count;
}

function countRefsRecursive(value: any, increment: (n: number) => void): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const v of value) {
      countRefsRecursive(v, increment);
    }
    return;
  }
  if (typeof value === "object") {
    if ("$ref" in value) increment(1);
    for (const v of Object.values(value)) {
      countRefsRecursive(v, increment);
    }
  }
}

function computeMaxDepth(value: any, current: number): number {
  if (!value) return current;
  if (Array.isArray(value)) {
    let max = current;
    for (const v of value) {
      const d = computeMaxDepth(v, current + 1);
      if (d > max) max = d;
    }
    return max;
  }
  if (typeof value === "object") {
    let max = current;
    for (const v of Object.values(value)) {
      const d = computeMaxDepth(v, current + 1);
      if (d > max) max = d;
    }
    return max;
  }
  return current;
}

export type DiffSeverity = "added" | "removed" | "modified";
export type DiffCategory =
  "type" | "field" | "fieldType" | "fieldRequired" | "federation" | "metadata";

export interface Diff {
  category: DiffCategory;
  severity: DiffSeverity;
  path: string;
  message: string;
}

export interface DiffResult {
  diffs: Diff[];
  breakingChanges: number;
  nonBreakingChanges: number;
}

export function diffSchemas(oldSchema: any, newSchema: any): DiffResult {
  const diffs: Diff[] = [];
  const oldDefs = extractDefsMap(oldSchema);
  const newDefs = extractDefsMap(newSchema);

  const oldNames = new Set(Object.keys(oldDefs));
  const newNames = new Set(Object.keys(newDefs));

  // Added types
  for (const added of newNames) {
    if (!oldNames.has(added)) {
      diffs.push({
        category: "type",
        severity: "added",
        path: `$.$defs.${added}`,
        message: `Type '${added}' was added`,
      });
    }
  }

  // Removed types
  for (const removed of oldNames) {
    if (!newNames.has(removed)) {
      diffs.push({
        category: "type",
        severity: "removed",
        path: `$.$defs.${removed}`,
        message: `Type '${removed}' was removed`,
      });
    }
  }

  // Modified types
  for (const common of oldNames) {
    if (newNames.has(common)) {
      diffTypeDefinition(common, oldDefs[common], newDefs[common], diffs);
    }
  }

  const breaking = diffs.filter((d) => d.severity === "removed").length;
  const nonBreaking = diffs.filter((d) => d.severity !== "removed").length;

  return { diffs, breakingChanges: breaking, nonBreakingChanges: nonBreaking };
}

function extractDefsMap(schema: any): Record<string, any> {
  const obj = schema as Record<string, unknown> | undefined;
  if (!obj || typeof obj !== "object") return {};
  const defs = (obj["$defs"] ?? obj["definitions"]) as
    Record<string, unknown> | undefined;
  if (!defs) return {};
  return { ...defs };
}

function diffTypeDefinition(
  name: string,
  old: any,
  newDef: any,
  diffs: Diff[],
): void {
  const oldObj = (old ?? {}) as Record<string, unknown>;
  const newObj = (newDef ?? {}) as Record<string, unknown>;

  // Check kind change
  const oldKind = String(oldObj.type ?? "unknown");
  const newKind = String(newObj.type ?? "unknown");
  if (oldKind !== newKind) {
    diffs.push({
      category: "fieldType",
      severity: "modified",
      path: `$.$defs.${name}.type`,
      message: `Type '${name}' changed kind: '${oldKind}' → '${newKind}'`,
    });
  }

  // Field additions/removals
  const oldProps = new Set(Object.keys((oldObj.properties ?? {}) as object));
  const newProps = new Set(Object.keys((newObj.properties ?? {}) as object));

  for (const added of newProps) {
    if (!oldProps.has(added)) {
      diffs.push({
        category: "field",
        severity: "added",
        path: `$.$defs.${name}.properties.${added}`,
        message: `Type '${name}': field '${added}' was added`,
      });
    }
  }

  for (const removed of oldProps) {
    if (!newProps.has(removed)) {
      diffs.push({
        category: "field",
        severity: "removed",
        path: `$.$defs.${name}.properties.${removed}`,
        message: `Type '${name}': field '${removed}' was removed`,
      });
    }
  }

  // Required transitions
  const oldRequired = new Set(
    Array.isArray(oldObj.required) ? (oldObj.required as string[]) : [],
  );
  const newRequired = new Set(
    Array.isArray(newObj.required) ? (newObj.required as string[]) : [],
  );

  for (const opt of oldRequired) {
    if (!newRequired.has(opt) && newProps.has(opt)) {
      diffs.push({
        category: "fieldRequired",
        severity: "modified",
        path: `$.$defs.${name}.required`,
        message: `Type '${name}': field '${opt}' is now optional`,
      });
    }
  }

  for (const req of newRequired) {
    if (!oldRequired.has(req)) {
      diffs.push({
        category: "fieldRequired",
        severity: "removed",
        path: `$.$defs.${name}.required`,
        message: `Type '${name}': field '${req}' is now required (breaking change)`,
      });
    }
  }

  // Federation key changes
  const oldFed =
    "x-graphql-federation-keys" in oldObj ||
    "x-graphql-federation-key" in oldObj;
  const newFed =
    "x-graphql-federation-keys" in newObj ||
    "x-graphql-federation-key" in newObj;

  if (oldFed && !newFed) {
    diffs.push({
      category: "federation",
      severity: "removed",
      path: `$.$defs.${name}.x-graphql-federation-keys`,
      message: `Type '${name}': federation key was removed (breaking change)`,
    });
  }
}

export interface TypeCoverage {
  typeName: string;
  totalSourceFields: number;
  mappedFields: number;
  missingFields: string[];
  coveragePercent: number;
}

export interface CoverageReport {
  typeCoverages: TypeCoverage[];
  totalSourceFields: number;
  totalMappedFields: number;
  overallCoveragePercent: number;
}

export function computeFieldCoverageByName(
  sourceSchema: any,
  targetSchema: any,
): CoverageReport {
  const sourceDefs = extractDefsMap(sourceSchema);
  const targetDefs = extractDefsMap(targetSchema);

  // Build set of (type, field) pairs in target
  const targetFieldPaths = new Set<string>();
  for (const [typeName, defValue] of Object.entries(targetDefs)) {
    if (!defValue || typeof defValue !== "object") continue;
    const properties = (defValue as Record<string, unknown>)["properties"] as
      Record<string, unknown> | undefined;
    if (!properties) continue;
    for (const fieldName of Object.keys(properties)) {
      targetFieldPaths.add(`${typeName}.${fieldName}`);
    }
  }

  const report: CoverageReport = {
    typeCoverages: [],
    totalSourceFields: 0,
    totalMappedFields: 0,
    overallCoveragePercent: 100,
  };

  for (const [typeName, defValue] of Object.entries(sourceDefs)) {
    const obj = (defValue ?? {}) as Record<string, unknown>;
    const properties = (obj["properties"] ?? {}) as Record<string, unknown>;
    const fieldNames = Object.keys(properties);

    const total = fieldNames.length;
    let mapped = 0;
    const missing: string[] = [];

    for (const prop of fieldNames) {
      if (targetFieldPaths.has(`${typeName}.${prop}`)) {
        mapped++;
      } else {
        missing.push(prop);
      }
    }

    const coveragePercent = total > 0 ? (mapped / total) * 100 : 100;

    report.totalSourceFields += total;
    report.totalMappedFields += mapped;
    report.typeCoverages.push({
      typeName,
      totalSourceFields: total,
      mappedFields: mapped,
      missingFields: missing,
      coveragePercent,
    });
  }

  report.overallCoveragePercent =
    report.totalSourceFields > 0
      ? (report.totalMappedFields / report.totalSourceFields) * 100
      : 100;

  return report;
}
