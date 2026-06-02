# Quick Release Reference

## One-Command Release

```bash
# The release workflow handles everything automatically:
# 1. Run tests
# 2. Bump version (patch/minor/major)
# 3. Update CHANGELOG.md
# 4. Publish to npm
# 5. Publish to crates.io
# 6. Create GitHub Release
```

## Trigger Release (4 Steps)

1. **Go to**: GitHub → Actions → "Release and Publish"
2. **Click**: "Run workflow"
3. **Select**: version bump type (patch/minor/major)
4. **Click**: "Run workflow"
5. **Done**: Workflow handles the rest!

## Before Each Release

```bash
# Verify tests pass locally
npm test
cargo test

# Check git is clean
git status

# Ensure on latest main
git pull origin main
```

## Monitor Release

Watch the workflow run → Check artifacts:

```bash
# npm package
npm view json-schema-x-graphql

# Cargo crate
cargo search json-schema-x-graphql

# GitHub Release
https://github.com/json-schema-x-graphql/json-schema-x-graphql/releases
```

## Required Secrets (GitHub Settings)

✅ `NPM_TOKEN` - from https://www.npmjs.com/settings/~/tokens  
✅ `CARGO_TOKEN` - from https://crates.io/me → API Tokens

## Conventional Commits Cheat Sheet

```
feat: new feature          → bump MINOR
fix: bug fix              → bump PATCH
perf: performance         → bump PATCH
docs: documentation      → no bump
chore: dependencies      → no bump
feat!: breaking change   → bump MAJOR
```

## Two Methods to Release

### Method 1: Manual (Full Control)

```
1. Go to Actions → Release and Publish
2. Select version bump
3. Run
```

### Method 2: Automated (Recommended)

```
1. Commits get analyzed automatically
2. Release-Please creates PR with changelog
3. Review and merge PR
4. Trigger Release workflow to publish
```

## Common Issues

| Issue                        | Solution                       |
| ---------------------------- | ------------------------------ |
| `401 Unauthorized` (npm)     | Check NPM_TOKEN in secrets     |
| `403 Forbidden` (npm)        | Verify account permissions     |
| `token not provided` (cargo) | Check CARGO_TOKEN in secrets   |
| Workflow hangs               | Check npm/crates.io status     |
| Version mismatch             | Workflow auto-syncs both files |

## Rollback a Bad Release

```
# Create a new patch release with revert commit
git revert <bad-commit-hash>
git push origin main

# Then trigger Release workflow again
# This creates a new patch with the revert
```

## Emergency Hotfix Release

```bash
# 1. Create bugfix on main
# 2. Commit: "fix: critical bug in X"
# 3. Push to main
# 4. Go to Actions → Release and Publish
# 5. Select "patch"
# 6. Done!
```

## What the Workflow Does

✅ Checks out code  
✅ Runs Rust tests + linting  
✅ Runs Node tests + linting  
✅ Builds WASM  
✅ Calculates new version  
✅ Updates package.json + Cargo.toml  
✅ Generates CHANGELOG from commits  
✅ Commits version bump  
✅ Creates git tag  
✅ Publishes to npm  
✅ Publishes to crates.io  
✅ Creates GitHub Release with changelog

## Full Documentation

See `PUBLISHING.md` for:

- Detailed step-by-step process
- How to write conventional commits
- Troubleshooting guide
- FAQ

## Useful Commands

```bash
# Check npm package
npm view json-schema-x-graphql versions

# Check Cargo crate
curl https://crates.io/api/v1/crates/json-schema-x-graphql

# List recent releases
git tag --sort=-version:refname | head -10
```

---

**Need help?** See PUBLISHING.md for full documentation.
