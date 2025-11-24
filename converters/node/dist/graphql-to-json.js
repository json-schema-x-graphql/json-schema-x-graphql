import { buildSchema, isObjectType, isInterfaceType, isEnumType, isUnionType, isScalarType, isInputObjectType, isNonNullType, isListType, getNamedType, isSpecifiedScalarType, print, } from 'graphql';
import { camelToSnake } from './helpers/case-conversion';
export function convertGraphqlToJson(sdl, options = {}) {
    try {
        const schema = buildSchema(sdl, { assumeValidSDL: false });
        const context = { options, schema };
        const definitions = {};
        const typeMap = schema.getTypeMap();
        for (const typeName in typeMap) {
            if (typeName.startsWith('__')) {
                continue;
            }
            const type = typeMap[typeName];
            if (isSpecifiedScalarType(type)) {
                continue;
            }
            definitions[typeName] = convertNamedType(type, context);
        }
        const queryType = schema.getQueryType();
        let rootProperties = {};
        let rootTypeName = queryType?.name;
        if (!rootTypeName) {
            const objectTypes = Object.values(schema.getTypeMap()).filter((type) => isObjectType(type) && !type.name.startsWith('__'));
            if (objectTypes.length > 0) {
                rootTypeName = objectTypes[0].name;
            }
        }
        if (rootTypeName && definitions[rootTypeName]) {
            rootProperties = definitions[rootTypeName];
            delete definitions[rootTypeName];
        }
        const finalSchema = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: 'Generated JSON Schema from GraphQL',
            ...rootProperties,
            definitions,
        };
        return finalSchema;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to convert GraphQL to JSON Schema: ${error.message}`, {
                cause: error,
            });
        }
        throw new Error(`Failed to convert GraphQL to JSON Schema: An unknown error occurred`);
    }
}
function convertNamedType(type, context) {
    if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
        return convertObjectLikeType(type, context);
    }
    if (isEnumType(type)) {
        return convertEnumType(type, context.options);
    }
    if (isUnionType(type)) {
        return convertUnionType(type, context.options);
    }
    if (isScalarType(type)) {
        return convertScalarType(type);
    }
    return {
        type: 'object',
        description: `Unhandled GraphQL type: ${type.name}`,
    };
}
function convertObjectLikeType(type, context) {
    const schema = {
        type: 'object',
        properties: {},
        required: [],
    };
    if (type.description && context.options.includeDescriptions) {
        schema.description = type.description;
    }
    const fields = type.getFields();
    for (const fieldName in fields) {
        const field = fields[fieldName];
        const propertyName = context.options.caseConversion === 'snake' ? camelToSnake(fieldName) : fieldName;
        const { property, isRequired } = convertField(field, context);
        if (schema.properties) {
            schema.properties[propertyName] = property;
        }
        if (isRequired && schema.required) {
            schema.required.push(propertyName);
        }
    }
    if (schema.required && schema.required.length === 0) {
        delete schema.required;
    }
    if (isObjectType(type)) {
        const interfaces = type.getInterfaces();
        if (interfaces.length > 0) {
            schema.allOf = interfaces.map((iface) => ({
                $ref: `#/definitions/${iface.name}`,
            }));
        }
    }
    return schema;
}
function convertField(field, context) {
    const fieldType = field.type;
    const isRequired = isNonNullType(fieldType);
    const property = convertType(fieldType, context);
    if (field.description && context.options.includeDescriptions) {
        property.description = field.description;
    }
    if (field.deprecationReason) {
        property.deprecated = true;
        property['x-graphql-deprecation-reason'] = field.deprecationReason;
    }
    if ('args' in field && field.args.length > 0) {
        property['x-graphql-arguments'] = field.args.map((arg) => ({
            name: arg.name,
            type: arg.type.toString(),
            description: arg.description ?? undefined,
            default: arg.defaultValue,
        }));
    }
    if (field.astNode?.directives?.length) {
        property['x-graphql-directives'] = convertDirectives(field.astNode.directives);
    }
    return { property, isRequired };
}
function convertType(type, context) {
    if (isNonNullType(type)) {
        return convertType(type.ofType, context);
    }
    if (isListType(type)) {
        return {
            type: 'array',
            items: convertType(type.ofType, context),
        };
    }
    const namedType = getNamedType(type);
    if (isScalarType(namedType)) {
        return convertScalarType(namedType);
    }
    return {
        $ref: `#/definitions/${namedType.name}`,
    };
}
function convertEnumType(type, options) {
    const schema = {
        type: 'string',
        enum: type.getValues().map((val) => val.name),
    };
    if (type.description && options.includeDescriptions) {
        schema.description = type.description;
    }
    return schema;
}
function convertUnionType(type, options) {
    const schema = {
        anyOf: type.getTypes().map((objType) => ({
            $ref: `#/definitions/${objType.name}`,
        })),
    };
    if (type.description && options.includeDescriptions) {
        schema.description = type.description;
    }
    return schema;
}
function convertScalarType(type) {
    const schema = {};
    switch (type.name) {
        case 'Int':
            schema.type = 'integer';
            break;
        case 'Float':
            schema.type = 'number';
            break;
        case 'String':
        case 'ID':
            schema.type = 'string';
            break;
        case 'Boolean':
            schema.type = 'boolean';
            break;
        default:
            schema.type = 'string';
            schema['x-graphql-scalar'] = type.name;
            break;
    }
    if (type.description) {
        schema.description = type.description;
    }
    return schema;
}
function convertValue(value) {
    switch (value.kind) {
        case 'IntValue':
            return parseInt(value.value, 10);
        case 'FloatValue':
            return parseFloat(value.value);
        case 'StringValue':
        case 'EnumValue':
            return value.value;
        case 'BooleanValue':
            return value.value;
        case 'NullValue':
            return null;
        case 'ListValue':
            return value.values.map(convertValue);
        case 'ObjectValue':
            return value.fields.reduce((acc, field) => {
                acc[field.name.value] = convertValue(field.value);
                return acc;
            }, {});
        default:
            return print(value);
    }
}
function convertDirectives(directives) {
    return directives.map((directive) => {
        const args = directive.arguments?.reduce((argAcc, arg) => {
            argAcc[arg.name.value] = convertValue(arg.value);
            return argAcc;
        }, {}) || {};
        return {
            name: directive.name.value,
            arguments: args,
        };
    });
}
//# sourceMappingURL=graphql-to-json.js.map