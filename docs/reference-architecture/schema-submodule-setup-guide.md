# Schema Submodule Setup Guide

**Status:** Ready to Begin  
**Prerequisites:** ✅ All Complete  
**Estimated Time:** 1-2 weeks  
**Priority:** Medium

---

## Overview

Extract the canonical schemas and generator/validator scripts to a standalone repository (`schema-unification-project-schemas`) for reuse across multiple projects. This will enable other teams to:

1. Import canonical contract schemas without cloning the entire application
2. Use generator/validator scripts as a library
3. Contribute schema improvements independently
4. Version schemas separately from the main application

---

## Prerequisites Status

✅ **Documentation Consolidation:** 95% complete  
✅ **Scripts Audit:** 100% complete  
✅ **All Scripts Tested:** 215 tests passing  
✅ **API Documentation:** Complete (`scripts/API.md`)  
✅ **No Blockers:** All issues resolved

**Ready to proceed:** Yes

---

## Architecture

### New Repository Structure

```
schema-unification-project-schemas/
├── schemas/                          # Canonical schemas
│   ├── schema_unification.schema.json         # Main contract schema (snake_case)
│   ├── legacy_procurement.schema.json            # Legacy Procurement system schema
│   ├── logistics_mgmt.schema.json              # Logistics Mgmt system schema
│   ├── intake_process.schema.json              # Intake Process system schema
│   ├── contract_data.schema.json              # Contract Data system schema
│   ├── public_spending.schema.json       # USASpending system schema
│   └── generated/                    # Generated artifacts
│       ├── schema_unification.from-json.graphql
│       ├── schema_unification.from-graphql.json
│       ├── schema_unification.v2.from-graphql.json
│       └── field-name-mapping.json
│
├── scripts/                          # Generator and validator scripts
│   ├── generators/
│   │   ├── generate-graphql-from-json-schema.mjs
│   │   ├── generate-graphql-json-schema.mjs
│   │   ├── generate-graphql-json-schema-v2.mjs
│   │   ├── generate-schema-interop.mjs
│   │   ├── generate-field-mapping.mjs
│   │   ├── generate-all-subgraphs.mjs
│   │   └── generate-supergraph.mjs
│   │
│   ├── validators/
│   │   ├── validate-schema.mjs
│   │   ├── validate-graphql-vs-jsonschema.mjs
│   │   ├── validate-schema-sync.mjs
│   │   └── validate-graphql-vs-jsonschema-v2.mjs
│   │
│   ├── helpers/
│   │   ├── case-conversion.mjs
│   │   ├── format-json.mjs
│   │   ├── generate-graphql-json-schema-helpers.mjs
│   │   └── federation-directives.mjs
│   │
│   └── lib/
│       ├── graphql-hints.mjs
│       ├── graphql-utils-proto.mjs
│       └── ir-to-graphql.mjs
│
├── __tests__/                        # Comprehensive test suite
│   ├── fixtures/
│   ├── generators/
│   ├── validators/
│   └── helpers/
│
├── docs/                             # Standalone documentation
│   ├── README.md                     # Getting started
│   ├── API.md                        # Complete API reference
│   ├── SCHEMA-ARCHITECTURE.md        # Schema design
│   └── CONTRIBUTING.md               # Contribution guide
│
├── .github/
│   └── workflows/
│       ├── test.yml                  # Run tests on PR
│       ├── validate.yml              # Validate schemas
│       └── publish.yml               # Publish to npm (optional)
│
├── package.json                      # Dependencies and scripts
├── jest.config.mjs                   # Test configuration
├── LICENSE.md                        # License
└── README.md                         # Main README
```

---

## Implementation Steps

### Week 8: Repository Setup

#### Task 1: Create New Repository

```bash
# On GitHub
# 1. Navigate to https://github.com/GSA-TTS
# 2. Click "New repository"
# 3. Name: schema-unification-project-schemas
# 4. Description: Canonical contract schemas and tooling for federal acquisition data
# 5. Public repository (open source)
# 6. Initialize with README
# 7. Add LICENSE (same as main repo)
```

#### Task 2: Clone and Initialize

```bash
# Clone the new repository
git clone https://github.com/GSA-TTS/schema-unification-project-schemas.git
cd schema-unification-project-schemas

# Create directory structure
mkdir -p schemas/generated
mkdir -p scripts/{generators,validators,helpers,lib}
mkdir -p __tests__/{fixtures,generators,validators,helpers}
mkdir -p docs
mkdir -p .github/workflows
```

#### Task 3: Extract Schemas

Copy schema files from main repository:

```bash
# From main repository root
cp src/data/schema_unification.schema.json ../schema-unification-project-schemas/schemas/
cp src/data/legacy_procurement.schema.json ../schema-unification-project-schemas/schemas/
cp src/data/logistics_mgmt.schema.json ../schema-unification-project-schemas/schemas/
cp src/data/intake_process.schema.json ../schema-unification-project-schemas/schemas/
cp src/data/contract_data.schema.json ../schema-unification-project-schemas/schemas/
cp src/data/public_spending.schema.json ../schema-unification-project-schemas/schemas/
```

#### Task 4: Extract Scripts

Copy script files:

```bash
# Generators
cp scripts/generate-graphql-from-json-schema.mjs ../schema-unification-project-schemas/scripts/generators/
cp scripts/generate-graphql-json-schema.mjs ../schema-unification-project-schemas/scripts/generators/
cp scripts/generate-graphql-json-schema-v2.mjs ../schema-unification-project-schemas/scripts/generators/
cp scripts/generate-schema-interop.mjs ../schema-unification-project-schemas/scripts/generators/
cp scripts/generate-field-mapping.mjs ../schema-unification-project-schemas/scripts/generators/
cp scripts/generate-all-subgraphs.mjs ../schema-unification-project-schemas/scripts/generators/
cp scripts/generate-supergraph.mjs ../schema-unification-project-schemas/scripts/generators/

# Validators
cp scripts/validate-schema.mjs ../schema-unification-project-schemas/scripts/validators/
cp scripts/validate-graphql-vs-jsonschema.mjs ../schema-unification-project-schemas/scripts/validators/
cp scripts/validate-schema-sync.mjs ../schema-unification-project-schemas/scripts/validators/
cp scripts/validate-graphql-vs-jsonschema-v2.mjs ../schema-unification-project-schemas/scripts/validators/

# Helpers
cp scripts/helpers/case-conversion.mjs ../schema-unification-project-schemas/scripts/helpers/
cp scripts/helpers/format-json.mjs ../schema-unification-project-schemas/scripts/helpers/
cp scripts/helpers/generate-graphql-json-schema-helpers.mjs ../schema-unification-project-schemas/scripts/helpers/
cp scripts/helpers/federation-directives.mjs ../schema-unification-project-schemas/scripts/helpers/

# Lib
cp scripts/lib/graphql-hints.mjs ../schema-unification-project-schemas/scripts/lib/
cp scripts/lib/graphql-utils-proto.mjs ../schema-unification-project-schemas/scripts/lib/
cp scripts/lib/ir-to-graphql.mjs ../schema-unification-project-schemas/scripts/lib/
```

#### Task 5: Extract Tests

Copy test files:

```bash
cp -r __tests__/fixtures/ ../schema-unification-project-schemas/__tests__/
cp -r __tests__/scripts/generators/ ../schema-unification-project-schemas/__tests__/
cp -r __tests__/scripts/validators/ ../schema-unification-project-schemas/__tests__/
cp -r __tests__/helpers/ ../schema-unification-project-schemas/__tests__/
```

#### Task 6: Create package.json

```json
{
  "name": "@gsa-tts/schema-unification-project-schemas",
  "version": "1.0.0",
  "description": "Canonical contract schemas and tooling for federal acquisition data",
  "type": "module",
  "main": "scripts/generators/generate-schema-interop.mjs",
  "exports": {
    ".": "./scripts/generators/generate-schema-interop.mjs",
    "./generators/*": "./scripts/generators/*.mjs",
    "./validators/*": "./scripts/validators/*.mjs",
    "./helpers/*": "./scripts/helpers/*.mjs",
    "./lib/*": "./scripts/lib/*.mjs",
    "./schemas/*": "./schemas/*"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "validate": "node scripts/validators/validate-schema.mjs",
    "validate:sync": "node scripts/validators/validate-schema-sync.mjs",
    "validate:all": "npm run validate && npm run validate:sync",
    "generate": "node scripts/generators/generate-schema-interop.mjs"
  },
  "keywords": [
    "contract",
    "schema",
    "graphql",
    "json-schema",
    "federal-acquisition",
    "contract_data",
    "public_spending"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/GSA-TTS/schema-unification-project-schemas.git"
  },
  "license": "SEE LICENSE IN LICENSE.md",
  "dependencies": {
    "@graphql-tools/schema": "^10.0.0",
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1",
    "graphql": "^16.8.1",
    "prettier": "^3.0.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

#### Task 7: Copy Configuration Files

```bash
cp jest.config.mjs ../schema-unification-project-schemas/
cp .eslintrc.json ../schema-unification-project-schemas/ # If needed
```

#### Task 8: Create Documentation

Copy and adapt documentation:

```bash
cp scripts/API.md ../schema-unification-project-schemas/docs/
cp docs/SCHEMA-ARCHITECTURE.md ../schema-unification-project-schemas/docs/
cp CONTRIBUTING.md ../schema-unification-project-schemas/docs/
```

Create standalone README:

```markdown
# Schema Unification Forest Schemas

Canonical contract schemas and tooling for federal acquisition data interoperability.

## Quick Start

### Installation

\`\`\`bash
npm install @gsa-tts/schema-unification-project-schemas
\`\`\`

### Usage

\`\`\`javascript
import { generateFromJSONSchema } from '@gsa-tts/schema-unification-project-schemas/generators/generate-graphql-from-json-schema.mjs';
import { validateFiles } from '@gsa-tts/schema-unification-project-schemas/validators/validate-schema.mjs';

// Generate GraphQL SDL from JSON Schema
const outputPath = await generateFromJSONSchema({
  schemaPath: './schemas/schema_unification.schema.json'
});

// Validate schemas
const results = await validateFiles();
\`\`\`

### Schemas Included

- **schema_unification.schema.json** - Main contract schema
- **legacy_procurement.schema.json** - Legacy Procurement system schema
- **logistics_mgmt.schema.json** - Logistics Mgmt system schema
- **intake_process.schema.json** - Intake Process system schema
- **contract_data.schema.json** - Contract Data system schema
- **public_spending.schema.json** - USASpending system schema

## Documentation

- [API Reference](./docs/API.md)
- [Schema Architecture](./docs/SCHEMA-ARCHITECTURE.md)
- [Contributing](./docs/CONTRIBUTING.md)

## License

See [LICENSE.md](./LICENSE.md)
\`\`\`

#### Task 9: Set Up CI/CD

Create `.github/workflows/test.yml`:

\`\`\`yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run validate:all
\`\`\`

#### Task 10: Initial Commit and Push

\`\`\`bash
cd schema-unification-project-schemas
git add .
git commit -m "Initial commit: Extract schemas and tooling from main repository"
git push origin main
\`\`\`

---

### Week 9: Integration and Documentation

#### Task 1: Add Submodule to Main Repository

\`\`\`bash
cd /path/to/enterprise-schema-unification
git submodule add https://github.com/GSA-TTS/schema-unification-project-schemas.git schemas-submodule
git submodule update --init --recursive
\`\`\`

#### Task 2: Update Main Repository to Use Submodule

Update import paths in main repository scripts:

\`\`\`javascript
// Before
import { generateFromJSONSchema } from './scripts/generate-graphql-from-json-schema.mjs';

// After
import { generateFromJSONSchema } from './schemas-submodule/scripts/generators/generate-graphql-from-json-schema.mjs';
\`\`\`

#### Task 3: Update Main Repository package.json

Add submodule scripts:

\`\`\`json
{
  "scripts": {
    "submodule:update": "git submodule update --remote schemas-submodule",
    "submodule:test": "cd schemas-submodule && npm test",
    "generate:schema:interop": "cd schemas-submodule && npm run generate"
  }
}
\`\`\`

#### Task 4: Update CI/CD in Main Repository

Update `.github/workflows/validate-schemas.yml`:

\`\`\`yaml
name: Validate Schemas

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: cd schemas-submodule && npm ci
      - run: cd schemas-submodule && npm run validate:all
\`\`\`

#### Task 5: Create Integration Documentation

Create `docs/schema-submodule-guide.md`:

\`\`\`markdown
# Schema Submodule Guide

## Working with the Submodule

### Cloning the Repository with Submodules

\`\`\`bash
git clone --recurse-submodules https://github.com/GSA-TTS/enterprise-schema-unification.git
\`\`\`

### Updating the Submodule

\`\`\`bash
# Update to latest version
pnpm run submodule:update

# Or manually
git submodule update --remote schemas-submodule
\`\`\`

### Making Changes to Schemas

1. Navigate to submodule: `cd schemas-submodule`
2. Create a branch: `git checkout -b feature/my-changes`
3. Make changes to schemas
4. Run tests: `npm test`
5. Commit and push to submodule repository
6. Update main repository to reference new commit

### Using Schemas in Other Projects

\`\`\`bash
# Add as npm dependency
npm install @gsa-tts/schema-unification-project-schemas

# Or add as git submodule
git submodule add https://github.com/GSA-TTS/schema-unification-project-schemas.git schemas
\`\`\`
\`\`\`

#### Task 6: Test End-to-End Workflow

1. Make a schema change in submodule
2. Commit and push to submodule repository
3. Update submodule reference in main repository
4. Verify CI passes in both repositories
5. Verify main application uses updated schemas

#### Task 7: Document Workflow for Team

Create team documentation in main repository's README:

\`\`\`markdown
## Schema Development

Schemas are maintained in a separate repository: [schema-unification-project-schemas](https://github.com/GSA-TTS/schema-unification-project-schemas)

To update schemas:
1. Clone the schemas repository
2. Make your changes
3. Run tests: `npm test`
4. Submit PR to schemas repository
5. After merge, update submodule reference in this repository
\`\`\`

---

## Success Criteria

- [ ] New repository created with proper structure
- [ ] All schemas extracted and validated
- [ ] All scripts extracted with tests passing
- [ ] Submodule integrated into main repository
- [ ] CI/CD working in both repositories
- [ ] Documentation complete and accurate
- [ ] Team can clone and use submodule
- [ ] Team can make schema changes workflow

---

## Benefits

1. **Reusability:** Other projects can import schemas without the full application
2. **Versioning:** Schemas can be versioned independently
3. **Modularity:** Clear separation between schemas and application
4. **Collaboration:** Schema changes don't require application knowledge
5. **Publishing:** Can publish to npm for wider distribution
6. **Testing:** Schemas can be tested independently

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes in submodule | Pin to specific commits in main repo; use semantic versioning |
| Sync issues between repos | Automate submodule updates in CI; document update process |
| Circular dependencies | Keep submodule focused on schemas only; no application code |
| Learning curve for team | Comprehensive documentation; team training session |

---

## Future Enhancements

1. **npm Publishing:** Publish to npm registry for intake_processer consumption
2. **Versioning:** Implement semantic versioning for schema releases
3. **Change Log:** Maintain CHANGELOG.md for schema changes
4. **Migration Guides:** Document breaking changes and migrations
5. **Schema Registry:** Consider schema registry for discovery

---

**Next Steps:**

1. Review this plan with team
2. Get approval for creating new repository
3. Schedule Week 8 implementation
4. Coordinate with stakeholders for testing

**Questions?** Contact the development team.
