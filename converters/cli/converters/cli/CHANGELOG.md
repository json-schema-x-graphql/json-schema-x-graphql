# Changelog

## 1.0.0 (2026-09-13)


### 🎉 Features

* add --directive-filter CLI option and document new features ([#200](https://github.com/json-schema-x-graphql/json-schema-x-graphql/issues/200)) ([ba2a986](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ba2a986a5e2abe43dd58fbc9b9cfce8e01ff7770))
* consolidate issues, add Standard Schema & Codegen interop, SIMD optimizations ([04a3094](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/04a30943fcbb6263ae5af4f68c9decc82fb48c24))
* implement deprecation shim and migration script for nested fede… ([0722f55](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0722f557f625b7efedfbe1bfc506c2049c8d3a33))
* implement deprecation shim and migration script for nested federation object ([0e67211](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/0e67211b7707f96373cb5c749e315d50bcb945e9))
* Phase 1-4 Issue Consolidation (Codegen, Zod, SIMD, Strict Meta-Schema) ([9a19974](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/9a199744c4d79b7aca6439e535cc6fa6394fa059))
* **release:** update release workflow and CLI package config for multi-package publishing ([125711e](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/125711ebc356c6641e7a085a2dc04d028525152e))


### 🐛 Bug Fixes

* **deps:** align opentelemetry, export generateTypeScript from core, add cli node types, override auto-bind v4 ([f2a5332](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/f2a5332d82f4397b8faf5328ab05db7dd6c60ab6))
* security audit — Dependabot/CodeQL findings, dead code, error handling ([849d705](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/849d7058f8ee67fc6f4c89d2998f0d4fc7acb533))
* security audit — Dependabot/CodeQL findings, dead code, error handling ([3f68e78](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3f68e7808431cb73caa30c50c2d43e9da9200163))


### ♻️ Refactoring

* extract CLI & validators into @json-schema-x-graphql/cli package ([3c925e4](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3c925e47631728e297be67eea708274c19e0555b))


### 🎨 Styling

* apply prettier formatting to sources and tests ([b966bdc](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/b966bdcc187c85caf39f0b96ff5891cd46eb4735))


### 🏗️ Build System & Dependencies

* **deps:** bump the workspace-npm-dependencies group across 1 directory with 29 updates ([433c028](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/433c0288253ac410cdfba1611c048cc63e3d31fa))
* **deps:** bump the workspace-npm-dependencies group across 1 directory with 29 updates ([2cf3060](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/2cf306019af402c674f416ba739f60e388a769a4))
* **deps:** bump the workspace-npm-dependencies group with 32 updates ([3c8f796](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3c8f796ceed57708299500aa1f971186ad3ffd53))
* **deps:** bump the workspace-npm-dependencies group with 32 updates ([3e9286b](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/3e9286b1eba390f3093df66027553339536092ca))
* **deps:** consolidate and upgrade package dependencies across workspace ([ea8d5ca](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/ea8d5ca5e48eea377be43032fbc63140225a8912))
* **deps:** consolidate and upgrade package dependencies across workspace ([af03988](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/af0398844f33839e43bada27a6e25a06adb7ca02))
* eliminate remaining unused variables and catch blocks to stabilize CI ([845f96a](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/845f96ad08f9b7d2ff86b722b073ea7e6b6ba6a0))
* fix Rust/Node formatting and add prek pre-commit hooks ([412e238](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/412e23838fadc89fff4b266757b8c9b1e099c05a))
* lint cleanup, remove dead code, add voyager docs ([c6d1215](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/c6d12157a92f356eb4bb5dc0f78e28e0cf57613d))
* lint cleanup, remove dead code, add voyager docs ([e6287b3](https://github.com/json-schema-x-graphql/json-schema-x-graphql/commit/e6287b3689b75b4b24bf4961b8f64b5b7072512f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @json-schema-x-graphql/core bumped to 1.0.0
