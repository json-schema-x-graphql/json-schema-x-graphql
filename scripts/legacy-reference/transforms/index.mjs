/**
 * Transform utilities to support canonical → Unified Model mapping conversions.
 * ES module exports a registry of transforms, helpers to get/set values by dot paths,
 * and a translateRecord() function that applies a mapping table to an input record.
 *
 * Design goals:
 * - Side-by-side, non-destructive: build a new output object for Unified Model names.
 * - Deterministic: transforms are pure (value, args, context) => value.
 * - Minimal dependencies: utility functions only, no external packages.
 */

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Get a nested value from an object by a dot path.
 * Supports "[]" array markers to return the array at that node.
 * Example: getByPath(obj, 'contacts[].email') -> returns array of emails if leaf is scalar,
 * or the contacts array if "[]" is not at leaf.
 * This function returns { ok, value, parent, key } for more control in callers.
 */
export function getByPath(obj, path) {
  if (!obj || typeof obj !== "object" || !path) return { ok: false, value: undefined };
  const parts = String(path).split(".");
  let cur = obj;
  let parent = null;
  let lastKey = null;

  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i];
    const isArray = raw.endsWith("[]");
    const key = isArray ? raw.slice(0, -2) : raw;

    if (!key) return { ok: false, value: undefined };

    parent = cur;
    lastKey = key;

    if (cur == null || typeof cur !== "object") {
      return { ok: false, value: undefined, parent, key: lastKey };
    }

    if (!(key in cur)) {
      return { ok: false, value: undefined, parent, key: lastKey };
    }

    cur = cur[key];

    // If "[]" is used at this segment:
    if (isArray) {
      if (!Array.isArray(cur)) {
        // Path expects array but value is not an array
        return { ok: false, value: undefined, parent, key: lastKey };
      }
      // If this is not the last segment, keep walking on each element
      // but here we just return the array node to let caller decide traversal.
      return { ok: true, value: cur, parent, key: lastKey, isArrayNode: true };
    }
  }

  return { ok: true, value: cur, parent, key: lastKey };
}

/**
 * Set a nested value on an object by a dot path, creating intermediate objects/arrays as needed.
 * Supports "[]" to indicate an array path; if path ends with "[]", sets the entire array.
 * Example: setByPath(out, 'award.contacts[].email', ['a@x', 'b@y']) -> sets contacts array with objects containing email
 *          setByPath(out, 'award.contacts[0].email', 'a@x') is NOT supported by this helper (indexing not implemented).
 */
export function setByPath(target, path, value) {
  if (!target || typeof target !== "object" || !path) return false;

  const parts = String(path).split(".");
  let cur = target;

  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i];
    const isArray = raw.endsWith("[]");
    const key = isArray ? raw.slice(0, -2) : raw;
    const isLeaf = i === parts.length - 1;

    if (!key) return false;

    if (isLeaf) {
      if (isArray) {
        // Set or replace an array at leaf
        if (!Array.isArray(value)) return false;
        cur[key] = value;
        return true;
      } else {
        cur[key] = value;
        return true;
      }
    } else {
      // Ensure container exists
      if (!(key in cur) || cur[key] == null) {
        // If next part declares array, seed with []
        const next = parts[i + 1];
        const nextIsArray = next && next.endsWith("[]");
        cur[key] = nextIsArray ? [] : {};
      }
      cur = cur[key];

      // If current segment was `[]` (array container), ensure it is an array
      if (isArray) {
        if (!Array.isArray(cur)) {
          cur = [];
        }
        // We can't proceed deeper without indices; callers should handle array element mapping.
        // Return false to indicate leaf handling should be done via array mapping function.
        return false;
      }
    }
  }

  return false;
}

/**
 * Coalesces to the first non-empty (non-null, non-undefined, non-empty-string) value.
 */
export function coalesce(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "")) {
      return v;
    }
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Transform registry                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Each transform signature:
 *   (value: any, args?: Record<string, any>, context?: Record<string, any>) => any
 *
 * Best-effort semantics; functions should be null-safe and not throw for common inputs.
 */
export const transforms = {
  passthrough(value) {
    return value;
  },

  trim(value) {
    return typeof value === "string" ? value.trim() : value;
  },

  to_upper(value) {
    return typeof value === "string" ? value.toUpperCase() : value;
  },

  to_lower(value) {
    return typeof value === "string" ? value.toLowerCase() : value;
  },

  /**
   * Convert cents to dollars, keeping precision to 2 decimals by default.
   * args: { decimals?: number, asString?: boolean }
   */
  scale_cents_to_dollars(value, args = {}) {
    if (value == null || value === "") return value;
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    const decimals = Number.isInteger(args.decimals) ? args.decimals : 2;
    const dollars = n / 100;
    return args.asString ? dollars.toFixed(decimals) : Number(dollars.toFixed(decimals));
  },

  /**
   * Attempt to cast to number; keeps null/undefined; returns NaN for non-castable non-empty strings.
   */
  number(value) {
    if (value == null || value === "") return value;
    const n = Number(value);
    return n;
  },

  /**
   * Cast to string (simple String() wrapper), preserving null/undefined.
   */
  string(value) {
    if (value == null) return value;
    return String(value);
  },

  /**
   * Join an array of values with a separator (default: space), trimming empties.
   * args: { sep?: string }
   */
  join(value, args = {}) {
    const sep = typeof args.sep === "string" ? args.sep : " ";
    if (Array.isArray(value)) {
      return value
        .map((v) => (v == null ? "" : String(v)))
        .filter((s) => s.trim() !== "")
        .join(sep);
    }
    return value;
  },

  /**
   * Alias for join with a single space.
   */
  join_space(value) {
    return transforms.join(value, { sep: " " });
  },

  /**
   * Map enum values via a lookup table.
   * args: { table: Record<string, string>, caseInsensitive?: boolean, default?: any }
   */
  map_enum(value, args = {}, context = {}) {
    const table = args.table || context.enumTable || {}; // allow table to come from context
    const ci = !!args.caseInsensitive;

    if (value == null) return args.default ?? value;

    const key = String(value);
    if (!ci) {
      return table.hasOwnProperty(key) ? table[key] : (args.default ?? value);
    }
    // case-insensitive: build a normalized map
    const norm = {};
    for (const [k, v] of Object.entries(table)) norm[String(k).toLowerCase()] = v;
    const hit = norm[key.toLowerCase()];
    return hit !== undefined ? hit : (args.default ?? value);
  },

  /**
   * Parse an input date string; return Date or ISO string based on args.
   * args: { output?: 'Date' | 'iso' | 'date', tz?: 'utc' | 'local' }
   *  - 'iso': ISO 8601 with time
   *  - 'date': ISO 8601 date only (YYYY-MM-DD)
   */
  parse_date(value, args = {}) {
    if (value == null || value === "") return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const out = args.output || "iso";
    if (out === "Date") return d;
    if (out === "date") {
      // YYYY-MM-DD in UTC
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return d.toISOString();
  },

  /**
   * Convert a date/time to ISO date (YYYY-MM-DD) without time.
   * Accepts Date or string parseable by Date.
   */
  to_iso_date(value) {
    if (value == null || value === "") return value;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return value;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  },

  /**
   * Convert a date/time to ISO 8601 (with time).
   */
  to_iso_datetime(value) {
    if (value == null || value === "") return value;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toISOString();
  },

  /**
   * Extract the first 5 digits of a ZIP code string.
   */
  extract_zip5(value) {
    if (typeof value !== "string") return value;
    const m = value.match(/\d{5}/);
    return m ? m[0] : value;
  },

  /**
   * Pick the first non-empty value from an array (or from variadic args via context).
   * If value is an array, coalesce over it; else if context.candidates exists, use it.
   */
  first_non_empty(value, args = {}, context = {}) {
    if (Array.isArray(value)) {
      return coalesce(...value);
    }
    if (Array.isArray(context.candidates)) {
      return coalesce(...context.candidates);
    }
    return value;
  },

  /**
   * Normalize UEI: trim and uppercase.
   */
  normalize_uei(value) {
    if (typeof value !== "string") return value;
    return value.trim().toUpperCase();
  },
};

/**
 * Validate if a transform name is registered.
 */
export function validateTransformName(name) {
  return !!(name && typeof name === "string" && transforms[name]);
}

/**
 * Run a transform by name (string) or by descriptor object { name, args }.
 * - value: input value
 * - transform: string | { name: string, args?: object }
 * - context: optional context shared across transforms
 */
export function runTransform(value, transform, context = {}) {
  if (!transform) return value;

  if (typeof transform === "string") {
    const fn = transforms[transform];
    return typeof fn === "function" ? fn(value, undefined, context) : value;
  }

  if (transform && typeof transform === "object" && typeof transform.name === "string") {
    const fn = transforms[transform.name];
    return typeof fn === "function" ? fn(value, transform.args || {}, context) : value;
  }

  return value;
}

/**
 * Run a list (pipeline) of transforms; each may be a string or descriptor object.
 */
export function runTransforms(value, transformList, context = {}) {
  if (!Array.isArray(transformList) || transformList.length === 0) {
    return runTransform(value, transformList, context);
  }
  return transformList.reduce((v, t) => runTransform(v, t, context), value);
}

/* -------------------------------------------------------------------------- */
/* Mapping application                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Apply a single mapping entry to the output object.
 * Supports array-to-array mapping when both canonical and Unified Model paths contain "[]".
 *
 * entry shape:
 * {
 *   canonical_path: "vendor_info.vendor_uei",
 *   unified_model_path: "award.vendor.uei",
 *   transform: null | "transform_name" | { name, args } | [ ...transforms ],
 *   preserve?: boolean,
 *   description?: string,
 *   confidence?: string
 * }
 */
function applyMappingEntry(input, output, entry, context, diagnostics) {
  const cPath = entry.canonical_path;
  const gPath = entry.unified_model_path;
  const tSpec = entry.transform;
  const noteBase = `[map ${cPath} -> ${gPath}]`;

  if (!cPath || !gPath) {
    diagnostics.push({ level: "warn", msg: `${noteBase} missing path(s)` });
    return;
  }

  const cGet = getByPath(input, cPath);
  if (!cGet.ok) {
    diagnostics.push({ level: "info", msg: `${noteBase} source not found` });
    return;
  }

  // Handle array → array case: both paths use []
  const isSrcArray = cPath.includes("[]");
  const isDstArray = gPath.includes("[]");

  if (isSrcArray && isDstArray && cGet.isArrayNode) {
    const srcArr = Array.isArray(cGet.value) ? cGet.value : [];
    const mappedArr = srcArr.map((item, idx) => {
      const v = runTransforms(item, tSpec, { ...context, index: idx, sourcePath: cPath });
      // If v is object already, keep; else wrap into an object only at leaf in setByArray helper outside.
      return v;
    });

    // We need to place mappedArr into output following gPath container, but preserving shape.
    // Because we cannot set leaf scalars into object keys without knowing the terminal key,
    // we set entire array at gPath and let the consumer know it's at array level.
    const ok = setByPath(output, gPath, mappedArr);
    if (!ok) {
      // If direct set failed (due to nested non-leaf []), we fallback to element-wise object shaping:
      // Example: award.contacts[].email with mappedArr being scalar emails
      // Build [{ email: v }, ...]
      const terminalKey = (() => {
        const parts = gPath.split(".");
        const last = parts[parts.length - 1];
        if (last.endsWith("[]")) return null; // no terminal key
        return last;
      })();

      if (terminalKey) {
        const containerPath = gPath.slice(0, -(terminalKey.length + 1)); // strip ".terminalKey"
        const arr = mappedArr.map((v) => ({ [terminalKey]: v }));
        const ok2 = setByPath(output, containerPath, arr);
        if (!ok2) {
          diagnostics.push({ level: "warn", msg: `${noteBase} failed to set array at ${gPath}` });
        }
      } else {
        diagnostics.push({ level: "warn", msg: `${noteBase} failed to set array at ${gPath}` });
      }
    }
    return;
  }

  // Scalar/object mapping case (or leaf array value already handled upstream)
  const rawValue = cGet.value;
  const outValue = runTransforms(rawValue, tSpec, { ...context, sourcePath: cPath });

  // Attempt to set the value at target path
  const ok = setByPath(output, gPath, outValue);
  if (!ok) {
    // If setting failed due to "[]" in target path but not at leaf, try to wrap value into a one-element array
    if (gPath.includes("[]")) {
      const okArr = setByPath(output, gPath, Array.isArray(outValue) ? outValue : [outValue]);
      if (!okArr) {
        diagnostics.push({ level: "warn", msg: `${noteBase} failed to set value at ${gPath}` });
      }
    } else {
      diagnostics.push({ level: "warn", msg: `${noteBase} failed to set value at ${gPath}` });
    }
  }
}

/**
 * Translate a canonical input record into a Unified Model-shaped output using a mapping table.
 *
 * @param {object} input - canonical record
 * @param {Array<object>} mappingEntries - list of mapping entries
 * @param {object} [options]
 * @param {boolean} [options.includeDiagnostics=true] - include diagnostics array in return
 * @param {object} [options.context] - additional context passed to transforms
 * @returns {{ output: object, diagnostics?: Array<object> }}
 */
export function translateRecord(input, mappingEntries, options = {}) {
  const includeDiagnostics = options.includeDiagnostics !== false;
  const diagnostics = [];

  if (!input || typeof input !== "object") {
    const out = {};
    if (includeDiagnostics) {
      diagnostics.push({ level: "error", msg: "translateRecord: input is not an object" });
      return { output: out, diagnostics };
    }
    return { output: out };
  }

  if (!Array.isArray(mappingEntries) || mappingEntries.length === 0) {
    const out = {};
    if (includeDiagnostics) {
      diagnostics.push({ level: "warn", msg: "translateRecord: mappingEntries empty" });
      return { output: out, diagnostics };
    }
    return { output: out };
  }

  const output = {};
  const context = options.context || {};

  for (const entry of mappingEntries) {
    try {
      applyMappingEntry(input, output, entry, context, diagnostics);
    } catch (e) {
      diagnostics.push({
        level: "error",
        msg: `Exception applying entry for ${entry?.canonical_path} -> ${entry?.unified_model_path}: ${e?.message || e}`,
      });
    }
  }

  return includeDiagnostics ? { output, diagnostics } : { output };
}

/**
 * Convenience: translate an array of records with the same mapping.
 * @returns {{ outputs: object[], diagnostics: Array<object> }}
 */
export function translateRecords(inputs, mappingEntries, options = {}) {
  const outputs = [];
  const diagnostics = [];
  if (!Array.isArray(inputs)) {
    const r = translateRecord(inputs, mappingEntries, options);
    return { outputs: [r.output], diagnostics: r.diagnostics || [] };
  }
  for (let i = 0; i < inputs.length; i++) {
    const r = translateRecord(inputs[i], mappingEntries, options);
    outputs.push(r.output);
    if (r.diagnostics && r.diagnostics.length) {
      diagnostics.push(...r.diagnostics.map((d) => ({ ...d, index: i })));
    }
  }
  return { outputs, diagnostics };
}

/* -------------------------------------------------------------------------- */
/* Default export                                                             */
/* -------------------------------------------------------------------------- */

export default {
  transforms,
  runTransform,
  runTransforms,
  validateTransformName,
  getByPath,
  setByPath,
  translateRecord,
  translateRecords,
  coalesce,
};
