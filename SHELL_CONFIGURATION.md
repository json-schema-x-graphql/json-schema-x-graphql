# Shell Configuration Summary

## Overview
This document summarizes the shell configuration changes made to ensure `cargo` and `pnpm` are always available.

## Date
December 30, 2024

---

## Changes Made

### 1. Cargo/Rust Environment Setup

Added Rust environment initialization to all shell configuration files to ensure `cargo` is available in new shell sessions.

**Files Modified:**
- `~/.bashrc` - For bash interactive shells
- `~/.profile` - For login shells (sourced by bash, sh, and other shells)
- `~/.zshrc` - For zsh interactive shells

**Line Added:**
```bash
. "$HOME/.cargo/env"
```

**Effect:**
- `cargo` command is now available in all new terminal sessions
- Rust toolchain binaries are in `$PATH` automatically
- No need to manually source the environment file

### 2. NPM → PNPM Alias

Added alias to redirect `npm` commands to `pnpm` automatically.

**Files Modified:**
- `~/.bashrc` - For bash interactive shells
- `~/.profile` - For login shells
- `~/.zshrc` - For zsh interactive shells

**Line Added:**
```bash
alias npm='pnpm'
```

**Effect:**
- Running `npm install` will execute `pnpm install` instead
- Running `npm run test` will execute `pnpm run test` instead
- All `npm` commands transparently use `pnpm`
- Original `pnpm` command still works as expected

---

## Verification

### Verify Cargo is Available

After restarting your shell or running `. ~/.bashrc`:

```bash
cargo --version
# Expected: cargo 1.92.0 (344c4567c 2025-10-21)
```

### Verify NPM Alias

After restarting your shell or running `. ~/.bashrc`:

```bash
alias npm
# Expected: alias npm='pnpm'

type npm
# Expected: npm is aliased to `pnpm'
```

### Test the Alias

```bash
npm --version
# Should show pnpm version, not npm version
```

---

## Usage

### For Bash Users

Your `~/.bashrc` is sourced automatically for interactive shells. Just restart your terminal or run:

```bash
source ~/.bashrc
```

### For Zsh Users

Your `~/.zshrc` is sourced automatically for interactive shells. Just restart your terminal or run:

```zsh
source ~/.zshrc
```

### For Login Shells

Your `~/.profile` is sourced automatically on login. Changes take effect on next login or by running:

```bash
. ~/.profile
```

---

## Helper Scripts

### Cargo Wrapper Script

Created: `converters/rust/cargo.sh`

A convenience script that sources the Rust environment before running cargo. Useful in environments where the shell config hasn't been loaded yet.

**Usage:**
```bash
cd converters/rust
./cargo.sh test --lib
./cargo.sh build --release
```

**Content:**
```bash
#!/bin/bash
# Cargo wrapper script that ensures Rust environment is loaded

# Source the Rust environment
. "$HOME/.cargo/env"

# Execute cargo with all passed arguments
cargo "$@"
```

---

## Why These Changes?

### Cargo Environment

The Rust installer (`rustup`) creates `~/.cargo/env` but doesn't automatically add it to your shell configuration. Without sourcing this file, `cargo` and other Rust tools are not in your `$PATH`, causing "command not found" errors.

### NPM → PNPM Alias

This project uses `pnpm` as its package manager (which is faster and more disk-efficient than `npm`). The alias ensures that if you accidentally type `npm` out of habit, it will use `pnpm` instead, maintaining consistency.

---

## Troubleshooting

### "cargo: not found" in Scripts

If you run scripts that invoke `cargo` and get "command not found" errors:

1. Ensure the script sources the environment:
   ```bash
   #!/bin/bash
   . "$HOME/.cargo/env"
   cargo build
   ```

2. Or use the wrapper script:
   ```bash
   ./converters/rust/cargo.sh build
   ```

### Alias Not Working

If the `npm` alias doesn't work:

1. Verify the alias is defined:
   ```bash
   alias npm
   ```

2. If not, source your shell config:
   ```bash
   source ~/.bashrc   # for bash
   source ~/.zshrc    # for zsh
   ```

3. Remember: aliases only work in interactive shells, not in scripts (unless you use `bash -i` or `zsh -i`)

### Want to Use Real NPM?

If you need to use the actual `npm` command (not pnpm), you can:

1. **Temporarily bypass the alias:**
   ```bash
   \npm --version    # backslash bypasses aliases
   command npm --version
   ```

2. **Remove the alias for the session:**
   ```bash
   unalias npm
   ```

3. **Remove the alias permanently:**
   Edit `~/.bashrc`, `~/.zshrc`, and `~/.profile` to remove the `alias npm='pnpm'` line.

---

## File Locations

```
~/.bashrc           # Bash interactive shell config
~/.profile          # Login shell config (POSIX-compatible)
~/.zshrc            # Zsh interactive shell config
~/.cargo/env        # Rust environment file (created by rustup)
```

---

## Summary of Current Shell Config

### ~/.bashrc (relevant lines)
```bash
export PATH=$HOME/.local/bin:$PATH
. "$HOME/.cargo/env"
alias npm='pnpm'
```

### ~/.profile (relevant lines)
```bash
if [ -d "$HOME/.local/bin" ] ; then
    PATH="$HOME/.local/bin:$PATH"
fi
. "$HOME/.cargo/env"
alias npm='pnpm'
```

### ~/.zshrc (relevant lines)
```bash
. "$HOME/.cargo/env"
alias npm='pnpm'
```

---

## Status

✅ **Complete** - All shell configurations updated and tested.

**Next Steps:**
- Restart your terminal or source the config files
- Verify with `cargo --version` and `alias npm`
- Use `npm` commands (they will run `pnpm` automatically)