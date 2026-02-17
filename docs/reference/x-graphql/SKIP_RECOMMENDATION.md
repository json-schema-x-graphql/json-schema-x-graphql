# x-graphql: Recommended Use of `x-graphql-skip`

Version: 1.0  
Generated: 2026-01-01T00:00:00Z

## Purpose

This document describes the recommended semantics and best practices for using the `x-graphql-skip` extension attribute in json-schema-x-graphql conversions. It clarifies intended usage patterns, alternatives, converter responsibilities, and testing and migration guidance so you (the schema author) and I (the engineering team / converter implementer) have a shared, safe, and auditable approach for excluding schema elements from GraphQL outputs.

## Short recommendation (TL;DR)

- Use `x-graphql-skip: true` sparingly, only for fields or types that must never be exposed in GraphQL (e.g., secrets, internal implementation metadata).
- Avoid encoding runtime access control in `x-graphql-skip`. For conditional visibility (roles, environment flags), generate separate schema targets or use build-time configuration.
- Prefer `x-graphql-visibility` (e.g., `internal`) and converter-level `excludePatterns` / `excludeTypes` when you want softer, configurable omission.
- Converters must log skipped elements and ensure skipping does not create invalid/empty GraphQL types.

## Scope & semantics

- Attribute name: `x-graphql-skip`
- Applicable scopes: `type`, `field` (can appear on object type definitions or on property descriptors)
- Accepted value types:
  - `boolean` — recommended primary form; `true` means "do not generate this element in GraphQL".
  - `string` — allowed as a human-readable reason or a tag for tooling (e.g., `"internal"`, `"sensitive"`) but must be treated as truthy by converters; do not embed runtime expressions.
- Default: `false` (absence means do not skip)
- Precedence: `x-graphql-skip` is authoritative for generation-time omission. If present and true, it takes precedence over most generation heuristics (e.g., `required`, naming rules). However, converters should document any special interactions (see "Precedence rules" below).

## When to use `x-graphql-skip`

Appropriate use cases:

- Sensitive fields that must not be exposed (passwords, secrets, internal tokens).
- Implementation-only metadata that is never part of public API (internal URIs, debug-only flags).
- Deprecated/internal types that should be fully removed from public SDL (short-lived migration use when you absolutely must remove artifacts at source).
- Edge-case fields created for system bookkeeping that clients must never see.

When to avoid:

- Do not use for role-based, tenant-based, or feature-flag-driven visibility. Those are runtime concerns and should be managed by:
  - Server-side resolver logic,
  - Separate generated schemas per target audience, or
  - Build-time flags that generate different GraphQL artifacts.
- Do not use as a substitute for structured API versioning or migration strategies.

## Precedence and interactions

Converters must document how `x-graphql-skip` interacts with other annotations. Recommended precedence rules:

1. If `x-graphql-skip` is truthy on a field or type, the converter should omit that field/type from GraphQL generation unconditionally at conversion time.
2. If skipping a field results in:
   - An object type with zero remaining fields:
     - If converter option `emitEmptyTypes` is `false` (recommended default), then omit the type as well.
     - If `emitEmptyTypes` is `true`, emit the type as an empty GraphQL `type` (not recommended for public APIs).
     - Alternatively, converter can map the object to `JSON` scalar if the inline object threshold and policy permit (configurable via `inlineObjectThreshold`).
3. If `x-graphql-field-non-null` or `required` would make a skipped field non-null, `x-graphql-skip` still wins — the field is removed and types must be revalidated for nullability.
4. If both `x-graphql-skip` and `x-graphql-visibility` exist, treat `skip` as absolute removal; `visibility` is advisory and may be used by tooling to include/exclude items in generated client docs.

## Recommended patterns

- Prefer explicit boolean form on the schema element:
  - Field: `{"properties": {"secret": {"type":"string", "x-graphql-skip": true}}}`
  - Type: `{"x-graphql-skip": true, "properties": {...}}`
- Use `x-graphql-visibility: "internal"` when you want a softer, configurable omission that central tooling can flip via build-time flags. Use `x-graphql-skip` when omission must be enforced from schema source.
- For large projects, prefer global exclusion rules for patterns (e.g., `excludePatterns` set to `^internal_`) and use `x-graphql-skip` only for exceptions that must be enforced irrespective of converter config.
- For migrating away from a field, prefer:
  1. Mark field as deprecated via `x-graphql-deprecated` with a reason.
  2. When ready, switch to `x-graphql-visibility: "internal"` and update build config to omit `internal`.
  3. Finally, if removal must be permanent and irrevocable, annotate with `x-graphql-skip: true` and commit.

## Examples (recommended usage)

Example A — skip a sensitive field (recommended, simple):
`{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "password": { "type": "string", "x-graphql-skip": true }
  }
}`

Example B — mark type as internal for converter-level control (so toolchain can include or exclude):
`{
  "x-graphql-visibility": "internal",
  "properties": { "audit": { "type": "string" } }
}`

Example C — avoid runtime conditions; do not do this:
`// ❌ BAD: Do not write dynamic conditions in schema
{ "properties": { "secret": { "x-graphql-skip": "env == 'production'" } } }`

If you need conditional exposure, generate separate schema builds instead.

## Converter responsibilities (what I expect from converter implementers)

Converters must implement safe, observable behavior for `x-graphql-skip`:

- Honor `x-graphql-skip` as authoritative removal at conversion time.
- Emit a human-readable trace/log containing each skipped element with:
  - JSON Pointer to the skipped element,
  - Scope (type/field),
  - Reason (string value if provided),
  - Converter run id / timestamp.
- Ensure type graph validity after removal:
  - Re-evaluate nullability constraints,
  - If a generated type becomes empty, decide fallback per `emitEmptyTypes` or `inlineObjectThreshold` configuration,
  - Avoid generating invalid GraphQL (e.g. interfaces with zero fields).
- Provide a CLI or debug flag that emits a "skip report" to make audits simple.
- Optionally, expose a converter option to `treatVisibilityAsSkip` which maps `x-graphql-visibility: internal` to effective skip when enabled at build time.

## Auditability & governance

- Every `x-graphql-skip` decision should be reviewable:
  - Prefer code reviews that include a short justification in the change description when adding `x-graphql-skip`.
  - Converter logs and "skip reports" should be archived with the build artifacts for traceability.
- For regulated/data-sensitive projects, require that any `x-graphql-skip` additions are approved by security or privacy teams.

## Testing guidance

- Unit tests should cover:
  - Field-level skip: ensure field absent in generated SDL.
  - Type-level skip: ensure type absent and any references handled.
  - Interaction tests: required/non-null vs skip, resulting empty types behavior.
- Integration tests should simulate converter runs with variations of config flags:
  - `emitEmptyTypes: true|false`
  - `inlineObjectThreshold` values
  - `excludePatterns` and `excludeTypes` set
- Include a test that checks converter emits a skip-trace/log record for each skipped element.

## Migration & rollout suggestions

- Run a detection pass that produces a "skip candidates" report from existing schemas before converting to GraphQL. This helps discover accidental omissions.
- Prefer staged rollout:
  1. Introduce `x-graphql-deprecated` with migrations instructions.
  2. Move to `x-graphql-visibility: internal` and flip build config to omit internals in public builds.
  3. Harden to `x-graphql-skip: true` only when removal is permanent and reviewed.
- For public client SDKs, communicate breaking changes resulting from `x-graphql-skip` clearly in release notes and changelogs.

## FAQ

Q: Can I use `x-graphql-skip` to implement feature flags?
A: No. `x-graphql-skip` is a conversion-time, static signal. Feature flags are runtime. To have variant schemas per feature, generate and publish separate GraphQL artifacts per feature flag at build-time.

Q: What happens if skipping a field breaks a federation key?
A: Do not skip fields that are required for federation keys. Converters should detect key invalidation and emit errors/warnings. Use `x-graphql-federation-keys` and ensure fields referenced there are not skipped.

Q: Can `x-graphql-skip` be tested automatically?
A: Yes. Add unit and integration tests as described above; ensure CI enforces these tests.

## Governance checklist (quick)

- [ ] Use boolean `true` for absolute skips.
- [ ] Add a short comment or commit message explaining why you skipped.
- [ ] Prefer `visibility` and global rules for broad omission policies.
- [ ] Add a converter-level audit/logging option to capture skipped items.
- [ ] Add tests that verify skip behavior and subsequent type validity.

---

If you'd like, I can:

- Produce a small example script that scans schemas and emits a skip report (JSON list of pointers + reasons), or
- Add the three unit tests for `x-graphql-skip` to the Node converter test harness and a skeleton of the skip-report CLI.

Tell me which of those you'd like me to prepare next and I will draft it for you.
