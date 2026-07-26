/**
 * Field mapping system for multi-source schema unification.
 *
 * Mirrors the Rust implementation in
 * `converters/rust/src/mapping/mod.rs`.
 */

import { snakeToCamel, camelToSnake } from "../case-conversion.js";

export interface FieldMappingEntry {
  snake?: string;
  camel?: string;
  locations: string[];
}

export type FieldMapping = Record<string, FieldMappingEntry>;

/**
 * Build a FieldMapping from a JSON object (e.g., loaded from
 * `field-mapping.json`).
 */
export function parseFieldMapping(value: any): FieldMapping {
  const map: FieldMapping = {};
  if (!value || typeof value !== "object") return map;
  const obj = value as Record<string, unknown>;
  for (const [key, entryValue] of Object.entries(obj)) {
    if (
      entryValue &&
      typeof entryValue === "object" &&
      !Array.isArray(entryValue)
    ) {
      const entryObj = entryValue as Record<string, unknown>;
      const entry: FieldMappingEntry = {
        snake: typeof entryObj.snake === "string" ? entryObj.snake : undefined,
        camel: typeof entryObj.camel === "string" ? entryObj.camel : undefined,
        locations: Array.isArray(entryObj.locations)
          ? (entryObj.locations as unknown[]).filter(
              (v): v is string => typeof v === "string",
            )
          : [],
      };
      map[key] = entry;
    } else if (Array.isArray(entryValue)) {
      map[key] = {
        snake: undefined,
        camel: undefined,
        locations: (entryValue as unknown[]).filter(
          (v): v is string => typeof v === "string",
        ),
      };
    } else if (typeof entryValue === "string") {
      map[key] = {
        snake: undefined,
        camel: undefined,
        locations: [entryValue],
      };
    }
  }
  return map;
}

/**
 * Walk a JSON pointer path through a schema.
 * Accepts both `/foo/bar` and `foo/bar` formats. Tries direct
 * key access, then camelCase/snake_case variants.
 */
export function resolvePointer(schema: any, pointer: string): any {
  if (!pointer || pointer === "/") return schema;

  const parts = pointer
    .replace(/^\//, "")
    .split("/")
    .filter((p) => p.length > 0);

  let current = schema;
  for (const part of parts) {
    if (current && typeof current === "object") {
      if (part in current) {
        current = current[part];
        continue;
      }
      // Snake case
      const snake = camelToSnake(part);
      if (snake in current) {
        current = current[snake];
        continue;
      }
      // Camel case
      const camel = snakeToCamel(part);
      if (camel in current) {
        current = current[camel];
        continue;
      }
      return undefined;
    }
    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (!isNaN(idx) && idx < current.length) {
        current = current[idx];
        continue;
      }
      return undefined;
    }
    return undefined;
  }
  return current;
}

/**
 * Resolve a pointer using a field mapping as a hint.
 * Tries direct resolution first, then falls back to mapping locations.
 */
export function resolvePointerWithMapping(
  schema: any,
  pointer: string,
  mapping: FieldMapping,
): { node: any; path: string } | null {
  // Try direct resolution
  const direct = resolvePointer(schema, pointer);
  if (direct !== undefined && direct !== null) {
    return { node: direct, path: pointer };
  }

  // Try each path component as a mapping key
  const parts = pointer
    .replace(/^\//, "")
    .split("/")
    .filter((p) => p.length > 0);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const entry = mapping[part];
    if (!entry) continue;
    for (const location of entry.locations) {
      const locationClean = location.replace(/^#/, "").replace(/^\//, "");
      const node = resolvePointer(schema, locationClean);
      if (node !== undefined && node !== null) {
        return { node, path: locationClean };
      }
      if (i < parts.length - 1) {
        const remaining = parts.slice(i + 1).join("/");
        const combined = `${locationClean}/${remaining}`;
        const combinedNode = resolvePointer(schema, combined);
        if (combinedNode !== undefined && combinedNode !== null) {
          return { node: combinedNode, path: combined };
        }
      }
    }
  }
  return null;
}

/**
 * Translate a federation field set (e.g., `"id contractId"`) by
 * applying the field mapping to each token.
 */
export function translateFederationFieldSet(
  fieldSet: string,
  mapping: FieldMapping,
): string {
  return fieldSet
    .split(/\s+/)
    .map((token) => {
      const entry = mapping[token];
      if (entry?.camel) return entry.camel;
      return token;
    })
    .join(" ");
}
