# JSON Schema × GraphQL Converter (Node)

This package contains the TypeScript/Node implementation of the JSON Schema ↔ GraphQL SDL converter. It is designed to run independently (as an npm package) or as part of the broader `json-schema-x-graphql` workspace, and mirrors the feature set of the Rust engine (deep `$ref` resolution, `$defs`, Apollo Federation metadata, etc.).

---

## At a Glance

| Item            | Value                          |
| --------------- | ------------------------------ |
| Package name    | `@json-schema-x-graphql/core`  |
| Language        | TypeScript / Node.js           |
| Minimum Node    | `>= 16.0.0`                    |
| Entry point     | `dist/converter.js`            |
| Type defs       | `dist/converter.d.ts`          |
| Source root     | `src/`                         |
| Tests           | Jest (co-located under `src/`) |
| Peer dependency | `graphql@^16.8.1`              |

---

## Installing & Building

```bash
# Install dependencies
npm install

# Type-check & emit JS/types to dist/
npm run build

# Run the Jest test suite (ts-jest)
npm test
```

During the build, `tsc` consumes `tsconfig.json`, which is scoped to `src/` and excludes `*.test.ts` so the published bundle stays lean.

---

## Usage

### Programmatic API

```ts
import { jsonSchemaToGraphQL, graphqlToJsonSchema } from "@json-schema-x-graphql/core";

const sdl = jsonSchemaToGraphQL(schemaStringOrObject, {
  includeDescriptions: true,
  preserveFieldOrder: true,
  federationVersion: 2,
});

const schema = graphqlToJsonSchema(sdl, { maxDepth: 25 });
```

Both functions accept optional `ConverterOptions` (see `src/converter.ts`) for toggling validation, federation support, exclusion filters, and depth limits.

### CLI / Comparison Script

The repository root includes `scripts/test-both-converters.js`, which loads the compiled Node converter (`dist/converter.js`) to compare outputs against the Rust engine. After running `npm run build`, you can execute:

```bash
node ../../scripts/test-both-converters.js path/to/schema.json
```

---

## Project Structure

```
converters/node
├── package.json        # npm metadata (name, scripts, peer deps)
├── tsconfig.json       # Strict TS settings (ES2020 target, CJS output)
├── jest.config.cjs     # Local Jest config (used when extracted standalone)
├── src/
│   ├── converter.ts    # Core implementation (deep $ref resolution)
│   ├── index.ts        # Public exports
│   └── converter.test.ts
└── dist/               # Generated JS + .d.ts after `npm run build`
```

When this directory is extracted to its own repository or git submodule, copy it as-is and run `npm install && npm run build`. The package is already configured with `files: ["dist"]` so only build artifacts are published.

---

## Feature Highlights

- **Deep `$ref` resolution** with JSON Pointer semantics, circular reference detection, and `$defs` support.
- **Federation metadata**: respects `x-graphql-*` annotations (`@key`, custom scalars, union members, interface implementations, etc.).
- **Output determinism**: optional field-order preservation and description stripping to match downstream requirements.
- **GraphQL ⇄ JSON Schema parity**: `graphqlToJsonSchema` provides a reverse conversion for round-trip scenarios.

---

## Relintake_processng

1. Ensure `npm run build` and `npm test` pass.
2. Bump the version in `package.json` (keep it aligned with the Rust crate when possible).
3. Publish from within `converters/node`:

   ```bash
   npm publish
   ```

Because the package depends on generated `dist/` files, always run the build step beforehand (or rely on `prepublishOnly` which already invokes it).

---

## Extensibility & Future Work

- Split the converter into its own repository or git submodule using the metadata in `converters/manifest.json`.
- Add CI pipelines that run `npm test` here independently of the monorepo.
- Publish complementary documentation/examples demonstrating how to embed the converter in web bundlers (Vite, Next.js) or tooling (GraphQL code generators).

This README should give you everything needed to operate the Node converter as a standalone artifact while staying in sync with the overall project.
