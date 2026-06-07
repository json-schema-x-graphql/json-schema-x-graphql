#!/usr/bin/env bash
# clean-target.sh — Manage Rust build artifact disk usage
#
# Usage:
#   ./scripts/clean-target.sh           # Remove stale artifacts (older than 7 days)
#   ./scripts/clean-target.sh --full     # Full cargo clean (WARNING: next build will be slow)
#   ./scripts/clean-target.sh --sweep    # Remove artifacts not needed for current lockfile
#
# Prerequisites for --sweep:
#   cargo install cargo-sweep

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="$PROJECT_ROOT/target"

# Default: remove stale artifacts (older than 7 days)
MODE="${1:-stale}"

case "$MODE" in
  --full)
    echo "Performing full cargo clean..."
    cargo clean --manifest-path "$PROJECT_ROOT/converters/rust/Cargo.toml"
    ALSO_CLEAN="$PROJECT_ROOT/converters/rust/target"
    if [ -d "$ALSO_CLEAN" ]; then
      echo "Removing secondary target dir: $ALSO_CLEAN"
      rm -rf "$ALSO_CLEAN"
    fi
    echo "Done. Target directory removed completely."
    echo "Note: the next build will recompile everything from scratch."
    ;;
  --sweep)
    if ! command -v cargo-sweep &> /dev/null; then
      echo "ERROR: cargo-sweep not found. Install with: cargo install cargo-sweep"
      exit 1
    fi
    echo "Removing artifacts not needed for currently installed toolchain..."
    cargo sweep --installed --manifest-path "$PROJECT_ROOT/converters/rust/Cargo.toml"
    echo "Done. Only artifacts required by the current lockfile are kept."
    ;;
  stale|*)
    echo "Removing build artifacts older than 7 days..."
    # Find and remove files in target/ older than 7 days
    if [ -d "$TARGET_DIR" ]; then
      find "$TARGET_DIR" -type f -mtime +7 -delete 2>/dev/null || true
      # Remove empty directories left behind
      find "$TARGET_DIR" -type d -empty -delete 2>/dev/null || true
      echo "Stale files removed."
    fi
    # Also handle secondary target dir
    ALSO_CLEAN="$PROJECT_ROOT/converters/rust/target"
    if [ -d "$ALSO_CLEAN" ]; then
      echo "Removing stale artifacts from secondary target dir..."
      find "$ALSO_CLEAN" -type f -mtime +7 -delete 2>/dev/null || true
      find "$ALSO_CLEAN" -type d -empty -delete 2>/dev/null || true
    fi
    echo "Done."
    ;;
esac

# Report remaining size
echo ""
if [ -d "$TARGET_DIR" ]; then
  echo "Current target/ size: $(du -sh "$TARGET_DIR" 2>/dev/null | cut -f1)"
fi
