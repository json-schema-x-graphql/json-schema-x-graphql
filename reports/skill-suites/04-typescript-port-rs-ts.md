# 04 — typescript-port (rs→ts): `analysis/diff` acceptance report

**Deliverable:** `ports/rs-to-ts/analysis-diff/` (package.json, tsconfig.json, `src/analysis-diff.ts`, `src/analysis-diff.test.ts`, PORTING.md)
**Source of truth:** `converters/rust/src/analysis/diff.rs` @ git `e0796ea`, sha256 `9c7738047d1e989f086bc7193bccf5406b2fe8b0023f0c5927148ffcf056b30c` (388 lines, 6 inline tests)
**Acceptance performed against:** `.agents/skills/typescript-port/SKILL.md` (§3, §6, §8) and `.agents/skills/typescript-verify/SKILL.md`

## Acceptance

- **Verdict: accepted with modifications.** The port's public behavior, messages,
  paths, severity/category modeling and summary format were already faithful for
  the characterized domain, and all 6 Rust tests mapped 1:1. Acceptance found
  and fixed four real gaps (three behavioral fidelity edges in defs extraction,
  one broken documented test command) plus PORTING.md inaccuracies.

  Modifications made (all within `ports/rs-to-ts/**`; `converters/` untouched,
  confirmed via clean `git status`):

  1. **`extractDefsMap` fidelity to `extract_defs_map` (diff.rs:113–124)** —
     three fixes in `src/analysis-diff.ts`:
     - `$defs` fallback used `??`, so a present-but-null `$defs` wrongly fell
       through to `definitions`. Rust `Option::or_else` fires only on an
       *absent* key; now uses `Object.hasOwn(schema, "$defs")`.
     - Array containers (`$defs: [...]`) passed the `typeof === "object"`
       check; Rust `as_object()` rejects arrays. Added a shared
       `isJsonObject()` guard (also rejects top-level array schemas).
     - The port filtered non-object definition values out of the defs map,
       but Rust clones every value and guards inside `diff_type_definition`.
       The filter silently dropped `Type 'A' was removed`-style diffs for
       e.g. `{"$defs":{"A":5}}` → `{"$defs":{}}`. Filtering removed;
       `diffTypeDefinition` now takes `unknown` and early-returns unless both
       defs are objects (exact `as_object()` mirror). PORTING.md's claim that
       the filter "matches Rust `as_object()` guard" was false and is corrected.
  2. **Federation-key presence check** switched from `in` to `Object.hasOwn`
     (Rust `contains_key` is own-key only; `in` consults the prototype chain).
  3. **Native `node --test` was broken as delivered.** Test imported
     `./analysis-diff.js`, which Node ≥22 type-stripping does not remap to
     `.ts` (`ERR_MODULE_NOT_FOUND`), and `package.json`'s `node --test src/`
     directory-positional fails on Node 24.18.0 (runner tries to execute `src`
     as a file). Fixed: import `./analysis-diff.ts`, tsconfig gained
     `allowImportingTsExtensions: true` (valid under `noEmit`) and
     `erasableSyntaxOnly: true` (now enforces the port's erasable-syntax claim),
     test script is `node --test` (auto-discovery). The tsx fallback path the
     porter documented works unchanged.
  4. **PORTING.md corrections/completions (skill §8):** `DiffResult::total()`
     was documented "Not exported" in two tables while `total()` is in fact
     exported — docs fixed and the `total_and_isCompatible_match_counts` test
     now exercises it (plus the `breaking + nonBreaking === total` invariant).
     Source revision pinned (git rev + sha256) instead of "current working
     tree". Added "Preserved quirks" and "Unverified cases / limits" sections,
     the 15th test-mapping row, corrected verification commands (with the
     `node --test src/` gotcha), and refreshed all verification results.
  5. **Test suite extended 14 → 15:** added characterization test
     `defs_extraction_matches_rust_edge_cases` covering null-`$defs`
     shadowing (both the symmetric and asymmetric case), array containers,
     top-level array schemas, non-object defs counted as added/removed, and
     non-object common defs producing no field diffs. Each assertion was
     derived from the Rust source, not from the TS implementation.

- **Verification:** commands re-run at acceptance (Node v24.18.0, tsc 6.0.3,
  Linux):

  | Command | Scope | Result |
  |---|---|---|
  | `cd converters/rust && cargo test analysis::diff` | Source baseline | **6 passed, 0 failed, 0 ignored** (re-run before edits; `converters/` never modified — `git status --porcelain converters/` clean) |
  | `npx tsc --noEmit -p ports/rs-to-ts/analysis-diff/tsconfig.json` (repo root) | Typecheck, strict + `erasableSyntaxOnly` | **exit 0**, no diagnostics |
  | `node --test` in `ports/rs-to-ts/analysis-diff/` (≡ `npm test`) | Port tests, native Node type-stripping | **15 tests, 15 pass, 0 fail** |
  | `node --test src/analysis-diff.test.ts` | Explicit file | 15 pass, exit 0 |
  | `cd converters/node && npx tsx ../../ports/rs-to-ts/analysis-diff/src/analysis-diff.test.ts` | Porter's documented fallback | **15 pass, exit 0** (14/14 as delivered, pre-modification) |
  | `npm run typecheck` in the port dir | Package script | exit 0 |

  As delivered, the port's own primary command failed: `node --test src/` →
  `MODULE_NOT_FOUND` for `src`, and `node --test src/analysis-diff.test.ts` →
  `ERR_MODULE_NOT_FOUND` for `./analysis-diff.js`. Only the tsx fallback
  (14/14 pass) worked. Both native paths now work.

- **Test-mapping audit: validated.**
  - *6 ported tests:* each Rust test (diff.rs:277–388) maps to a same-named
    TS test with equivalent assertions — `total()==0` ≡ `diffs.length===0`;
    `any(message.contains && severity)` ≡ `some(includes && ===)`;
    `breaking_changes==1 && !is_compatible()` ≡ `breakingChanges===1 &&
    !isCompatible(...)`; summary `contains` checks identical. Fixtures are
    literal translations of the `json!` inputs. Cited line numbers in
    PORTING.md check out.
  - *8 characterization tests (as delivered; 9 after acceptance):* all
    expectations were validated by reading the Rust source, not by running the
    TS implementation. Deep-checked four, per the brief:
    - `required_to_optional_is_non_breaking` — diff.rs:207–217:
      `old_required.difference(new_required)` with `new_props.contains` guard →
      `Modified` (non-breaking), message `"...is now optional"`. Test expects
      `isCompatible` + `fieldRequired`/`modified`. ✓
    - optional→required breaking (covered inside `test_required_change_breaking`
      and the counting logic) — diff.rs:219–230 pushes `DiffSeverity::Removed`
      (quirk preserved), diff.rs:96–104 counts `Removed` as breaking. ✓
    - `definitions_fallback_works` — diff.rs:118–120 `.or_else(||
      obj.get("definitions"))`: fallback only when `$defs` key absent; test's
      both-sides-`definitions` fixture yields exactly 1 `added` diff. ✓
    - `type_array_property_falls_back_to_unknown_kind` — diff.rs:137–144:
      `as_str()` on an array → `None` → `"unknown"` both sides → kinds equal →
      0 diffs. ✓
    - Also spot-verified: `kind_change_produces_modified_severity_diff`
      (diff.rs:145–155, `FieldType`/`Modified`), `removed_field_is_breaking`
      (diff.rs:178–185), `federation_key_removal_is_breaking` (diff.rs:232–248),
      `non_object_schema_returns_zero_diffs` (diff.rs:114–117). ✓
    - The new 15th test's expectations were derived line-by-line from
      `extract_defs_map`/`diff_type_definition` as above.

- **Behavior fidelity:** confirmed points —
  - All 8 message templates byte-identical, including single quotes, the
    `(breaking change)` suffixes and the U+2192 `→` in `changed kind:
    '<old>' → '<new>'`.
  - All 5 path formats identical: `$.$defs.<N>`, `$.$defs.<N>.type`,
    `$.$defs.<N>.properties.<f>`, `$.$defs.<N>.required`,
    `$.$defs.<N>.x-graphql-federation-keys`.
  - Severity/category assignments identical per branch, including the
    optional→required ≙ `Removed` quirk and `fieldType`+`modified` for kind
    changes; `metadata` never produced in either (union keeps 6/6 enum values).
  - Counting: breaking = `removed` only; non-breaking = complement; invariant
    `breaking + nonBreaking === diffs.length` now asserted in tests.
  - `isCompatible` ≡ `breakingChanges === 0` ≡ Rust `is_compatible`.
  - `formatDiffSummary`: header line, two-space-indented count lines, blank
    line, `[+|-|~] path: message` rows, `\n` join — exact match with
    diff.rs:252–270.
  - Enum modeling: string-literal unions only, no `enum` keyword anywhere;
    `erasableSyntaxOnly: true` now enforces this at compile time.
  - Ordering honesty (criterion 5): PORTING.md correctly states Rust
    `HashSet` iteration is nondeterministic (per-process random hasher seed)
    and that insertion-ordered TS output is a *deliberate difference*, with no
    false determinism-equivalence claim; acceptance added the integer-key
    ordering caveat for JS objects.

  Residual gaps (documented in PORTING.md "Unverified cases / limits"):
  - No cross-language differential harness (shared corpus run through both
    binaries); equivalence rests on line-by-line reading + 15 tests. This is
    how the three `extractDefsMap` divergences survived the porter's own
    verification.
  - Order equality is untestable by construction (nondeterministic source).
  - Only Node v24.18.0 exercised; browser/Bun/Deno unverified; `noEmit` means
    no built artifact/consumer check beyond source execution.
  - No performance measurement (TS08 not attempted; not required here).

## Suite findings

What this port demonstrates: the typescript-port skill's pipeline produced a
structurally faithful, dependency-free pure-core port with a genuinely useful
PORTING.md (honest ordering section, real comparison against the pre-existing
`converters/node` implementation, cited line numbers) and a correct 1:1 test
mapping. The characterization tests all encoded real Rust behavior — none were
generated by echoing the TS implementation. The typescript-verify-style
re-run caught what the porter's own run did not: a documented primary test
command that never worked on the target runtime, and a doc/code contradiction
(`total()` "not exported").

Remaining risks / lessons for the suite:

1. **`Option::or_else` vs `??` and `as_object()` vs `typeof === "object"`**
   are exactly the "similar-looking standard-library semantics" hazard the
   skill warns about (§4). Rust option/map combinators key on *presence*,
   JS nullish operators key on *nullishness*; Rust `as_object()` excludes
   arrays, JS `typeof` includes them. These produced three silent behavioral
   divergences on malformed-input edges that a happy-path corpus never
   reaches. A cheap differential harness (serde_json fixtures → JSON out,
   compared against the TS side) would have caught them mechanically.
2. **Documented commands must be re-executed at delivery time.** The
   `node --test src/` script and the `.js`-specifier import show the PORTING.md
   "Verification commands" section drifting from what actually ran (the porter
   noted the tsx fallback but left the broken primary in place). The
   `.js`→`.ts` non-remapping in native Node type-stripping is a recurring
   rs/js-port trap worth adding to the skill's host-boundary checklist.
3. **Doc/code drift is a real failure mode** even in a small deliverable
   (`total()`), reinforcing §8's demand that PORTING.md describe the shipped
   artifact, verified by re-run rather than memory.

Post-modification state: 15/15 tests green under both native `node --test` and
tsx, tsc clean under strict + `erasableSyntaxOnly`, Rust baseline untouched at
6/6. Nothing committed.
