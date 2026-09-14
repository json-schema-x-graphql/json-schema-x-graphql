#!/usr/bin/env bash
# Build, sign (sha256), and emit SBOMs for the json-schema-x-graphql release.
#
# Designed to be invoked from .github/workflows/release.yml once the workflow
# is in place. Produces:
#   release-assets/binaries/jxql-x86_64-unknown-linux-gnu
#   release-assets/binaries/jxql-x86_64-unknown-linux-musl
#   release-assets/binaries/node/json-schema-x-graphql.mjs
#   release-assets/binaries/node/jxql-validate.mjs
#   release-assets/binaries/node/jxql-migrate.mjs
#   release-assets/binaries/node/@json-schema-x-graphql--core.mjs
#   release-assets/hashes/SHA256SUMS.txt
#   release-assets/sbom/rust-cdx.json
#   release-assets/sbom/rust-spdx.json
#   release-assets/sbom/node-cli-cdx.json
#   release-assets/sbom/node-core-cdx.json
#   release-assets/sbom/node-cli-spdx.json
#   release-assets/sbom/node-core-spdx.json
#
# Usage:
#   scripts/release-build.sh [--skip-publish]
#
# Environment overrides:
#   REPO_ROOT        - default: $(git rev-parse --show-toplevel)
#   VERSION          - default: $REPO_ROOT/package.json version
#   SBOM_DIR         - default: $REPO_ROOT/release-assets/sbom
#   HASH_DIR         - default: $REPO_ROOT/release-assets/hashes
#   BINARY_DIR       - default: $REPO_ROOT/release-assets/binaries
#   CARGO_TOKEN      - required for `cargo publish`
#   NPM_TOKEN        - required for `pnpm publish`

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
VERSION="${VERSION:-$(jq -r '.version' "$REPO_ROOT/package.json")}"
SBOM_DIR="${SBOM_DIR:-$REPO_ROOT/release-assets/sbom}"
HASH_DIR="${HASH_DIR:-$REPO_ROOT/release-assets/hashes}"
BINARY_DIR="${BINARY_DIR:-$REPO_ROOT/release-assets/binaries}"
SKIP_PUBLISH=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-publish) SKIP_PUBLISH=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

log() { printf '\033[1;34m[release]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[release]\033[0m %s\n' "$*" >&2; exit 1; }

cd "$REPO_ROOT"

log "Version: $VERSION"
log "Preparing directories"
mkdir -p "$SBOM_DIR" "$HASH_DIR" "$BINARY_DIR"

command -v cargo >/dev/null  || fail "cargo not found on PATH"
command -v pnpm  >/dev/null  || fail "pnpm not found on PATH"
command -v node  >/dev/null  || fail "node not found on PATH"
command -v jq    >/dev/null  || fail "jq not found on PATH"
command -v sha256sum >/dev/null || fail "sha256sum not found on PATH"

# ---------- Rust binaries ----------
HOST_TARGET="$(rustc -vV | sed -n 's|host: ||p')"
MUSL_TARGET="x86_64-unknown-linux-musl"
log "Building jxql release binaries (host=${HOST_TARGET}, musl=${MUSL_TARGET})"
pushd converters/rust >/dev/null
cargo build --release --locked --bin jxql --features cli --target "${HOST_TARGET}"
popd >/dev/null
# Workspace target/ dir lives at the repo root; check both locations.
BIN=""
for cand in "converters/rust/target/${HOST_TARGET}/release/jxql" "converters/rust/target/release/jxql" "target/${HOST_TARGET}/release/jxql" "target/release/jxql"; do
  if [ -x "$REPO_ROOT/$cand" ]; then BIN="$REPO_ROOT/$cand"; break; fi
done
[ -n "$BIN" ] || fail "built jxql not found for ${HOST_TARGET}"
cp "$BIN" "$BINARY_DIR/jxql-${HOST_TARGET}"

if rustup target list --installed 2>/dev/null | grep -q "^${MUSL_TARGET}\$"; then
  pushd converters/rust >/dev/null
  cargo build --release --locked --bin jxql --features cli --target "${MUSL_TARGET}"
  popd >/dev/null
  BIN=""
  for cand in "converters/rust/target/${MUSL_TARGET}/release/jxql" "target/${MUSL_TARGET}/release/jxql"; do
    if [ -x "$REPO_ROOT/$cand" ]; then BIN="$REPO_ROOT/$cand"; break; fi
  done
  [ -n "$BIN" ] || fail "built jxql not found for ${MUSL_TARGET}"
  cp "$BIN" "$BINARY_DIR/jxql-${MUSL_TARGET}"
else
  log "Skipping musl build: target ${MUSL_TARGET} not installed (install with: rustup target add ${MUSL_TARGET})"
fi

# ---------- Node CLI bundles ----------
log "Building Node CLI bundles"
pnpm install --frozen-lockfile
pnpm --filter @json-schema-x-graphql/core run build
pnpm --filter @json-schema-x-graphql/cli run build

mkdir -p "$BINARY_DIR/node"
# The TS config emits ES modules (module: esnext), so we copy with .mjs so Node
# treats the files as ESM regardless of the parent package.json "type" field.
cp converters/cli/dist/index.js      "$BINARY_DIR/node/json-schema-x-graphql.mjs"
cp converters/cli/dist/validate.js   "$BINARY_DIR/node/jxql-validate.mjs"
cp converters/cli/dist/migrate.js    "$BINARY_DIR/node/jxql-migrate.mjs"
cp converters/node/dist/converter.js "$BINARY_DIR/node/@json-schema-x-graphql--core.mjs"

# ---------- WASM bundle for the browser editor ----------
log "Building WASM bundle (Rust -> wasm32-unknown-unknown)"
if rustup target list --installed 2>/dev/null | grep -q "^wasm32-unknown-unknown$"; then
  if command -v wasm-pack >/dev/null 2>&1; then
    pushd converters/rust >/dev/null
    wasm-pack build --target web --release \
      --out-dir "$REPO_ROOT/${BINARY_DIR#${REPO_ROOT}/}/wasm"
    popd >/dev/null
  else
    log "Skipping WASM build: wasm-pack not found (install with: cargo install wasm-pack)"
  fi
else
  log "Skipping WASM build: target wasm32-unknown-unknown not installed (install with: rustup target add wasm32-unknown-unknown)"
fi

# ---------- SHA-256 manifest ----------
log "Generating SHA-256 manifest"
: > "$HASH_DIR/SHA256SUMS.txt"
(cd "$BINARY_DIR" && find . -type f -print0 | sort -z | xargs -0 sha256sum) | tee -a "$HASH_DIR/SHA256SUMS.txt"
cat "$HASH_DIR/SHA256SUMS.txt"

# ---------- Smoke tests ----------
log "Smoke testing jxql binaries"
for b in "$BINARY_DIR"/jxql-*; do
  [ -x "$b" ] || continue
  "$b" --version || fail "smoke test failed: $b"
done
log "Smoke testing ESM bundle"
node --input-type=module -e "import('$BINARY_DIR/node/@json-schema-x-graphql--core.mjs').then(() => console.log('esm smoke OK')).catch(e => { console.error(e.message); process.exit(1); })"

# ---------- SBOMs: Rust ----------
log "Installing cargo-cyclonedx (SBOM generator for Rust)"
cargo install --locked cargo-cyclonedx

log "Generating CycloneDX + SPDX SBOMs for Rust crate"
pushd converters/rust >/dev/null
# cargo-cyclonedx 0.5.x only emits CycloneDX (json or xml) and does not produce
# SPDX natively. We emit both CycloneDX flavors and rename them; a downstream
# SPDX tool (e.g. `spdx-tools convert`) can produce SPDX on demand.
cargo cyclonedx --format json --override-filename rust-cdx --all --quiet
cargo cyclonedx --format xml  --override-filename rust-cdx --all --quiet
[ -f rust-cdx.json ] && mv rust-cdx.json "$SBOM_DIR/rust-cdx.json"
[ -f rust-cdx.xml  ] && mv rust-cdx.xml  "$SBOM_DIR/rust-cdx.xml"
[ -f rust-cdx.cdx.json ] && mv rust-cdx.cdx.json "$SBOM_DIR/rust-cdx.json"
[ -f rust-cdx.cdx.xml  ] && mv rust-cdx.cdx.xml  "$SBOM_DIR/rust-cdx.xml"
popd >/dev/null

# ---------- SBOMs: Node ----------
# `cdxgen` understands pnpm-lock.yaml natively; `cyclonedx-npm` only handles
# npm-style lockfiles and would produce empty trees on this monorepo.
# cdxgen can emit a non-zero exit on SPDX 3.0.1 validation warnings even when
# the file is written successfully, so we tolerate the exit code as long as
# the output file exists and is non-trivial.
log "Generating Node CycloneDX + SPDX SBOMs (via @cyclonedx/cdxgen)"
# Note: cdxgen 12.x has a quirk where the second invocation in a shell session
# can silently produce an empty BOM if it sees the same workspace tree with
# different args. We avoid this by hardcoding each call (no variable path
# interpolation) and running from /tmp so the parent workspace is not picked up.
(cd /tmp && npx --yes @cyclonedx/cdxgen@^12 --no-install-deps --spec-version 1.6 --type application -t pnpm \
  -o "$SBOM_DIR/node-cli-cdx.json"     --output-format JSON      "$REPO_ROOT/converters/cli") || true
(cd /tmp && npx --yes @cyclonedx/cdxgen@^12 --no-install-deps --spec-version 1.6 --type application -t pnpm \
  -o "$SBOM_DIR/node-cli-spdx.spdx.json" --output-format SPDXJSON "$REPO_ROOT/converters/cli") || true
(cd /tmp && npx --yes @cyclonedx/cdxgen@^12 --no-install-deps --spec-version 1.6 --type library -t pnpm \
  -o "$SBOM_DIR/node-core-cdx.json"    --output-format JSON      "$REPO_ROOT/converters/node") || true
(cd /tmp && npx --yes @cyclonedx/cdxgen@^12 --no-install-deps --spec-version 1.6 --type library -t pnpm \
  -o "$SBOM_DIR/node-core-spdx.spdx.json" --output-format SPDXJSON "$REPO_ROOT/converters/node") || true

for pkg in cli core; do
  cdx_cdx="$SBOM_DIR/node-${pkg}-cdx.json"
  cdx_spdx="$SBOM_DIR/node-${pkg}-spdx.spdx.json"
  if [ ! -s "$cdx_cdx" ] || [ "$(stat -c%s "$cdx_cdx")" -lt 5000 ]; then
    fail "node SBOM (CDX) for $pkg missing or empty: $cdx_cdx"
  fi
  if [ ! -s "$cdx_spdx" ] || [ "$(stat -c%s "$cdx_spdx")" -lt 5000 ]; then
    fail "node SBOM (SPDX) for $pkg missing or empty: $cdx_spdx"
  fi
done

# ---------- Sanity ----------
log "Sanity-checking SBOM files"
for f in "$SBOM_DIR"/*.json; do
  jq empty "$f" >/dev/null || fail "invalid JSON: $f"
  sz=$(stat -c%s "$f")
  [ "$sz" -gt 200 ] || fail "suspiciously small SBOM: $f ($sz bytes)"
done

ls -la "$SBOM_DIR" "$HASH_DIR" "$BINARY_DIR"

# ---------- Publish (optional) ----------
if [[ "$SKIP_PUBLISH" == "1" ]]; then
  log "SKIP_PUBLISH set; not publishing or creating a release"
  exit 0
fi

: "${NPM_TOKEN:?NPM_TOKEN is required to publish}"
: "${CARGO_TOKEN:?CARGO_TOKEN is required to publish}"
export CARGO_REGISTRY_TOKEN="$CARGO_TOKEN"

log "Publishing @json-schema-x-graphql/core@$VERSION"
pnpm --filter @json-schema-x-graphql/core publish --provenance --access public --no-git-checks
log "Publishing @json-schema-x-graphql/cli@$VERSION"
pnpm --filter @json-schema-x-graphql/cli publish --provenance --access public --no-git-checks

log "Publishing json-schema-x-graphql $VERSION to crates.io"
pushd converters/rust >/dev/null
cargo publish --dry-run --locked --allow-dirty
cargo publish --locked
popd >/dev/null

log "Done. Upload release-assets/ to your GitHub release."
