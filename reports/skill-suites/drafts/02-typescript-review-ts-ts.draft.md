# TypeScript review — `@json-schema-x-graphql/core` (`converters/node`)

Skill: `typescript-review` (TS01–TS10). Review type: module/library review (read-only; no source or config modified).
Baseline: commit `e0796eaf` (clean tree under `converters/node/`), package version 2.2.1, Node 24.18.0.
Probes: `/tmp/jxg-probe/probe{1,2,3,4,5}.mts` executed with the package's own `tsx`; nothing written inside the repo.

## Scope and verdict

Scope: the published library package `converters/node` (`src/`, ~4.3k lines of production code plus tests), with a
deep pass over `src/converter.ts`, `src/validation-lint.ts`, `src/directive-filter.ts`, `src/analysis/index.ts`,
`src/case-conversion.ts`, `src/interfaces.ts`, `src/validate-x-graphql.ts`, and the support modules every
conversion flows through (`hints/*`, `normalization/directives.ts`, `features/relay.ts`, `otel.ts`,
`standard-schema.ts`, `codegen.ts`), plus public callers `src/api-server.ts` and out-of-package consumers
(`converters/cli`, `ports/rs-to-ts/analysis-diff`, `schema/converter-api.graphql` contract).
`src/x-graphql-validator.ts` and `src/mapping/` were skimmed only (see "Unverified").

**Verdict.** The default SDL happy path is solid (275 tests green, package-pinned typecheck clean). However,
several *documented* surfaces of the public API are broken or inert: `Converter.convert()` fails 100% of the
time for `outputFormat: "AST_JSON"` (P1); `validate`/`failOnWarning`/`diagnostics` are no-ops; `excludePatterns`
never filters field names; and multiple post-processing passes (directive filter, hints operations, enum
rendering, literal serialization) can silently alter, duplicate, or invalidate the emitted SDL. The shipped
`validate-x-graphql` CLI cannot load under the package's own ESM runtime, and importing the library hijacks the
consumer's global OpenTelemetry provider. The single highest risk is the cluster of silent SDL-corruption paths:
the library's core promise is valid, parity-matched SDL, and none of these paths are covered by the test suite.

## Mechanical checks (TS09)

| Check | Command | Result |
|---|---|---|
| Lint (as shipped) | `cd converters/node && npm run lint` → `eslint src/**/*.ts` | "0 errors, 50 warnings" — **but only 10 of 41 `src` files were linted** (see P3-11). `sh` expands `src/**/*.ts` as `src/*/*.ts`; all 31 top-level `src/*.ts` files (including `converter.ts`) are never linted. |
| Lint (full scope) | `npx eslint "src/**/*.ts"` | 144 problems: **24 errors** (19× parser error on `*.test.ts` — typed-linting setup failure, see P3-11; 4× `no-undef: performance` in `api-server.ts` — missing global in eslint config; 1× genuine `prefer-const` at `converter.ts:1187`), 120 warnings (`no-explicit-any` ×94, `no-console` ×26). |
| Typecheck (as instructed) | `npx tsc --noEmit -p converters/node/tsconfig.json` from repo root | **113 errors** — setup/toolchain artifact, not source violations: root `npx tsc` is TypeScript **6.0.3**, which does not auto-include `@types/node` for this tsconfig (TS2584/TS2591/TS2304 for `console`/`process`/`http`/`performance`/`require`, plus derivative TS7006 implicit-`any` callback params in `api-server.ts`, `validate-x-graphql.ts`, `otel.ts`, `performance.bench.ts`). |
| Typecheck (package toolchain) | `converters/node/node_modules/.bin/tsc --noEmit -p converters/node/tsconfig.json` (TS **5.9.3**, the pinned devDependency used by `npm run build`) | **0 errors** — from both repo root and package dir. All 113 errors above are attributable to the compiler-version difference, not to rule violations in source. |
| Tests | `cd converters/node && npm test` | **19 suites / 275 tests passed**, 0 skipped, ~23 s. `testMatch` covers every `*.test.ts` under `src/` (all 19 ran; no zero-file green run). No runtime/deprecation warnings in output. |

Scope limits, recorded per instruction (not worked around):

- `tsconfig.json` excludes `**/*.test.ts`, so neither typecheck run covers test files. (ts-jest compiles tests
  with the same `compilerOptions` during `npm test`, and tests pass, so tests are at least ts-jest-clean.)
- `dist/` was inspected as-is and contains artifacts with no `src/` counterpart (`dist/cli.js`, `dist/cli/`),
  i.e. the checked-in build output is stale relative to `src/`.
- The TypeScript 6.0.3 failure mode is recorded empirically; I did not consult the 6.0 changelog to confirm the
  mechanism (auto-`@types` inclusion). Hardening options: a package-level `typecheck` script that uses the
  pinned local `tsc`, and/or an explicit `"types": ["node"]` in `tsconfig.json`.

---

## Findings

### P1-1 — `Converter.convert()` always fails for `outputFormat: "AST_JSON"` (double conversion)

**Location:** `converters/node/src/converter.ts:1493-1503` (with `:245`, `:260-263`).

`jsonSchemaToGraphQLInternal` already returns `JSON.stringify(ast)` when `outputFormat === "AST_JSON"`
(L260-263; and the literal string `"null"` for empty output, L245). `Converter.convert()` then treats that
return value as SDL and parses it *again*:

```ts
const sdl = jsonSchemaToGraphQL(jsonSchema, resolvedOptions);   // L1493 — already AST JSON text
let output = sdl;
if (resolvedOptions.outputFormat === "AST_JSON") {              // L1496
  if (!sdl) { output = "null"; }
  else { const ast = parse(sdl, { noLocation: true }); output = JSON.stringify(ast); }  // parse(JSON text) → throws
}
```

**Trigger:** `new Converter().convert({ jsonSchema, options: { outputFormat: "AST_JSON" } })` with any
schema. **Probe (executed):** `success: false`, `output: null`, diagnostic `"Syntax Error: Expected Name,
found String \"kind\""`; the direct function on the same input returns correct AST JSON
(`{"kind":"Document",...}`). The empty-schema path also fails: internal returns `"null"` (truthy), so
`parse("null")` throws.

**Consequence / callers:** `Converter` and `IJsonSchemaConverter` are exported from the package barrel
(`main: dist/converter.js`); `ConvertInput`/`ConversionResult`/`OutputFormat` are the published contract
(`src/generated/types.ts:202-214`, generated from `schema/converter-api.graphql:213-223`, which explicitly
promises AST_JSON as "a stable … interface boundary for downstream tooling"). Every AST_JSON call through the
class API returns `success: false` — a documented, stability-guaranteed workflow is 100% broken. No test
covers it (`federation-examples.test.ts` uses `convert()` only with SDL options; `parity.test.ts:268` handles
AST_JSON without `Converter`). The CLI is unaffected (it calls `jsonSchemaToGraphQL` directly).

**Minimal remedy** (rules TS02/TS03 — return relationship between two public entrypoints): the internal
function has already produced the final artifact; stop re-converting:

```ts
const sdl = jsonSchemaToGraphQL(jsonSchema, resolvedOptions);
const output = sdl; // internal returns AST JSON (or "null") when outputFormat === "AST_JSON"
```

If a single conversion site is preferred instead, have `convert()` request SDL and parse it once — but not both.

---

### P2-2 — `validate` (default `true`) and `failOnWarning` are inert; `diagnostics` is always empty

**Location:** `converters/node/src/converter.ts:1505-1514` and `:1339`, `:1352`.

```ts
const diagnostics: Diagnostic[] = [];                    // L1505 — created empty, never populated
const warningCount = diagnostics.filter(...).length;     // always 0
const errorCount   = diagnostics.filter(...).length;     // always 0
const success = errorCount === 0 && (!resolvedOptions.failOnWarning || warningCount === 0); // always true
```

`normalized.validate` is assigned (L1339) and never read anywhere in the pipeline (repo-wide grep: no other
consumer). The validation machinery exists — `lintAll`/`lintSchema` (`validation-lint.ts`, exported from the
barrel at `converter.ts:55`) and `validateSchema` (`x-graphql-validator.ts`) — but nothing wires it into
conversion; `x-graphql-validator.ts` is imported only by the broken CLI (P2-9), and its only other references
are commented-out benchmark lines.

**Trigger:** `convert({ jsonSchema: <schema containing deprecated "x-sensitive">, options: { validate: true,
failOnWarning: true } })`. **Probe (executed):** returns `success: true`, `diagnostics: []`, `warningCount: 0`
— while the package's own exported `lintAll` flags that exact attribute with severity `"error"`
(`validation-lint.ts:22`).

**Consequence / callers:** the published contract documents `validate` — "Whether to validate the input JSON
Schema before conversion. Default: true" (`generated/types.ts:113-117`) — and `failOnWarning` — "treats
warnings as errors and fails the conversion" (`:66-70`), plus `ConversionResult.diagnostics` — "warnings or
errors encountered during conversion" (`:15-16`) with `DiagnosticKind` values like `JSON_SCHEMA_VALIDATION`
that can never occur. Any consumer relying on the default validation guarantee (including the GraphQL API
surface in `schema/converter-api.graphql`) silently gets none. No test asserts either behavior.

**Minimal remedy:** populate diagnostics where the result object is built, using the project's existing lint
convention, e.g.:

```ts
const diagnostics: Diagnostic[] = [];
if (resolvedOptions.validate) {
  for (const issue of lintAll(jsonSchema)) {
    diagnostics.push({
      severity: issue.severity === "error" ? "ERROR" : "WARNING",
      kind: "JSON_SCHEMA_VALIDATION",
      message: issue.message,
      path: issue.path.split(".").filter((s) => s && s !== "$"),
      code: issue.validator,
    });
  }
}
```

with `success` then meaningfully honoring `failOnWarning` (and, per the "validate before conversion" wording,
failing early on ERROR-severity diagnostics). If validation is deliberately out of scope for v2, remove the
options from the published schema instead — but the current state contradicts the shipped contract either way.

---

### P2-3 — `excludePatterns` never excludes field names (documented contract + Rust parity)

**Location:** `converters/node/src/converter.ts:851-903` (`convertField` — no exclusion check); exclusion is
only reachable via `shouldExcludeType` (call sites L216, 227, 636, 1279, 1297 — all type-level).

The published option docs say: "List of regex patterns to exclude fields or types. **Patterns are applied to
Type names and Field names individually**" (`generated/types.ts:59-63`). The Rust engine implements this:
`converters/rust/src/json_to_graphql.rs:1029` — `if is_excluded(&gql_field_name, &context.options.exclude_patterns) { return Ok(String::new()); }`. The TS `convertField` computes `safeFieldName` (L868) and emits it with no
equivalent check.

**Trigger:** `jsonSchemaToGraphQL({ type:"object", title:"User", properties:{ internalNotes:{type:"string"}, name:{type:"string"} } }, { excludePatterns: ["internal.*"] })`.
**Probe (executed):** `internalNotes: String` is still present in the output.

**Consequence / callers:** every consumer of `jsonSchemaToGraphQL`/`Converter.convert` passing
`excludePatterns` gets fields the contract (and the sibling engine) promises are stripped — silent
over-emission of exactly the fields the caller asked to remove (commonly internal/sensitive ones), and a
cross-engine parity break in a repo whose stated purpose is TS↔Rust parity (`converter.ts:1-7`).

**Minimal remedy:** mirror the Rust placement in `convertField`:

```ts
const safeFieldName = sanitizeFieldName(fieldName, options.namingConvention);
if (options.excludeRegexes.some((re) => re.test(safeFieldName))) {
  return null;
}
```

---

### P2-4 — `escapeRegExp` heuristic silently disables multi-wildcard exclude patterns and throws raw `SyntaxError` on others (Rust parity break)

**Location:** `converters/node/src/converter.ts:1316-1332` (`escapeRegExp`), used at `:1363-1366`
(`excludeRegexes = excludePatterns.map((p) => new RegExp(escapeRegExp(p)))`).

The "ReDoS guard" declares any pattern containing **two or more** `*`/`+` characters unsafe and escapes *all*
metacharacters — turning a regex into a literal string match. Separately, patterns built only from the
"safe" charset still reach `new RegExp(...)` raw, so malformed ones (e.g. unbalanced `[`) throw an uncaught
`SyntaxError` out of the public API instead of a `ConversionError`/diagnostic. Rust does neither:
`json_to_graphql.rs:1946-1953` compiles patterns raw (`Regex::new(pattern)`) and silently ignores
uncompilable ones. Note also that common safe idioms (`\d`, `\s`, `{2,}`) contain `\`/`{`, fail the charset
test, and are likewise literalized.

**Trigger + probe (executed):** identical schema with `title: "User_filter_thing"` (sanitized type name
`UserFilterThing`):
- `excludePatterns: [".*Filter.*Thing"]` → type **still emitted** (`"type UserFilterThing {...}"`);
- control `excludePatterns: [".*FilterThing"]` (single wildcard) → type correctly excluded;
- `excludePatterns: ["[a-"]` → `SyntaxError: Invalid regular expression: /[a-/: Unterminated character class` propagates raw to the caller.

**Consequence / callers:** exclusions silently stop working for any pattern with two wildcards (a normal regex
shape), and an invalid pattern crashes `jsonSchemaToGraphQL` with a non-contract error. Behavior differs from
the Rust engine for the same inputs, breaking parity fixtures that use such patterns.

**Minimal remedy:** treat patterns as regexes (as documented and as Rust does) and convert compilation failure
into the project's error convention:

```ts
const excludeRegexes: RegExp[] = [];
for (const pattern of excludePatterns) {
  try {
    excludeRegexes.push(new RegExp(pattern));
  } catch {
    // Mirror Rust: ignore uncompilable patterns (or record a WARNING diagnostic).
  }
}
```

`escapeRegExp` then has no remaining caller and can be removed. If ReDoS hardening is genuinely wanted, apply
a timeout/complexity policy rather than silently changing pattern semantics.

---

### P2-5 — Directive-filter line scanner rewrites `@` tokens inside string literals: descriptions silently altered, SDL made unparseable

**Location:** `converters/node/src/directive-filter.ts:116-174` (`filterLineDirectives`), applied to the whole
final SDL at `converter.ts:252-257` when `directiveFilterMode !== "ALL"` (public option,
`generated/types.ts:52-56, 152-162`).

The scanner treats every `@` as a directive start with no awareness of string literals or block strings, and
discards the buffered token when its "name" doesn't pass the mode filter (unknown names classify as `custom`
and are dropped under `VIEWER_FRIENDLY`).

**Trigger + probes (executed):**
- Description: schema description `"Contact support@acme.com for help"` with `directiveFilterMode:
  "VIEWER_FRIENDLY"` → output `"Contact support for help"` — the email token silently deleted from a
  user-visible docstring.
- Argument default: field with `"x-graphql-arguments": { notify: { type: "String", default: "a@b.com" } }`
  under `VIEWER_FRIENDLY` → output line `email(notify: String = "a` — the rest of the line swallowed as a
  "directive". The returned SDL does not parse; in `AST_JSON` mode the internal `parse()` (L261) throws a raw
  `GraphQLSyntaxError` at the consumer.

**Consequence / callers:** any consumer using a documented filter mode gets silently corrupted descriptions or
unparseable SDL whenever an `@` appears in a description, default, or any string value (emails, handles,
`@mention`-style docs — common in real schemas). Affects `jsonSchemaToGraphQL`, `Converter.convert`, and the
CLI (`--directive-filter-mode` flows through the same option).

**Minimal remedy** (TS02 — follow unknown text to its first trusted use; the filter must not treat string
content as syntax): make the scan quote-aware for single-line strings, e.g.:

```ts
let inString = false;
for (const ch of line) {
  if (!inDirective) {
    if (ch === '"') inString = !inString;
    if (inString || ch !== "@") { result += ch; continue; }
    inDirective = true; directiveBuffer = "@"; continue;
  }
  // ...existing directive-buffer logic unchanged...
}
```

Because `filterSdlDirectives` processes line-by-line, multi-line `"""` block descriptions need cross-line
string state (or, more robustly, filter directives on the parsed AST — `parse` → remove excluded directive
nodes → `print` — which also removes the paren-in-string depth hazard at `directive-filter.ts:136-140`).
The Rust engine has the same scanner (`directive_filter.rs:95+`), so any fix should be mirrored there for parity.

---

### P2-6 — `includeOperationalTypes: true` + `x-graphql-operations` duplicates the entire SDL

**Location:** `converters/node/src/hints/operations.ts:221` (and the dead "skip" branch at `:222-224`),
consumed by `injectOperations` (`:229-236`) from `applyHints` (`hints/index.ts:96`) on every conversion
(`converter.ts:240`).

```ts
// Append to existing SDL, but skip if existing SDL already has these types
if (existingSdl.includes("type Query")) return existingSdl;   // ← returns the WHOLE existing SDL
```

`generateOperationsSdl`'s return value is what `injectOperations` *appends* to `sdl`. Returning `existingSdl`
therefore emits the complete schema twice.

**Trigger:** the core emits its own `type Query` only when `includeOperationalTypes: true` (by default
`Query`/`Mutation`/`Subscription` are in `excludeTypes`, `converter.ts:1358-1362`, so `emitOperations` skips
and hints inject normally — which is why tests miss this). Combine that option with `x-graphql-operations`.
**Probe (executed):** output contains `type User {...}` and `type Query {...}` each **twice**. `parse()` still
succeeds (duplicate type names are a schema-*validation* error, not syntax), so the corruption sails through
the AST_JSON path too; `buildSchema`/federation composition rejects it with "There can be only one type
named …". The `type Mutation` sibling branch (`:222-224`) has an empty body with a "skip" comment and then
falls through to append a duplicate `Mutation` block anyway.

**Consequence / callers:** the documented `includeOperationalTypes` option (extended options,
`interfaces.ts:25`) combined with the documented `x-graphql-operations` extension produces an unusable
schema — silently.

**Minimal remedy:** return only *new* blocks, guarding each:

```ts
if (querySdl && !existingSdl.includes("type Query")) blocks.push(querySdl);
if (mutationSdl && !existingSdl.includes("type Mutation")) blocks.push(mutationSdl);
if (subscriptionSdl && !existingSdl.includes("type Subscription")) blocks.push(subscriptionSdl);
```

(then delete the `return existingSdl` line and the empty Mutation branch). A substring check on `"type Query"`
also matches that text inside descriptions; a line-anchored check (`/^type Query\b/m`) is sturdier.

---

### P2-7 — Numeric enum values produce invalid SDL; `{ value: 0 }` is silently dropped

**Location:** `converters/node/src/converter.ts:722-738` (`renderEnum`): L724-725
`const valName = raw.name ?? raw.value; if (!valName) continue;` (falsy check drops `0`), L731-736
`String(raw).replace(/[^_a-zA-Z0-9]/g, "_").toUpperCase()` (digits pass through unchanged).

**Trigger + probes (executed):**
- Plain JSON Schema numeric enum: `$defs: { Level: { enum: [0, 1, 2] } }` → output `enum Level {\n 0\n 1\n 2\n}`;
  `graphql.parse` fails: `Syntax Error: Expected Name, found Int "0"`. The SDL output path never parses, so the
  invalid document is returned as success.
- Configured enum: `"x-graphql-enum": { values: [{ value: 0 }, { value: 1 }] }` → output `enum Z {\n 1\n}` —
  the `0` member is silently discarded by the falsy check while `1` is emitted (as an invalid name).

Numeric members are supported input: `GraphQLEnumConfig.values: Array<string | number | GraphQLEnumValue>`
(`interfaces.ts:103-107`), and plain `enum: (string | number)[]` (`interfaces.ts:61`).

**Consequence / callers:** valid JSON Schema input yields SDL that no GraphQL tool accepts, with no diagnostic;
or silently loses an enum member (schema semantics changed). Affects every entrypoint. Parity note: Rust
*skips* numeric members entirely (`json_to_graphql.rs:75-84` handles only `as_str()`/`name`), so TS and Rust
already diverge here (invalid names vs. dropped values); a fix should be coordinated across engines.

**Minimal remedy:** make the drop-check nullish (not falsy) and guarantee identifier-legal names:

```ts
const valName = raw.name ?? raw.value;
if (valName === undefined || valName === null || valName === "") continue;
```

```ts
const name = String(raw).replace(/[^_a-zA-Z0-9]/g, "_").toUpperCase();
lines.push(`  ${/^[A-Z_]/.test(name) ? name : `V_${name}`}`);   // e.g. 0 → V_0
```

Apply the same normalization to the object-form branch, and mirror in Rust (`sanitize_enum_value`) so parity
fixtures stay green.

---

### P2-8 — `graphqlToJsonSchema` silently drops `input` (and `extend`) definitions; blanket `catch` masks real failures with a lossy fallback

**Location:** `converters/node/src/converter.ts:305-357` (registry handles only
Object/Interface/Enum/Union/Scalar definitions) and `:405-407`:

```ts
} catch {
  // Fallback to simple parsing if AST parsing fails
  return fallbackGraphqlToJsonSchema(graphqlSdl, normalized);
}
```

**Trigger + probe (executed):**
`graphqlToJsonSchema("type Query { users(filter: UserFilter): [User] } input UserFilter { name: String } type User { id: ID! }")`
→ returned JSON Schema has `$defs` **empty**: `input UserFilter` vanishes without a trace; any field
referencing it degrades to `{ type: "object", "x-graphql-type": "UserFilter" }` (L554-555). No error, no
diagnostic (the function returns a bare string).

**Consequence / callers:** data loss on one of the two flagship directions of a "Bidirectional JSON Schema ↔
GraphQL SDL converter" (package description). Input types are ubiquitous in real SDL (every filter/argument
shape). Additionally, the `catch` wraps the *entire* conversion — not just `parse()` — so any internal defect
in `convertGraphQLTypeToSchema` is silently downgraded to `fallbackGraphqlToJsonSchema`, which flattens all
types into one object, ignores enums/unions/scalars/`extend`, misreads multi-line block-string descriptions,
and maps `Int` to `{type:"number"}` (vs `{type:"integer"}` in the AST path, L531-533) — divergent output for
the same input depending on whether an unrelated exception occurred.

**Minimal remedy:** register `InputObjectTypeDefinition` alongside object types (same field walk; mark with
`x-graphql-input: true` or reuse the existing kind field), and narrow the fallback to parse failures so
internal errors surface:

```ts
let doc;
try { doc = parse(graphqlSdl); }
catch { return fallbackGraphqlToJsonSchema(graphqlSdl, normalized); }
// ...rest of conversion outside the catch...
```

---

### P2-9 — Shipped `validate-x-graphql` CLI cannot load under the package's own ESM runtime

**Location:** `converters/node/src/validate-x-graphql.ts:21` and `src/x-graphql-validator.ts:8`
(extensionless relative imports), `src/validate-x-graphql.ts:320` (`require.main === module`),
`package.json` (no `bin` entry; `"type": "module"`, `"files": ["dist"]`).

The package is ESM (`"type": "module"`) and `tsc` (`moduleResolution: "bundler"`) emits import specifiers
verbatim. `dist/validate-x-graphql.js` therefore contains `import { validateSchema } from "./x-graphql-validator"`
and `dist/x-graphql-validator.js` contains `import ... from "./x-graphql-extensions"` — both unresolvable for
Node's ESM loader. Behind that, `if (require.main === module)` (L320) references CJS-only bindings that do not
exist in an ESM module, so even with fixed specifiers the file throws `ReferenceError` on load.

**Probe (executed):** `node dist/validate-x-graphql.js --help` →
`ERR_MODULE_NOT_FOUND: Cannot find module '.../dist/x-graphql-validator' imported from .../dist/validate-x-graphql.js`.

**Consequence / callers:** the validation CLI is documented as a supported workflow
(`docs/reference/x-graphql-quick-reference.md:528-541`: `npx validate-x-graphql schema.json [--fail-on-warning|--json]`,
referenced from `docs/plans/X-GRAPHQL-NAMESPACE-IMPLEMENTATION-PLAN.md:1073`), and it is compiled into the
published `dist/` — but it cannot execute in any supported runtime, and `npx validate-x-graphql` cannot
resolve it anyway because `package.json` declares no `bin`. The only reason tests are green is that
`*.test.ts` files import through ts-jest's resolver, and nothing tests the CLI entry itself. (Test files also
use extensionless imports — `converter.test.ts:1` etc. — which is fine for ts-jest but confirms why the gap
went unnoticed; `jest.config.cjs:14-16` papers over `.js` specifiers only.)

**Minimal remedy:** add explicit extensions (`"./x-graphql-validator.js"`, `"./x-graphql-extensions.js"`),
replace the CJS entry guard with an ESM-safe one, and expose the CLI if it is meant to be shipped:

```ts
// validate-x-graphql.ts (ESM): run main when executed directly
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

plus a `"bin": { "validate-x-graphql": "dist/validate-x-graphql.js" }` entry (or delete the CLI from the
package if the docs are stale — either way, shipping a non-loading entrypoint contradicts the docs).

---

### P2-10 — Importing the library registers a global OpenTelemetry provider, hijacking consumer telemetry

**Location:** `converters/node/src/otel.ts:19-49` — module-load side effect: `initTracerProvider()`
fire-and-forget builds a `NodeTracerProvider` with an `InMemorySpanExporter` and calls `provider.register()`.
`package.json:86-89` lists both SDK packages as **optionalDependencies**, so a plain
`npm install @json-schema-x-graphql/core` installs them and activates this path in every Node consumer.

**Probe (executed):** after importing the converter and letting init settle, a host application calling its
own `new NodeTracerProvider().register()` fails with
`@opentelemetry/api: Attempted duplicate registration of API: trace` (also `context`, `propagation`), and
`trace.getTracerProvider()` remains the library-registered instance (identity check `true`).

**Consequence / callers:** a library silently claims process-global tracing ownership at import time.
Consumers that configure tracing *after* importing this package lose their telemetry entirely (spans flow to
the library's in-memory exporter and are discarded); consumers that register *first* win, and the library's
registration fails — so telemetry ownership is decided by an import/init race, with no opt-out and no
diagnostic. `getOtelSpans`/`clearOtelSpans` (L58-70) show the in-memory exporter exists for this package's
own tests, which is the only legitimate consumer of that setup.

**Minimal remedy** (TS04/TS05 — libraries should not own global singletons): drop `provider.register()` and
the import-time side effect; rely on the host's provider (the API's default is a no-op tracer, which is the
correct library behavior), and let tests install their own provider:

```ts
export const otelTracer: Tracer = trace.getTracer("json-schema-x-graphql");
// remove initTracerProvider()/register(); tests that need spans can register a
// NodeTracerProvider + InMemorySpanExporter themselves and use clearOtelSpans().
```

If self-instrumentation must remain, gate registration behind an explicit opt-in (e.g.
`process.env.JSON_SCHEMA_X_GRAPHQL_OTEL === "1"`).

---

### P3-11 — `npm run lint` covers 10 of 41 source files; full-scope lint hides a real error and 70+ warnings

**Location:** `converters/node/package.json:46` (`"lint": "eslint src/**/*.ts"`), interacting with
`eslint.config.cjs:31-36` (`projectService: true, allowDefaultProject: true` — the latter is not a valid
standalone flag for typed linting of files outside the tsconfig).

npm runs scripts with `sh`, where `**` is a plain `*`: the glob expands to the 10 one-level-deep files
(`src/*/*.ts`) before eslint ever sees it (verified: `sh -c 'ls src/**/*.ts'` → 10 files; none of the 31
top-level `src/*.ts` files). The gate reported by `npm run lint` — and by `precommit` (`package.json:59`) — is
"0 errors, 50 warnings", while the same eslint over the full tree reports **24 errors / 120 warnings**:

- genuine rule violation never seen by CI: `prefer-const` at `converter.ts:1187`;
- 19 parser errors: every `*.test.ts` is "not found by the project service" (tsconfig excludes tests and the
  `allowDefaultProject` flag as written does not cover them) — a typed-linting setup failure, distinct from
  rule violations;
- 4× `no-undef: 'performance'` in `api-server.ts` (the eslint `globals` block, `eslint.config.cjs:13-30`,
  omits `performance`, standard in Node ≥ 16);
- 94 `no-explicit-any` + 26 `no-console` warnings in the never-linted top-level files.

**Consequence:** the package's only static-analysis gate silently excludes its entire core (including
`converter.ts`), so regressions there are never flagged pre-commit or in CI.

**Minimal remedy:** let eslint own the glob and fix the typed-lint project scope:

```json
"lint": "eslint src"
```

plus a `tsconfig.eslint.json` (`"include": ["src"]`, tests not excluded) referenced via
`parserOptions.projectService: { defaultProject: "./tsconfig.eslint.json" }`, and add
`performance: "readonly"` to the eslint globals. Then address the surfaced `prefer-const`/globals diagnostics.

---

### P3-12 — GraphQL literal values serialized with `JSON.stringify`/raw templates: object defaults and quoted strings emit invalid SDL

**Location (one root cause — no GraphQL-literal serializer — four call sites):**
`converter.ts:1866-1868` (`formatArgs`), `converter.ts:1885-1887` (`formatOperationArgs`),
`normalization/directives.ts:203` (`formatDirectiveArgs`), `hints/operations.ts:121-129`
(`formatDefaultValue` — raw `"${value}"`, no escaping at all).

**Triggers + probes (executed):**
- Object default (`default: unknown` is the declared type, `interfaces.ts:86`):
  `"x-graphql-arguments": { filter: { type: "String", default: { kind: "all" } } }` → emits
  `search(filter: String = {"kind":"all"})`; `parse` fails: `Expected Name, found String "kind"` — GraphQL
  input-object literals require unquoted `Name` keys, JSON quoting is not valid.
- Same failure through directives: `"x-graphql-directives": [{ name: "cache", arguments: { config: { ttl: 60 } } }]`
  → `@cache(config: {"ttl":60})` → `parse` fails.
- Unescaped string default via the hints path: `"x-graphql-operations": { queries: { echo: { args: { msg:
  { type: "String", default: 'say "hi"' } } } } }` → `echo(msg: String = "say "hi"")` → `parse` fails. (The
  core `formatArgs` path escapes via `JSON.stringify` — the hints path diverges from it.)

**Consequence:** supported inputs (the option types explicitly allow arbitrary defaults) silently yield
unparseable SDL — same failure class as P2-5/P2-7 but with rarer inputs, hence P3.

**Minimal remedy:** one shared helper used at all four sites:

```ts
export function toGraphQLLiteral(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value); // valid GraphQL string escaping
  if (Array.isArray(value)) return `[${value.map(toGraphQLLiteral).join(", ")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).map(([k, v]) => `${k}: ${toGraphQLLiteral(v)}`).join(", ")}}`;
  }
  return String(value ?? "null"); // number | boolean | null
}
```

---

### P3-13 — api-server: `graphql-to-json` response is double-JSON-encoded

**Location:** `converters/node/src/api-server.ts:155-156`. `graphqlToJsonSchema` already returns a JSON
*string* (`converter.ts:404`: `JSON.stringify(schema, null, 2)`); the handler stringifies it again:
`output = JSON.stringify(result, null, 2)`.

**Probe (executed, live server):** `POST /api/convert` with `direction: "graphql-to-json"` returns
`output: "\"{\\n  \\\"type\\\": \\\"object\\\", ..."` — a quoted, escaped JSON string literal — while the
`json-to-graphql` direction returns plain text. Clients must `JSON.parse` twice in one direction and once in
the other; the two directions of the same endpoint have asymmetric contracts.

**Minimal remedy:** `output = result;`

### P3-14 — api-server: per-chunk `toString()` corrupts multi-byte UTF-8 in request bodies

**Location:** `converters/node/src/api-server.ts:44-52` (`parseRequestBody`): `body += chunk.toString()` on raw
`Buffer` chunks without `req.setEncoding("utf8")`.

**Trigger:** any request body large enough to arrive in multiple TCP chunks (the handler accepts up to 1 MB,
chunks typically arrive at 64 KB) containing a multi-byte character straddling a chunk boundary — e.g. a large
schema with CJK/emoji descriptions. **Probe (mechanism, executed):**
`Buffer.from("héllo").subarray(0,2).toString() + subarray(2).toString()` → `"h\ufffd\ufffdllo"` (whole-buffer
decode → `"héllo"`). Consequence: spurious `400 Invalid JSON` (or, worse, mojibake inside converted
descriptions) for valid non-ASCII payloads.

**Minimal remedy:**

```ts
req.setEncoding("utf8"); // then `body += chunk` decodes across boundaries correctly
```

---

### P3-15 — `validation-lint` flags user data property names as annotation violations; dead no-op block

**Location:** `converters/node/src/validation-lint.ts:44-92` (`lintValue` applies the deprecated-attribute and
`x-*` checks to *every* object it recurses into, including `properties`/`$defs` maps whose keys are user data
names, not schema annotations); dead block at `:127-137` (computes `hasFederationKeys`, then does nothing —
vestigial code that only misleads the next reader).

**Trigger + probe (executed):** `lintAll({ type: "object", properties: { "x-cost": { type: "number" } } })` →
`[["$.properties.x-cost","error"], ["$.properties.x-cost","warning"]]` — an ERROR-severity "Deprecated
attribute 'x-cost'" for a schema that legitimately models a data field named `x-cost` (HTTP-header and
metadata schemas routinely contain `x-*` property names).

**Consequence / callers:** `lintAll`/`lintSchema` are exported public API (`converter.ts:55`) and back the
`--fail-on-warning` CLI story; false ERRORs break CI for valid schemas and train users to ignore the linter.

**Minimal remedy:** distinguish annotation positions from data-name maps — recurse into the *values* of
name-keyed maps without running key checks on the map itself:

```ts
const DATA_NAME_KEYS = new Set(["properties", "patternProperties", "$defs", "definitions"]);
// in lintValue: if (DATA_NAME_KEYS.has(k) && v && typeof v === "object") {
//   for (const [name, child] of Object.entries(v)) lintValue(child, `${newPath}.${name}`, issues);
// } else lintValue(v, newPath, issues);
```

and delete the no-op federation-keys block (L127-137).

---

### P3-16 — `localeCompare` sorting breaks the determinism/parity promise for `preserveFieldOrder: false`

**Location:** `converters/node/src/converter.ts:190-192` (definition order) and `:795-797` (property order):
`sort(([a], [b]) => a.localeCompare(b))`.

`localeCompare` is ICU-locale-dependent — the module header promises "deterministic GraphQL SDL output that
mirrors the behavior of the Rust implementation" (`converter.ts:1-7`), but the same code can order types
differently under different default locales/ICU builds. It also diverges from Rust unconditionally: Rust sorts
byte-wise (`prop_names.sort()`, `json_to_graphql.rs:920`) and, with `serde_json` `preserve_order`
(`converters/rust/Cargo.toml:27`), never reorders `$defs` at all.

**Probe (executed):** `["Beta","alpha"].sort((a,b)=>a.localeCompare(b))` → `alpha,Beta`; code-unit sort →
`Beta,alpha`. End-to-end with `preserveFieldOrder: false` and `$defs: {Beta, alpha}` (insertion order), TS
emits `type Alpha` before `type Beta` — the reverse of a byte-wise sort, and unrelated to Rust's
insertion-order output.

**Consequence:** non-deterministic SDL across environments for an option whose documented purpose is
deterministic alphabetical ordering, plus engine-to-engine output divergence. Default (`preserveFieldOrder:
true`) is unaffected — hence P3.

**Minimal remedy:** code-unit comparison (matches Rust's byte order for ASCII names):

```ts
.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
```

and decide the `$defs`-ordering policy against Rust explicitly (Rust does not sort definitions even when
`preserve_field_order` is false).

---

### P3-17 — `classifyDirective` omits `"link"` from the federation tier (documented Rust mirror)

**Location:** `converters/node/src/directive-filter.ts:36-55` — the federation set lacks `link`; Rust's
canonical list includes it (`converters/rust/src/directive_filter.rs:38`: `"listSize" | "link" |
"composeDirective" => Federation`). The file header states it "Mirrors the Rust implementation".

**Trigger/consequence:** `classifyDirective("link")` → `"custom"` in TS vs `Federation` in Rust. Not
observable through `filterSdlDirectives` today (no current mode distinguishes federation from custom), but
`classifyDirective`/`DirectiveTier` are the module's exported classification API (deep-importable from
`dist/directive-filter.js`, and `DirectiveTier` is re-exported from the barrel at `converter.ts:48-53`), and
`directive-filter.test.ts` does not pin `"link"` either way. Any future tier-based mode inherits the
divergence.

**Minimal remedy:** add `"link"` to the `federationDirectives` set (and a test line
`expect(classifyDirective("@link")).toBe("federation")`).

---

## Checks actually run, and what they cover

1. **Lint** as shipped (`npm run lint`: 0 errors/50 warnings — but only 10 of 41 files in scope) and
   full-scope (`npx eslint "src/**/*.ts"`: 24 errors/120 warnings; parser/setup errors on test files separated
   from the single genuine `prefer-const` violation and 4 missing-global errors). → P3-11.
2. **Typecheck** both toolchains: root `npx tsc` 6.0.3 → 113 errors (all `@types/node`-inclusion artifacts,
   grouped by TS2584/TS2591/TS2304/TS7006, 5 files); package-pinned tsc 5.9.3 → clean from either cwd.
   Tests excluded by tsconfig (scope limit, recorded).
3. **Tests**: `npm test` → 19/19 suites, 275/275 tests pass; verified every `src/**/*.test.ts` file is matched
   by `testMatch` (no zero-file green run).
4. **Executed probes** (`/tmp/jxg-probe/`, run with the package's `tsx`; no repo files touched):
   probe1 — AST_JSON via `Converter.convert` vs direct function; empty diagnostics; field-pattern leak;
   multi-wildcard/invalid exclude patterns; VIEWER_FRIENDLY description corruption; locale sort; numeric enum
   parse failure; `{value:0}` drop. probe2/probe3 — exclude-pattern controls against sanitized names; `@` in
   argument defaults; object directive args. probe4 — operations duplication (full SDL emitted twice, printed);
   object/quoted-string defaults (parse failures); `input`-type loss; `lintAll` false positives;
   SDL_WITH_FEDERATION_METADATA sanity (works). probe5 — OTel global-provider hijack with live
   duplicate-registration errors. Live-server curl probe — double-encoded `graphql-to-json` response.
   `node dist/validate-x-graphql.js` — ERR_MODULE_NOT_FOUND reproduction.
5. **Cross-engine evidence**: cited Rust sources (`directive_filter.rs`, `json_to_graphql.rs`, `Cargo.toml`)
   for each parity claim; Rust test suite was **not** executed.

**Unverified assumptions / limits.**
- `Converter.convert` consumers outside this repo (npm consumers of `@json-schema-x-graphql/core`, the GraphQL
  service described by `schema/converter-api.graphql`) were not observable here; P1-1 is proven against the
  published API surface itself. The only in-repo frontend caller of `/api/convert` lives under
  `frontend/subgraph-composer/src/salvaged/` (likely archived), which is why P3-13/P3-14 are graded P3.
- `src/x-graphql-validator.ts` (630 lines) and `src/mapping/` received only a skim: the validator is reachable
  solely through the broken CLI (P2-9), and `mapping/` has no in-package caller besides its own test (it
  mirrors a Rust module and stays deep-importable from `dist`, so I did not classify it as dead code).
- `analysis/index.ts` was reviewed in full; no defect with a concrete trigger was established
  (`diffSchemas`' severity taxonomy — "removed" used as "breaking" for newly-required fields — is unusual but
  internally consistent and matches its messages).
- Rust-side behavior is evidenced by source reading only; whether current Rust parity fixtures would catch the
  divergences noted (P2-3/4/7/16/17) was not executed.
- The TypeScript 6.0.3 `@types` inclusion change is recorded empirically (identical config, two compiler
  versions), without consulting the 6.0 release notes.
- No performance claims were evaluated; benchmark scripts were intentionally not run.
