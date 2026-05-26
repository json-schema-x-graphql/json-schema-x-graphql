# Publishing Guide

This document explains how to publish releases of json-schema-x-graphql to npm, crates.io, and GitHub.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Publishing Methods](#publishing-methods)
- [Manual Release Process](#manual-release-process)
- [Automated Release Process](#automated-release-process)
- [Commit Convention](#commit-convention)
- [Troubleshooting](#troubleshooting)

---

## Overview

This project uses a two-pronged publishing strategy:

1. **Manual Release Workflow** (`.github/workflows/release.yml`)
   - Triggered manually via GitHub Actions
   - Provides complete control over version bumping
   - Updates package.json, Cargo.toml, CHANGELOG.md
   - Publishes to npm and crates.io simultaneously
   - Creates GitHub Release with changelog

2. **Automated Release-Please** (`.github/workflows/release-please.yml`)
   - Automatically creates release PRs based on commits
   - Uses conventional commits to determine version bumps
   - Provides a review step before publishing
   - Complements the manual workflow

## Prerequisites

### GitHub Setup

1. **NPM Token** (`NPM_TOKEN`)
   - Create at: https://www.npmjs.com/settings/~/tokens
   - Permissions: `automation` (read/write)
   - Store in repository secrets

2. **Cargo Token** (`CARGO_TOKEN`)
   - Create at: https://crates.io/me
   - Go to: API Tokens → New Token
   - Store in repository secrets

3. **GitHub Token** (auto-provided as `GITHUB_TOKEN`)
   - Used for creating releases and managing PRs
   - No additional setup required

### Local Setup (if publishing manually)

```bash
# Set up npm authentication
npm login

# Set up Cargo authentication
cargo login
```

## Publishing Methods

### Method 1: Manual Release (Recommended for Patch/Emergency Releases)

Trigger the workflow via GitHub Actions UI:

1. Go to: **Actions** → **Release and Publish**
2. Click **Run workflow**
3. Select version bump type:
   - `patch` - Bug fixes (0.1.0 → 0.1.1)
   - `minor` - New features (0.1.0 → 0.2.0)
   - `major` - Breaking changes (0.1.0 → 1.0.0)
4. Click **Run workflow**

**What happens:**
1. ✅ Runs all tests (Rust + Node)
2. ✅ Calculates new version
3. ✅ Updates `package.json` and `Cargo.toml`
4. ✅ Generates CHANGELOG entries from commits
5. ✅ Commits version bump
6. ✅ Creates git tag
7. ✅ Publishes to npm
8. ✅ Publishes to crates.io
9. ✅ Creates GitHub Release

### Method 2: Automated Release-Please (Recommended for Regular Releases)

Release-Please automatically creates release PRs:

1. **Automatic**: Every push to `main` branch
2. **Manual**: Go to **Actions** → **Release Please** → **Run workflow**

**What happens:**
1. ✅ Analyzes commits since last release
2. ✅ Determines version bump (based on conventional commits)
3. ✅ Creates a release PR with:
   - Updated versions in package.json and Cargo.toml
   - Updated CHANGELOG.md
   - Proposed tag and release notes
4. ✅ When PR is merged, it's ready to publish
5. ✅ Manually trigger the **Release and Publish** workflow to publish

**Recommended Flow:**
```
1. Merge feature PRs to main with conventional commits
2. Release-Please creates a release PR
3. Review and merge the release PR
4. Manually trigger Release and Publish workflow
```

---

## Manual Release Process (Step-by-Step)

### Step 1: Prepare Commits

Ensure all commits follow conventional commits format:

```
feat(converter): add support for union types
fix(wasm): correct field nullability handling
docs(spec): update federation guide
```

### Step 2: Create Release PR (Optional but Recommended)

If using Release-Please:

1. Wait for Release-Please to create a PR
2. Review the proposed changes
3. Approve and merge

### Step 3: Trigger Release Workflow

Via GitHub Actions UI:

1. Go to: **Actions** → **Release and Publish**
2. Click **Run workflow**
3. Select version bump type
4. Confirm

### Step 4: Monitor the Release

Watch the workflow run and verify:

```bash
# Check npm package
npm view json-schema-x-graphql

# Check Cargo package
cargo search json-schema-x-graphql

# Check GitHub Release
https://github.com/json-schema-x-graphql/json-schema-x-graphql/releases
```

### Step 5: Announce Release

Update any relevant channels:
- GitHub discussions
- Discord/Slack channels
- Twitter/announcement channels
- Newsletter

---

## Commit Convention

This project uses **Conventional Commits** to determine version bumps automatically.

### Format

```
type(scope): subject

body

footer
```

### Examples

**Features** (bump `minor`):
```
feat(converter): add support for custom directives

Allows users to define custom GraphQL directives in JSON Schema
using the x-graphql-custom-directives extension.

Closes #123
```

**Bug Fixes** (bump `patch`):
```
fix(wasm): correct field nullability handling

Previously, fields marked with x-graphql-field-non-null were
incorrectly treated as nullable in generated SDL.
```

**Breaking Changes** (bump `major`):
```
feat(spec)!: replace x-graphql-keys with x-graphql-federation-keys

BREAKING CHANGE: The x-graphql-keys extension is deprecated.
Use x-graphql-federation-keys instead.

See MIGRATION.md for migration guide.
```

### Types

- **feat** - New feature (minor bump)
- **fix** - Bug fix (patch bump)
- **perf** - Performance improvement (patch bump)
- **refactor** - Code refactoring (no bump)
- **docs** - Documentation changes (no bump)
- **style** - Code style changes (no bump)
- **chore** - Dependency/build changes (no bump)
- **ci** - CI/CD changes (no bump)

### Breaking Changes

Add `!` before colon to trigger major version bump:

```
feat!: redesign schema structure
feat(converter)!: remove deprecated extensions
fix!: change behavior of field resolution
```

---

## Troubleshooting

### NPM Publishing Fails

**Issue**: `401 Unauthorized`
- **Fix**: Check `NPM_TOKEN` is set in repository secrets
- **Fix**: Verify token hasn't expired (create new token)
- **Fix**: Verify package.json `name` field is correct

**Issue**: `403 Forbidden`
- **Fix**: Verify account has publish permissions
- **Fix**: Check if package is private/restricted

### Cargo Publishing Fails

**Issue**: `error: token not provided`
- **Fix**: Check `CARGO_TOKEN` is set in repository secrets
- **Fix**: Token must be from crates.io (not GitHub)

**Issue**: `error: unable to verify the checksum`
- **Fix**: Delete `Cargo.lock` and regenerate
- **Fix**: Push Cargo.lock to git before publishing

### Release Workflow Hangs

**Issue**: Workflow stuck at "Publish to npm"
- **Fix**: Check npm registry status
- **Fix**: Manually cancel and retry

**Issue**: "Failed to push tag"
- **Fix**: Verify Git credentials are correct
- **Fix**: Check branch protection rules don't block tags

### Version Mismatch

**Issue**: package.json and Cargo.toml have different versions
- **Fix**: Ensure both files are committed before running release
- **Fix**: Release workflow should keep them in sync

### CHANGELOG Conflicts

**Issue**: CHANGELOG.md merge conflicts
- **Fix**: Resolve conflicts manually before merging release PR
- **Fix**: Ensure only release workflow updates CHANGELOG.md

---

## Release Checklist

Before releasing, verify:

- [ ] All tests pass (`npm run test`, `cargo test`)
- [ ] No uncommitted changes (`git status`)
- [ ] Latest version of `main` branch (`git pull`)
- [ ] CHANGELOG.md looks correct
- [ ] package.json and Cargo.toml versions match
- [ ] npm and Cargo tokens are valid
- [ ] No security issues in dependencies

---

## Version Numbering

This project follows **Semantic Versioning** (SemVer):

- **MAJOR.MINOR.PATCH** (e.g., 2.0.1)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

Examples:
- 2.0.0 → 2.0.1 (patch: bug fix)
- 2.0.0 → 2.1.0 (minor: new feature)
- 2.0.0 → 3.0.0 (major: breaking change)

---

## Integration with External Services

### Changelog Integration

The changelog is automatically generated from commits using:
- **conventional-changelog** for formatting
- **@semantic-release** plugins for changelog generation

### GitHub Release Notes

Release notes include:
- Generated changelog from commits
- Links to related PRs and issues
- Contributors list

### npm Package

The npm package includes:
- Built WASM binaries from `converters/rust/pkg/`
- TypeScript definitions
- README.md and LICENSE

### Cargo Package

The Cargo package includes:
- All Rust source code
- README.md and LICENSE

---

## FAQ

**Q: How often should we release?**
A: No fixed schedule. Release when there are significant changes (features, fixes, or important updates).

**Q: Can I release multiple times a day?**
A: Yes, follow the same process for each release.

**Q: What if I need to revert a release?**
A: Create a new patch release with the revert commit.

**Q: How do I release a pre-release (alpha, beta)?**
A: Release-Please supports pre-release branches (develop, beta). See `.github/release-please.json`.

**Q: Can I manually push to npm without using the workflow?**
A: Not recommended. Use the workflow to ensure:
- Tests pass before publishing
- Versions are synchronized
- Changelog is updated
- GitHub Release is created

---

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Release-Please Documentation](https://github.com/googleapis/release-please)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Cargo Publishing Guide](https://doc.rust-lang.org/cargo/commands/cargo-publish.html)

---

**Last Updated**: 2024-01-XX
**Maintained by**: Project team
