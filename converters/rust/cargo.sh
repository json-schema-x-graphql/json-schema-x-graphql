#!/bin/bash
# Cargo wrapper script that ensures Rust environment is loaded

# Source the Rust environment
. "$HOME/.cargo/env"

# Execute cargo with all passed arguments
cargo "$@"
