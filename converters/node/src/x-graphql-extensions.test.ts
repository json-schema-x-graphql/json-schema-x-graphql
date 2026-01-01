/**
 * X-GraphQL Extensions Tests
 *
 * Comprehensive test suite for x-graphql-* extension handling.
 * Tests all P0 features: skip, nullable, description, type/field mapping, nullability.
 */

import {
  extractExtensions,
  shouldSkip,
  getEffectiveDescription,
  isFieldNullable,
  getEffectiveFieldName,
  getEffectiveTypeName,
  formatDescription,
  parseFederationKeys,
  buildFederationDirective,
  generateTypeFederationDirectives,
  generateFieldFederationDirectives,
  mergeExtensions,
  XGraphQLExtensions,
} from './x-graphql-extensions';

describe('extractExtensions', () => {
  it('should extract type-level extensions', () => {
    const schema = {
      'x-graphql-type-name': 'User',
      'x-graphql-type-kind': 'OBJECT',
      'x-graphql-implements': ['Node', 'Timestamped'],
    };

    const extensions = extractExtensions(schema);

    expect(extensions.typeName).toBe('User');
    expect(extensions.typeKind).toBe('OBJECT');
    expect(extensions.implements).toEqual(['Node', 'Timestamped']);
  });

  it('should extract field-level extensions', () => {
    const schema = {
      'x-graphql-field-name': 'userId',
      'x-graphql-field-type': 'ID',
      'x-graphql-field-non-null': true,
      'x-graphql-field-list-item-non-null': false,
    };

    const extensions = extractExtensions(schema);

    expect(extensions.fieldName).toBe('userId');
    expect(extensions.fieldType).toBe('ID');
    expect(extensions.fieldNonNull).toBe(true);
    expect(extensions.fieldListItemNonNull).toBe(false);
  });

  it('should extract P0 feature: skip', () => {
    const schema = {
      'x-graphql-skip': true,
    };

    const extensions = extractExtensions(schema);

    expect(extensions.skip).toBe(true);
  });

  it('should extract P0 feature: nullable', () => {
    const schema = {
      'x-graphql-nullable': true,
    };

    const extensions = extractExtensions(schema);

    expect(extensions.nullable).toBe(true);
  });

  it('should extract P0 feature: description', () => {
    const schema = {
      'x-graphql-description': 'This is a GraphQL-specific description',
    };

    const extensions = extractExtensions(schema);

    expect(extensions.description).toBe('This is a GraphQL-specific description');
  });

  it('should extract union types', () => {
    const schema = {
      'x-graphql-union-types': ['User', 'Product', 'Article'],
    };

    const extensions = extractExtensions(schema);

    expect(extensions.unionTypes).toEqual(['User', 'Product', 'Article']);
  });

  it('should extract federation keys as string', () => {
    const schema = {
      'x-graphql-federation-keys': 'id',
    };

    const extensions = extractExtensions(schema);

    expect(extensions.federationKeys).toBe('id');
  });

  it('should extract federation keys as array', () => {
    const schema = {
      'x-graphql-federation-keys': ['id', 'email'],
    };

    const extensions = extractExtensions(schema);

    expect(extensions.federationKeys).toEqual(['id', 'email']);
  });

  it('should extract all federation extensions', () => {
    const schema = {
      'x-graphql-federation-keys': ['id'],
      'x-graphql-federation-shareable': true,
      'x-graphql-federation-requires': 'organizationId',
      'x-graphql-federation-provides': 'email',
      'x-graphql-federation-external': true,
      'x-graphql-federation-override-from': 'subgraph-a',
    };

    const extensions = extractExtensions(schema);

    expect(extensions.federationKeys).toEqual(['id']);
    expect(extensions.federationShareable).toBe(true);
    expect(extensions.federationRequires).toBe('organizationId');
    expect(extensions.federationProvides).toBe('email');
    expect(extensions.federationExternal).toBe(true);
    expect(extensions.federationOverrideFrom).toBe('subgraph-a');
  });

  it('should handle legacy x-graphql-type as string', () => {
    const schema = {
      'x-graphql-type': 'DateTime',
    };

    const extensions = extractExtensions(schema);

    expect(extensions.fieldType).toBe('DateTime');
  });

  it('should handle legacy x-graphql-type as object', () => {
    const schema = {
      'x-graphql-type': { name: 'User' },
    };

    const extensions = extractExtensions(schema);

    expect(extensions.typeName).toBe('User');
  });

  it('should ignore non-x-graphql properties', () => {
    const schema = {
      type: 'object',
      properties: {},
      'x-graphql-type-name': 'User',
      'x-other-extension': 'ignored',
    };

    const extensions = extractExtensions(schema);

    expect(extensions.typeName).toBe('User');
    expect(Object.keys(extensions)).toHaveLength(1);
  });
});

describe('shouldSkip', () => {
  it('should return true when skip is true', () => {
    const extensions: XGraphQLExtensions = { skip: true };
    expect(shouldSkip(extensions)).toBe(true);
  });

  it('should return false when skip is false', () => {
    const extensions: XGraphQLExtensions = { skip: false };
    expect(shouldSkip(extensions)).toBe(false);
  });

  it('should return false when skip is undefined', () => {
    const extensions: XGraphQLExtensions = {};
    expect(shouldSkip(extensions)).toBe(false);
  });
});

describe('getEffectiveDescription', () => {
  it('should prefer x-graphql-description over fallback', () => {
    const extensions: XGraphQLExtensions = {
      description: 'GraphQL description',
    };

    expect(getEffectiveDescription(extensions, 'JSON Schema description')).toBe('GraphQL description');
  });

  it('should use fallback when x-graphql-description is not provided', () => {
    const extensions: XGraphQLExtensions = {};

    expect(getEffectiveDescription(extensions, 'JSON Schema description')).toBe('JSON Schema description');
  });

  it('should return undefined when neither is provided', () => {
    const extensions: XGraphQLExtensions = {};

    expect(getEffectiveDescription(extensions)).toBeUndefined();
  });

  it('should trim whitespace and return undefined for empty strings', () => {
    const extensions: XGraphQLExtensions = {
      description: '   ',
    };

    expect(getEffectiveDescription(extensions)).toBeUndefined();
  });

  it('should trim whitespace from valid descriptions', () => {
    const extensions: XGraphQLExtensions = {
      description: '  Valid description  ',
    };

    expect(getEffectiveDescription(extensions)).toBe('Valid description');
  });

  it('should handle empty x-graphql-description and fall back to JSON Schema', () => {
    const extensions: XGraphQLExtensions = {
      description: '',
    };

    expect(getEffectiveDescription(extensions, 'Fallback')).toBe('Fallback');
  });

  it('should preserve multiline descriptions', () => {
    const extensions: XGraphQLExtensions = {
      description: 'Line 1\nLine 2\nLine 3',
    };

    expect(getEffectiveDescription(extensions)).toBe('Line 1\nLine 2\nLine 3');
  });
});

describe('isFieldNullable', () => {
  it('should return true when x-graphql-nullable is true', () => {
    const extensions: XGraphQLExtensions = { nullable: true };
    expect(isFieldNullable(extensions, false)).toBe(true);
    expect(isFieldNullable(extensions, true)).toBe(true);
  });

  it('should return false when x-graphql-nullable is false', () => {
    const extensions: XGraphQLExtensions = { nullable: false };
    expect(isFieldNullable(extensions, false)).toBe(false);
    expect(isFieldNullable(extensions, true)).toBe(false);
  });

  it('should use x-graphql-field-non-null when nullable is not set', () => {
    const extensions: XGraphQLExtensions = { fieldNonNull: true };
    expect(isFieldNullable(extensions, false)).toBe(false);
    expect(isFieldNullable(extensions, true)).toBe(false);
  });

  it('should return based on isRequired when no explicit settings', () => {
    const extensions: XGraphQLExtensions = {};
    expect(isFieldNullable(extensions, false)).toBe(true);
    expect(isFieldNullable(extensions, true)).toBe(false);
  });

  it('x-graphql-nullable should override x-graphql-field-non-null', () => {
    const extensions: XGraphQLExtensions = {
      nullable: true,
      fieldNonNull: true,
    };
    expect(isFieldNullable(extensions, true)).toBe(true);
  });

  it('x-graphql-nullable should override required status', () => {
    const extensions: XGraphQLExtensions = {
      nullable: true,
    };
    expect(isFieldNullable(extensions, true)).toBe(true);
  });
});

describe('getEffectiveFieldName', () => {
  it('should use x-graphql-field-name when provided', () => {
    const extensions: XGraphQLExtensions = { fieldName: 'userId' };
    expect(getEffectiveFieldName(extensions, 'user_id')).toBe('userId');
  });

  it('should use property name when x-graphql-field-name is not provided', () => {
    const extensions: XGraphQLExtensions = {};
    expect(getEffectiveFieldName(extensions, 'user_id')).toBe('user_id');
  });
});

describe('getEffectiveTypeName', () => {
  it('should use x-graphql-type-name when provided', () => {
    const extensions: XGraphQLExtensions = { typeName: 'User' };
    expect(getEffectiveTypeName(extensions, 'UserType')).toBe('User');
  });

  it('should use fallback when x-graphql-type-name is not provided', () => {
    const extensions: XGraphQLExtensions = {};
    expect(getEffectiveTypeName(extensions, 'UserType')).toBe('UserType');
  });
});

describe('formatDescription', () => {
  it('should return empty string for undefined description', () => {
    expect(formatDescription(undefined)).toBe('');
  });

  it('should format short single-line description', () => {
    const result = formatDescription('Short description');
    expect(result).toBe('"""Short description"""\n');
  });

  it('should format long single-line description as multiline', () => {
    const longDesc = 'This is a very long description that exceeds eighty characters and should be formatted as multiline';
    const result = formatDescription(longDesc);
    expect(result).toContain('"""\n');
    expect(result).toContain('This is a very long description');
  });

  it('should format multiline description', () => {
    const result = formatDescription('Line 1\nLine 2\nLine 3');
    expect(result).toBe('"""\nLine 1\nLine 2\nLine 3\n"""\n');
  });

  it('should apply indentation', () => {
    const result = formatDescription('Description', '  ');
    expect(result).toBe('  """Description"""\n');
  });

  it('should apply indentation to multiline', () => {
    const result = formatDescription('Line 1\nLine 2', '  ');
    expect(result).toBe('"""\n  Line 1\n  Line 2\n  """\n');
  });
});

describe('parseFederationKeys', () => {
  it('should return empty array for undefined', () => {
    expect(parseFederationKeys(undefined)).toEqual([]);
  });

  it('should return array as-is', () => {
    expect(parseFederationKeys(['id', 'email'])).toEqual(['id', 'email']);
  });

  it('should split space-separated string', () => {
    expect(parseFederationKeys('id email')).toEqual(['id', 'email']);
  });

  it('should handle single key string', () => {
    expect(parseFederationKeys('id')).toEqual(['id']);
  });

  it('should filter empty strings', () => {
    expect(parseFederationKeys('id  email')).toEqual(['id', 'email']);
  });
});

describe('buildFederationDirective', () => {
  it('should build directive without arguments', () => {
    expect(buildFederationDirective('shareable')).toBe('@shareable');
  });

  it('should build directive with string argument', () => {
    expect(buildFederationDirective('key', { fields: 'id' })).toBe('@key(fields: "id")');
  });

  it('should build directive with array argument', () => {
    expect(buildFederationDirective('key', { fields: ['id', 'email'] })).toBe('@key(fields: ["id", "email"])');
  });

  it('should build directive with multiple arguments', () => {
    const result = buildFederationDirective('directive', { arg1: 'value1', arg2: 'value2' });
    expect(result).toContain('@directive(');
    expect(result).toContain('arg1: "value1"');
    expect(result).toContain('arg2: "value2"');
  });

  it('should handle numeric arguments', () => {
    const result = buildFederationDirective('directive', { count: 42 });
    expect(result).toBe('@directive(count: 42)');
  });
});

describe('generateTypeFederationDirectives', () => {
  it('should generate @key directive from string', () => {
    const extensions: XGraphQLExtensions = {
      federationKeys: 'id',
    };

    const directives = generateTypeFederationDirectives(extensions);
    expect(directives).toContain('@key(fields: "id")');
  });

  it('should generate multiple @key directives from array', () => {
    const extensions: XGraphQLExtensions = {
      federationKeys: ['id', 'email'],
    };

    const directives = generateTypeFederationDirectives(extensions);
    expect(directives).toHaveLength(2);
    expect(directives).toContain('@key(fields: "id")');
    expect(directives).toContain('@key(fields: "email")');
  });

  it('should generate @shareable directive', () => {
    const extensions: XGraphQLExtensions = {
      federationShareable: true,
    };

    const directives = generateTypeFederationDirectives(extensions);
    expect(directives).toContain('@shareable');
  });

  it('should generate multiple directives', () => {
    const extensions: XGraphQLExtensions = {
      federationKeys: 'id',
      federationShareable: true,
    };

    const directives = generateTypeFederationDirectives(extensions);
    expect(directives).toHaveLength(2);
    expect(directives).toContain('@key(fields: "id")');
    expect(directives).toContain('@shareable');
  });

  it('should return empty array when no federation extensions', () => {
    const extensions: XGraphQLExtensions = {};
    const directives = generateTypeFederationDirectives(extensions);
    expect(directives).toEqual([]);
  });
});

describe('generateFieldFederationDirectives', () => {
  it('should generate @external directive', () => {
    const extensions: XGraphQLExtensions = {
      federationExternal: true,
    };

    const directives = generateFieldFederationDirectives(extensions);
    expect(directives).toContain('@external');
  });

  it('should generate @requires directive from string', () => {
    const extensions: XGraphQLExtensions = {
      federationRequires: 'organizationId',
    };

    const directives = generateFieldFederationDirectives(extensions);
    expect(directives).toContain('@requires(fields: "organizationId")');
  });

  it('should generate @requires directive from array', () => {
    const extensions: XGraphQLExtensions = {
      federationRequires: ['organizationId', 'userId'],
    };

    const directives = generateFieldFederationDirectives(extensions);
    expect(directives).toContain('@requires(fields: "organizationId userId")');
  });

  it('should generate @provides directive', () => {
    const extensions: XGraphQLExtensions = {
      federationProvides: 'email',
    };

    const directives = generateFieldFederationDirectives(extensions);
    expect(directives).toContain('@provides(fields: "email")');
  });

  it('should generate @override directive', () => {
    const extensions: XGraphQLExtensions = {
      federationOverrideFrom: 'subgraph-a',
    };

    const directives = generateFieldFederationDirectives(extensions);
    expect(directives).toContain('@override(from: "subgraph-a")');
  });

  it('should generate multiple field directives', () => {
    const extensions: XGraphQLExtensions = {
      federationExternal: true,
      federationRequires: 'organizationId',
    };

    const directives = generateFieldFederationDirectives(extensions);
    expect(directives).toHaveLength(2);
    expect(directives).toContain('@external');
    expect(directives).toContain('@requires(fields: "organizationId")');
  });

  it('should return empty array when no federation extensions', () => {
    const extensions: XGraphQLExtensions = {};
    const directives = generateFieldFederationDirectives(extensions);
    expect(directives).toEqual([]);
  });
});

describe('mergeExtensions', () => {
  it('should merge simple properties', () => {
    const ext1: XGraphQLExtensions = { typeName: 'User' };
    const ext2: XGraphQLExtensions = { fieldName: 'userId' };

    const merged = mergeExtensions(ext1, ext2);

    expect(merged.typeName).toBe('User');
    expect(merged.fieldName).toBe('userId');
  });

  it('should overwrite conflicting simple properties with last value', () => {
    const ext1: XGraphQLExtensions = { typeName: 'User' };
    const ext2: XGraphQLExtensions = { typeName: 'Person' };

    const merged = mergeExtensions(ext1, ext2);

    expect(merged.typeName).toBe('Person');
  });

  it('should concatenate implements arrays', () => {
    const ext1: XGraphQLExtensions = { implements: ['Node'] };
    const ext2: XGraphQLExtensions = { implements: ['Timestamped'] };

    const merged = mergeExtensions(ext1, ext2);

    expect(merged.implements).toEqual(['Node', 'Timestamped']);
  });

  it('should deduplicate implements arrays', () => {
    const ext1: XGraphQLExtensions = { implements: ['Node'] };
    const ext2: XGraphQLExtensions = { implements: ['Node', 'Timestamped'] };

    const merged = mergeExtensions(ext1, ext2);

    expect(merged.implements).toEqual(['Node', 'Timestamped']);
  });

  it('should concatenate unionTypes arrays', () => {
    const ext1: XGraphQLExtensions = { unionTypes: ['User'] };
    const ext2: XGraphQLExtensions = { unionTypes: ['Product'] };

    const merged = mergeExtensions(ext1, ext2);

    expect(merged.unionTypes).toEqual(['User', 'Product']);
  });

  it('should deduplicate unionTypes arrays', () => {
    const ext1: XGraphQLExtensions = { unionTypes: ['User', 'Product'] };
    const ext2: XGraphQLExtensions = { unionTypes: ['Product', 'Article'] };

    const merged = mergeExtensions(ext1, ext2);

    expect(merged.unionTypes).toEqual(['User', 'Product', 'Article']);
  });

  it('should merge multiple extension objects', () => {
    const ext1: XGraphQLExtensions = { typeName: 'User', implements: ['Node'] };
    const ext2: XGraphQLExtensions = { fieldName: 'userId', implements: ['Timestamped'] };
    const ext3: XGraphQLExtensions = { skip: false };

    const merged = mergeExtensions(ext1, ext2, ext3);

    expect(merged.typeName).toBe('User');
    expect(merged.fieldName).toBe('userId');
    expect(merged.skip).toBe(false);
    expect(merged.implements).toEqual(['Node', 'Timestamped']);
  });

  it('should handle empty extensions', () => {
    const ext1: XGraphQLExtensions = {};
    const ext2: XGraphQLExtensions = { typeName: 'User' };

    const merged = mergeExtensions(ext1, ext2);

    expect(merged.typeName).toBe('User');
  });
});
