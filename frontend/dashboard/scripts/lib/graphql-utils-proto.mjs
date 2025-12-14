import { buildSchema, printSchema } from "graphql";

// Try to import mapSchema, but make it optional
let mapSchema = null;
try {
  const utils = await import("@graphql-tools/utils");
  mapSchema = utils.mapSchema;
} catch (err) {
  // mapSchema not available - will skip optional transformations
}

// Minimal prototype utilities for validating/inspecting generated SDL.
export function validateSDL(sdlText) {
  try {
    // buildSchema will throw if SDL is invalid (unknown types, etc.)
    const schema = buildSchema(sdlText);

    // Optionally walk the schema to ensure mapSchema works (no-op here)
    if (mapSchema) {
      try {
        mapSchema(schema, {});
      } catch (merr) {
        // don't fail validation if mapSchema has issues; capture for debugging
        // but proceed to print the base schema
        // console.error('mapSchema validation warning:', merr);
      }
    }

    // Return a canonical printed schema to aid debugging
    return { valid: true, printed: printSchema(schema) };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}

// Emit a canonical SDL by parsing the temporary document, applying mapSchema
// (no-op today) and printing the resulting schema. This ensures consistent
// ordering and surfacing of missing dependent types.
export function emitCanonicalSDL(sdlText) {
  try {
    const schema = buildSchema(sdlText);
    if (mapSchema) {
      try {
        const mapped = mapSchema(schema, {});
        // mapSchema can sometimes throw or attempt to mutate internal structures.
        // If it succeeds and returns a schema-like object, print it; otherwise
        // fall back to printing the original built schema.
        if (mapped && typeof mapped === "object" && mapped.toConfig) {
          return { ok: true, printed: printSchema(mapped) };
        }
        return { ok: true, printed: printSchema(schema) };
      } catch (mapErr) {
        // Trace mapSchema error for debugging and avoid mutating/throwing further
        // Include stack to stderr to help debugging the 'Assignment to constant variable' issue
        try {
          process.stderr.write(
            `mapSchema error during canonicalization: ${mapErr.stack || String(mapErr)}\n`
          );
        } catch (e) {
          // ignore
        }
        return { ok: true, printed: printSchema(schema) };
      }
    }
    // mapSchema not available, just print the schema
    return { ok: true, printed: printSchema(schema) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export default { validateSDL, emitCanonicalSDL };
