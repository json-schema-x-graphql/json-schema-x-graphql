# Changelog

## 1.0.0 (2026-09-13)


### 🎉 Features

* add --directive-filter CLI option and document new features ([#200](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/200)) ([ba2a986](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ba2a986a5e2abe43dd58fbc9b9cfce8e01ff7770))
* add unified support for ESLint, Oxlint, Prettier, and Oxfmt ([87bb839](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/87bb8392e7d92aa2fe9c6d3a063a00c04a538456))
* consolidate issues, add Standard Schema & Codegen interop, SIMD optimizations ([04a3094](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/04a30943fcbb6263ae5af4f68c9decc82fb48c24))
* **federation:** implement [@policy](https://github.com/policy) directive and organic composition drift validator ([f414f51](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f414f51f50253855048949cef8e45fc3404943b7))
* **federation:** implement [@policy](https://github.com/policy) directive and organic composition… ([dbe2fd2](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/dbe2fd283b3ebcb0b35748a968bd6dd6a790946b))
* **gateway:** implement federated REST emulation & stitching gateway ([0749e08](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0749e081e922907aed94740324a71738831c8dfc))
* implement deprecation shim and migration script for nested fede… ([0722f55](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0722f557f625b7efedfbe1bfc506c2049c8d3a33))
* implement deprecation shim and migration script for nested federation object ([0e67211](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0e67211b7707f96373cb5c749e315d50bcb945e9))
* **node:** port P0 + P1 features from TTSE-petrified-forest ([f01b6a5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f01b6a541f01ed10dd1b3c399cfe659a55fdbfb8))
* Phase 1-4 Issue Consolidation (Codegen, Zod, SIMD, Strict Meta-Schema) ([9a19974](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9a199744c4d79b7aca6439e535cc6fa6394fa059))
* **subgraph-composer:** update UI and editor dependencies ([ba92172](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ba92172ed1b42b64e8f91aeadb03266621c4b65f))
* **subgraph-composer:** update UI and editor dependencies ([9341f95](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9341f95807858da7ed8cbdb19c0f50a9a7d2de2a))
* **telemetry:** instrument tests and library methods with OpenTelemetry ([5231407](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/52314076c0883c55847e22017a3676c1e17f5227))
* **ui:** Visualizer PK/FK UI & Mobile Tab Layout ([f6447e5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f6447e5a05b1b1408e3854ce8121e47a8dc30834))


### 🐛 Bug Fixes

* **#93,#94:** add x-graphql-federation-extends support + CI tests for federation examples ([0edad26](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0edad2677c2f5040f45955c0a69e246782b8cc33))
* **#93,#94:** add x-graphql-federation-extends support and CI tests for federation examples ([982f1a7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/982f1a75296fcfd62055780269a3be6e2b242b51))
* batch uncommitted security fixes and editor build updates ([13045ea](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/13045eaf2ac0e00cc68965a20658a6fd40bcda93))
* **ci:** align lockfile and resolve security warnings by replacing execSync with execFileSync in tests ([c8d778d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c8d778d3adf3d543941f1edeba883f0973382de5))
* **ci:** resolve CI failures from linter and missing script path ([d6b696a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/d6b696a5e9d02fec9ef05866bbfe82bddadc1664))
* **ci:** resolve package audit vulnerabilities and format federation examples tests ([105367d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/105367dd084787edcbaf36c9e9773906bce575a3))
* **ci:** resolve prettier formatting and clippy deprecation warnings ([f839086](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f8390869c355855037119d866c9c39d041a36509))
* **ci:** resolve validation benchmark clippy deprecation and improvements test linter rule error ([b6f25e1](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/b6f25e10adea81911d82feb2a7d1e340fa5b08f2))
* CodeQL escapes, remove tracked coverage, audit fixes ([045a8a4](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/045a8a4d0a96b9efaac8e2aad30c604e2506f2b8))
* CodeQL escapes, remove tracked coverage, audit fixes ([e96c74d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e96c74d7a0364b2ec9cc3dff9bca15f93dd2708d))
* **converter:** circular reference protection and enhanced $ref resolution ([2a2dca7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2a2dca7a2e97b808f0c54a5838131feab42dbcb8))
* **converter:** circular reference protection and enhanced $ref resolution ([a63eefd](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a63eefd18ac47c0d173ea1bf3d54f142b8a69db8))
* **converters:** resolve roundtrip validation drift and fix CodeQL path vulnerability alert ([3cf775a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3cf775ad947263195897f762699dc7e068e35101))
* **deps:** align opentelemetry, export generateTypeScript from core, add cli node types, override auto-bind v4 ([f2a5332](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f2a5332d82f4397b8faf5328ab05db7dd6c60ab6))
* harden VoyagerPanel SDL prep, api-server body limit, remove debug logs ([de7d7a6](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/de7d7a61fe6363e7074e3360a7c8e1f7c351c9f1))
* **node:** do not auto-inject federation directive definitions ([2df2c67](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2df2c6764d9fb43a6d5b09c25b32aed9ba0876c4))
* **pr-review:** useless guard, unused vars, schemaDiff .then() on Set crash, landing page typo ([20ddf16](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/20ddf164fc8de276a67cb9015a212d4d5f67d6d2))
* regex escapes, unused vars, monaco tokenizer & security upgrades ([eb37f30](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/eb37f300553a8e09095fb11d5ad424e6d221936a))
* regex escapes, unused vars, monaco tokenizer & security upgrades ([1e47490](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/1e47490cab51a5a8d388d6e719a2e07f3fa01d0b))
* remove codegen export from core package to fix browser build ([ff29201](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ff292010525d683e48226362d526c6f434d3e6f4))
* remove unused imports flagged by code-quality bot ([bd49a91](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/bd49a9128ab9b86fead48bc975cf40f0f60b2e93))
* resolve all CI failures across 4 categories ([2b417ba](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2b417ba455aaeffdd11edca3c3bb5c92194e047f))
* resolve CodeQL insecure randomness and format node package files ([fca0c31](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/fca0c31e849ad240da2ac8a1eb5a466cb093401b))
* resolve otel browser crashes, fix react 18/19 test mismatch, and lint errors ([84a602a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/84a602a3923da7b3927fb8240d4fd83ff872e2da))
* resolve oxfmt/prettier formatting conflict ([5037aa0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/5037aa05946d279c775ba4e16ba58c5815a9fdf6))
* resolve oxfmt/prettier formatting conflict ([fce6385](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/fce638521db2210adf89de94eed38f8079e4421f))
* resolve PR [#108](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/108) CI failures and CodeQL alerts ([01b229b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/01b229baebf5781fb6d445819c11311f113e1588))
* security audit — Dependabot/CodeQL findings, dead code, error handling ([849d705](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/849d7058f8ee67fc6f4c89d2998f0d4fc7acb533))
* security audit — Dependabot/CodeQL findings, dead code, error handling ([3f68e78](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3f68e7808431cb73caa30c50c2d43e9da9200163))
* Security fixes and editor build updates ([2a39d74](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2a39d747265c6f0646638c7dc1b30abc8a0b83c6))
* **subgraph-composer:** OTel instrumentation, SDL validation, scroll, security hardening ([e0c7a29](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e0c7a2912a77e4f32448612bf3f868651745fa5e))


### ♻️ Refactoring

* audit and harden viaduct/codegen/standard-schema integration ([0c40be5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0c40be598ed9cb8d2e706d6922e53fbccab8cac2))
* extract CLI & validators into @json-schema-x-graphql/cli package ([3c925e4](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3c925e47631728e297be67eea708274c19e0555b))


### 📚 Documentation

* Create Docs/Tests for anti-vulnerable GraphQL Applications ([#107](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/107)) ([45d5072](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/45d5072148e9fb229d1f2f3d07a6d559d9671c16))
* create dvga secured guide and examples ([524cf60](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/524cf60d5fa1ed332337fd16e4abb8d3e577675d))
* update READMEs with Phase 1-4 features ([34ce558](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/34ce558d2dcf97be6cc22acefd1bceb70899e1bb))


### 🎨 Styling

* apply prettier formatting to sources and tests ([b966bdc](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/b966bdcc187c85caf39f0b96ff5891cd46eb4735))
* **converters/node:** run prettier on all 19 ts files to fix format:check ([240ec15](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/240ec15b22eafa640f398fd6043461085af92753))


### 🏗️ Build System & Dependencies

* **dependabot:** configure dependabot for pnpm & remove vestigial package-lock files ([f0669b7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f0669b7a9cfd224ba7bf9dcc5aa047669d414899))
* **deps:** bump the workspace-npm-dependencies group across 1 directory with 29 updates ([433c028](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/433c0288253ac410cdfba1611c048cc63e3d31fa))
* **deps:** bump the workspace-npm-dependencies group across 1 directory with 29 updates ([2cf3060](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2cf306019af402c674f416ba739f60e388a769a4))
* **deps:** bump the workspace-npm-dependencies group with 32 updates ([3c8f796](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3c8f796ceed57708299500aa1f971186ad3ffd53))
* **deps:** bump the workspace-npm-dependencies group with 32 updates ([3e9286b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3e9286b1eba390f3093df66027553339536092ca))
* **deps:** consolidate and upgrade package dependencies across workspace ([ea8d5ca](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ea8d5ca5e48eea377be43032fbc63140225a8912))
* **deps:** consolidate and upgrade package dependencies across workspace ([af03988](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/af0398844f33839e43bada27a6e25a06adb7ca02))
* eliminate remaining unused variables and catch blocks to stabilize CI ([845f96a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/845f96ad08f9b7d2ff86b722b073ea7e6b6ba6a0))
* fix formatting ([f06b9c8](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f06b9c8adc63d042b0918612685fd38be0c5f391))
* fix Rust/Node formatting and add prek pre-commit hooks ([412e238](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/412e23838fadc89fff4b266757b8c9b1e099c05a))
* isolate benchmarking logic to fix inaccurate execution time metrics ([e15d2bb](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e15d2bb6a376a882d23f9887ae977671b891b631))
* lint cleanup, remove dead code, add voyager docs ([c6d1215](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c6d12157a92f356eb4bb5dc0f78e28e0cf57613d))
* lint cleanup, remove dead code, add voyager docs ([e6287b3](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e6287b3689b75b4b24bf4961b8f64b5b7072512f))
* remove legacy project name reference from file comment ([e057fb0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e057fb0827f72c8aef518590229961aa5137fd3f))
* run prettier and oxfmt formatting across all workspace files ([12cd603](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/12cd603f10480a07b99637b7a6b0c935fd0469a1))
* run prettier on node converter files to resolve formatting warnings ([073fc43](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/073fc43769f6a91302081c71ec0103393133a6ba))
