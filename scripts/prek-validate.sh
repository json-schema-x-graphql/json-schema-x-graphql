#!/bin/bash
# Pre-commit helper script to validate staged files sequentially using the CLI validator
set -e

EXIT_CODE=0

for file in "$@"; do
  if [ -f "$file" ]; then
    # Run the validator on the file
    if ! node converters/cli/dist/validate.js json-schema "$file" -q; then
      EXIT_CODE=1
    fi
  fi
done

exit $EXIT_CODE
