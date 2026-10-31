/**
 * Schema diff engine — TypeScript port of `converters/rust/src/analysis/diff.rs`.
 *
 * Compares two JSON Schemas and reports differences in types, fields, and metadata.
 * Rust enums become string-literal union types per the project convention.
 */

// ---------------------------------------------------------------------------
// Types (Rust enums → string-literal unions; unit variants only, so no
// discriminated unions needed)
// ---------------------------------------------------------------------------

export type DiffSeverity = "added" | "removed" | "modified";

export type DiffCategory =
  | "type"
  | "field"
  | "fieldType"
  | "fieldRequired"
  | "federation"
  | "metadata";

/** A single schema difference. */
export interface Diff {
  category: DiffCategory;
  severity: DiffSeverity;
  path: string;
  message: string;
}

/** Overall diff result. */
export interface DiffResult {
  diffs: Diff[];
  breakingChanges: number;
  nonBreakingChanges: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** True when there are zero breaking changes. */
export function isCompatible(result: DiffResult): boolean {
  return result.breakingChanges === 0;
}

/** Total number of diffs. */
export function total(result: DiffResult): number {
  return result.diffs.length;
}

/**
 * Compare two JSON Schemas and return differences.
 *
 * Uses `$defs` / `definitions` as the comparison basis.
 */
export function diffSchemas(old: unknown, new_: unknown): DiffResult {
  const diffs: Diff[] = [];
  const oldDefs = extractDefsMap(old);
  const newDefs = extractDefsMap(new_);

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

  // Modified types (types present in both)
  for (const common of oldNames) {
    if (newNames.has(common)) {
      diffTypeDefinition(common, oldDefs[common], newDefs[common], diffs);
    }
  }

  // Compute severity counts (mirrors Rust: Removed = breaking, everything else
  // = non-breaking)
  const breaking = diffs.filter((d) => d.severity === "removed").length;
  const nonBreaking = diffs.filter((d) => d.severity !== "removed").length;

  return { diffs, breakingChanges: breaking, nonBreakingChanges: nonBreaking };
}

/**
 * Generate a human-readable summary of a diff.
 */
export function formatDiffSummary(result: DiffResult): string {
  const lines: string[] = [];
  lines.push(`Schema diff: ${result.diffs.length} total changes`);
  lines.push(`  Breaking changes: ${result.breakingChanges}`);
  lines.push(`  Non-breaking changes: ${result.nonBreakingChanges}`);
  lines.push("");
  for (const d of result.diffs) {
    const marker =
      d.severity === "added" ? "+" : d.severity === "removed" ? "-" : "~";
    lines.push(`[${marker}] ${d.path}: ${d.message}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** True for JSON-object values (mirrors Rust `Value::as_object()`; arrays excluded). */
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Extract `$defs` (or `definitions`) from a schema, returning a shallow copy.
 *
 * Mirrors Rust `extract_defs_map`:
 * - Non-object schemas (including arrays) yield no definitions.
 * - The `definitions` fallback fires only when the `$defs` key is ABSENT
 *   (`Option::or_else`); a present-but-null `$defs` shadows `definitions`.
 * - A non-object container (scalar/array/null) yields no definitions.
 * - All entries are kept as-is (Rust clones every value, object or not);
 *   non-object definitions are guarded later in `diffTypeDefinition`.
 */
function extractDefsMap(schema: unknown): Record<string, unknown> {
  if (!isJsonObject(schema)) return {};
  const container = Object.hasOwn(schema, "$defs")
    ? schema["$defs"]
    : schema["definitions"];
  if (!isJsonObject(container)) return {};
  return { ...container };
}

function diffTypeDefinition(
  name: string,
  old: unknown,
  newDef: unknown,
  diffs: Diff[],
): void {
  // Rust: both definitions must be JSON objects (`as_object()` guards);
  // otherwise no field-level diffs are produced.
  if (!isJsonObject(old) || !isJsonObject(newDef)) return;

  // Check kind change.
  // Rust: `old_obj.get("type").and_then(|v| v.as_str()).unwrap_or("unknown")`
  const oldKind = typeof old.type === "string" ? old.type : "unknown";
  const newKind = typeof newDef.type === "string" ? newDef.type : "unknown";
  if (oldKind !== newKind) {
    diffs.push({
      category: "fieldType",
      severity: "modified",
      path: `$.$defs.${name}.type`,
      message: `Type '${name}' changed kind: '${oldKind}' → '${newKind}'`,
    });
  }

  // Check field additions/removals within properties.
  const oldProps = propsKeySet(old);
  const newProps = propsKeySet(newDef);

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

  // Required field transitions.
  const oldRequired = requiredSet(old);
  const newRequired = requiredSet(newDef);

  // Required → optional (non-breaking). Only reported when the field still
  // exists in the new properties.
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

  // Optional → required (breaking for clients).
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

  // Federation key changes.
  // Rust `contains_key` checks own entries only — `Object.hasOwn`, not `in`.
  const oldFed =
    Object.hasOwn(old, "x-graphql-federation-keys") ||
    Object.hasOwn(old, "x-graphql-federation-key");
  const newFed =
    Object.hasOwn(newDef, "x-graphql-federation-keys") ||
    Object.hasOwn(newDef, "x-graphql-federation-key");

  if (oldFed && !newFed) {
    diffs.push({
      category: "federation",
      severity: "removed",
      path: `$.$defs.${name}.x-graphql-federation-keys`,
      message: `Type '${name}': federation key was removed (breaking change)`,
    });
  }
}

function propsKeySet(obj: Record<string, unknown>): Set<string> {
  const props = obj.properties;
  if (props === null || typeof props !== "object" || Array.isArray(props)) {
    return new Set();
  }
  return new Set(Object.keys(props as Record<string, unknown>));
}

function requiredSet(obj: Record<string, unknown>): Set<string> {
  const req = obj.required;
  if (!Array.isArray(req)) return new Set();
  const result = new Set<string>();
  for (const item of req) {
    if (typeof item === "string") result.add(item);
  }
  return result;
}