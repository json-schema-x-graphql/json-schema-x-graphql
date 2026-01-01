/**
 * X-GraphQL Validator
 *
 * Validation utilities for x-graphql-* extensions in JSON Schema.
 * Ensures correct usage of x-graphql attributes and provides helpful error messages.
 */
const VALID_TYPE_KINDS = ['OBJECT', 'INTERFACE', 'UNION', 'ENUM', 'INPUT_OBJECT', 'SCALAR'];
const GRAPHQL_SCALAR_TYPES = [
    'ID',
    'String',
    'Int',
    'Float',
    'Boolean',
    'DateTime',
    'Date',
    'Time',
    'JSON',
];
const GRAPHQL_NAME_PATTERN = /^[_A-Za-z][_0-9A-Za-z]*$/;
/**
 * Validate all x-graphql extensions in a JSON Schema
 */
export function validateSchema(schema, path = '$') {
    const errors = [];
    const warnings = [];
    // Validate current level
    const currentErrors = validateExtensions(schema, path);
    errors.push(...currentErrors.filter(e => e.severity === 'error'));
    warnings.push(...currentErrors.filter(e => e.severity === 'warning'));
    // Recursively validate properties
    if (schema.properties && typeof schema.properties === 'object') {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
            if (typeof propSchema === 'object' && propSchema !== null) {
                const propResult = validateSchema(propSchema, `${path}.properties.${propName}`);
                errors.push(...propResult.errors);
                warnings.push(...propResult.warnings);
            }
        }
    }
    // Validate definitions
    if (schema.definitions && typeof schema.definitions === 'object') {
        for (const [defName, defSchema] of Object.entries(schema.definitions)) {
            if (typeof defSchema === 'object' && defSchema !== null) {
                const defResult = validateSchema(defSchema, `${path}.definitions.${defName}`);
                errors.push(...defResult.errors);
                warnings.push(...defResult.warnings);
            }
        }
    }
    // Validate $defs
    if (schema.$defs && typeof schema.$defs === 'object') {
        for (const [defName, defSchema] of Object.entries(schema.$defs)) {
            if (typeof defSchema === 'object' && defSchema !== null) {
                const defResult = validateSchema(defSchema, `${path}.$defs.${defName}`);
                errors.push(...defResult.errors);
                warnings.push(...defResult.warnings);
            }
        }
    }
    // Validate items (for arrays)
    if (schema.items && typeof schema.items === 'object') {
        const itemsResult = validateSchema(schema.items, `${path}.items`);
        errors.push(...itemsResult.errors);
        warnings.push(...itemsResult.warnings);
    }
    // Validate allOf, anyOf, oneOf
    for (const combinator of ['allOf', 'anyOf', 'oneOf']) {
        const combinatorSchemas = schema[combinator];
        if (Array.isArray(combinatorSchemas)) {
            combinatorSchemas.forEach((subSchema, index) => {
                if (typeof subSchema === 'object' && subSchema !== null) {
                    const subResult = validateSchema(subSchema, `${path}.${combinator}[${index}]`);
                    errors.push(...subResult.errors);
                    warnings.push(...subResult.warnings);
                }
            });
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
/**
 * Validate x-graphql extensions at a single schema level
 */
export function validateExtensions(schema, path) {
    const errors = [];
    const extensions = {};
    // Extract x-graphql extensions
    for (const [key, value] of Object.entries(schema)) {
        if (key.startsWith('x-graphql-')) {
            const extensionKey = key.substring(11);
            extensions[extensionKey] = value;
        }
    }
    // Validate type-name
    if (extensions.typeName !== undefined) {
        if (typeof extensions.typeName !== 'string') {
            errors.push({
                path,
                message: 'x-graphql-type-name must be a string',
                severity: 'error',
                attribute: 'x-graphql-type-name',
            });
        }
        else if (!GRAPHQL_NAME_PATTERN.test(extensions.typeName)) {
            errors.push({
                path,
                message: `x-graphql-type-name "${extensions.typeName}" is not a valid GraphQL name. Must match /^[_A-Za-z][_0-9A-Za-z]*$/`,
                severity: 'error',
                attribute: 'x-graphql-type-name',
            });
        }
    }
    // Validate type-kind
    if (extensions.typeKind !== undefined) {
        if (!VALID_TYPE_KINDS.includes(extensions.typeKind)) {
            errors.push({
                path,
                message: `x-graphql-type-kind must be one of: ${VALID_TYPE_KINDS.join(', ')}`,
                severity: 'error',
                attribute: 'x-graphql-type-kind',
            });
        }
    }
    // Validate field-name
    if (extensions.fieldName !== undefined) {
        if (typeof extensions.fieldName !== 'string') {
            errors.push({
                path,
                message: 'x-graphql-field-name must be a string',
                severity: 'error',
                attribute: 'x-graphql-field-name',
            });
        }
        else if (!GRAPHQL_NAME_PATTERN.test(extensions.fieldName)) {
            errors.push({
                path,
                message: `x-graphql-field-name "${extensions.fieldName}" is not a valid GraphQL name. Must match /^[_A-Za-z][_0-9A-Za-z]*$/`,
                severity: 'error',
                attribute: 'x-graphql-field-name',
            });
        }
    }
    // Validate field-type
    if (extensions.fieldType !== undefined && typeof extensions.fieldType === 'string') {
        // Extract base type (remove [], !, etc.)
        const baseType = extensions.fieldType.replace(/[\[\]!]/g, '');
        if (!GRAPHQL_NAME_PATTERN.test(baseType)) {
            errors.push({
                path,
                message: `x-graphql-field-type "${extensions.fieldType}" contains invalid type name "${baseType}"`,
                severity: 'error',
                attribute: 'x-graphql-field-type',
            });
        }
    }
    // Validate skip
    if (extensions.skip !== undefined && typeof extensions.skip !== 'boolean') {
        errors.push({
            path,
            message: 'x-graphql-skip must be a boolean',
            severity: 'error',
            attribute: 'x-graphql-skip',
        });
    }
    // Validate nullable
    if (extensions.nullable !== undefined && typeof extensions.nullable !== 'boolean') {
        errors.push({
            path,
            message: 'x-graphql-nullable must be a boolean',
            severity: 'error',
            attribute: 'x-graphql-nullable',
        });
    }
    // Validate description
    if (extensions.description !== undefined && typeof extensions.description !== 'string') {
        errors.push({
            path,
            message: 'x-graphql-description must be a string',
            severity: 'error',
            attribute: 'x-graphql-description',
        });
    }
    // Validate field-non-null
    if (extensions.fieldNonNull !== undefined && typeof extensions.fieldNonNull !== 'boolean') {
        errors.push({
            path,
            message: 'x-graphql-field-non-null must be a boolean',
            severity: 'error',
            attribute: 'x-graphql-field-non-null',
        });
    }
    // Validate field-list-item-non-null
    if (extensions.fieldListItemNonNull !== undefined && typeof extensions.fieldListItemNonNull !== 'boolean') {
        errors.push({
            path,
            message: 'x-graphql-field-list-item-non-null must be a boolean',
            severity: 'error',
            attribute: 'x-graphql-field-list-item-non-null',
        });
    }
    // Validate implements
    if (extensions.implements !== undefined) {
        if (!Array.isArray(extensions.implements)) {
            errors.push({
                path,
                message: 'x-graphql-implements must be an array of interface names',
                severity: 'error',
                attribute: 'x-graphql-implements',
            });
        }
        else {
            for (const interfaceName of extensions.implements) {
                if (typeof interfaceName !== 'string') {
                    errors.push({
                        path,
                        message: 'x-graphql-implements must contain only strings',
                        severity: 'error',
                        attribute: 'x-graphql-implements',
                    });
                }
                else if (!GRAPHQL_NAME_PATTERN.test(interfaceName)) {
                    errors.push({
                        path,
                        message: `Interface name "${interfaceName}" in x-graphql-implements is not a valid GraphQL name`,
                        severity: 'error',
                        attribute: 'x-graphql-implements',
                    });
                }
            }
        }
    }
    // Validate union-types
    if (extensions.unionTypes !== undefined) {
        if (!Array.isArray(extensions.unionTypes)) {
            errors.push({
                path,
                message: 'x-graphql-union-types must be an array of type names',
                severity: 'error',
                attribute: 'x-graphql-union-types',
            });
        }
        else {
            for (const typeName of extensions.unionTypes) {
                if (typeof typeName !== 'string') {
                    errors.push({
                        path,
                        message: 'x-graphql-union-types must contain only strings',
                        severity: 'error',
                        attribute: 'x-graphql-union-types',
                    });
                }
                else if (!GRAPHQL_NAME_PATTERN.test(typeName)) {
                    errors.push({
                        path,
                        message: `Type name "${typeName}" in x-graphql-union-types is not a valid GraphQL name`,
                        severity: 'error',
                        attribute: 'x-graphql-union-types',
                    });
                }
            }
        }
    }
    // Validate UNION type has union-types
    if (extensions.typeKind === 'UNION' && !extensions.unionTypes) {
        errors.push({
            path,
            message: 'x-graphql-type-kind "UNION" requires x-graphql-union-types to be specified',
            severity: 'error',
            attribute: 'x-graphql-union-types',
        });
    }
    // Validate federation keys
    if (extensions.federationKeys !== undefined) {
        const keys = Array.isArray(extensions.federationKeys) ? extensions.federationKeys : [extensions.federationKeys];
        for (const key of keys) {
            if (typeof key !== 'string') {
                errors.push({
                    path,
                    message: 'x-graphql-federation-keys must be a string or array of strings',
                    severity: 'error',
                    attribute: 'x-graphql-federation-keys',
                });
            }
        }
    }
    // Validate federation booleans
    for (const attr of ['federationShareable', 'federationExternal', 'federationInaccessible']) {
        const value = extensions[attr];
        if (value !== undefined && typeof value !== 'boolean') {
            const attrName = 'x-graphql-' + attr.replace(/([A-Z])/g, '-$1').toLowerCase();
            errors.push({
                path,
                message: `${attrName} must be a boolean`,
                severity: 'error',
                attribute: attrName,
            });
        }
    }
    // Warn about conflicting nullability settings
    if (extensions.nullable === true && extensions.fieldNonNull === true) {
        errors.push({
            path,
            message: 'Conflicting nullability: x-graphql-nullable is true but x-graphql-field-non-null is also true. x-graphql-nullable will take precedence.',
            severity: 'warning',
            attribute: 'x-graphql-nullable',
        });
    }
    // Warn about skip on required fields
    if (extensions.skip === true && schema.required && Array.isArray(schema.required)) {
        const fieldName = extensions.fieldName || path.split('.').pop();
        if (fieldName && schema.required.includes(fieldName)) {
            errors.push({
                path,
                message: `Field is marked as x-graphql-skip but is in the required array. This may cause validation issues.`,
                severity: 'warning',
                attribute: 'x-graphql-skip',
            });
        }
    }
    // Warn about unused field-list-item-non-null on non-arrays
    if (extensions.fieldListItemNonNull !== undefined && schema.type !== 'array') {
        errors.push({
            path,
            message: 'x-graphql-field-list-item-non-null is set but schema type is not "array"',
            severity: 'warning',
            attribute: 'x-graphql-field-list-item-non-null',
        });
    }
    return errors;
}
/**
 * Validate a single extension value
 */
export function validateExtensionValue(attribute, value, context) {
    const errors = [];
    const path = context?.path || '$';
    switch (attribute) {
        case 'x-graphql-type-name':
        case 'x-graphql-field-name':
            if (typeof value !== 'string') {
                errors.push({
                    path,
                    message: `${attribute} must be a string`,
                    severity: 'error',
                    attribute,
                });
            }
            else if (!GRAPHQL_NAME_PATTERN.test(value)) {
                errors.push({
                    path,
                    message: `${attribute} "${value}" is not a valid GraphQL name`,
                    severity: 'error',
                    attribute,
                });
            }
            break;
        case 'x-graphql-type-kind':
            if (!VALID_TYPE_KINDS.includes(value)) {
                errors.push({
                    path,
                    message: `${attribute} must be one of: ${VALID_TYPE_KINDS.join(', ')}`,
                    severity: 'error',
                    attribute,
                });
            }
            break;
        case 'x-graphql-skip':
        case 'x-graphql-nullable':
        case 'x-graphql-field-non-null':
        case 'x-graphql-field-list-item-non-null':
        case 'x-graphql-federation-shareable':
        case 'x-graphql-federation-external':
            if (typeof value !== 'boolean') {
                errors.push({
                    path,
                    message: `${attribute} must be a boolean`,
                    severity: 'error',
                    attribute,
                });
            }
            break;
        case 'x-graphql-description':
            if (typeof value !== 'string') {
                errors.push({
                    path,
                    message: `${attribute} must be a string`,
                    severity: 'error',
                    attribute,
                });
            }
            break;
        case 'x-graphql-implements':
        case 'x-graphql-union-types':
            if (!Array.isArray(value)) {
                errors.push({
                    path,
                    message: `${attribute} must be an array`,
                    severity: 'error',
                    attribute,
                });
            }
            else {
                for (const item of value) {
                    if (typeof item !== 'string') {
                        errors.push({
                            path,
                            message: `${attribute} must contain only strings`,
                            severity: 'error',
                            attribute,
                        });
                    }
                    else if (!GRAPHQL_NAME_PATTERN.test(item)) {
                        errors.push({
                            path,
                            message: `"${item}" in ${attribute} is not a valid GraphQL name`,
                            severity: 'error',
                            attribute,
                        });
                    }
                }
            }
            break;
    }
    return errors;
}
/**
 * Format validation errors as human-readable messages
 */
export function formatValidationErrors(result) {
    const messages = [];
    if (result.errors.length > 0) {
        messages.push('Errors:');
        for (const error of result.errors) {
            messages.push(`  [${error.path}] ${error.message}`);
        }
    }
    if (result.warnings.length > 0) {
        messages.push('Warnings:');
        for (const warning of result.warnings) {
            messages.push(`  [${warning.path}] ${warning.message}`);
        }
    }
    return messages.join('\n');
}
/**
 * Check if a schema has any x-graphql extensions
 */
export function hasXGraphQLExtensions(schema) {
    return Object.keys(schema).some(key => key.startsWith('x-graphql-'));
}
/**
 * Get all x-graphql attribute names used in a schema
 */
export function getUsedXGraphQLAttributes(schema) {
    const attributes = new Set();
    function traverse(obj) {
        for (const [key, value] of Object.entries(obj)) {
            if (key.startsWith('x-graphql-')) {
                attributes.add(key);
            }
            if (typeof value === 'object' && value !== null) {
                traverse(value);
            }
        }
    }
    traverse(schema);
    return attributes;
}
//# sourceMappingURL=x-graphql-validator.js.map