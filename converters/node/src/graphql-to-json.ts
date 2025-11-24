import {
  buildSchema,
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLField,
  GraphQLInputField,
  GraphQLType,
  isObjectType,
  isInterfaceType,
  isEnumType,
  isUnionType,
  isScalarType,
  isInputObjectType,
  isNonNullType,
  isListType,
  getNamedType,
  isSpecifiedScalarType,
  ConstDirectiveNode,
  print,
  ConstValueNode,
} from 'graphql';
import {
  JsonSchema,
  ConversionOptions,
  GraphQLDirective,
  JsonSchemaProperty,
  GraphQLArgument as JsonSchemaGraphQLArgument,
} from './types';
import { camelToSnake } from './helpers/case-conversion';

interface ConversionContext {
  options: ConversionOptions;
  schema: GraphQLSchema;
}

/**
 * Converts a GraphQL SDL string to a JSON Schema object.
 *
 * @param sdl The GraphQL SDL string.
 * @param options The conversion options.
 * @returns A JSON Schema object representing the GraphQL schema.
 */
export function convertGraphqlToJson(sdl: string, options: ConversionOptions = {}): JsonSchema {
  try {
    const schema = buildSchema(sdl, { assumeValidSDL: false });
    const context: ConversionContext = { options, schema };

    const definitions: { [key: string]: JsonSchema } = {};
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
    let rootProperties: JsonSchema = {};
    let rootTypeName: string | undefined = queryType?.name;

    if (!rootTypeName) {
      // If no query type is defined, find the first object type to act as the root.
      // This is a common case for simple, single-type GraphQL schemas.
      const objectTypes = Object.values(schema.getTypeMap()).filter(
        (type): type is GraphQLObjectType => isObjectType(type) && !type.name.startsWith('__')
      );
      if (objectTypes.length > 0) {
        rootTypeName = objectTypes[0].name;
      }
    }

    if (rootTypeName && definitions[rootTypeName]) {
      rootProperties = definitions[rootTypeName];
      delete definitions[rootTypeName]; // Avoid duplicating the root type in definitions
    }

    const finalSchema: JsonSchema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Generated JSON Schema from GraphQL',
      ...rootProperties,
      definitions,
    };

    return finalSchema;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to convert GraphQL to JSON Schema: ${error.message}`, {
        cause: error,
      });
    }
    throw new Error(`Failed to convert GraphQL to JSON Schema: An unknown error occurred`);
  }
}

function convertNamedType(type: GraphQLNamedType, context: ConversionContext): JsonSchema {
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
    description: `Unhandled GraphQL type: ${(type as any).name}`,
  };
}

function convertObjectLikeType(
  type: GraphQLObjectType | GraphQLInterfaceType | GraphQLInputObjectType,
  context: ConversionContext
): JsonSchema {
  const schema: JsonSchema = {
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
    const propertyName =
      context.options.caseConversion === 'snake' ? camelToSnake(fieldName) : fieldName;

    const { property, isRequired } = convertField(field, context);
    if (schema.properties) {
      schema.properties[propertyName] = property as JsonSchemaProperty;
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

function convertField(
  field: GraphQLField<unknown, unknown> | GraphQLInputField,
  context: ConversionContext
): { property: JsonSchema; isRequired: boolean } {
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
    property['x-graphql-arguments'] = field.args.map(
      (arg): JsonSchemaGraphQLArgument => ({
        name: arg.name,
        type: arg.type.toString(),
        description: arg.description ?? undefined,
        default: arg.defaultValue,
      })
    );
  }

  if (field.astNode?.directives?.length) {
    property['x-graphql-directives'] = convertDirectives(field.astNode.directives);
  }

  return { property, isRequired };
}

function convertType(type: GraphQLType, context: ConversionContext): JsonSchema {
  if (isNonNullType(type)) {
    return convertType(type.ofType, context);
  }
  if (isListType(type)) {
    return {
      type: 'array',
      items: convertType(type.ofType, context) as JsonSchemaProperty,
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

function convertEnumType(type: GraphQLEnumType, options: ConversionOptions): JsonSchema {
  const schema: JsonSchema = {
    type: 'string',
    enum: type.getValues().map((val) => val.name),
  };
  if (type.description && options.includeDescriptions) {
    schema.description = type.description;
  }
  return schema;
}

function convertUnionType(type: GraphQLUnionType, options: ConversionOptions): JsonSchema {
  const schema: JsonSchema = {
    anyOf: type.getTypes().map((objType) => ({
      $ref: `#/definitions/${objType.name}`,
    })),
  };
  if (type.description && options.includeDescriptions) {
    schema.description = type.description;
  }
  return schema;
}

function convertScalarType(type: GraphQLScalarType): JsonSchema {
  const schema: JsonSchema = {};
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

type DirectiveArgumentValue = string | number | boolean | unknown;
type DirectiveArgs = Record<string, DirectiveArgumentValue>;

function convertValue(value: ConstValueNode): DirectiveArgumentValue {
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
      return value.fields.reduce(
        (acc, field) => {
          acc[field.name.value] = convertValue(field.value);
          return acc;
        },
        {} as Record<string, DirectiveArgumentValue>
      );
    default:
      return print(value);
  }
}

function convertDirectives(directives: readonly ConstDirectiveNode[]): GraphQLDirective[] {
  return directives.map((directive) => {
    const args =
      directive.arguments?.reduce((argAcc, arg) => {
        argAcc[arg.name.value] = convertValue(arg.value);
        return argAcc;
      }, {} as DirectiveArgs) || {};
    return {
      name: directive.name.value,
      arguments: args as Record<string, string | number | boolean | string[] | number[]>,
    };
  });
}
