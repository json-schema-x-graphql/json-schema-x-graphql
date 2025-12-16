# 0009: Use GraphQL-ESLint for SDL Linting

Date: 2025-12-16

## Status

Accepted

## Context

As the JSON Schema to GraphQL converter grows in complexity and federation support expands, schema validation becomes increasingly important. We needed a linting solution to catch issues in GraphQL Schema Definition Language (SDL) before they reach validators or federation composition tools.

The landscape of GraphQL linting tools includes:
- **GraphQL-ESLint** (@graphql-eslint/eslint-plugin) - ESLint-based, actively maintained
- **Spectaql** - Schema documentation focused
- **GraphQL Inspector** - Schema comparison and change detection
- **Custom validators** - Ad-hoc validation logic

We evaluated the key requirements:
1. **Active Maintenance**: Regular updates and security patches
2. **Community Usage**: Widely adopted to leverage ecosystem knowledge
3. **Federation Support**: Ability to validate federation directives
4. **Extensibility**: Support for custom rules for x-graphql-* extensions
5. **Integration**: Works with existing tooling and CI/CD pipelines

## Decision

**Adopt GraphQL-ESLint (@graphql-eslint/eslint-plugin) as the standard GraphQL SDL linter for this project.**

Additionally, implement a **custom SDL linter** (`lintSDL()` function) in `federation-validator.js` that provides:
- Naming convention checks (PascalCase for types, snake_case for fields)
- Federation directive validation (@key, @extends, @external placement)
- x-graphql-* metadata validation
- Duplicate type detection
- Empty type detection

The custom linter serves as a lightweight, dependency-free option, while GraphQL-ESLint can be integrated for comprehensive linting when users want full ESLint integration.

## Consequences

### Positive

- **Industry Standard**: GraphQL-ESLint is the most widely used, actively maintained GraphQL linter in the ecosystem
- **ESLint Integration**: Leverages familiar ESLint configuration and tooling
- **Federation Support**: Comprehensive rules for @key, @extends, @requires, @provides, etc.
- **Extensibility**: Support for custom rules to validate x-graphql-* extensions
- **Community Best Practices**: Access to community-contributed rules and patterns
- **Dual Approach**: Custom linter provides immediate value; GraphQL-ESLint adds enterprise features
- **IDE Support**: ESLint integration enables real-time linting in IDEs

### Negative

- **Additional Dependency**: Adds GraphQL-ESLint to project dependencies (though optional for custom linter)
- **Configuration Required**: ESLint config needs setup for GraphQL files
- **Learning Curve**: Developers need to understand ESLint rules and configuration
- **Plugin Ecosystem**: Quality of community rules varies; vetting needed

### Tradeoffs

- **Lightweight Option**: Custom `lintSDL()` function works without additional dependencies
- **Enterprise Option**: Full GraphQL-ESLint integration for organizations with strict linting needs
- **Gradual Adoption**: Teams can start with custom linter, graduate to GraphQL-ESLint as needs grow

## Implementation Strategy

### Phase 1: Custom SDL Linter (Completed)
Implement `lintSDL()` function with:
- Type naming convention checks
- Field naming convention checks
- Federation directive validation
- Duplicate type detection
- Empty type warnings

### Phase 2: GraphQL-ESLint Integration (Future)
When ESLint adoption is needed:
- Install @graphql-eslint/eslint-plugin
- Create `.eslintrc.js` for GraphQL files
- Define rules for federation and x-graphql-* extensions
- Add to CI/CD pipeline

### Phase 3: Custom Rules (Future)
Develop custom ESLint rules for:
- x-graphql-supergraph-* and x-graphql-subgraph-* validation
- x-graphql-type annotation consistency
- x-graphql-is-entity-key validation
- Supergraph composition rules

## Usage Examples

### Custom Linter
```javascript
import { lintSDL } from './federation-validator.js';

const sdl = `type User @key(fields: "id") { id: ID! }`;
const issues = lintSDL(sdl);

console.log('Errors:', issues.errors);   // Critical issues
console.log('Warnings:', issues.warnings); // Best practice violations
console.log('Infos:', issues.infos);       // Informational hints
```

### Future GraphQL-ESLint Usage
```javascript
// .eslintrc.js
module.exports = {
  parser: '@graphql-eslint/eslint-plugin',
  parserOptions: {
    skipGraphQLConfig: true,
  },
  plugins: ['@graphql-eslint'],
  rules: {
    '@graphql-eslint/known-fragment-names': 'error',
    '@graphql-eslint/unique-fragment-names': 'error',
    '@graphql-eslint/federation/unique-type-and-field-names': 'error',
  },
};
```

## Validation Rules Implemented

The custom SDL linter checks:

| Check | Level | Description |
|-------|-------|-------------|
| Type PascalCase | Error | Types must start with uppercase letter |
| Field snake_case | Warning | Fields should use snake_case |
| @extends without @key | Warning | Extending types should repeat @key |
| @external without @extends | Warning | @external only valid with @extends |
| Duplicate types | Error | Type defined multiple times |
| Empty types | Info | Type has no fields or only _empty |

## References

- GraphQL-ESLint: https://github.com/B2o5T/graphql-eslint
- GraphQL-ESLint Rules: https://github.com/B2o5T/graphql-eslint/blob/master/docs/rules/README.md
- Apollo Federation Rules: https://github.com/B2o5T/graphql-eslint#federation
- ESLint Configuration: https://eslint.org/docs/latest/use/configure/configuration-files

## Adoption Path

1. ✅ **Implemented**: Custom `lintSDL()` in federation-validator.js
2. ⏳ **Pending**: GraphQL-ESLint package installation and configuration
3. ⏳ **Future**: Integration into CI/CD pipeline
4. ⏳ **Future**: Custom ESLint rules for x-graphql-* metadata
