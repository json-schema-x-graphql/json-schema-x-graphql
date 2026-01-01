#!/bin/bash

# Add Federation v2 schema link directive to generated SDL files
# This prepends the required @link directive for Apollo Federation v2 composition

set -e

SCHEMA_LINK='extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable", "@external", "@provides", "@requires", "@extends"])

'

OUTPUT_DIR="${1:-output/federation/node}"

echo "Adding Federation schema link to SDL files in: $OUTPUT_DIR"

for file in "$OUTPUT_DIR"/*.graphql; do
    if [ -f "$file" ]; then
        echo "Processing: $(basename "$file")"

        # Check if file already has @link directive
        if grep -q "@link" "$file"; then
            echo "  ⏭️  Already has @link directive, skipping"
            continue
        fi

        # Create temp file with schema link prepended
        echo "$SCHEMA_LINK" > "${file}.tmp"
        cat "$file" >> "${file}.tmp"
        mv "${file}.tmp" "$file"

        echo "  ✓ Added schema link"
    fi
done

echo ""
echo "✓ Complete! All SDL files now have Federation schema link directive."
