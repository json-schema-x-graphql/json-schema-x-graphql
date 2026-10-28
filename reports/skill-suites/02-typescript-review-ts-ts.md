# TypeScript review — `@json-schema-x-graphql/core` (`converters/node`)

Skill: `typescript-review` (TS01–TS10). Review type: module/library review (read-only; no source or config modified).
Baseline: commit `e0796eaf`, package version 2.2.1, Node 24.18.0.
Acceptance probes: existing `/tmp/jxg-probe/probe{1,2,3,4,5}.mts` re-run with the package's own `tsx`; additional CLI, live-server, UTF-8, and classification checks run without writing inside the repository.

## Acceptance

- **Verdict: accepted with modifications.** All 17 findings are supported by source inspection and reproduction; none were removed. The draft's principal P1/P2 conclusions and tool claims are correct.
- **Verified:** `npm run lint` reproduced 0 errors/50 warnings and the shell glob selected exactly 10 one-level-deep files out of 41 (31 top-level files were omitted). Full-scope ESLint reproduced 24 errors/120 warnings across 41 files. Package-local `npx tsc --noEmit` used TS 5.9.3 and passed; root `npx tsc --noEmit -p converters/node/tsconfig.json` used TS 6.0.3 and produced exactly 113 errors. `npm test` passed 19 suites/275 tests, with a `MODULE_TYPELESS_PACKAGE_JSON` warning. Probes 1–5 were re-run and reproduced AST_JSON failure, inert successful-result diagnostics, field-exclusion leakage, regex defects, string corruption, numeric-enum failures, operations duplication, invalid literals, input-type loss, lint false positives, locale ordering, and OpenTelemetry duplicate registration. The multi-wildcard case was confirmed by probe 3 (probe 1's differently cased control is not the decisive reproduction). The shipped CLI again failed with `ERR_MODULE_NOT_FOUND`; a live API request reproduced double encoding; the split-buffer probe reproduced UTF-8 corruption; `classifyDirective("link")` returned `custom`.
- **Changes vs draft:**
  - Reclassified former P3-12/P3-13/P3-14/P3-15/P3-16 as **P2-11/P2-12/P2-13/P2-14/P2-15**: these are reproducible output-corruption, compatibility, or edge-case defects, not merely maintenance costs under the skill's calibration.
  - Reordered the P3s for consequence order: former P3-17 (`link` classification) is P3-16; former P3-11 (lint coverage) is P3-17.
  - Narrowed P2-2's “diagnostics is always empty” wording to successful conversions; the exception path does construct an error diagnostic.
  - Replaced P2-5's insufficient quote-toggle suggestion with an AST-based or properly stateful lexer remedy; the draft snippet did not handle escaped quotes or multiline block strings.
  - Clarified P2-11's object-default examples so the GraphQL argument type is semantically compatible with an object value (input object or JSON scalar), rather than relying on a `String` argument with an object default.
  - Replaced P2-13's `setEncoding`-only remedy with `StringDecoder`; changing chunks to strings without also changing `size += chunk.length` would make the 1 MB byte limit count UTF-16 code units instead of bytes.
  - Corrected the mechanical-check narrative: the test run does emit a Node module-type warning, contrary to the draft's “No runtime/deprecation warnings” statement.

## Scope and verdict

Scope: the published library package `converters/node` (`src/`, approximately 4.3k lines of production code plus tests), with a deep pass over `src/converter.ts`, `src/validation-lint.ts`, `src/directive-filter.ts`, `src/analysis/index.ts`, `src/case-conversion.ts`, `src/interfaces.ts`, `src/validate-x-graphql.ts`, and support modules on the conversion path (`hints/*`, `normalization/directives.ts`, `features/relay.ts`, `otel.ts`, `standard-schema.ts`, `codegen.ts`), plus public callers `src/api-server.ts` and out-of-package contracts/consumers (`converters/cli`, `ports/rs-to-ts/analysis-diff`, `schema/converter-api.graphql`). `src/x-graphql-validator.ts` and `src/mapping/` were skimmed only.

**Verdict.** The default SDL happy path is solid (275 tests pass and package-pinned typecheck is clean), but several documented public surfaces are broken or inert. `Converter.convert()` fails every `AST_JSON` request; `validate`, `failOnWarning`, and successful-result diagnostics do not implement their contract; field exclusion is incomplete; and multiple post-processing paths silently alter, duplicate, or invalidate SDL. The highest risk is the cluster of silent SDL/schema corruption: these paths produce output that appears successful while violating the converter's core promise.

## Mechanical checks (TS09)

| Check | Command | Verified result |
|---|---|---|
| Lint as shipped | `cd converters/node && npm run lint` | 0 errors, 50 warnings, but only 10 of 41 source files linted. In `sh`, unquoted `src/**/*.ts` expands as `src/*/*.ts`; all 31 top-level `src/*.ts` files are omitted. |
| Full-scope lint | `npx eslint "src/**/*.ts"` | 41 files; 24 errors/120 warnings: 19 test parser/setup errors, 4 missing `performance` globals, 1 genuine `prefer-const`, 94 `no-explicit-any`, and 26 `no-console`. |
| Package typecheck | `cd converters/node && npx tsc --noEmit` | TS 5.9.3; 0 errors. |
| Root-toolchain comparison | `npx tsc --noEmit -p converters/node/tsconfig.json` from repo root | TS 6.0.3; 113 errors, dominated by missing Node globals and derivative implicit-`any` diagnostics. These are toolchain/config artifacts, not evidence that the pinned package build fails. |
| Tests | `cd converters/node && npm test` | 19/19 suites and 275/275 tests passed in 19.457 s. The run emitted `MODULE_TYPELESS_PACKAGE_JSON` for `scripts/test-both-converters.js`; it was not warning-free. |

`tsconfig.json` excludes `**/*.test.ts`, so standalone typecheck does not cover tests. Tests are compiled through ts-jest during the passing test run. Checked-in `dist/` also contains artifacts without current `src/` counterparts (`dist/cli.js`, `dist/cli/`), so it is stale in addition to the specific CLI loading defect below.

---

## Findings

### P1-1 — `Converter.convert()` always fails for `outputFormat: "AST_JSON"`

**Location:** `converters/node/src/converter.ts:1493-1503`, with `:245` and `:260-263`.

`jsonSchemaToGraphQLInternal` already returns `JSON.stringify(ast)` for AST_JSON, or the literal string `"null"` for empty output. `Converter.convert()` then treats that JSON text as SDL and calls `parse()` on it again:

```ts
const sdl = jsonSchemaToGraphQL(jsonSchema, resolvedOptions);
let output = sdl;
if (resolvedOptions.outputFormat === "AST_JSON") {
  if (!sdl) output = "null";
  else {
    const ast = parse(sdl, { noLocation: true });
    output = JSON.stringify(ast);
  }
}
```

**Trigger and reproduction:** `new Converter().convert({ jsonSchema: JSON.stringify(schema), options: { outputFormat: "AST_JSON" } })` returns `success: false`, `output: null`, and a syntax diagnostic (`Expected Name, found String "kind"`). The direct function on the same schema returns a valid AST JSON document. Empty output also fails because the truthy text `"null"` is parsed as SDL.

**Consequence:** every AST_JSON request through the exported class API fails. AST_JSON is explicitly documented as a stable interface boundary (`generated/types.ts:202-214`; `schema/converter-api.graphql:210-213`). The CLI's direct-function route is unaffected, which helps explain the missing coverage.

**Minimal remedy:** return the internal function's final artifact directly in `convert()`; do not parse it a second time. Alternatively, request SDL internally and perform exactly one AST conversion.

---

### P2-2 — `validate` and `failOnWarning` are inert; successful conversions never produce diagnostics

**Location:** `converters/node/src/converter.ts:1339`, `:1352`, `:1505-1514`.

`validate` is normalized but never read. `failOnWarning` only examines a locally created `diagnostics` array that is never populated on the successful path, so `warningCount` and `errorCount` are always zero and `success` is always true there. The catch path can return an error diagnostic; the defect is the absence of validation/conversion diagnostics on otherwise successful results.

**Trigger and reproduction:** converting a schema containing deprecated `x-sensitive` with `{ validate: true, failOnWarning: true }` returns `success: true`, `diagnostics: []`, and `warningCount: 0`, while exported `lintAll` reports that attribute as an error (`validation-lint.ts:22`).

**Consequence:** the published options promise input validation and warning-based failure (`generated/types.ts:66-70,113-117`), and `ConversionResult.diagnostics` promises conversion warnings/errors. Consumers relying on those guarantees receive none.

**Minimal remedy:** wire the intended validation/lint pipeline into result construction, map issues to the existing `Diagnostic` contract, honor `failOnWarning`, and fail early on validation errors where required. If validation is deliberately unsupported, remove or correct the published options instead. Using `lintAll` alone would cover x-graphql lint issues, but the implementation should also ensure it satisfies the documented JSON Schema validation scope.

---

### P2-3 — `excludePatterns` never excludes field names

**Location:** `converters/node/src/converter.ts:851-903`; existing exclusion calls at `:216`, `:227`, `:636`, `:1279`, and `:1297` are type-level.

The published option says patterns apply to type names **and field names individually** (`generated/types.ts:59-63`). `convertField` computes `safeFieldName` at line 868 and emits it without an exclusion check. Rust performs the missing check at `converters/rust/src/json_to_graphql.rs:1029-1031`.

**Trigger and reproduction:** with fields `internalNotes` and `name`, `excludePatterns: ["internal.*"]` still emits `internalNotes: String`.

**Consequence:** every direct/class conversion using field exclusion can silently over-emit fields the caller requested be removed, and TS diverges from Rust.

**Minimal remedy:** immediately after computing `safeFieldName`, return `null` when any `options.excludeRegexes` entry matches it, mirroring the Rust placement.

---

### P2-4 — `escapeRegExp` disables multi-wildcard patterns and leaks raw regex syntax errors

**Location:** `converters/node/src/converter.ts:1316-1332`, used at `:1363-1366`.

The heuristic literalizes patterns containing two or more `*`/`+` characters, changing their documented regex semantics. Patterns in the “safe” character set still reach `new RegExp` raw, so malformed patterns throw `SyntaxError` from `jsonSchemaToGraphQL`. Common idioms containing `\` or `{...}` are also literalized. Rust compiles patterns directly and ignores invalid ones (`json_to_graphql.rs:1945-1953`).

**Triggers and reproduction:**
- `.*Filter.*Thing` fails to exclude sanitized type `UserFilterThing`; the single-wildcard control `.*FilterThing` excludes it (probe 3).
- `excludePatterns: ["[a-"]` throws an unterminated-character-class `SyntaxError`.

**Consequence:** normal exclusions silently stop working, invalid input escapes the direct API's error convention, and cross-engine behavior diverges.

**Minimal remedy:** compile the caller's regex directly inside `try/catch`; on failure either ignore it for Rust parity or return the project's documented diagnostic/error. Do not silently rewrite valid regexes into literals. Any ReDoS policy must be explicit rather than changing pattern meaning.

---

### P2-5 — Directive filtering rewrites `@` tokens inside strings and can make SDL unparseable

**Location:** `converters/node/src/directive-filter.ts:116-174`, applied at `converter.ts:252-257`.

`filterLineDirectives` treats every `@` as directive syntax, with no awareness of quoted strings, escapes, or block strings. Unknown tokens classify as custom and are dropped in `VIEWER_FRIENDLY` mode.

**Triggers and reproduction:**
- Description `Contact support@acme.com for help` becomes `Contact support for help`.
- An argument default `"a@b.com"` produces a truncated line such as `email(notify: String = "a`; the SDL no longer parses.

**Consequence:** documented non-ALL filter modes silently corrupt common email/handle text or return invalid SDL through direct, class, and CLI entrypoints.

**Minimal remedy:** filter directives on the parsed AST and print the result, or implement a stateful SDL lexer that correctly handles escaped quotes, single-line strings, and multiline block strings across lines. A simple per-line quote toggle is not sufficient. Mirror the correction in Rust, which has the same scanner design.

---

### P2-6 — `includeOperationalTypes` plus `x-graphql-operations` duplicates the entire SDL

**Location:** `converters/node/src/hints/operations.ts:201-236`, reached from `hints/index.ts:91-97` and `converter.ts:240`.

`generateOperationsSdl` returns `existingSdl` when it already contains `type Query` (line 221). `injectOperations` then appends that return value to the original SDL, duplicating the whole document. The Mutation branch has an empty skip body and still appends a duplicate Mutation block.

**Trigger and reproduction:** enable `includeOperationalTypes: true` and provide `x-graphql-operations`. Probe 4 printed `type User` and `type Query` twice. `parse()` accepts the duplicate syntax, but schema construction/validation rejects duplicate type names.

**Consequence:** a documented option/extension combination produces an unusable schema while appearing successful, including through AST_JSON.

**Minimal remedy:** return only newly generated blocks and independently guard Query, Mutation, and Subscription. Prefer line-anchored type checks over unrestricted substring matching, then remove the `return existingSdl` and empty Mutation branch.

---

### P2-7 — Numeric enum values produce invalid SDL; `{ value: 0 }` is dropped

**Location:** `converters/node/src/converter.ts:722-738`; numeric inputs are allowed by `interfaces.ts:61` and `:97-107`.

The object branch's `if (!valName) continue` drops zero. The primitive branch preserves leading digits, which are illegal GraphQL names; the object branch can likewise emit a numeric value directly.

**Triggers and reproduction:**
- `enum: [0, 1, 2]` emits numeric lines and `graphql.parse` fails with `Expected Name, found Int "0"`.
- `x-graphql-enum.values: [{ value: 0 }, { value: 1 }]` drops zero and emits `1` as an invalid name.

**Consequence:** valid supported input yields invalid SDL or silently loses an enum member. Rust currently skips numeric members (`json_to_graphql.rs:75-84`), so parity also needs an explicit policy.

**Minimal remedy:** use a nullish/empty-string omission check instead of a falsy check, and normalize every emitted member to a legal GraphQL identifier (for example, prefix digit-leading names with `V_`). Apply the same normalization to primitive and object forms and coordinate the Rust behavior.

---

### P2-8 — `graphqlToJsonSchema` drops `input`/`extend` definitions and masks conversion failures with a lossy fallback

**Location:** `converters/node/src/converter.ts:304-357` and `:405-407`.

The registry handles object/interface/enum/union/scalar definitions, but not `InputObjectTypeDefinition` or extension definitions. The `catch` wraps the entire conversion, not just parsing, so unrelated internal errors silently switch to the weaker fallback.

**Trigger and reproduction:** converting SDL containing `input UserFilter { name: String }` returns no `UserFilter` definition (`$defs` is empty in probe 4). References to unregistered custom types degrade to `{ type: "object", "x-graphql-type": "UserFilter" }` at lines 554-555.

**Consequence:** common SDL filter/argument shapes are silently lost in one of the package's two flagship conversion directions. If conversion throws after parsing, the fallback can additionally flatten types and change scalar/description behavior, concealing the actual defect.

**Minimal remedy:** register input object definitions and convert their fields into object schemas, preserving an input-kind marker if required by the round-trip contract. Handle supported extension definitions explicitly. Narrow the fallback `try/catch` to `parse()` so post-parse conversion failures surface.

---

### P2-9 — Shipped `validate-x-graphql` CLI cannot load under the package's ESM runtime

**Location:** `converters/node/src/validate-x-graphql.ts:21,320`, `src/x-graphql-validator.ts:8`, and `package.json:30-35`.

The package is ESM, while emitted relative imports remain extensionless under bundler resolution. Node cannot resolve them. After that is fixed, `require.main === module` still references CJS-only bindings. `package.json` also has no `bin` entry for the documented command.

**Reproduction:** `node dist/validate-x-graphql.js --help` fails with `ERR_MODULE_NOT_FOUND` for `dist/x-graphql-validator`.

**Consequence:** the documented validation CLI cannot execute in the supported Node runtime, and the documented `npx validate-x-graphql` workflow is not exposed by this package.

**Minimal remedy:** emit `.js` relative specifiers, replace the CJS direct-entry guard with an ESM-safe `import.meta.url`/`fileURLToPath` check, and add the `bin` mapping if the CLI is supported. Otherwise remove the stale CLI/documentation rather than shipping a non-loading entrypoint.

---

### P2-10 — Importing the library registers a global OpenTelemetry provider

**Location:** `converters/node/src/otel.ts:19-52`; SDKs are installed by default through `package.json:86-89`.

Module import fire-and-forget constructs a `NodeTracerProvider` with an in-memory exporter and calls `provider.register()`, claiming process-global tracing ownership without an opt-in.

**Reproduction:** after importing the converter and allowing initialization to settle, the host's own provider registration emits duplicate-registration errors for trace, context, and propagation; the global provider remains the library-registered instance.

**Consequence:** consumers configuring telemetry after import can lose spans to the library's in-memory exporter. If the host registers first, the library's registration loses instead, making behavior order-dependent.

**Minimal remedy:** remove import-time provider registration and use the host's global provider (whose default is a no-op). Tests requiring span capture should install their own provider/exporter. If self-registration is required, make it an explicit opt-in.

---

### P2-11 — GraphQL literals are serialized with JSON/raw templates, producing invalid SDL

**Location:** `converters/node/src/converter.ts:1866-1868,1885-1887`, `normalization/directives.ts:190-205`, and `hints/operations.ts:121-128`.

There is no GraphQL-literal serializer. JSON object keys are quoted, although GraphQL input-object keys must be Names, and the hints path inserts strings without escaping.

**Triggers and reproduction:**
- An object directive argument such as `@cache(config: {"ttl":60})` fails to parse; the same defect applies to an object default on a semantically compatible input-object or JSON scalar argument.
- Operation default `say "hi"` becomes `echo(msg: String = "say "hi"")` and fails to parse.

**Consequence:** supported `unknown` default/argument values can silently yield unparseable SDL. The probes reproduced both object-key and unescaped-string failures.

**Minimal remedy:** use one shared GraphQL-value serializer at all four sites: JSON-style escaping for strings, recursive list formatting, unquoted valid Name keys plus recursive values for objects, and GraphQL-compatible scalar/null formatting. Add parse tests for nested objects, arrays, quotes, backslashes, and control characters.

---

### P2-12 — API `graphql-to-json` responses are double-JSON-encoded

**Location:** `converters/node/src/api-server.ts:148-156`; `graphqlToJsonSchema` returns a JSON string at `converter.ts:404`.

The handler applies `JSON.stringify` to that string again.

**Reproduction:** a live `POST /api/convert` with `direction: "graphql-to-json"` returned `output` as a quoted, escaped JSON string literal, whereas the opposite direction returns plain SDL text.

**Consequence:** clients must decode the two directions asymmetrically; a client expecting the documented JSON Schema text receives another encoding layer.

**Minimal remedy:** assign `output = result` and let the outer response serializer encode the response object once.

---

### P2-13 — Per-chunk `toString()` corrupts multibyte UTF-8 request bodies

**Location:** `converters/node/src/api-server.ts:40-57`.

Raw Buffer chunks are decoded independently with `body += chunk.toString()`. A multibyte code point split across chunks becomes replacement characters before JSON parsing/conversion.

**Trigger and reproduction:** a sufficiently large non-ASCII request can straddle a chunk boundary. The mechanism probe decoded split buffers for `héllo` as `h��llo`, while whole-buffer decoding returned `héllo`.

**Consequence:** valid large CJK/emoji payloads can produce spurious `400 Invalid JSON` responses or mojibake in converted descriptions.

**Minimal remedy:** use `StringDecoder("utf8")`, calling `decoder.write(chunk)` for each Buffer and `decoder.end()` on completion, while retaining the current Buffer-length byte accounting. Accumulating Buffers and decoding once at end is also correct. A bare `req.setEncoding("utf8")` is insufficient unless the byte-limit accounting is adjusted too.

---

### P2-14 — `validation-lint` treats user data property names as annotation violations

**Location:** `converters/node/src/validation-lint.ts:44-92`.

`lintValue` runs deprecated/nonstandard `x-*` key checks on every object, including `properties`, `patternProperties`, `$defs`, and `definitions` maps whose keys are user-chosen data/type names rather than annotation positions.

**Trigger and reproduction:** `lintAll({ type: "object", properties: { "x-cost": { type: "number" } } })` reports both an error for deprecated `x-cost` and a nonstandard-x warning at `$.properties.x-cost`.

**Consequence:** the exported linter and its CLI story reject valid schemas modeling legitimate `x-*` data fields, potentially failing CI on false errors.

**Minimal remedy:** for name-keyed maps, recurse directly into each child schema without applying annotation-key checks to the map itself. Continue linting actual schema objects normally. The unrelated no-op federation-keys block at lines 127-137 can be deleted separately as cleanup.

---

### P2-15 — `localeCompare` ordering breaks deterministic/cross-engine output when field order is not preserved

**Location:** `converters/node/src/converter.ts:190-192` and `:795-797`.

`localeCompare` depends on runtime locale/ICU behavior and does not match Rust's code-unit/byte-style sort. The module explicitly promises deterministic output that closely mirrors Rust.

**Trigger and reproduction:** `["Beta", "alpha"].sort((a,b) => a.localeCompare(b))` yields `alpha,Beta`, while code-unit sorting yields `Beta,alpha`. End-to-end with `preserveFieldOrder: false`, TS emitted Alpha before Beta. Rust sorts property names with `prop_names.sort()` (`json_to_graphql.rs:920`) and preserves definition insertion order through `serde_json`'s `preserve_order` feature.

**Consequence:** the nondefault sorting mode can vary across environments and already diverges from Rust for ordinary mixed-case ASCII names.

**Minimal remedy:** use an explicit code-unit comparator (`a < b ? -1 : a > b ? 1 : 0`) for the intended deterministic order, and decide/test the `$defs` ordering policy against Rust explicitly.

---

### P3-16 — `classifyDirective` omits `link` from the federation tier

**Location:** `converters/node/src/directive-filter.ts:35-55`; Rust's canonical list includes `link` at `converters/rust/src/directive_filter.rs:35-38`.

**Trigger and reproduction:** `classifyDirective("link")` returns `custom` in TS versus `Federation` in Rust.

**Consequence:** current filter modes do not distinguish federation from custom, so there is no present end-to-end SDL impact. The concrete maintenance/parity cost is in the exported deep-module classification API and any future tier-based mode, which inherits the divergence.

**Minimal remedy:** add `link` to `federationDirectives` and pin `classifyDirective("@link") === "federation"` in the existing directive-filter tests.

---

### P3-17 — The lint gate covers only 10 of 41 source files and hides a real error

**Location:** `converters/node/package.json:46,59`, interacting with `eslint.config.cjs:31-36`.

The unquoted script glob is expanded by `sh` before ESLint sees it. Verified `src/**/*.ts` expands to 10 one-level-deep files, omitting all 31 top-level files including `converter.ts`.

**Consequence:** `npm run lint` and `precommit` report 0 errors/50 warnings while excluding the core. Full-scope lint reports 24 errors/120 warnings: one genuine `prefer-const` at `converter.ts:1187`, four missing `performance` globals, 19 typed-lint project-service parser failures on excluded test files, and 120 warnings. Parser/setup failures should not be misreported as source rule violations.

**Minimal remedy:** let ESLint own the scope (for example, `eslint src`), configure a lint tsconfig/project-service default project that includes intended test files, and add Node's `performance` global. Then address the surfaced genuine rule violation and warning policy.

---

## Checks actually run, coverage, and limits

1. **Lint:** shipped script and quoted full-tree scope both re-run. Exact file/problem counts and rule breakdown are recorded above.
2. **Typecheck:** package-pinned TS 5.9.3 passed. Root TS 6.0.3 produced 113 errors. Tests remain excluded from standalone typecheck by tsconfig.
3. **Tests:** all 19 suites/275 tests passed. The run emitted a Node `MODULE_TYPELESS_PACKAGE_JSON` warning; passing tests do not cover the findings reproduced here.
4. **Probes:** all five existing `/tmp/jxg-probe` scripts re-run. Additional direct checks re-ran the shipped CLI, a bounded live API server plus curl request, split-buffer UTF-8 decoding, and `classifyDirective("link")`.
5. **Cross-engine evidence:** cited Rust source and Cargo configuration inspected; the Rust test suite was not run.
6. **Unverified scope:** `src/x-graphql-validator.ts` and `src/mapping/` received only a skim. External npm consumers were not observable. No performance claims or benchmarks were evaluated. No source or configuration under `converters/` was modified.
