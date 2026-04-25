#!/usr/bin/env bash
#
# Build helper for the Rust -> WASM converter used by the frontend.
#
# Usage:
#   ./scripts/build-wasm.sh
#
# This script:
#   - Ensures the wasm target is installed
#   - Optionally runs `cargo fix` to apply simple fixes
#   - Builds the WASM package via `wasm-pack` (configured to use the wasm_js backend)
#   - Verifies the generated artifacts and prints their paths
#
# Notes:
#   - Run this from the repository root (the script will attempt to detect repo root
#     automatically if invoked from elsewhere).
#   - The script uses an environment variable `SKIP_CARGO_FIX=1` to bypass `cargo fix`
#     if desired.
#   - If you prefer to set RUSTFLAGS externally for the build environment, you can
#     override the RUSTFLAGS environment variable before invoking this script.
#

set -euo pipefail

# Helpers
log()   { printf "\n\033[1;34m>>\033[0m %s\n" "$*"; }
info()  { printf "\033[1;32m==>\033[0m %s\n" "$*"; }
warn()  { printf "\033[1;33m!!\033[0m %s\n" "$*"; }
err()   { printf "\033[1;31m--\033[0m %s\n" "$*" >&2; }

# Determine repository root (assume this script lives at <repo>/scripts/build-wasm.sh)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Paths
RUST_CRATE_DIR="${REPO_ROOT}/converters/rust"
WASM_OUT_DIR="${REPO_ROOT}/frontend/schema-authoring/src/wasm"

# Default RUSTFLAGS used when building wasm to enable `getrandom` wasm backend.
# This is safe to override externally by exporting RUSTFLAGS before calling the script.
DEFAULT_RUSTFLAGS='--cfg getrandom_backend="wasm_js"'

# Make sure required tools are available
command -v rustc >/dev/null 2>&1 || { err "rustc not found in PATH. Install Rust toolchain and retry."; exit 1; }
command -v cargo >/dev/null 2>&1 || { err "cargo not found in PATH. Install Rust toolchain and retry."; exit 1; }

# wasm-pack is needed to produce the web-target package used by the frontend.
HAS_WASM_PACK=1
if ! command -v wasm-pack >/dev/null 2>&1; then
  warn "wasm-pack not found in PATH. The script will try to continue but building may fail."
  HAS_WASM_PACK=0
fi

# Ensure wasm target installed
log "Ensuring wasm target (wasm32-unknown-unknown) is installed..."
if rustup target list --installed | grep -q '^wasm32-unknown-unknown$'; then
  info "wasm target already installed"
else
  info "Installing wasm target..."
  rustup target add wasm32-unknown-unknown
fi

# Optionally run cargo fix to apply trivial fixes (unsafe to run in CI unless desired).
if [ "${SKIP_CARGO_FIX:-0}" != "1" ]; then
  log "Running 'cargo fix' (library fixes) in the Rust crate to auto-apply trivial suggestions..."
  if command -v cargo >/dev/null 2>&1; then
    # Run cargo fix inside the rust crate so it targets the crate-specific suggestions
    (cd "${RUST_CRATE_DIR}" && cargo fix --lib -p json-schema-x-graphql) || {
      warn "cargo fix encountered issues or made no changes; continuing anyway."
    }
  else
    warn "cargo not available; skipping cargo fix"
  fi
else
  info "SKIP_CARGO_FIX=1 set; skipping cargo fix step."
fi

# Build the WASM package using wasm-pack
log "Building WASM package using wasm-pack..."

if [ "${HAS_WASM_PACK}" -eq 0 ]; then
  err "wasm-pack is required to build the web package. Install wasm-pack (cargo install wasm-pack) or add it to PATH."
  exit 1
fi

# Ensure output dir exists
mkdir -p "${WASM_OUT_DIR}"

# Use provided RUSTFLAGS if present, otherwise use the default that enables getrandom wasm_js backend.
RUSTFLAGS_TO_USE="${RUSTFLAGS:-${DEFAULT_RUSTFLAGS}}"
info "Using RUSTFLAGS: ${RUSTFLAGS_TO_USE}"

# Invoke wasm-pack from the crate dir. This will produce the pkg under the specified out-dir.
(
  cd "${RUST_CRATE_DIR}"
  export RUSTFLAGS="${RUSTFLAGS_TO_USE}"

  info "Invoking wasm-pack build (target=web) from: ${RUST_CRATE_DIR}"
  wasm-pack build --target web --out-dir "${WASM_OUT_DIR}"
)

# List results
log "WASM build completed. Listing artifacts in ${WASM_OUT_DIR}:"
if [ -d "${WASM_OUT_DIR}" ]; then
  ls -la "${WASM_OUT_DIR}" || true
else
  warn "Output directory not found: ${WASM_OUT_DIR}"
fi

info "Quick file type check for .wasm (if present):"
for f in "${WASM_OUT_DIR}"/*.wasm; do
  if [ -e "$f" ]; then
    file "$f" || true
  else
    warn "No .wasm files found in ${WASM_OUT_DIR}"
  fi
done

log "WASM build helper finished successfully."
info "You can now start the frontend dev server and verify the app loads the wasm module."
info "Frontend dev: cd frontend/schema-authoring && pnpm run dev"

exit 0
