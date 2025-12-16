/**
 * Schema comparison and diff viewer
 * Identifies changes between two JSON schemas
 */

export class SchemaDiff {
  constructor(schemaA, schemaB) {
    this.schemaA = schemaA;
    this.schemaB = schemaB;
    this.differences = [];
    this.analyze();
  }

  /**
   * Analyze differences between schemas
   * @private
   */
  analyze() {
    const propsA = this.schemaA.properties || {};
    const propsB = this.schemaB.properties || {};

    const allKeys = new Set([
      ...Object.keys(propsA),
      ...Object.keys(propsB),
    ]);

    for (const key of allKeys) {
      const propA = propsA[key];
      const propB = propsB[key];

      if (!propA) {
        // Field added in B
        this.differences.push({
          type: 'added',
          field: key,
          from: null,
          to: propB,
        });
      } else if (!propB) {
        // Field removed in B
        this.differences.push({
          type: 'removed',
          field: key,
          from: propA,
          to: null,
        });
      } else if (this.hasChanged(propA, propB)) {
        // Field modified
        this.differences.push({
          type: 'modified',
          field: key,
          from: propA,
          to: propB,
          changes: this.getFieldChanges(propA, propB),
        });
      }
    }
  }

  /**
   * Check if property has changed
   * @private
   */
  hasChanged(propA, propB) {
    const keyPropsA = {
      type: propA.type,
      format: propA.format,
      enum: JSON.stringify(propA.enum || []),
    };
    const keyPropsB = {
      type: propB.type,
      format: propB.format,
      enum: JSON.stringify(propB.enum || []),
    };

    return JSON.stringify(keyPropsA) !== JSON.stringify(keyPropsB);
  }

  /**
   * Get specific field changes
   * @private
   */
  getFieldChanges(propA, propB) {
    const changes = [];

    if (propA.type !== propB.type) {
      changes.push({
        aspect: 'type',
        from: propA.type,
        to: propB.type,
      });
    }

    if (propA.format !== propB.format) {
      changes.push({
        aspect: 'format',
        from: propA.format || 'none',
        to: propB.format || 'none',
      });
    }

    if (JSON.stringify(propA.enum) !== JSON.stringify(propB.enum)) {
      changes.push({
        aspect: 'enum values',
        from: propA.enum || [],
        to: propB.enum || [],
      });
    }

    if (propA.description !== propB.description) {
      changes.push({
        aspect: 'description',
        from: propA.description || '(no description)',
        to: propB.description || '(no description)',
      });
    }

    return changes;
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const added = this.differences.filter((d) => d.type === 'added').length;
    const removed = this.differences.filter((d) => d.type === 'removed').length;
    const modified = this.differences.filter(
      (d) => d.type === 'modified'
    ).length;

    return {
      totalChanges: this.differences.length,
      added,
      removed,
      modified,
      unchanged:
        (Object.keys(this.schemaA.properties || {}).length +
          Object.keys(this.schemaB.properties || {}).length) /
          2 -
        (added + removed + modified),
    };
  }

  /**
   * Get formatted diff for display
   */
  getFormatted() {
    return {
      summary: this.getSummary(),
      changes: this.differences.map((diff) => ({
        ...diff,
        description: this.getChangeDescription(diff),
      })),
    };
  }

  /**
   * Get human-readable description of change
   * @private
   */
  getChangeDescription(diff) {
    switch (diff.type) {
      case 'added':
        return `Added field "${diff.field}" (${diff.to.type})`;
      case 'removed':
        return `Removed field "${diff.field}"`;
      case 'modified': {
        const changeStrs = diff.changes.map(
          (c) => `${c.aspect}: ${c.from} → ${c.to}`
        );
        return `Modified "${diff.field}": ${changeStrs.join(', ')}`;
      }
      default:
        return `Unknown change`;
    }
  }

  /**
   * Check if schemas are identical
   */
  isIdentical() {
    return this.differences.length === 0;
  }

  /**
   * Get fields that exist in both schemas
   */
  getCommonFields() {
    const propsA = this.schemaA.properties || {};
    const propsB = this.schemaB.properties || {};

    return Object.keys(propsA).filter(
      (key) => key in propsB && !this.hasChanged(propsA[key], propsB[key])
    );
  }

  /**
   * Get only additions
   */
  getAdditions() {
    return this.differences.filter((d) => d.type === 'added');
  }

  /**
   * Get only removals
   */
  getRemovals() {
    return this.differences.filter((d) => d.type === 'removed');
  }

  /**
   * Get only modifications
   */
  getModifications() {
    return this.differences.filter((d) => d.type === 'modified');
  }

  /**
   * Export diff as text report
   */
  toTextReport(schemaAName = 'Schema A', schemaBName = 'Schema B') {
    const summary = this.getSummary();
    const lines = [
      `Schema Comparison Report`,
      `${'='.repeat(50)}`,
      ``,
      `Comparing: ${schemaAName} → ${schemaBName}`,
      ``,
      `Summary:`,
      `  Added:    ${summary.added} fields`,
      `  Removed:  ${summary.removed} fields`,
      `  Modified: ${summary.modified} fields`,
      `  Unchanged: ${summary.unchanged} fields`,
      ``,
    ];

    if (this.differences.length === 0) {
      lines.push('No differences found.');
    } else {
      lines.push(`Changes (${this.differences.length} total):`);
      lines.push('');

      for (const diff of this.differences) {
        lines.push(
          `  [${diff.type.toUpperCase()}] ${this.getChangeDescription(diff)}`
        );

        if (diff.changes) {
          for (const change of diff.changes) {
            lines.push(
              `    - ${change.aspect}: "${change.from}" → "${change.to}"`
            );
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

/**
 * Compare multiple schemas and find common/diverging patterns
 */
export function compareMultipleSchemas(schemas) {
  if (schemas.length < 2) {
    return {
      error: 'Need at least 2 schemas to compare',
    };
  }

  const comparisons = [];

  for (let i = 0; i < schemas.length - 1; i++) {
    for (let j = i + 1; j < schemas.length; j++) {
      const diff = new SchemaDiff(schemas[i].parsed, schemas[j].parsed);
      comparisons.push({
        schemaA: schemas[i].name,
        schemaB: schemas[j].name,
        diff: diff.getFormatted(),
      });
    }
  }

  // Find common fields across all
  const allFields = schemas.map(
    (s) => new Set(Object.keys(s.parsed.properties || {}))
  );

  const commonFields = allFields
    .reduce((common, current) =>
      new Set([...common].filter((f) => current.has(f)))
    )
    .then((x) => [...x]);

  const uniqueFieldsBySchema = schemas.map((schema, idx) => {
    const schemaFields = new Set(Object.keys(schema.parsed.properties || {}));
    const otherFields = allFields
      .filter((_, i) => i !== idx)
      .reduce((all, current) => new Set([...all, ...current]));

    return {
      schema: schema.name,
      unique: [...schemaFields].filter((f) => !otherFields.has(f)),
    };
  });

  return {
    success: true,
    comparisons,
    commonFields: [...commonFields],
    uniqueFieldsBySchema,
  };
}
