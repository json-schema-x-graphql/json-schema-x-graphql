# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/compare/json-schema-x-graphql-v2.0.0...json-schema-x-graphql-v2.1.0) (2026-08-23)


### 🎉 Features

* add --directive-filter CLI option and document new features ([#200](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/200)) ([ba2a986](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ba2a986a5e2abe43dd58fbc9b9cfce8e01ff7770))
* add Mermaid ER diagram generation from relational schema ([1afcc7f](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/1afcc7f22063df9e001477da8a4599784e6bfc6a))
* add unified support for ESLint, Oxlint, Prettier, and Oxfmt ([87bb839](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/87bb8392e7d92aa2fe9c6d3a063a00c04a538456))
* add unified support for ESLint, Oxlint, Prettier, and Oxfmt ([ba55b7d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ba55b7d2d5fd4641a7d5fd4adf6992cfeb54fa29))
* apply next.js caching optimization and webhook signatures ([df21a0a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/df21a0aa29cd43cd17ae48cee992dd2a9ca4b27b))
* apply next.js caching optimization and webhook signatures ([665fcb2](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/665fcb2fec82cd66005a20837187685e68ebeef4))
* apply next.js caching optimization and webhook signatures ([cc8dd5d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/cc8dd5db5d8cec542646474d8b11a1bf8124a1e3))
* **ci:** add comprehensive GitHub Actions publishing workflow ([8407e23](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/8407e23c7c9440245b32db9e1220b9932e6bf7ad))
* **ci:** Add comprehensive GitHub Actions publishing workflow ([c4a1802](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c4a18028c96e31e2d4e5d4a7d3c945adf509e3d7))
* consolidate issues, add Standard Schema & Codegen interop, SIMD optimizations ([04a3094](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/04a30943fcbb6263ae5af4f68c9decc82fb48c24))
* **editor:** hide voyager preview and show visualize tab only after generation ([1182955](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/118295584943a9096b84056c82bea8b466d30fb5))
* **editor:** implement custom panels, visual Mermaid rendering, CodeMirror integration, and remove react-split-pane ([985eb14](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/985eb14526fc19325b9a4321aea7e1db0c7ff431))
* **editor:** remove redundant individual subgraph text box ([b323d76](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/b323d7674ecdb9c08c4eba64ccc1495920ad8fdc))
* **federation:** implement [@policy](https://github.com/policy) directive and organic composition drift validator ([f414f51](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f414f51f50253855048949cef8e45fc3404943b7))
* **federation:** implement [@policy](https://github.com/policy) directive and organic composition… ([dbe2fd2](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/dbe2fd283b3ebcb0b35748a968bd6dd6a790946b))
* **frontend:** add federation ER diagram visualization to subgraph-composer ([34b0944](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/34b09441f56309be6e3ab69d36d7d1ab63b01faf))
* **frontend:** add federation ER diagram visualization to subgraph-composer ([4d5f902](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/4d5f90219713339299f504a525118ee611909e12)), closes [#20](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/20)
* **frontend:** add graphql-voyager visualization to subgraph-composer ([f58c362](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f58c362bc05926cbe72dd1fbe8f181c014165ecf))
* **frontend:** add graphql-voyager visualization to subgraph-composer ([3cd9371](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3cd937190cdd58c2868ddcf4b12780b0c5a51650)), closes [#19](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/19)
* **gateway:** add production-grade GraphQL Mesh in-memory gateway comparison ([7e98b4a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/7e98b4abdd5a8228132f852f328ce1818bf74720))
* **gateway:** implement federated REST emulation & stitching gateway ([0749e08](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0749e081e922907aed94740324a71738831c8dfc))
* **gateway:** implement federated REST emulation & stitching gateway ([c6ec618](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c6ec618da6c381dd7f120dd0f2e9f66aad2ed767))
* implement deprecation shim and migration script for nested fede… ([0722f55](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0722f557f625b7efedfbe1bfc506c2049c8d3a33))
* implement deprecation shim and migration script for nested federation object ([0e67211](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0e67211b7707f96373cb5c749e315d50bcb945e9))
* implement visual editor design guide exclusions ([f6ef118](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f6ef1185bb99a0e4125f73854eafe3a70339d8bc))
* implement visual editor design guide exclusions ([#85](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/85)) ([10d376f](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/10d376f654df2273a5cf5c995341de0d0ab277d7))
* incorporate mockforge and schema-sync scripts ([53c4642](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/53c46421ca06ea0ceea6f27bb7500765fe0f18ef))
* incorporate mockforge and schema-sync scripts from petrified-forest ([0f019b3](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0f019b32ddd97f84c71392936c2d1dbccb6e0e44))
* **node:** port P0 + P1 features from TTSE-petrified-forest ([f01b6a5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f01b6a541f01ed10dd1b3c399cfe659a55fdbfb8))
* Phase 1-4 Issue Consolidation (Codegen, Zod, SIMD, Strict Meta-Schema) ([9a19974](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9a199744c4d79b7aca6439e535cc6fa6394fa059))
* redesign subgraph-composer ER diagram with premium dark mode and glassmorphism ([7739b9e](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/7739b9ef553b64234119a6c1218088f769242361))
* **release:** update release workflow and CLI package config for multi-package publishing ([125711e](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/125711ebc356c6641e7a085a2dc04d028525152e))
* **subgraph-composer:** update UI and editor dependencies ([ba92172](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ba92172ed1b42b64e8f91aeadb03266621c4b65f))
* **subgraph-composer:** update UI and editor dependencies ([9341f95](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9341f95807858da7ed8cbdb19c0f50a9a7d2de2a))
* **telemetry:** instrument tests and library methods with OpenTelemetry ([5231407](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/52314076c0883c55847e22017a3676c1e17f5227))
* transplant P0 features from TTSE-petrified-forest ([eaaf642](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/eaaf64243cc6cfa2372c3295e9e233e00297abb2))
* transplant P1 analysis features from TTSE-petrified-forest ([e2bda52](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e2bda52e0a3bfcb202bf4f179e7748df61b67f1d))
* transplant P1 field mapping system from TTSE-petrified-forest ([06fec0c](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/06fec0c50c6b676308abf38d47221652dfcf790f))
* transplant P2 schema to DDL pipeline from TTSE-petrified-forest ([e267bbe](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e267bbe8c185067d073355d757e83c1837e5d076))
* **ui:** display [@key](https://github.com/key) and [@provides](https://github.com/provides) as explicit PK and FK linkages in ER visualizers ([0dcd714](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0dcd7146772f77f7c83f23659fea3145b7f2f3b3))
* **ui:** Visualizer PK/FK UI & Mobile Tab Layout ([f6447e5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f6447e5a05b1b1408e3854ce8121e47a8dc30834))
* **visual-editor:** add field-level bezier linkages and federation o… ([dc83766](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/dc837663f4d9de88199d61a35fa688454aab1426))
* **visual-editor:** add field-level bezier linkages and federation orchestration edges ([fbde7e5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/fbde7e5bbae1a61fa2d51cd4427b9f4eacc68c05))


### 🐛 Bug Fixes

* **#93,#94:** add x-graphql-federation-extends support + CI tests for federation examples ([0edad26](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0edad2677c2f5040f45955c0a69e246782b8cc33))
* **#93,#94:** add x-graphql-federation-extends support and CI tests for federation examples ([982f1a7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/982f1a75296fcfd62055780269a3be6e2b242b51))
* batch uncommitted security fixes and editor build updates ([13045ea](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/13045eaf2ac0e00cc68965a20658a6fd40bcda93))
* **build:** align vite 6 + plugin-react 5 and externalize codegen packages ([0f18822](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0f1882219e6b134f478cbb8820fb37031554b11a))
* **ci:** Add pnpm-lock.yaml and run install from root in workflows ([9e387b4](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9e387b4caeb87696c91e796c62b7e8e6de7cdf36))
* **ci:** address Copilot review feedback for release workflow ([a406a30](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a406a30dc264b396753d464704e72f5443dea678))
* **ci:** align lockfile and resolve security warnings by replacing execSync with execFileSync in tests ([c8d778d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c8d778d3adf3d543941f1edeba883f0973382de5))
* **ci:** bypass wasm-opt 404 download errors and stabilize workspace build scripts ([bf3fe7e](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/bf3fe7e5a4a689889df583fec56731ace0de82ee))
* **ci:** centralize workspace overrides to pnpm-workspace.yaml, remediate remaining vulnerabilities, and fix release-please workflow ([42781c1](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/42781c12a8c7c665a8134ac64385fe99b5f3902d))
* **ci:** fix rust formatting errors and resolve axios vulnerability ([f89d54d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f89d54dec89a7201f4eb48d7d32064cc6510f263))
* **ci:** pin release-please-action to tag v4 to resolve resolution error ([2a92344](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2a923442689fc4d305fd19f1f30a914372c41f6a))
* **ci:** remediate 47 vulnerabilities, fix release-please, and pin action SHAs ([67903a1](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/67903a1000659f0da679f99fb7b254c90af71443))
* **ci:** resolve CI failures from linter and missing script path ([d6b696a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/d6b696a5e9d02fec9ef05866bbfe82bddadc1664))
* **ci:** resolve package audit vulnerabilities and format federation examples tests ([105367d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/105367dd084787edcbaf36c9e9773906bce575a3))
* **ci:** resolve prettier formatting and clippy deprecation warnings ([f839086](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f8390869c355855037119d866c9c39d041a36509))
* **ci:** resolve validation benchmark clippy deprecation and improvements test linter rule error ([b6f25e1](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/b6f25e10adea81911d82feb2a7d1e340fa5b08f2))
* **ci:** upgrade OpenTelemetry dependencies to v2.8.0 to resolve build compilation error ([a8474de](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a8474de1e9c1cb1412b50ba110f94c88c9c3a427))
* **ci:** upgrade packageManager to stable pnpm v11.14.0 to resolve setup-pnpm broken release error ([f39594b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f39594b84b5ae064083deae28a7051aa7a8eb24e))
* CodeQL escapes, remove tracked coverage, audit fixes ([045a8a4](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/045a8a4d0a96b9efaac8e2aad30c604e2506f2b8))
* CodeQL escapes, remove tracked coverage, audit fixes ([e96c74d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e96c74d7a0364b2ec9cc3dff9bca15f93dd2708d))
* CodeQL identity-replacement in esc(), remove spurious allowBuilds ([2f98224](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2f982245f7e6d6c1db72f5b361858f40a6e2ea49))
* **converter:** circular reference protection and enhanced $ref resolution ([2a2dca7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2a2dca7a2e97b808f0c54a5838131feab42dbcb8))
* **converter:** circular reference protection and enhanced $ref resolution ([a63eefd](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a63eefd18ac47c0d173ea1bf3d54f142b8a69db8))
* **converters:** resolve roundtrip validation drift and fix CodeQL path vulnerability alert ([3cf775a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3cf775ad947263195897f762699dc7e068e35101))
* **deploy:** update editor base url and docs link for subpath deployment ([c5fd9c9](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c5fd9c97994a80885ee95920d02c7d0a80948491))
* **deploy:** update editor base url and docs link for subpath deployment ([9c98964](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9c98964600c3f826e02d7fec02628c1baae1476e))
* **deps:** align opentelemetry, export generateTypeScript from core, add cli node types, override auto-bind v4 ([f2a5332](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f2a5332d82f4397b8faf5328ab05db7dd6c60ab6))
* **deps:** bump react to v19.2.8 in subgraph-composer to resolve version mismatch with react-dom ([dd3a9a3](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/dd3a9a334e03082569ab3df8a81b5cec78c9d702))
* **deps:** revert @vitejs/plugin-react to ^5.2.0 to resolve Vite build error in CI ([f4a3cc5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f4a3cc5a6af27e46ee03acb7799eb45f7c670de2))
* **deps:** revert website Next/Nextra/React-DOM versions to main branch state to avoid Nextra incompatibility ([678ce67](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/678ce6797d2cc320d54f4c3269964c6395ff7ea1))
* disable wasm-pack build script (broken postinstall 404) ([ff06e65](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ff06e6592abc141a1e4511440e56eb77fa89c73e))
* **editor:** eliminate Maximum update depth exceeded infinite render loops ([e7ce618](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e7ce618fd048bd471cadbd0f769e2fbb377224f7))
* **editor:** GitHub Pages base path, dev script, and ER diagram polish ([aa1a703](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/aa1a7038fd3a4f88dbac4662f77a38f1e910a0d1))
* **editor:** resolve layout clipping and statistics scrollbar bug ([33d1120](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/33d112021c58d9e9eedc3f540b1dcd781c8f42c3))
* **frontend:** address ER diagram review feedback ([5498df6](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/5498df6fe0e0f4448e251b7fa3988d4a6850547f))
* harden VoyagerPanel SDL prep, api-server body limit, remove debug logs ([de7d7a6](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/de7d7a61fe6363e7074e3360a7c8e1f7c351c9f1))
* **node:** do not auto-inject federation directive definitions ([2df2c67](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2df2c6764d9fb43a6d5b09c25b32aed9ba0876c4))
* **otel+security:** add Resource to spans, crypto.getRandomValues, trace compose(), fix dead code & CSS ([a935be7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a935be729c173f6c35d66bd41bdf4dc4c108135f))
* **pr-review:** address copilot feedback with dynamic template routing and esm dynamic imports ([c07b9c0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c07b9c03e2f4c2bffe24aa50e62f94cbd9d2bc68))
* **pr-review:** useless guard, unused vars, schemaDiff .then() on Set crash, landing page typo ([20ddf16](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/20ddf164fc8de276a67cb9015a212d4d5f67d6d2))
* regex escapes, unused vars, monaco tokenizer & security upgrades ([eb37f30](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/eb37f300553a8e09095fb11d5ad424e6d221936a))
* regex escapes, unused vars, monaco tokenizer & security upgrades ([1e47490](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/1e47490cab51a5a8d388d6e719a2e07f3fa01d0b))
* remove codegen export from core package to fix browser build ([ff29201](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ff292010525d683e48226362d526c6f434d3e6f4))
* remove unused imports flagged by code-quality bot ([bd49a91](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/bd49a9128ab9b86fead48bc975cf40f0f60b2e93))
* resolve all CI failures across 4 categories ([2b417ba](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2b417ba455aaeffdd11edca3c3bb5c92194e047f))
* resolve all moderate+ audit vulnerabilities ([864ef0b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/864ef0b8bb72ee9415173ab49bc61e53205d3a7f))
* resolve all moderate+ audit vulnerabilities ([8f973d8](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/8f973d8b56e91785d577c30d2340307e49badfe7))
* resolve CodeQL insecure randomness and format node package files ([fca0c31](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/fca0c31e849ad240da2ac8a1eb5a466cb093401b))
* resolve otel browser crashes, fix react 18/19 test mismatch, and lint errors ([84a602a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/84a602a3923da7b3927fb8240d4fd83ff872e2da))
* resolve oxfmt/prettier formatting conflict ([5037aa0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/5037aa05946d279c775ba4e16ba58c5815a9fdf6))
* resolve oxfmt/prettier formatting conflict ([fce6385](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/fce638521db2210adf89de94eed38f8079e4421f))
* resolve PR [#108](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/108) CI failures and CodeQL alerts ([01b229b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/01b229baebf5781fb6d445819c11311f113e1588))
* restore allowBuilds with proper boolean values, add esbuild/wasm-pack ([59054e6](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/59054e6b42e56f8acdfe786ab9217f829a9dd120))
* security audit — Dependabot/CodeQL findings, dead code, error handling ([849d705](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/849d7058f8ee67fc6f4c89d2998f0d4fc7acb533))
* security audit — Dependabot/CodeQL findings, dead code, error handling ([3f68e78](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3f68e7808431cb73caa30c50c2d43e9da9200163))
* Security fixes and editor build updates ([2a39d74](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2a39d747265c6f0646638c7dc1b30abc8a0b83c6))
* **security:** upgrade transitive crate h2 to v0.4.18 to patch RUSTSEC-2026-0258 ([39f12bb](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/39f12bbfe11be0c2f710f42faec8fc766b022938))
* **subgraph-composer:** align react-dom version to v18 to prevent test crashes ([3893947](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/38939471b6a403f1e8c824cf083b7d5358219ed4))
* **subgraph-composer:** OTel instrumentation, SDL validation, scroll, security hardening ([e0c7a29](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e0c7a2912a77e4f32448612bf3f868651745fa5e))
* **SubgraphEditor:** validate SDL not JSON, fix Statistics scroll overflow ([44ce260](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/44ce260118f9d9d726f46bb474a8d537b09e0ba3))
* **ui:** auto-select first schema to remove unneeded empty state panel ([ff863d1](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ff863d183d967b6914fe653ba6926d434f6ee356))
* **ui:** resolve dark mode bugs and build three-tab layout for responsive mobile views ([d92a9e3](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/d92a9e337704b90a8f3f1bd50f987cfc11297125))


### ⚡ Performance

* **ci:** Enable pnpm caching in validation workflow ([a781b5e](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a781b5edcac89de762618ce9175dd72f0ae99f64))


### ♻️ Refactoring

* audit and harden viaduct/codegen/standard-schema integration ([0c40be5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0c40be598ed9cb8d2e706d6922e53fbccab8cac2))
* extract CLI & validators into @json-schema-x-graphql/cli package ([3c925e4](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3c925e47631728e297be67eea708274c19e0555b))


### 📚 Documentation

* add ADRs for federation visualization, authorization, and caching ([a81c365](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a81c3651c3f06e6398a0446f086f81c1be731ebe))
* add ADRs for federation visualization, authorization, and caching ([f7f9b61](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f7f9b61951a33786ebc22aa9f78c9b313a33d935))
* **adr:** add ADR 0013 — federation extension format recommendation ([d55be8b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/d55be8be94b223d3641f811fe407c80e544d6547))
* **adr:** add ADR 0013 — federation extension format recommendation ([63005f8](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/63005f804aa2e9736f75f00bc93b064472281877))
* **adr:** add ADR 0013 — federation extension format recommendation ([5f1c2a4](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/5f1c2a43113cf2328bb4e6f99874e3aa4d8ea393))
* Create Docs/Tests for anti-vulnerable GraphQL Applications ([#107](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/107)) ([45d5072](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/45d5072148e9fb229d1f2f3d07a6d559d9671c16))
* create dvga secured guide and examples ([524cf60](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/524cf60d5fa1ed332337fd16e4abb8d3e577675d))
* update READMEs with Phase 1-4 features ([34ce558](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/34ce558d2dcf97be6cc22acefd1bceb70899e1bb))


### 🎨 Styling

* apply prettier formatting to sources and tests ([b966bdc](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/b966bdcc187c85caf39f0b96ff5891cd46eb4735))
* **converters/node:** run prettier on all 19 ts files to fix format:check ([240ec15](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/240ec15b22eafa640f398fd6043461085af92753))


### 🏗️ Build System & Dependencies

* add build artifacts and cache to .gitignore ([624ffec](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/624ffec4bc4815e01003203918136cdc1499031c))
* address PR review feedback for drift script and none id strategy description ([ce5ecc8](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ce5ecc8dfadbeaf9d473bb54a99d0eab485cbdd1))
* align nextra/next versions and add grouped dependabot updates ([c1ccfd2](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c1ccfd294e6f1cd7b7b0ba9f7962c2e4f0ff79f3))
* **dependabot:** configure dependabot for pnpm & remove vestigial package-lock files ([f0669b7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f0669b7a9cfd224ba7bf9dcc5aa047669d414899))
* **deps-dev:** bump @babel/core ([c981734](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c9817345f582236fb8a60d8c0736ce64f6901c4f))
* **deps-dev:** bump @babel/core from 7.29.0 to 7.29.6 in the npm_and_yarn group across 1 directory ([9869eae](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9869eaee59f8088c15ee5254435cf8e0addcc673))
* **deps-dev:** bump @faker-js/faker in /frontend/dashboard ([86348d6](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/86348d6d8d80da67f54775ce5047a7f4beca43ce))
* **deps-dev:** bump glob from 7.2.3 to 13.0.6 ([1017834](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/10178347f595911184ec0adf4eb06909680c0225))
* **deps-dev:** bump the npm_and_yarn group across 3 directories with 1 update ([9e85b1a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9e85b1a459c2f8349b3134cf815d8ab6e76ccda5))
* **deps-dev:** bump the npm_and_yarn group across 3 directories with 1 update ([0fbd9a2](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0fbd9a2456422620d1750627bf6e36fff6b55c6e))
* **deps:** bump actions/cache from 4.2.4 to 5.0.5 ([3441ec8](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3441ec898fe318655ffe0bae0417e40b71bd40bd))
* **deps:** bump actions/dependency-review-action from 4.9.0 to 5.0.0 ([e72917a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e72917a4bb16543aae8921e297d77f2aad8e3ab9))
* **deps:** bump codecov/codecov-action ([54d9457](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/54d9457099ad6bf0d97d63a16fe3bb524a3e56de))
* **deps:** bump googleapis/release-please-action from 4 to 5 ([e570403](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e57040394a93a933503b3dee11591dfc9702f7c5))
* **deps:** bump json-2-csv ([17613bc](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/17613bc7176e623b65d7d15b9ad469cca8f6c8a9))
* **deps:** bump mermaid ([0c7c780](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0c7c7809d03831a682c2b7a49e0460902d217f75))
* **deps:** bump mermaid ([5eec2a5](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/5eec2a56c8743a1a7c00c3a731aae2350122e750))
* **deps:** bump mermaid from 11.14.0 to 11.15.0 in /frontend/dashboard in the npm_and_yarn group across 1 directory ([8ed9148](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/8ed91488b5d4fee663ed55fdca9fb8b81f279d01))
* **deps:** bump mermaid from 11.16.0 to 11.16.1 in /frontend/subgraph-composer in the npm_and_yarn group across 1 directory ([87db8a2](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/87db8a2b42d9249f450aeec08b3b93c1b6d55479))
* **deps:** bump openssl in the cargo group across 1 directory ([0cd056c](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0cd056cec56942fa85ecf2b7df0e743e5aad88b7))
* **deps:** bump the cargo-dependencies group ([127e662](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/127e66216877a6f54ed26ba59a6002a8fc33e521))
* **deps:** bump the cargo-dependencies group in /converters/rust with 3 updates ([44bf1c7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/44bf1c722752bee7c7f8d2fe3959bc4f17da4e6b))
* **deps:** bump the dashboard-npm-dependencies group ([51a1d40](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/51a1d408acbc201fb0e69f9cd100589fc1dd8584))
* **deps:** bump the dashboard-npm-dependencies group across 1 directory with 33 updates ([329ae5b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/329ae5b45cfeb5f552c6497e325a2deb3d992ef5))
* **deps:** bump the dashboard-npm-dependencies group across 1 directory with 33 updates ([7df3faf](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/7df3faf3050181676c0249759ccaf992f768d948))
* **deps:** bump the dashboard-npm-dependencies group in /frontend/dashboard with 54 updates ([5ba1d1a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/5ba1d1a1be5d6bc84f3d9698451914169e4c400b))
* **deps:** bump the github-actions-dependencies group with 11 updates ([d271466](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/d27146690796faf930d8bd782b2125df2bc2450a))
* **deps:** bump the github-actions-dependencies group with 11 updates ([99b7652](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/99b76529d38ee70311cb1b365c134976364e8f9b))
* **deps:** bump the github-actions-dependencies group with 5 updates ([83703c3](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/83703c3dbf9718f55ca68fade071900ac493e188))
* **deps:** bump the github-actions-dependencies group with 5 updates ([820d712](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/820d7127b2750ed68f729bf90f941aa1df7b791d))
* **deps:** bump the npm_and_yarn group across 1 directory with 4 updates ([25871b2](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/25871b2698c84a386efa9dafaf901a29d5d2544e))
* **deps:** bump the npm_and_yarn group across 1 directory with 4 updates ([1488864](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/14888641345604fcd9c61d87a0f636906b4965a2))
* **deps:** bump the workspace-npm-dependencies group across 1 directory with 29 updates ([433c028](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/433c0288253ac410cdfba1611c048cc63e3d31fa))
* **deps:** bump the workspace-npm-dependencies group across 1 directory with 29 updates ([2cf3060](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2cf306019af402c674f416ba739f60e388a769a4))
* **deps:** bump the workspace-npm-dependencies group with 32 updates ([3c8f796](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3c8f796ceed57708299500aa1f971186ad3ffd53))
* **deps:** bump the workspace-npm-dependencies group with 32 updates ([3e9286b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3e9286b1eba390f3093df66027553339536092ca))
* **deps:** consolidate and upgrade package dependencies across workspace ([ea8d5ca](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ea8d5ca5e48eea377be43032fbc63140225a8912))
* **deps:** consolidate and upgrade package dependencies across workspace ([af03988](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/af0398844f33839e43bada27a6e25a06adb7ca02))
* **deps:** update dtolnay/rust-toolchain requirement to 67ef31d5b988238dd797d409d6f9574278e20537 ([4c9e508](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/4c9e5086fab212ad64c2a43184aa1f4955c47042))
* **deps:** update getrandom requirement in /converters/rust ([19a853c](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/19a853c020380ae6d34fbe13d6b5392fa07c3392))
* **deps:** update opentelemetry_sdk requirement in /converters/rust ([34335b7](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/34335b737c9ad9b4af2beb3dc295578736a11a29))
* **deps:** update simd-json requirement in /converters/rust ([76f1f3d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/76f1f3dbce0a242c2508f62d43488a763cba80d9))
* **deps:** upgrade opentelemetry to 0.32 and fix deprecation errors ([60118aa](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/60118aa8bf89bc2c4748a9e895451c0837aaff79))
* eliminate remaining unused variables and catch blocks to stabilize CI ([845f96a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/845f96ad08f9b7d2ff86b722b073ea7e6b6ba6a0))
* expand .gitignore to prevent large binaries and archives ([98c4558](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/98c45583790c0d042add0222cdafbdef7b0c536c))
* fix formatting ([f06b9c8](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f06b9c8adc63d042b0918612685fd38be0c5f391))
* fix Rust/Node formatting and add prek pre-commit hooks ([412e238](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/412e23838fadc89fff4b266757b8c9b1e099c05a))
* format pnpm-lock.yaml ([8c8c15c](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/8c8c15c23e9e33fb750211e48b8ce1167ec6dce8))
* harden pre-commit workflow with mise, prek, dprint, and x-graphql validation ([63260c9](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/63260c988753e0cd11eacb71360a209fed286dbb))
* harden pre-commit workflow with mise, prek, dprint, and x-graphql validation ([67a36cd](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/67a36cd3f4e8a1c973e9b1706c231fdce530e52d))
* isolate benchmarking logic to fix inaccurate execution time metrics ([e15d2bb](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e15d2bb6a376a882d23f9887ae977671b891b631))
* lint cleanup, remove dead code, add voyager docs ([c6d1215](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c6d12157a92f356eb4bb5dc0f78e28e0cf57613d))
* lint cleanup, remove dead code, add voyager docs ([e6287b3](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e6287b3689b75b4b24bf4961b8f64b5b7072512f))
* patch gray-matter to support js-yaml v4 and pass audit ([5ac6c35](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/5ac6c3573a8b8ee800773d59d4fa4b8314459e76))
* **pnpm:** add unrs-resolver allowBuilds and regenerate lockfile with pnpm v11 ([652a520](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/652a520e27f231dd2142cbe55a9f8d162b40a00f))
* **pnpm:** migrate overrides from package.json to pnpm-workspace.yaml for pnpm v11 compatibility ([0bec78c](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0bec78c6d28d396919fbe14d7c084805a165251b))
* **pnpm:** update lockfile to apply auto-bind 4.0.0 override correctly ([09ced10](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/09ced101dcbc0e0956aa189a7796047040b71505))
* **pnpm:** update packageManager to pnpm@11.13.0 to match local self-updated version ([558ac22](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/558ac225148e3ce9b7d84be2f92450a1fa753f4e))
* reduce oxlint warnings from 59 to 38 ([6a99070](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/6a99070216d4932d975462b25dcc41406ea41903))
* remove legacy project name reference from file comment ([e057fb0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e057fb0827f72c8aef518590229961aa5137fd3f))
* remove legacy project name references from Rust docs ([9909558](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9909558e70e1ba9d56259673b91ce6983df4ad53))
* remove legacy project name references from Rust docs ([137c841](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/137c8417a0e51df96d9f266e24f02570a5aab4eb))
* remove unused gray-matter patch and regenerate pnpm lockfile using v11 ([9d77bc0](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9d77bc0ff3f02079bf66a405e2694d6da51a9c41))
* rename example files and address review ([a33a14c](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/a33a14c57a20ff8b4f0f41aaf77537abf8e04917))
* resolve security vulnerabilities in Next.js and Rust dependencies ([323b2ef](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/323b2efe7f84d3e85c09000e9f093fdf69c36c9c))
* run prettier and oxfmt formatting across all workspace files ([12cd603](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/12cd603f10480a07b99637b7a6b0c935fd0469a1))
* run prettier on node converter files to resolve formatting warnings ([073fc43](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/073fc43769f6a91302081c71ec0103393133a6ba))
* **schema-authoring:** use central build-wasm.sh script via npm script ([cd1841c](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/cd1841c920c1a10437092ce773ae915a7870950f))
* **scripts:** remove unused execFileSync import ([012be92](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/012be92ed04dd4a19a0415c8cc4b1faf736f6a9d))
* update pnpm-lock.yaml to sync dependency specifiers for oxlint and oxfmt ([7f47820](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/7f47820be5c4b5490ffd545dda373980722bcc26))


### 🔄 CI/CD

* run cargo-deny inside converters/rust to avoid version-specific CLI option differences ([6af14b8](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/6af14b86de579e330a681fa94e69d68334c4283b))
* use cargo-deny binary directly in security audit workflow ([71f924d](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/71f924db4a6b1a77474c18d412906386a91f429b))

## [Unreleased]

### Fixed

#### Rust Converter Parity (2024-01-XX)

- **Type-level skip support** - Types marked with `x-graphql-skip: true` are now excluded from SDL output
- **Field-level type override** - `x-graphql-field-type` attribute now properly overrides inferred types
- **Field-level skip support** - Fields marked with `x-graphql-skip: true` are now excluded from SDL output
- **Interface generation** - `x-graphql-type-kind: "INTERFACE"` now correctly generates `interface` instead of `type`
- **Field nullability overrides** - `x-graphql-field-non-null` and `x-graphql-nullable` now properly control field nullability
- **List item non-null** - `x-graphql-field-list-item-non-null` now properly generates non-null array items (`[String!]`)
- **Full feature parity** - Rust converter now matches Node.js converter behavior across all x-graphql attributes

#### Documentation

- Added comprehensive [Rust Parity Implementation](./docs/RUST-PARITY-IMPLEMENTATION.md) document
- Detailed 6 critical fixes with code examples and verification steps
- Documented testing requirements and validation checklist

## [2.0.0] - 2025-01-XX

### 🎉 Major Release: X-GraphQL Extensions v2.0

This release introduces standardized x-graphql namespace conventions, comprehensive test coverage, and production-ready validation infrastructure.

### Breaking Changes

#### Namespace Consolidation

- **Federation attributes** now use `x-graphql-federation-*` prefix:
  - `x-graphql-keys` → `x-graphql-federation-keys`
  - `x-graphql-shareable` → `x-graphql-federation-shareable`
  - `x-graphql-external` → `x-graphql-federation-external`
  - `x-graphql-requires` → `x-graphql-federation-requires`
  - `x-graphql-provides` → `x-graphql-federation-provides`
  - `x-graphql-override-from` → `x-graphql-federation-override-from`

#### Type Attribute Split

- `x-graphql-type` (object form) split into:
  - `x-graphql-type-name` - Type name
  - `x-graphql-type-kind` - Type kind (OBJECT, INTERFACE, UNION, INPUT_OBJECT)
- `x-graphql-type` (string form) renamed to `x-graphql-type-name`

#### Scalar Definition Changes

- `x-graphql-scalars` (bulk definition) → individual `x-graphql-scalar` per type

### Added

#### Phase 5: Validation Infrastructure

- **Dual JSON Schema Validation** - `jsonschema` + `boon` validators for comprehensive schema validation
- **Multi-Layer GraphQL Validation** - Apollo parser, compiler, spec, and federation validators
- **Validation CLI Tools**:
  - Rust: `validate` binary with JSON and GraphQL validation commands
  - Node.js: `validate.ts` CLI with feature parity
- **Full-Stack Validator** - Combined JSON Schema + GraphQL SDL validation
- **Comprehensive Validation Tests** - 70+ validation tests across Rust and Node.js
- **X-GraphQL Extension Validation**:
  - Type kind validation (OBJECT, INTERFACE, UNION, INPUT_OBJECT, ENUM)
  - Field type syntax validation
  - Federation keys validation
  - Naming convention warnings

#### Converter Bug Fixes

- **Interface Generation** - Fixed `x-graphql-type-kind: "INTERFACE"` now correctly generates `interface` instead of `type`
- **Field-Level Type Overrides** - Added support for `x-graphql-field-type` to override inferred field types
- **Field Skipping** - Implemented `x-graphql-skip: true` at field level to exclude fields from GraphQL schema
- **Type Skipping** - Implemented `x-graphql-skip: true` at type level to exclude entire types
- **Field Nullability Overrides** - Added support for `x-graphql-field-non-null` and `x-graphql-nullable`
- **List Item Non-Null** - Added support for `x-graphql-field-list-item-non-null` for array item nullability
- **Federation Field Directives** - Added support for `@requires`, `@provides`, `@external`, and `@override` at field level

#### Test Coverage Expansion

- **Expected SDL Outputs** - Added 6 new expected GraphQL SDL files for comprehensive validation:
  - `descriptions.graphql` - Description handling tests
  - `interfaces.graphql` - Interface generation and implementation
  - `nullability.graphql` - Nullability override tests
  - `skip-fields.graphql` - Field and type skipping tests
  - `unions.graphql` - Union type generation
  - `comprehensive.graphql` - Combined feature tests
- **Test Data Coverage** - Now 8/8 schemas have expected outputs (100% coverage)
- **Integration Tests** - All shared test data validated across Node.js and Rust converters
- **CI/CD Integration** - GitHub Actions workflow for automated validation

#### Phase 6: Performance Benchmarking

- **Rust Benchmark Suite** - Criterion-based benchmarks for validation and conversion
- **Node.js Benchmark Suite** - Benchmark.js-based performance tests
- **Performance Targets Achieved**:
  - Validation: > 10,000 ops/sec (achieved 15,000-50,000 ops/sec)
  - Conversion: > 1,000 ops/sec (achieved 3,000-10,000 ops/sec)
  - Round-trip: > 500 ops/sec (achieved 1,500-5,000 ops/sec)
- **Benchmark Categories**:
  - JSON Schema validation (small, medium, large, real-world)
  - GraphQL SDL validation (simple, complex, federation)
  - Conversion benchmarks (JSON↔GraphQL)
  - Round-trip conversion benchmarks
  - Memory allocation and scaling benchmarks
- **CI/CD Benchmark Integration** - Automated benchmark runs with regression detection

#### Documentation

- **Quick Start Guide** (`docs/x-graphql/QUICK_START.md`) - Get started in 5 minutes
- **Attribute Reference** (`docs/x-graphql/ATTRIBUTE_REFERENCE.md`) - Complete catalog of all 36+ x-graphql attributes
- **Common Patterns** (`docs/x-graphql/COMMON_PATTERNS.md`) - Real-world usage examples and best practices
- **Migration Guide** (`docs/x-graphql/MIGRATION_GUIDE.md`) - Automated migration from v1.x with scripts
- **Phase 5-6 Summary** (`docs/PHASES-5-6-IMPLEMENTATION-SUMMARY.md`) - Comprehensive implementation documentation
- Comprehensive inline documentation and examples

#### Test Coverage

- **Shared test-data** approach - Node.js and Rust use same test schemas
- `comprehensive-features.json` - Schema demonstrating all x-graphql features
- Node.js: `x-graphql-shared.test.ts` - 30+ integration tests using shared data
- Rust: `x_graphql_shared_tests.rs` - 20+ integration tests using shared data
- Rust: `validation_tests.rs` - 30+ validation-specific tests
- Expected SDL outputs for validation in `test-data/x-graphql/expected/`
- All tests load schemas from disk (no inline schemas)

#### Performance Improvements

- **Rust Performance**: 3-5x faster than Node.js implementation
- **Linear Scaling**: Confirmed linear performance with schema size
- **Optimized Validation**: < 0.1ms per schema for small/medium schemas
- **Efficient Conversion**: < 1ms per schema for most conversions

### Future (v2.1.0+)

- VS Code extension for real-time validation and IntelliSense
- Interactive migration CLI tool
- Memory profiling tools
- Additional federation composition validators

#### Validation Infrastructure (Phase 5)

- **JSON Schema Validator** - AJV-based validator for schema files
- **GraphQL SDL Validator** - Parse, validate, and lint generated SDL
- **Integration Test Harness** - Automated conversion testing with diffs
- **Performance Benchmarks** - Conversion timing, memory, and throughput metrics
- Master runner scripts: `run-all-validation.sh`, `run-integration-tests.sh`, `run-benchmarks.sh`

#### CI/CD Integration

- GitHub Actions workflow: `.github/workflows/validation-and-testing.yml`
- Automated schema validation on PRs
- SDL validation and linting
- Integration test execution
- Performance regression detection
- Artifact uploads for test reports

#### P0 Features (Core)

- `x-graphql-skip` - Exclude fields/types from GraphQL
- `x-graphql-nullable` - Override nullability independent of JSON Schema required
- `x-graphql-description` - GraphQL-specific descriptions (override JSON Schema description)
- Full support in both Node.js and Rust converters

#### Field-Level Enhancements

- `x-graphql-field-list-item-non-null` - Non-null list items `[Type!]`
- `x-graphql-field-directives` - Custom field directives
- `x-graphql-field-arguments` - Field argument definitions

#### Type-Level Enhancements

- `x-graphql-type-directives` - Custom type directives
- `x-graphql-union-types` - Union member type lists
- Better interface implementation support

#### Federation v2 Support

- All federation directives properly namespaced
- Composite key support (e.g., `"organizationId userId"`)
- Multiple entity keys support (array of keys)
- `@override(from: "service")` for field migration
- `@shareable` for value objects

#### Developer Experience

- CLI tool: `json-schema-x-graphql` command
- Migration script for automated v1.x → v2.0 conversion
- Validation CLI with strict mode
- Benchmark comparison against baselines
- Detailed error messages with suggestions

### Changed

#### Package Metadata

- **Version**: 0.1.0 → 2.0.0
- **Node package**: Updated keywords, engines, publishConfig
- **Rust crate**: Updated keywords, categories, rust-version
- Both packages ready for npm/crates.io publication

#### Documentation Structure

- Moved to `docs/x-graphql/` namespace
- Separated concerns: Quick Start, Reference, Patterns, Migration
- Added troubleshooting sections
- Improved examples with real-world scenarios

#### Test Organization

- Consolidated test data in `converters/test-data/x-graphql/`
- Expected outputs in `converters/test-data/x-graphql/expected/`
- Both converters use identical test files (DRY principle)

### Fixed

- Description handling now properly prefers `x-graphql-description` over `description`
- Federation directive formatting matches Apollo Federation v2 spec
- List item nullability correctly generates `[Type!]` vs `[Type]`
- Circular reference handling in both converters
- Case conversion edge cases for field names

### Performance

- Node.js converter: ~0.2ms average per schema (small-medium schemas)
- Rust converter: Sub-millisecond conversion for most schemas
- Validation overhead dominates conversion time (expected)
- Throughput: 2.8K - 37K conversions/sec depending on schema size

### Validation Results (Initial Run)

- **JSON Schemas**: 37 discovered, 34 valid (92% pass rate)
- **GraphQL SDL**: 3 files discovered, 2 valid
- **Integration Tests**: 11 cases, 10 passed (91% pass rate)
- Known issues documented for remaining failures

### Migration Support

- Automated migration script with dry-run mode
- Detailed migration report (JSON format)
- Backup creation before in-place migration
- Rollback instructions and tooling
- Manual migration checklist

### Developer Notes

- All new features have tests in both Node.js and Rust
- Documentation uses consistent examples across guides
- CI/CD pipeline validates all changes
- Benchmarks establish performance baselines

### Upgrade Path

See [Migration Guide](docs/x-graphql/MIGRATION_GUIDE.md) for detailed upgrade instructions.

### Deprecations

- `x-graphql-type` (object form) - Use `x-graphql-type-name` + `x-graphql-type-kind`
- `x-graphql-type` (string form) - Use `x-graphql-type-name`
- `x-graphql-scalars` - Use individual `x-graphql-scalar` definitions
- Non-namespaced federation attributes - Use `x-graphql-federation-*` prefix

### Removed

- None (backward compatibility maintained where possible)

### Added

- Case-insensitive `$ref` resolution with automatic snake_case/camelCase conversion fallbacks
- Circular reference support for self-referencing and mutually referencing types
- Comprehensive type filtering system with `excludeTypes`, `excludeTypeSuffixes`, and `excludePatterns`
- Default exclusion of operational types (Query, Mutation, Subscription) and common suffixes (Filter, Connection, Edge, etc.)
- `includeOperationalTypes` option to override operational type exclusions
- Case conversion utilities (`camelToSnake`, `snakeToCamel`, `convertObjectKeys`)
- Circular reference protection in both Node.js and Rust implementations
- Test schemas for circular references, case mismatches, and filtering scenarios
- Comprehensive test suite (24 new tests for Node.js, 13 new tests for Rust)

### Changed

- Default `excludeTypes` now includes `["Query", "Mutation", "Subscription", "PageInfo"]`
- Default `excludeTypeSuffixes` now includes common patterns like Filter, Connection, Edge, Payload, Args
- `$ref` resolution now tries multiple case variations when exact match fails

### Fixed

- Node.js: Fixed `shouldExcludeType` logic to properly handle custom exclusions when `includeOperationalTypes` is true
- Node.js: Added null check for root type name before filtering
- Rust: Added missing circular reference protection in `convert_type_definition`
- Node.js: Corrected function reference from non-existent `shouldIncludeType` to `shouldExcludeType`

### Planned

- Core Rust WASM converter implementation
- React editor frontend
- API documentation
- npm and crates.io publication

## [0.1.0] - 2024-01-20

### Added

- Initial project structure and repository setup
- Comprehensive README.md with project overview and quick start
- CONTEXT.md with detailed architecture and roadmap
- CONTRIBUTING.md with contribution guidelines
- JSON Schema 2020-12 meta-schema defining all `x-graphql-*` extensions
- Example user-service schema demonstrating all features
- Cargo.toml for Rust/WASM project configuration
- package.json for npm distribution
- .gitignore for clean version control
- PROJECT_SUMMARY.md documenting repository structure
- MIT License

### Features

- Meta-schema with strict validation patterns for:
  - GraphQL naming conventions (PascalCase types, camelCase fields)
  - Apollo Federation v2.9 directives
  - Custom directive definitions
  - Field arguments with defaults
  - Enum value configurations
  - Resolver metadata hints
  - Subscription configuration
- Comprehensive example schema demonstrating:
  - Entity configuration with @key directives
  - Federation directives (@requires, @provides, @external, @shareable)
  - Authorization directives (@authenticated, @requiresScopes, @policy)
  - Root operation types (Query, Mutation)
  - All GraphQL type kinds (Object, Enum, Input, Scalar)

### Documentation

- Complete architectural documentation
- Three-namespace design (snake_case, camelCase, hyphen-case)
- 15 core extension fields specification
- Development roadmap (5 phases)
- Coding standards for Rust and TypeScript
- Testing guidelines with examples
- RFC process for major changes

### Standards Compliance

- JSON Schema 2020-12 specification
- GraphQL October 2021 specification
- Apollo Federation v2.9 support
- MIT License

## Version History

### Version Numbering

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Incompatible API changes or breaking changes
- **MINOR** version: New functionality in a backward compatible manner
- **PATCH** version: Backward compatible bug fixes

### Release Process

1. Update this CHANGELOG.md with new version
2. Update version in Cargo.toml and package.json
3. Create git tag: `git tag -a v0.1.0 -m "Release v0.1.0"`
4. Push tag: `git push origin v0.1.0`
5. Publish to crates.io: `cargo publish`
6. Publish to npm: `npm publish`
7. Create GitHub release with release notes

## Links

- [Repository](https://github.com/JJediny/json-schema-x-graphql)
- [Issues](https://github.com/JJediny/json-schema-x-graphql/issues)
- [Pull Requests](https://github.com/JJediny/json-schema-x-graphql/pulls)
- [Discussions](https://github.com/JJediny/json-schema-x-graphql/discussions)

---

**Maintained by**: @JJediny and contributors  
**License**: MIT
