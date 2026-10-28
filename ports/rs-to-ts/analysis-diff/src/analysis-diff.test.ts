/**
 * Tests for schema diff engine — ported from
 * `converters/rust/src/analysis/diff.rs` `#[cfg(test)] mod tests`.
 *
 * One `node:test` case per Rust test. Verifies behavioral equivalence against
 * the Rust source of truth.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  diffSchemas,
  isCompatible,
  total,
  formatDiffSummary,
} from "./analysis-diff.ts";

// ---------------------------------------------------------------------------
// Rust: test_no_diff_identical  (line 278)
// ---------------------------------------------------------------------------

describe("diffSchemas", () => {
  it("test_no_diff_identical", () => {
    const schema = {
      $defs: {
        User: {
          type: "object",
          properties: { id: { type: "string" } },
        },
      },
    };
    const result = diffSchemas(schema, schema);
    assert.strictEqual(result.diffs.length, 0);
  });

  // ---------------------------------------------------------------------------
  // Rust: test_added_type  (line 292)
  // ---------------------------------------------------------------------------

  it("test_added_type", () => {
    const old_ = { $defs: { User: { type: "object" } } };
    const new_ = {
      $defs: {
        User: { type: "object" },
        Order: { type: "object" },
      },
    };
    const result = diffSchemas(old_, new_);
    assert.ok(
      result.diffs.some(
        (d) => d.message.includes("Order") && d.severity === "added",
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Rust: test_removed_type_breaking  (line 308)
  // ---------------------------------------------------------------------------

  it("test_removed_type_breaking", () => {
    const old_ = {
      $defs: {
        User: { type: "object" },
        Order: { type: "object" },
      },
    };
    const new_ = { $defs: { User: { type: "object" } } };
    const result = diffSchemas(old_, new_);
    assert.strictEqual(result.breakingChanges, 1);
    assert.ok(!isCompatible(result));
  });

  // ---------------------------------------------------------------------------
  // Rust: test_added_field_non_breaking  (line 322)
  // ---------------------------------------------------------------------------

  it("test_added_field_non_breaking", () => {
    const old_ = {
      $defs: {
        User: {
          type: "object",
          properties: { id: { type: "string" } },
        },
      },
    };
    const new_ = {
      $defs: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
          },
        },
      },
    };
    const result = diffSchemas(old_, new_);
    assert.ok(isCompatible(result));
    assert.ok(
      result.diffs.some(
        (d) => d.message.includes("name") && d.severity === "added",
      ),
    );
  });

  // ---------------------------------------------------------------------------
  // Rust: test_required_change_breaking  (line 351)
  // ---------------------------------------------------------------------------

  it("test_required_change_breaking", () => {
    const old_ = {
      $defs: {
        User: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
    };
    const new_ = {
      $defs: {
        User: {
          type: "object",
          required: ["id", "email"],
          properties: {
            id: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    };
    const result = diffSchemas(old_, new_);
    assert.ok(!isCompatible(result));
  });

  // ---------------------------------------------------------------------------
  // Rust: test_format_diff_summary  (line 379)
  // ---------------------------------------------------------------------------

  it("test_format_diff_summary", () => {
    const old_ = { $defs: { A: { type: "object" } } };
    const new_ = { $defs: { B: { type: "object" } } };
    const result = diffSchemas(old_, new_);
    const summary = formatDiffSummary(result);
    assert.ok(summary.includes("Breaking changes"));
    assert.ok(summary.includes("Type 'A' was removed"));
    assert.ok(summary.includes("Type 'B' was added"));
  });

  // ---------------------------------------------------------------------------
  // Characterization tests — behavior present in Rust source but not covered
  // by the inline `#[cfg(test)]` module.
  // ---------------------------------------------------------------------------

  it("kind_change_produces_modified_severity_diff", () => {
    const old_ = {
      $defs: { T: { type: "string" } },
    };
    const new_ = {
      $defs: { T: { type: "number" } },
    };
    const result = diffSchemas(old_, new_);
    const d = result.diffs.find(
      (d) => d.category === "fieldType",
    );
    assert.ok(d);
    assert.strictEqual(d!.severity, "modified");
    assert.ok(d!.message.includes("string") && d!.message.includes("number"));
  });

  it("removed_field_is_breaking", () => {
    const old_ = {
      $defs: {
        User: {
          type: "object",
          properties: { id: { type: "string" }, name: { type: "string" } },
        },
      },
    };
    const new_ = {
      $defs: {
        User: {
          type: "object",
          properties: { id: { type: "string" } },
        },
      },
    };
    const result = diffSchemas(old_, new_);
    assert.ok(!isCompatible(result), "field removal should be breaking");
    const fieldDiff = result.diffs.find(
      (d) => d.category === "field" && d.severity === "removed",
    );
    assert.ok(fieldDiff);
    assert.ok(fieldDiff!.message.includes("name"));
  });

  it("federation_key_removal_is_breaking", () => {
    const old_ = {
      $defs: {
        User: {
          type: "object",
          "x-graphql-federation-keys": [{ fields: "id" }],
          properties: { id: { type: "string" } },
        },
      },
    };
    const new_ = {
      $defs: {
        User: {
          type: "object",
          properties: { id: { type: "string" } },
        },
      },
    };
    const result = diffSchemas(old_, new_);
    assert.ok(!isCompatible(result), "fed key removal should be breaking");
    const fed = result.diffs.find((d) => d.category === "federation");
    assert.ok(fed);
    assert.strictEqual(fed!.severity, "removed");
  });

  it("required_to_optional_is_non_breaking", () => {
    const old_ = {
      $defs: {
        User: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            id: { type: "string" },
          },
        },
      },
    };
    const new_ = {
      $defs: {
        User: {
          type: "object",
          required: [],
          properties: {
            name: { type: "string" },
            id: { type: "string" },
          },
        },
      },
    };
    const result = diffSchemas(old_, new_);
    assert.ok(isCompatible(result));
    const reqDiff = result.diffs.find(
      (d) => d.category === "fieldRequired" && d.severity === "modified",
    );
    assert.ok(reqDiff);
    assert.ok(reqDiff!.message.includes("now optional"));
  });

  it("definitions_fallback_works", () => {
    const old_ = {
      definitions: {
        User: { type: "object" },
      },
    };
    const new_ = {
      definitions: {
        User: { type: "object" },
        Order: { type: "object" },
      },
    };
    const result = diffSchemas(old_, new_);
    assert.strictEqual(result.diffs.length, 1);
    assert.strictEqual(result.diffs[0].severity, "added");
    assert.ok(result.diffs[0].message.includes("Order"));
  });

  it("non_object_schema_returns_zero_diffs", () => {
    assert.strictEqual(diffSchemas(null, null).diffs.length, 0);
    assert.strictEqual(
      diffSchemas("string", 42).diffs.length,
      0,
    );
  });

  it("type_array_property_falls_back_to_unknown_kind", () => {
    // Rust `as_str()` rejects array-typed `"type"`, producing "unknown".
    const old_ = {
      $defs: { T: { type: ["string", "null"] } },
    };
    const new_ = {
      $defs: { T: { type: ["string", "null"] } },
    };
    const result = diffSchemas(old_, new_);
    assert.strictEqual(result.diffs.length, 0);
  });

  it("total_and_isCompatible_match_counts", () => {
    const old_ = { $defs: {} };
    const new_ = { $defs: {} };
    const result = diffSchemas(old_, new_);
    assert.strictEqual(total(result), result.diffs.length);
    assert.strictEqual(total(result), 0);
    assert.strictEqual(
      result.breakingChanges + result.nonBreakingChanges,
      total(result),
    );
    assert.ok(isCompatible(result));
  });

  it("defs_extraction_matches_rust_edge_cases", () => {
    // Rust `Option::or_else` fires only when the `$defs` key is ABSENT:
    // a present-but-null `$defs` shadows `definitions` on that side.
    const shadowed = diffSchemas(
      { $defs: null, definitions: { User: { type: "object" } } },
      { $defs: null },
    );
    assert.strictEqual(shadowed.diffs.length, 0);

    // Absent `$defs` falls back to `definitions`; the other side's null
    // `$defs` yields no defs → "User" is reported removed (Rust asymmetry).
    const asymmetric = diffSchemas(
      { definitions: { User: { type: "object" } } },
      { $defs: null },
    );
    assert.strictEqual(asymmetric.diffs.length, 1);
    assert.strictEqual(asymmetric.diffs[0].severity, "removed");
    assert.strictEqual(asymmetric.diffs[0].message, "Type 'User' was removed");

    // Rust `as_object()` rejects array containers: `$defs: [...]` → no defs.
    const arrayDefs = diffSchemas({ $defs: [{ type: "object" }] }, { $defs: [] });
    assert.strictEqual(arrayDefs.diffs.length, 0);

    // Top-level arrays are not objects in Rust (`Value::as_object()` → None).
    const arraySchema = diffSchemas([1, 2], { $defs: { A: { type: "object" } } });
    assert.strictEqual(arraySchema.diffs.length, 1);
    assert.strictEqual(arraySchema.diffs[0].severity, "added");

    // Non-object definition values stay in the name set (Rust clones every
    // value): added/removed are still reported for them.
    const nonObjectDef = diffSchemas({ $defs: { A: 5 } }, { $defs: {} });
    assert.strictEqual(nonObjectDef.diffs.length, 1);
    assert.strictEqual(nonObjectDef.diffs[0].severity, "removed");
    assert.strictEqual(nonObjectDef.diffs[0].message, "Type 'A' was removed");

    // A common type whose definitions are non-objects produces no field diffs
    // (Rust `diff_type_definition` early-returns on `as_object()` failure).
    const bothNonObject = diffSchemas({ $defs: { A: 5 } }, { $defs: { A: 6 } });
    assert.strictEqual(bothNonObject.diffs.length, 0);
  });
});