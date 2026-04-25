# Contributing to JSON Schema x GraphQL

Thank you for your interest in contributing to this project! We're building the **canonical standard** for bidirectional JSON Schema ↔ GraphQL SDL conversion, and we welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submission Process](#submission-process)
- [RFC Process](#rfc-process)

---

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- **Be respectful**: Treat all contributors with respect and kindness
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together to solve problems
- **Be inclusive**: Welcome contributors of all backgrounds and skill levels

Unacceptable behavior will not be tolerated and may result in removal from the project.

---

## Getting Started

### Prerequisites

- **Rust** 1.70+ (for core converter)
- **Node.js** 16+ (for frontend and npm package)
- **wasm-pack** (for building WASM modules)
- **Git** for version control

### Development Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/JJediny/json-schema-x-graphql.git
   cd json-schema-x-graphql
   ```

2. **Install Rust dependencies**:

   ```bash
   cargo build
   cargo test
   ```

3. **Install Node.js dependencies**:

   ```bash
   # Use Corepack + pnpm (preferred)
   corepack enable
   corepack prepare pnpm@10.13.1 --activate
   pnpm -w install
   ```

4. **Build WASM module**:

   ```bash
   npm run build:wasm
   ```

5. **Run tests**:

   ```bash
   # Rust tests
   cargo test

   # JavaScript tests
   npm test
   ```

6. **Run the development server** (frontend):
   ```bash
   cd frontend
    pnpm install
   npm run dev
   ```

**Note (CI):** We recommend enabling Corepack in CI and preparing the pinned `pnpm` version before running `pnpm install`. Example (GitHub Actions):

```yaml
- name: Enable Corepack
   run: |
      corepack enable
      corepack prepare pnpm@10.13.1 --activate

- name: Install dependencies
   run: pnpm -w install
```

---

## How to Contribute

### Types of Contributions

We welcome all types of contributions:

1. **Bug Reports**: Found a bug? Open an issue with details
2. **Feature Requests**: Have an idea? Propose it in discussions
3. **Documentation**: Improve docs, examples, or tutorials
4. **Code**: Fix bugs or implement new features
5. **Testing**: Add test cases or improve test coverage
6. **Design**: Improve UX, UI, or architecture

### Finding Work

- Check [Good First Issues](https://github.com/JJediny/json-schema-x-graphql/labels/good%20first%20issue) for beginner-friendly tasks
- Look at [Help Wanted](https://github.com/JJediny/json-schema-x-graphql/labels/help%20wanted) for areas needing legacy_procurementance
- Review the [Roadmap](CONTEXT.md#development-roadmap) for upcoming work
- Ask in [Discussions](https://github.com/JJediny/json-schema-x-graphql/discussions) if you want to tackle something new

---

## Coding Standards

### Rust Code

Follow standard Rust conventions:

- **Use `rustfmt`**: Run `cargo fmt` before committing
- **Use `clippy`**: Run `cargo clippy` and address warnings
- **Document public APIs**: Use doc comments (`///`) for all public items
- **Error handling**: Use `Result` and `anyhow` for error propagation
- **Testing**: Write unit tests for all new functionality

**Example**:

```rust
/// Converts GraphQL SDL to JSON Schema with x-graphql extensions.
///
/// # Arguments
///
/// * `sdl` - GraphQL SDL string to convert
///
/// # Returns
///
/// JSON Schema with x-graphql-* extensions
///
/// # Errors
///
/// Returns error if SDL parsing fails
pub fn sdl_to_json(sdl: &str) -> Result<JsonSchema> {
    // Implementation
}
```

### TypeScript Code

Follow TypeScript best practices:

- **Use ESLint**: Run `npm run lint` before committing
- **Use Prettier**: Run `npm run format` for consistent formatting
- **Type everything**: Avoid `any`, use proper types
- **Document exports**: Use JSDoc comments for public APIs
- **Testing**: Write tests for all new functionality

**Example**:

```typescript
/**
 * Converts GraphQL SDL to JSON Schema.
 *
 * @param sdl - GraphQL SDL string
 * @returns JSON Schema with x-graphql extensions
 * @throws Error if SDL is invalid
 */
export async function convertSdlToJson(sdl: string): Promise<JsonSchema> {
  // Implementation
}
```

### JSON Schema Files

- **Use JSON Schema 2020-12**: All schemas must use the latest draft
- **Include descriptions**: Add descriptions for all types and fields
- **Follow naming conventions**: Use `hyphen-case` for all `x-graphql-*` keys
- **Validate**: Ensure all examples validate against the meta-schema

---

## Testing Guidelines

### Unit Tests (Rust)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_type_conversion() {
        let sdl = r#"
            type User {
                id: ID!
                name: String
            }
        "#;

        let json_schema = sdl_to_json(sdl).unwrap();
        assert_eq!(json_schema.definitions.len(), 1);
    }
}
```

### Integration Tests (JavaScript)

```typescript
describe("SDL to JSON conversion", () => {
  it("should preserve directives", async () => {
    const sdl = `
      type User @key(fields: "id") {
        id: ID!
      }
    `;

    const result = await convertSdlToJson(sdl);
    expect(result.success).toBe(true);
    expect(result.data.$defs.User["x-graphql-federation-keys"]).toBeDefined();
  });
});
```

### Testing Checklist

- [ ] All tests pass locally
- [ ] Added tests for new functionality
- [ ] Updated tests for modified functionality
- [ ] Test coverage remains above 90%
- [ ] Integration tests pass
- [ ] Performance tests show no regression

---

## Submission Process

### 1. Create an Issue First

Before starting work on a significant change:

1. Check if an issue already exists
2. If not, create one describing the change
3. Wait for maintainer feedback before implementing
4. This prevents duplicate work and ensures alignment

**Exception**: Bug fixes, typos, and documentation improvements can skip this step.

### 2. Fork and Branch

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/json-schema-x-graphql.git
cd json-schema-x-graphql
git checkout -b feature/your-feature-name
```

**Branch naming conventions**:

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### 3. Make Your Changes

- Write clean, readable code
- Follow coding standards
- Add tests for new functionality
- Update documentation as needed
- Keep commits atomic and well-described

**Commit message format**:

```
type: short description (50 chars max)

Longer explanation if needed (wrap at 72 chars).

- Bullet points for details
- Reference issues: Fixes #123

Signed-off-by: Your Name <your.email@example.com>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 4. Run the Full Test Suite

```bash
# Rust tests
cargo test
cargo clippy

# Format check
cargo fmt --check

# JavaScript tests
npm test
npm run lint

# Build to ensure no errors
npm run build
```

### 5. Submit a Pull Request

1. Push your branch to your fork
2. Open a PR against the `main` branch
3. Fill out the PR template completely
4. Link related issues
5. Request review from maintainers

**PR Title Format**: `[Type] Short description`

- Examples: `[Feature] Add union type support`, `[Fix] Correct field argument parsing`

### 6. Address Review Feedback

- Respond to all review comments
- Make requested changes
- Push updates to the same branch
- Re-request review when ready

---

## RFC Process

For **major changes** that affect the architecture or API, we use an RFC (Request for Comments) process:

### When to Use RFC

- New core features
- Breaking API changes
- Significant architectural changes
- Changes to extension schema definitions
- New standards/specifications adoption

### RFC Steps

1. **Draft**: Create an issue with `[RFC]` prefix and full proposal
2. **Discussion**: Allow 1-2 weeks for community feedback
3. **Revision**: Update proposal based on feedback
4. **Decision**: Maintainers make final decision
5. **Implementation**: Approved RFCs can be implemented

### RFC Template

```markdown
# RFC: [Feature Name]

## Summary

Brief explanation of the feature.

## Motivation

Why are we doing this? What use cases does it support?

## Detailed Design

Explain the design in enough detail for someone familiar with the codebase to implement it.

## Drawbacks

Why should we _not_ do this?

## Alternatives

What other designs have been considered? What is the impact of not doing this?

## Unresolved Questions

What parts of the design are still TBD?
```

---

## Review Process

### Review Timeline

- **Small PRs** (< 100 lines): 1-3 days
- **Medium PRs** (100-500 lines): 3-7 days
- **Large PRs** (> 500 lines): 1-2 weeks

**Tip**: Smaller PRs get reviewed faster!

### Maintainer Responsibilities

Maintainers will:

- Review PRs within the timeline
- Provide constructive feedback
- Merge approved PRs promptly
- Help contributors succeed

### Contributor Responsibilities

Contributors should:

- Respond to feedback within 1 week
- Keep PRs focused on one change
- Update documentation
- Maintain backward compatibility when possible

---

## Documentation

### Where to Document

- **API changes**: Update `docs/API.md`
- **Architecture changes**: Update `docs/ARCHITECTURE.md`
- **New features**: Add examples to `examples/`
- **Extension changes**: Update `docs/SPECIFICATION.md`
- **User-facing changes**: Update `README.md`

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add diagrams where helpful
- Link to related documentation
- Keep examples up to date

---

## Release Process

Releases are managed by maintainers:

1. **Version bump**: Follow semantic versioning (MAJOR.MINOR.PATCH)
2. **Changelog**: Update `CHANGELOG.md` with all changes
3. **Tag**: Create git tag with version number
4. **Build**: Build and test all artifacts
5. **Publish**:
   - Rust: `cargo publish`
   - npm: `npm publish`
6. **Announce**: Post release notes in discussions

### Semantic Versioning

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

---

## Getting Help

### Where to Ask Questions

- **General questions**: [GitHub Discussions](https://github.com/JJediny/json-schema-x-graphql/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/JJediny/json-schema-x-graphql/issues)
- **Security issues**: Email maintainers privately (see SECURITY.md)
- **Real-time chat**: Discord server (link in README)

### Maintainer Office Hours

Join our weekly office hours:

- **When**: Every Friday, 3-4pm UTC
- **Where**: Discord voice channel
- **What**: Ask questions, discuss proposals, pair programming

---

## Recognition

We value all contributions! Contributors will be:

- Listed in `CONTRIBUTORS.md`
- Mentioned in release notes
- Credited in relevant documentation
- Invited to the contributors Discord channel

Significant contributors may be invited to become maintainers.

---

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

You must have the right to contribute the code and agree that we can distribute it under the project's license.

---

## Questions?

If you have questions about contributing, please:

1. Check this guide first
2. Search existing issues and discussions
3. Ask in [Discussions](https://github.com/JJediny/json-schema-x-graphql/discussions)
4. Reach out to maintainers

**Thank you for contributing!** 🎉

---

**Document Status**: Living document, updated as needed  
**Last Updated**: 2024-01-20  
**Maintainers**: @JJediny and team
