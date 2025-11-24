import { ConversionError } from './types';
function formatDescription(description) {
    if (!description) {
        return '';
    }
    const sanitized = description.replace(/"""/g, '""_');
    if (sanitized.includes('\n')) {
        return `"""\n${sanitized}\n"""`;
    }
    return `"${sanitized.replace(/"/g, '\\"')}"`;
}
function formatValue(value) {
    if (typeof value === 'string') {
        return `"${value.replace(/"/g, '\\"')}"`;
    }
    if (Array.isArray(value)) {
        return `[${value.map(formatValue).join(', ')}]`;
    }
    if (typeof value === 'object' && value !== null) {
        const fields = Object.entries(value)
            .map(([key, val]) => `${key}: ${formatValue(val)}`)
            .join(', ');
        return `{ ${fields} }`;
    }
    return String(value);
}
function formatDirectives(directives) {
    if (!directives || directives.length === 0) {
        return '';
    }
    return directives
        .map((dir) => {
        let dirStr = `@${dir.name}`;
        if (dir.arguments && Object.keys(dir.arguments).length > 0) {
            const args = Object.entries(dir.arguments)
                .map(([key, value]) => `${key}: ${formatValue(value)}`)
                .join(', ');
            dirStr += `(${args})`;
        }
        return dirStr;
    })
        .join(' ');
}
export async function convertJsonToGraphql(jsonSchema, options = {}) {
    const schema = typeof jsonSchema === 'string' ? JSON.parse(jsonSchema) : jsonSchema;
    const context = {
        schema,
        options,
        processedDefs: new Set(),
        building: new Set(),
    };
    const sdlParts = [];
    const definitions = schema.definitions || schema.$defs || {};
    for (const defName in definitions) {
        sdlParts.push(convertDefinition(defName, definitions[defName], context));
    }
    if (schema.type === 'object' && schema['x-graphql-type-name']) {
        const rootTypeName = schema['x-graphql-type-name'];
        if (!context.processedDefs.has(rootTypeName)) {
            sdlParts.push(convertObjectType(rootTypeName, schema, context));
        }
    }
    return sdlParts.filter((part) => part).join('\n\n');
}
function convertDefinition(defName, defSchema, context) {
    const typeName = defSchema['x-graphql-type-name'] || defName;
    if (context.processedDefs.has(typeName)) {
        return '';
    }
    const kind = defSchema['x-graphql-type-kind'];
    if (kind === 'ENUM' || defSchema.enum) {
        return convertEnumType(typeName, defSchema, context);
    }
    if (kind === 'UNION' || defSchema.oneOf || defSchema.anyOf) {
        return convertUnionType(typeName, defSchema, context);
    }
    if (kind === 'SCALAR') {
        return convertScalarType(typeName, defSchema, context);
    }
    return convertObjectType(typeName, defSchema, context);
}
const typeKindMap = {
    OBJECT: 'type',
    INTERFACE: 'interface',
    INPUT_OBJECT: 'input',
};
function convertObjectType(typeName, schema, context) {
    if (context.building.has(typeName)) {
        throw new ConversionError(`Circular dependency detected for type "${typeName}"`);
    }
    context.building.add(typeName);
    const description = schema.description ? formatDescription(schema.description) : '';
    const kind = schema['x-graphql-type-kind'] || 'OBJECT';
    const keyword = typeKindMap[kind] || 'type';
    let header = `${keyword} ${typeName}`;
    const implementsInterfaces = schema['x-graphql-implements'];
    if (Array.isArray(implementsInterfaces) && implementsInterfaces.length > 0) {
        header += ` implements ${implementsInterfaces.join(' & ')}`;
    }
    const allDirectives = [...(schema['x-graphql-directives'] || [])];
    if (Array.isArray(schema['x-graphql-federation-keys'])) {
        for (const key of schema['x-graphql-federation-keys']) {
            allDirectives.push({ name: 'key', arguments: { fields: key.fields } });
        }
    }
    const directives = formatDirectives(allDirectives);
    if (directives) {
        header += ` ${directives}`;
    }
    const fields = [];
    if (schema.properties) {
        const required = new Set(schema.required || []);
        for (const propName in schema.properties) {
            const propSchema = schema.properties[propName];
            fields.push(convertField(propName, propSchema, required.has(propName), context));
        }
    }
    context.processedDefs.add(typeName);
    context.building.delete(typeName);
    const body = fields.map((f) => `  ${f}`).join('\n');
    return [description, `${header} {`, body, '}'].filter((p) => p).join('\n');
}
function convertField(propName, propSchema, isRequired, context) {
    const description = propSchema.description ? formatDescription(propSchema.description) : '';
    const fieldName = propSchema['x-graphql-field-name'] || propName;
    const gqlType = convertToGraphQLType(propSchema, isRequired, context);
    let argsStr = '';
    if (Array.isArray(propSchema['x-graphql-field-arguments'])) {
        const args = propSchema['x-graphql-field-arguments']
            .map((arg) => {
            let argDef = `${arg.name}: ${arg.type}`;
            if (arg.defaultValue !== undefined) {
                argDef += ` = ${formatValue(arg.defaultValue)}`;
            }
            return argDef;
        })
            .join(', ');
        if (args) {
            argsStr = `(${args})`;
        }
    }
    const allDirectives = [...(propSchema['x-graphql-directives'] || [])];
    if (propSchema['x-graphql-federation-external']) {
        allDirectives.push({ name: 'external' });
    }
    if (propSchema['x-graphql-federation-requires']) {
        allDirectives.push({
            name: 'requires',
            arguments: { fields: propSchema['x-graphql-federation-requires'] },
        });
    }
    if (propSchema['x-graphql-federation-provides']) {
        allDirectives.push({
            name: 'provides',
            arguments: { fields: propSchema['x-graphql-federation-provides'] },
        });
    }
    if (propSchema['x-graphql-federation-shareable']) {
        allDirectives.push({ name: 'shareable' });
    }
    if (propSchema['x-graphql-federation-authenticated']) {
        allDirectives.push({ name: 'authenticated' });
    }
    if (propSchema['x-graphql-federation-requires-scopes']) {
        allDirectives.push({
            name: 'requiresScopes',
            arguments: { scopes: propSchema['x-graphql-federation-requires-scopes'] },
        });
    }
    if (propSchema['x-graphql-field-deprecated']) {
        const reason = propSchema['x-graphql-field-deprecation-reason'];
        allDirectives.push({ name: 'deprecated', arguments: reason ? { reason } : undefined });
    }
    const directives = formatDirectives(allDirectives);
    let fieldDef = `${fieldName}${argsStr}: ${gqlType}`;
    if (directives) {
        fieldDef += ` ${directives}`;
    }
    return description ? `${description}\n${fieldDef}` : fieldDef;
}
function convertToGraphQLType(propSchema, isRequired, context) {
    let typeStr;
    if (propSchema.type === 'array') {
        const itemsSchema = propSchema.items || { type: 'string' };
        const isListItemRequired = propSchema['x-graphql-field-list-item-non-null'] === true;
        const itemType = convertToGraphQLType(itemsSchema, isListItemRequired, context);
        typeStr = `[${itemType}]`;
    }
    else if (propSchema['x-graphql-field-type']) {
        typeStr = propSchema['x-graphql-field-type'].replace(/!$/, '');
    }
    else if (propSchema.$ref) {
        const refPath = propSchema.$ref;
        if (typeof refPath !== 'string') {
            throw new ConversionError(`Invalid $ref format: ${JSON.stringify(refPath)}. Must be a string.`);
        }
        if (!refPath.startsWith('#/definitions/') && !refPath.startsWith('#/$defs/')) {
            throw new ConversionError(`Unsupported $ref format: ${refPath}. Only local definition references are supported.`);
        }
        typeStr = refPath.split('/').pop();
    }
    else {
        switch (propSchema.type) {
            case 'string':
                typeStr = 'String';
                break;
            case 'integer':
                typeStr = 'Int';
                break;
            case 'number':
                typeStr = 'Float';
                break;
            case 'boolean':
                typeStr = 'Boolean';
                break;
            default:
                typeStr = propSchema['x-graphql-type-name'] || 'JSON';
                break;
        }
    }
    const isFieldRequired = isRequired || propSchema['x-graphql-field-non-null'] === true;
    return isFieldRequired ? `${typeStr}!` : typeStr;
}
function convertEnumType(typeName, schema, context) {
    context.processedDefs.add(typeName);
    const description = schema.description ? formatDescription(schema.description) : '';
    const header = `enum ${typeName}`;
    const values = schema.enum?.map((val) => `  ${String(val)}`).join('\n') || '';
    return [description, `${header} {`, values, '}'].filter((p) => p).join('\n');
}
function convertUnionType(typeName, schema, context) {
    context.processedDefs.add(typeName);
    const description = schema.description ? formatDescription(schema.description) : '';
    const schemas = schema.oneOf || schema.anyOf;
    if (!Array.isArray(schemas)) {
        throw new ConversionError(`Union type "${typeName}" must have a "oneOf" or "anyOf" array property.`);
    }
    const memberTypes = schemas.map((memberSchema) => {
        if (!memberSchema.$ref) {
            throw new ConversionError(`Union type "${typeName}" members must be $refs to other types.`);
        }
        return convertToGraphQLType(memberSchema, false, context);
    });
    const unionSDL = `union ${typeName} = ${memberTypes.join(' | ')}`;
    return description ? `${description}\n${unionSDL}` : unionSDL;
}
function convertScalarType(typeName, schema, context) {
    context.processedDefs.add(typeName);
    const description = schema.description ? formatDescription(schema.description) : '';
    const scalarSDL = `scalar ${typeName}`;
    return description ? `${description}\n${scalarSDL}` : scalarSDL;
}
//# sourceMappingURL=json-to-graphql.js.map