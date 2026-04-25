# JSON Schema × GraphQL Converters

This directory houses the two reference implementations of the JSON Schema ↔ GraphQL converter:

1. **Node/TypeScript converter** – optimized for JavaScript runtimes and browser bundlers.
2. **Rust converter** – optimized for native performance, WASM packaging, and parity with the Rust ecosystem.

Both implementations target feature parity (deep `$ref` resolution, `$defs`, Apollo Federation metadata, etc.) so they can be released independently or embedded as submodules in downstream repositories.

---

## Directory Layout

```
converters/
├─ README.md                 # You are here
├─ manifest.json             # Machine-readable metadata describing each converter
├─ node/                     # TypeScript implementation
│  ├─ package.json           # npm package definition (@json-schema-x-graphql/core)
│  ├─ tsconfig.json          # Strict TS configuration for src/*
│  ├─ jest.config.cjs        # Local Jest config (if needed when extracted)
│  ├─ src/                   # Converter source + tests
│  └─ dist/                  # Build artifacts (tsc output)
└─ rust/                     # Rust implementation
   ├─ Cargo.toml             # Crate definition (json-schema-graphql-converter)
   ├─ src/                   # Library source
   ├─ examples/              # Example binaries (e.g., json_to_sdl)
   ├─ pkg/                   # wasm-pack output (npm publishable)
   └─ tests/                 # Integration tests
```

The top-level `manifest.json` documents entry points, commands, and packaging metadata so automation can promote either converter into its own repository or manage them as git submodules.

---

## Node / TypeScript Converter

| Item         | Value                                                     |
| ------------ | --------------------------------------------------------- |
| Package name | `@json-schema-x-graphql/core`                             |
| Entry points | `src/index.ts` → `dist/converter.js` (+ `converter.d.ts`) |
| Build        | `npm run --prefix converters/node build`                  |
| Tests        | `npm run --prefix converters/node test`                   |
| Peer deps    | `graphql@^16.8.1`                                         |
| Publishing   | `npm publish` (after `npm run build`)                     |

Key features:

- Deep `$ref` traversal with circular reference protection.
- Deterministic SDL generation (field-order preservation toggles, description control, federation metadata).
- Reusable converter API exported via `src/index.ts`.
- Jest test suite colocated under `src/` (excluded from `tsc` output).

When extracting to a standalone repo:

1. Copy `converters/node` into a new root.
2. Bring over the shared `jest.config.js` or create a local equivalent.
3. Reference the `manifest.json` entry to recreate scripts and entry points.
4. Confirm the published files list still only includes `dist`.

---

## Rust Converter

| Item            | Value                                                             |
| --------------- | ----------------------------------------------------------------- |
| Crate name      | `json-schema-graphql-converter`                                   |
| Workspace entry | `converters/rust/Cargo.toml`                                      |
| Build           | `cargo build --release`                                           |
| Tests           | `cargo test` / `cargo test --features wasm`                       |
| Linting         | `cargo clippy --all-targets --all-features`                       |
| WASM build      | `wasm-pack build --target web --release` (outputs to `pkg/`)      |
| npm wrapper     | `converters/rust/pkg/package.json` for publishing the WASM bundle |

Highlights:

- Native Rust library with comprehensive `$ref` handling and validation.
- Example binaries in `examples/` for CLI-style conversions.
- `pkg/` contains the wasm-bindgen output consumed by the top-level JS package.
- `deny.toml`, fuzzing harnesses, and coverage scripts included for hardening.

To relocate this converter:

1. Copy `converters/rust` into a new repository root.
2. Preserve the existing crate name/version to keep compatibility with downstream users.
3. If publishing the WASM bundle separately, keep `pkg/` under source control or rebuild via `wasm-pack`.
4. Use the `manifest.json` entry for automation-friendly command discovery.

---

## Workflow Tips

- **Manifest-driven automation**: The root build/test scripts can read `converters/manifest.json` to iterate over converters, run their checks, or wire them into CI matrices.
- **Git submodules**: When splitting into submodules, reference `converters/node` and `converters/rust` via relative paths so consumers can pin exact versions.
- **Version parity**: Keep the Node package version and Rust crate version aligned whenever possible to avoid confusion in release notes.
- **Testing parity**: Run `npm test` (scoped to Node converter) and `cargo test` (Rust) before promoting changes. The top-level `scripts/test-both-converters.js` compares SDL output between implementations as an additional safeguard.

---

## Future Work

- Automate release pipelines per converter (npm + crates.io + wasm pkg).
- Add CI templates that read the manifest and spawn language-specific jobs.
- Document integration patterns (importing the Node package, embedding the Rust crate, or loading the WASM build) in each converter’s README for standalone releases.

By organizing the converters this way, the repository is ready for modular distribution while retaining a single source of truth for shared tooling and documentation.
