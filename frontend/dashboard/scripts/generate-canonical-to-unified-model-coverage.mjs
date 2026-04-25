#!/usr/bin/env node

/**
 * scripts/generate-canonical-to-unified_model-coverage.mjs
 *
 * Generate / augment a canonical -> Unified Model mapping and produce a coverage report.
 *
 * Behavior:
 * - Loads:
 *    - Canonical Schema Unification JSON Schema: `src/data/schema_unification.schema.json`
 *    - Contract Data-to-Unified Model reference: `resources/USASPENDING/Contract Data-to-Unified Model.json` (optional but used if present)
 *    - Existing seeded canonical->Unified Model mapping: `resources/USASPENDING/canonical-to-unified_model.json` (optional)
 * - Collects canonical leaf paths from the canonical schema.
 * - Attempts to match Unified Model/Contract Data elements to canonical paths using heuristics:
 *    - exact name equality (normalized)
 *    - token overlap / substring matching
 *    - use x-source-path values in Contract Data-to-Unified Model.json when present to suggest mapping
 * - Produces:
 *    - `resources/USASPENDING/canonical-to-unified_model.resolved.json` (merged + augmented mapping)
 *    - `generated-metadata/unified_model-mapping-coverage.json` (machine readable coverage report)
 *    - `generated-metadata/unified_model-mapping-coverage.md` (human readable summary)
 *
 * Usage:
 *   node scripts/generate-canonical-to-unified_model-coverage.mjs
 *
 * Notes:
 * - This is a best-effort, review-first generator: ambiguous matches are marked with low confidence
 *   and added to the 'review' list in the coverage output for manual curation.
 * - The script avoids destructive changes to the seeded mapping: existing entries are preserved and
 *   only new suggestions are appended (with provenance).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Utilities to get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve project-root relative files
const ROOT = path.resolve(__dirname, "..");
const CANONICAL_SCHEMA_PATH = path.join(ROOT, "src", "data", "schema_unification.schema.json");
const CONTRACT_DATA_TO_UNIFIED_MODEL_PATH = path.join(
  ROOT,
  "resources",
  "USASPENDING",
  "Contract Data-to-Unified Model.json",
);
const CONTRACT_DATA_TO_UNIFIED_MODEL_MAPPINGS_PATH = path.join(
  ROOT,
  "resources",
  "USASPENDING",
  "Contract Data-to-Unified Model-mappings.json",
);
const SEEDED_MAPPING_PATH = path.join(
  ROOT,
  "resources",
  "USASPENDING",
  "canonical-to-unified_model.json",
);

const OUTPUT_MAPPING_PATH = path.join(
  ROOT,
  "resources",
  "USASPENDING",
  "canonical-to-unified_model.resolved.json",
);
const COVERAGE_JSON_PATH = path.join(
  ROOT,
  "generated-metadata",
  "unified_model-mapping-coverage.json",
);
const COVERAGE_MD_PATH = path.join(ROOT, "generated-metadata", "unified_model-mapping-coverage.md");
const PRIORITY_REVIEW_CSV_PATH = path.join(
  ROOT,
  "generated-metadata",
  "unified_model-priority-review.csv",
);
const CONTRACT_DATA_ATOM_PATH = path.join(
  ROOT,
  "resources",
  "USASPENDING",
  "Contract Data-atom-transformation.json",
);

function safeReadJsonSync(p) {
  try {
    const content = fs.readFileSync(p, "utf8");
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/**
 * Collect canonical property paths (dot notation) from a JSON Schema object.
 * We traverse $defs and root properties and treat arrays as [*].
 */
function collectCanonicalPaths(schema) {
  const paths = new Set();

  function walk(obj, curPath) {
    if (!obj || typeof obj !== "object") return;

    // If object has properties, descend
    if (obj.properties && typeof obj.properties === "object") {
      for (const [propName, propSchema] of Object.entries(obj.properties)) {
        const nextPath = curPath ? `${curPath}.${propName}` : propName;
        // If primitive or has no properties, record the path as leaf
        if (
          !propSchema.properties &&
          !propSchema.$ref &&
          !propSchema.oneOf &&
          !propSchema.anyOf &&
          !propSchema.allOf
        ) {
          paths.add(nextPath);
        }
        // Always descend: nested objects may contain more leaves
        walk(propSchema, nextPath);
      }
    }

    // If this is an array with items
    if (obj.items) {
      const nextPath = curPath ? `${curPath}[*]` : "[*]";
      // If items have properties, descend into them and register leaf indicator
      if (obj.items.properties || obj.items.$ref) {
        walk(obj.items, nextPath);
      } else {
        // items primitive -> leaf array element
        paths.add(nextPath);
      }
    }

    // handle oneOf/anyOf/allOf - descend into each
    for (const key of ["oneOf", "anyOf", "allOf"]) {
      if (Array.isArray(obj[key])) {
        for (const sub of obj[key]) walk(sub, curPath);
      }
    }
  }

  // Top-level properties
  if (schema.properties) walk(schema, "");

  // If $defs exist, include those top-level types and their properties
  if (schema.$defs && typeof schema.$defs === "object") {
    for (const [defName, defSchema] of Object.entries(schema.$defs)) {
      const base = defName; // Treat $defs as top-level root for discovery
      if (defSchema.properties) walk(defSchema, base);
      // If nested refs inside defs, walk them too
      walk(defSchema, base);
    }
  }

  return Array.from(paths).sort();
}

/**
 * Normalize a name for fuzzy comparisons:
 * - lowercase, remove non-alphanum, collapse spaces/underscores/hyphens
 */
function normalizeName(s) {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .replace(/[_\-\s]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Simple token overlap score between two strings.
 */
function tokenOverlapScore(a, b) {
  const ta = new Set(normalizeName(a).split(/\s+/).filter(Boolean));
  const tb = new Set(normalizeName(b).split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common / Math.max(ta.size, tb.size);
}

/**
 * Heuristic matcher that tries to match a Unified Model/Contract Data element name to canonical paths.
 *
 * Strategy:
 * 1. Exact match on last token (property name) normalized -> exact confidence.
 * 2. If x-source-path provided and matches canonical path exactly -> exact.
 * 3. Token overlap (>= 0.6) -> high.
 * 4. Substring match or partial token overlap (>= 0.3) -> heuristic.
 * 5. Otherwise none.
 */
function findBestCanonicalMatch(unified_modelElementName, canonicalPaths, options = {}) {
  const normalizedElement = normalizeName(unified_modelElementName);
  // Extract candidate names from canonicalPaths: last segment after dot or [*]
  const keyToPaths = {};
  for (const p of canonicalPaths) {
    const segments = p.split(".");
    const last = segments[segments.length - 1].replace(/\[\*\]$/, "");
    const norm = normalizeName(last);
    if (!keyToPaths[norm]) keyToPaths[norm] = [];
    keyToPaths[norm].push(p);
  }

  // 1) exact property name match
  const lastToken = normalizedElement.split(" ").slice(-1)[0] || normalizedElement;
  if (keyToPaths[normalizedElement] && keyToPaths[normalizedElement].length > 0) {
    return {
      path: keyToPaths[normalizedElement][0],
      confidence: "exact",
      reason: "exact_property_name",
    };
  }
  if (keyToPaths[lastToken] && keyToPaths[lastToken].length > 0) {
    return {
      path: keyToPaths[lastToken][0],
      confidence: "exact",
      reason: "exact_last_token",
    };
  }

  // 2) token overlap scoring
  let best = null;
  let bestScore = 0;
  for (const p of canonicalPaths) {
    const score = tokenOverlapScore(unified_modelElementName, p);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  if (best && bestScore >= 0.6)
    return {
      path: best,
      confidence: "high",
      reason: `token_overlap_${bestScore.toFixed(2)}`,
    };
  if (best && bestScore >= 0.3)
    return {
      path: best,
      confidence: "heuristic",
      reason: `token_overlap_${bestScore.toFixed(2)}`,
    };

  // 3) substring fallbacks on normalized strings
  for (const p of canonicalPaths) {
    const normP = normalizeName(p);
    if (normP.includes(normalizedElement) || normalizedElement.includes(normP)) {
      return { path: p, confidence: "heuristic", reason: "substring_match" };
    }
  }

  return { path: null, confidence: "none", reason: "no_match" };
}

/**
 * Merge seeded mapping entries and new suggested mappings, preserving existing entries.
 */
function mergeMappings(seedEntries = [], suggestions = []) {
  const index = new Map();
  for (const e of seedEntries) {
    index.set(e.canonical_path + "||" + (e.unified_model_path || ""), {
      ...e,
      source: e.source || "seed",
    });
  }
  for (const s of suggestions) {
    const key = s.canonical_path + "||" + (s.unified_model_path || "");
    if (!index.has(key)) {
      index.set(key, { ...s, source: "suggestion" });
    } else {
      // If seed exists, keep seed but add suggestion details into a suggestions[] field
      const existing = index.get(key);
      if (!existing.suggestions) existing.suggestions = [];
      existing.suggestions.push(s);
      index.set(key, existing);
    }
  }
  return Array.from(index.values());
}

async function main() {
  console.log("generate-canonical-to-unified_model-coverage: starting");

  // Load canonical schema
  const canonicalSchema = safeReadJsonSync(CANONICAL_SCHEMA_PATH);
  if (!canonicalSchema) {
    console.error(`ERROR: cannot read canonical schema at ${CANONICAL_SCHEMA_PATH}`);
    process.exitCode = 2;
    return;
  }

  const canonicalPaths = collectCanonicalPaths(canonicalSchema);
  console.log(`Discovered ${canonicalPaths.length} canonical paths (leaf-level).`);

  // Load Contract Data->Unified Model reference (optional).
  // Try primary file first, then an alternate detailed mappings file if present.
  const contract_dataMapping = safeReadJsonSync(CONTRACT_DATA_TO_UNIFIED_MODEL_PATH);
  const contract_dataMappingAlt = safeReadJsonSync(CONTRACT_DATA_TO_UNIFIED_MODEL_MAPPINGS_PATH);
  if (!contract_dataMapping && !contract_dataMappingAlt) {
    console.warn(
      `Warning: Contract Data->Unified Model reference not found at ${CONTRACT_DATA_TO_UNIFIED_MODEL_PATH} nor ${CONTRACT_DATA_TO_UNIFIED_MODEL_MAPPINGS_PATH} — heuristic matching will be used.`,
    );
  } else if (!contract_dataMapping && contract_dataMappingAlt) {
    console.log(
      `Info: Using alternate Contract Data mapping file at ${CONTRACT_DATA_TO_UNIFIED_MODEL_MAPPINGS_PATH}`,
    );
  } else if (contract_dataMapping && contract_dataMappingAlt) {
    console.log(
      `Info: Loaded both Contract Data mapping files; merging candidates from both sources.`,
    );
  }

  // Load seeded mapping if present
  const seeded = safeReadJsonSync(SEEDED_MAPPING_PATH);
  const seedEntries = seeded && seeded.entries ? seeded.entries.slice() : [];

  // Build a list of known Unified Model element labels to try to match.
  // Strategy:
  // - If Contract Data mapping file includes $defs and type names, traverse it for property-level names and x-source-paths
  // - Additionally include any seeded unified_model_path values and their last path segments as targets to anchor matches.
  const unified_modelCandidates = new Map(); // key -> { label, exampleGsdmPath, xSourcePath? }

  // From Contract Data-to-Unified Model.json / Contract Data-to-Unified Model-mappings.json: look for "$defs" and traverse property names and x-source-path when present.
  // Support loading candidates from both the primary and alternate mapping files (when available).
  const mappingSources = [];
  if (contract_dataMapping && contract_dataMapping.$defs)
    mappingSources.push({
      src: CONTRACT_DATA_TO_UNIFIED_MODEL_PATH,
      obj: contract_dataMapping,
    });
  if (contract_dataMappingAlt && contract_dataMappingAlt.$defs)
    mappingSources.push({
      src: CONTRACT_DATA_TO_UNIFIED_MODEL_MAPPINGS_PATH,
      obj: contract_dataMappingAlt,
    });

  if (mappingSources.length > 0) {
    function traverseFpdsDef(obj, prefix = "") {
      if (!obj || typeof obj !== "object") return;
      if (obj.properties && typeof obj.properties === "object") {
        for (const [propName, propDef] of Object.entries(obj.properties)) {
          // Derive a friendly label (propName or propDef.description)
          const label = propDef && propDef.description ? propDef.description : propName;
          const unified_modelPath = prefix ? `${prefix}.${propName}` : propName;
          // x-source-path may exist on propDef (based on earlier Contract Data file patterns)
          const xSource = propDef && (propDef["x-source-path"] || propDef["x-source"]);
          const key = normalizeName(propName) + "||" + unified_modelPath;
          // Prefer first seen candidate for a given key (do not clobber)
          if (!unified_modelCandidates.has(key))
            unified_modelCandidates.set(key, {
              label: propName,
              unified_modelPath,
              xSource,
            });
          // descend
          traverseFpdsDef(propDef, unified_modelPath);
        }
      }
      // also handle nested type-name structures present in some Contract Data entries
      for (const k of Object.keys(obj)) {
        if (
          ["properties", "type", "description", "x-source-path", "x-graphql-type-name"].includes(k)
        )
          continue;
        const v = obj[k];
        if (v && typeof v === "object") traverseFpdsDef(v, prefix);
      }
    }

    for (const ms of mappingSources) {
      for (const [defName, defObj] of Object.entries(ms.obj.$defs)) {
        const initialPrefix = defName;
        traverseFpdsDef(defObj, initialPrefix);
      }
    }
  }

  // Also include seeded mapping unified_model_path tail segments as candidates
  for (const s of seedEntries) {
    if (s.unified_model_path) {
      const last = s.unified_model_path.split(".").slice(-1)[0];
      const key = normalizeName(last) + "||" + s.unified_model_path;
      if (!unified_modelCandidates.has(key))
        unified_modelCandidates.set(key, {
          label: last,
          unified_modelPath: s.unified_model_path,
          xSource: s["x-source-path"] || null,
        });
    }
  }

  // If unified_modelCandidates is empty, fall back to using some common Unified Model field names derived from Contract Data header table context:
  const commonFallbacks = [
    "piid",
    "award_id_piid",
    "uei",
    "recipient_uei",
    "vendor_uei",
    "vendor_name",
    "recipient_name",
    "naics_code",
    "psc_code",
    "place_of_performance",
    "zip_code",
    "city",
    "state",
    "obligated_amount",
    "base_and_all_options_value",
    "award_amount",
    "action_date",
    "last_modified_date",
    "total_obligated_amount",
  ];
  if (unified_modelCandidates.size === 0) {
    for (const f of commonFallbacks) {
      unified_modelCandidates.set(normalizeName(f) + "||" + f, {
        label: f,
        unified_modelPath: f,
        xSource: null,
      });
    }
  }

  // Build suggestions by iterating through the candidate unified_model entries and mapping to canonical paths
  const suggestions = [];
  for (const candidate of unified_modelCandidates.values()) {
    const label = candidate.label || candidate.unified_modelPath;
    const xSource = candidate.xSource || null;
    // If xSource looks like a canonical path (dot notation) try to match exactly first
    let matched = null;
    if (xSource && typeof xSource === "string") {
      // Clean up common leading/trailing patterns
      const cleaned = xSource.replace(/^\$\//, "").replace(/\//g, ".").replace(/^\./, "");
      // Try find canonical path that ends with the same segment
      if (canonicalPaths.includes(cleaned)) {
        matched = {
          path: cleaned,
          confidence: "exact",
          reason: "x-source-path_exact",
        };
      } else {
        // try loose match by suffix
        const candidateLast = cleaned.split(".").slice(-1)[0];
        const found = canonicalPaths.find((p) => p.endsWith(candidateLast));
        if (found)
          matched = {
            path: found,
            confidence: "heuristic",
            reason: "x-source-path_suffix",
          };
      }
    }

    if (!matched) {
      // Use heuristic match on label and unified_modelPath
      const attemptLabel = findBestCanonicalMatch(label, canonicalPaths);
      if (attemptLabel.path) matched = attemptLabel;
      else {
        const attemptGsdmName = findBestCanonicalMatch(
          candidate.unified_modelPath || label,
          canonicalPaths,
        );
        matched = attemptGsdmName;
      }
    }

    // Build suggestion entry
    const suggestion = {
      canonical_path: matched.path || null,
      unified_model_path: candidate.unified_modelPath || label,
      label: label,
      confidence: matched.confidence,
      reason: matched.reason,
      x_source_reference: candidate.xSource || null,
      generated_by: "generate-canonical-to-unified_model-coverage.mjs",
      generated_at: new Date().toISOString(),
    };

    suggestions.push(suggestion);
  }

  // Also ensure every canonical path has at least one mapping suggestion (reverse coverage)
  const canonicalCoverageMap = new Map(); // canonical_path -> array of mapping suggestions
  for (const s of suggestions) {
    if (s.canonical_path) {
      const arr = canonicalCoverageMap.get(s.canonical_path) || [];
      arr.push(s);
      canonicalCoverageMap.set(s.canonical_path, arr);
    }
  }

  // For canonicalPaths that have no candidate mapping, try to generate suggestions by last-token heuristics
  for (const cp of canonicalPaths) {
    if (!canonicalCoverageMap.has(cp)) {
      const tokens = cp.split(".");
      const last = tokens[tokens.length - 1];
      // Create a fallback suggestion using the canonical last token as unified_model_path (best-effort)
      const fallback = {
        canonical_path: cp,
        unified_model_path: last,
        label: last,
        confidence: "none",
        reason: "no_candidate_found",
        x_source_reference: null,
        generated_by: "generate-canonical-to-unified_model-coverage.mjs",
        generated_at: new Date().toISOString(),
      };
      suggestions.push(fallback);
      canonicalCoverageMap.set(cp, [fallback]);
    }
  }

  // Merge seeded mapping + suggestions
  const merged = mergeMappings(seedEntries, suggestions);

  // Write resolved mapping
  ensureDir(path.dirname(OUTPUT_MAPPING_PATH));
  fs.writeFileSync(
    OUTPUT_MAPPING_PATH,
    JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "Schema Unification Canonical → Unified Model Mapping (resolved, generated)",
        description:
          "Merged mapping generated by generate-canonical-to-unified_model-coverage.mjs. Seeded entries kept and suggestions appended. Review required.",
        mapping_version: "0.1.0-resolved",
        generated_at: new Date().toISOString(),
        entries: merged,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`Wrote resolved mapping to ${OUTPUT_MAPPING_PATH} (${merged.length} entries)`);

  // Build coverage report
  // Only consider canonical paths that were actually discovered in the canonical schema.
  const totalCanonical = canonicalPaths.length;
  const canonicalSet = new Set(canonicalPaths);
  const mappedCanonicals = new Set();

  // Simplify confidence buckets and normalize values we encounter.
  const confidenceCounts = { exact: 0, high: 0, heuristic: 0, low: 0, none: 0 };
  const allowed = new Set(Object.keys(confidenceCounts));

  for (const e of merged) {
    // Skip suggestions that don't reference a canonical path present in the schema.
    if (!e || !e.canonical_path || !canonicalSet.has(e.canonical_path)) continue;

    // Normalize confidence into allowed buckets (default to 'none' when missing/unknown).
    let conf = (e.confidence || "").toString().toLowerCase();
    if (!allowed.has(conf)) conf = "none";

    confidenceCounts[conf] = (confidenceCounts[conf] || 0) + 1;
    mappedCanonicals.add(e.canonical_path);
  }

  const mappedCount = mappedCanonicals.size;
  const unmappedCount = totalCanonical - mappedCount;

  const unmapped = canonicalPaths.filter((p) => !mappedCanonicals.has(p));

  // Derive quality coverage metrics (best confidence per canonical path)
  const scoreMap = { none: 0, low: 1, heuristic: 2, high: 3, exact: 4 };
  const canonicalBest = {};
  for (const e of merged) {
    if (!e.canonical_path || !canonicalSet.has(e.canonical_path)) continue;
    const conf = (e.confidence || "").toLowerCase();
    const score = scoreMap[conf] ?? 0;
    if (!canonicalBest[e.canonical_path] || score > canonicalBest[e.canonical_path].score) {
      canonicalBest[e.canonical_path] = {
        score,
        conf,
        source: e.source || "suggestion",
        entry: e,
      };
    }
  }
  let exactOrHigh = 0;
  let heuristicOrBetter = 0;
  let seedExactOrHigh = 0;
  let suggestionExactOrHigh = 0;
  let seedCanonicalCount = 0;
  for (const info of Object.values(canonicalBest)) {
    if (info.source === "seed") seedCanonicalCount++;
    if (info.conf === "exact" || info.conf === "high") {
      exactOrHigh++;
      if (info.source === "seed") seedExactOrHigh++;
      else suggestionExactOrHigh++;
    }
    if (["exact", "high", "heuristic"].includes(info.conf)) heuristicOrBetter++;
  }

  // Contract Data Atom ingestion coverage (how many Atom properties are represented by any mapping)
  const contract_dataAtom = safeReadJsonSync(CONTRACT_DATA_ATOM_PATH);
  const contract_dataAtomProps =
    contract_dataAtom &&
    contract_dataAtom.properties &&
    typeof contract_dataAtom.properties === "object"
      ? Object.keys(contract_dataAtom.properties)
      : [];
  let contract_dataAtomCovered = 0;
  const contract_dataAtomUncovered = [];
  for (const prop of contract_dataAtomProps) {
    const isCovered = merged.some((e) => {
      if (!e || !e.unified_model_path) return false;
      const pathStr = String(e.unified_model_path);
      const segments = pathStr.split(".");
      const last = segments[segments.length - 1].replace(/\[\]$/, "");
      return last === prop || pathStr === prop || pathStr.endsWith("." + prop);
    });
    if (isCovered) contract_dataAtomCovered++;
    else contract_dataAtomUncovered.push(prop);
  }
  const contract_dataAtomTotal = contract_dataAtomProps.length;
  const contract_dataAtomPercent = contract_dataAtomTotal
    ? +(contract_dataAtomCovered / contract_dataAtomTotal).toFixed(4)
    : 0;

  const coverage = {
    generated_at: new Date().toISOString(),
    total_canonical_paths: totalCanonical,
    mapped_canonical_paths: mappedCount,
    unmapped_canonical_paths: unmappedCount,
    confidence_counts: confidenceCounts,
    canonical_with_exact_or_high: exactOrHigh,
    canonical_with_heuristic_or_better: heuristicOrBetter,
    seed_canonical_paths_present: seedCanonicalCount,
    seed_exact_or_high: seedExactOrHigh,
    suggestion_exact_or_high: suggestionExactOrHigh,
    contract_data_atom_properties_total: contract_dataAtomTotal,
    contract_data_atom_properties_covered_by_mapping: contract_dataAtomCovered,
    contract_data_atom_properties_uncovered: contract_dataAtomTotal - contract_dataAtomCovered,
    percent_contract_data_atom_properties_covered: contract_dataAtomPercent,
    sample_contract_data_atom_uncovered: contract_dataAtomUncovered.slice(0, 50),
    sample_unmapped: unmapped.slice(0, 100),
    notes:
      "This report is generated heuristically. Review candidates with confidence != exact/high. Added quality metrics for prioritized curation, including Contract Data Atom ingestion coverage.",
  };

  ensureDir(path.dirname(COVERAGE_JSON_PATH));
  fs.writeFileSync(COVERAGE_JSON_PATH, JSON.stringify(coverage, null, 2), "utf8");
  console.log(`Wrote coverage JSON to ${COVERAGE_JSON_PATH}`);

  // Generate priority review CSV for key IDs / dollar values / dates / location fields
  const priorityCanonical = [
    "contract_identification.piid",
    "contract_identification.original_award_piid",
    "contract_identification.referenced_piid",
    "vendor_info.vendor_uei",
    "financial_info.total_contract_value",
    "financial_info.base_and_all_options_value",
    "financial_info.independent_government_estimate",
    "financial_info.amount_spent_on_product",
    "status_info.published_date",
    "status_info.last_modified_date",
    "place_of_performance.street_address",
    "place_of_performance.city",
    "place_of_performance.state",
    "place_of_performance.zip",
    "agency_info.code",
    "agency_info.name",
    "organization_info.contracting_agency.id",
  ];

  function quoteCsv(val) {
    if (val == null) return "";
    const s = String(val);
    if (/[",\\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  const header = [
    "canonical_path",
    "best_unified_model_path",
    "best_confidence",
    "source",
    "seed_unified_model_path",
    "seed_confidence",
    "all_suggestions",
    "priority",
    "notes",
  ];

  const seedIndex = new Map();
  for (const e of seedEntries) {
    if (e.canonical_path) seedIndex.set(e.canonical_path, e);
  }

  const rows = [header];
  for (const cp of priorityCanonical) {
    const best = canonicalBest[cp];
    const seed = seedIndex.get(cp);
    const allEntries = merged.filter((e) => e.canonical_path === cp);
    const suggestionsSummary = allEntries
      .map((e) => `${e.unified_model_path}|${e.confidence}|${e.source || "suggestion"}`)
      .join(";;");
    rows.push([
      cp,
      best ? best.entry.unified_model_path : "",
      best ? best.conf : "",
      best ? best.source : "",
      seed ? seed.unified_model_path : "",
      seed ? seed.confidence : "",
      suggestionsSummary,
      "High",
      "IDs/Dates/Dollars/Location",
    ]);
  }

  ensureDir(path.dirname(PRIORITY_REVIEW_CSV_PATH));
  fs.writeFileSync(
    PRIORITY_REVIEW_CSV_PATH,
    rows.map((r) => r.map(quoteCsv).join(",")).join("\n"),
    "utf8",
  );
  console.log(`Wrote priority review CSV to ${PRIORITY_REVIEW_CSV_PATH}`);

  // Also write a human readable markdown summary
  ensureDir(path.dirname(COVERAGE_MD_PATH));
  const mdLines = [];
  mdLines.push("# Unified Model Mapping Coverage Report");
  mdLines.push("");
  mdLines.push(`Generated at: ${coverage.generated_at}`);
  mdLines.push("");
  mdLines.push(`- Total canonical leaf paths discovered: **${coverage.total_canonical_paths}**`);
  mdLines.push(
    `- Canonical paths with at least one mapping suggestion: **${coverage.mapped_canonical_paths}**`,
  );
  mdLines.push(`- Canonical paths without suggestion: **${coverage.unmapped_canonical_paths}**`);
  mdLines.push("");
  mdLines.push("Confidence distribution:");
  for (const [k, v] of Object.entries(confidenceCounts)) {
    mdLines.push(`- ${k}: ${v}`);
  }
  mdLines.push("");
  mdLines.push("Top 50 unmapped canonical paths (for review):");
  mdLines.push("");
  if (coverage.sample_unmapped.length === 0) mdLines.push("_None_");
  else {
    for (const p of coverage.sample_unmapped.slice(0, 50)) {
      mdLines.push(`- ${p}`);
    }
  }
  mdLines.push("");
  mdLines.push("Next recommended actions:");
  mdLines.push("");
  mdLines.push(
    '- Manually review entries in `resources/USASPENDING/canonical-to-unified_model.resolved.json` especially those with `confidence: "none" or "heuristic"`.',
  );
  mdLines.push(
    '- For high-value fields (IDs, dollar values, dates), ensure `confidence: "exact" or "high"` and add `transform` rules where units differ.',
  );
  mdLines.push(
    "- Convert reviewed suggestions into authoritative entries in `resources/USASPENDING/canonical-to-unified_model.json` and rerun this script to produce an updated resolved mapping and coverage.",
  );
  mdLines.push("");
  mdLines.push("Generated by `scripts/generate-canonical-to-unified_model-coverage.mjs`");
  fs.writeFileSync(COVERAGE_MD_PATH, mdLines.join("\n"), "utf8");
  console.log(`Wrote coverage markdown to ${COVERAGE_MD_PATH}`);

  console.log("Done.");
}

// Run main when executed directly (ES module compatible)
// Compare the resolved file path of this module to the invoked script path (process.argv[1])
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error("Fatal error during mapping generation:", err);
    process.exitCode = 1;
  });
}
