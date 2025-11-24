import { JsonSchema, ConversionOptions, ConversionError, GraphQLDirective } from './types';

/**
 * Helper to format a description string into a GraphQL comment.
 * Handles multi-line descriptions by using block strings.
 * @param description The description text.
 * @returns A GraphQL-formatted description string.
 */
function formatDescription(description: string): string {
  if (!description) {
    return '';
  }
  // Avoid breaking out of a block string if it contains triple quotes
  const sanitized = description.replace(/"""/g, '""_');
  if (sanitized.includes('\n')) {
    return `"""\n${sanitized}\n"""`;
  }
  return `"${sanitized.replace(/"/g, '\\"')}"`;
}

/**
 * Formats a JavaScript value into a GraphQL-compatible string for SDL.
 * @param value The value to format.
 * @returns A string representation of the value for SDL.
 */
function formatValue(value: unknown): string {
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

/**
 * Formats an array of directive definitions into a GraphQL SDL string.
 * @param directives An array of directive objects.
 * @returns A string of formatted directives, e.g., "@deprecated(reason: "...") @custom".
 */
function formatDirectives(directives: GraphQLDirective[]): string {
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

/**
 * Holds the state during a conversion process.
 */
interface ConversionContext {
  schema: JsonSchema;
  options: ConversionOptions;
  // Tracks definitions that have already been converted to avoid redundant output.
  processedDefs: Set<string>;
  // Tracks types currently being built to detect circular dependencies.
  building: Set<string>;
}

/**
 * Main function to convert a JSON Schema object to a GraphQL SDL string.
 * This implementation is inspired by the advanced logic found in the project's scripts,
 * handling various `x-graphql-*` extensions and schema structures.
 *
 * @param jsonSchema The JSON Schema object or a string representation of it.
 * @param options The conversion options.
 * @returns The generated GraphQL SDL string.
 */
export async function convertJsonToGraphql(
  jsonSchema: JsonSchema | string,
  options: ConversionOptions = {}
): Promise<string> {
  const schema = typeof jsonSchema === 'string' ? JSON.parse(jsonSchema) : jsonSchema;

  const context: ConversionContext = {
    schema,
    options,
    processedDefs: new Set(),
    building: new Set(),
  };

  const sdlParts: string[] = [];
  const definitions = schema.definitions || schema.$defs || {};

  // First, convert all named definitions. This allows forward references to work correctly.
  for (const defName in definitions) {
    sdlParts.push(convertDefinition(defName, definitions[defName], context));
  }

  // After processing definitions, convert the root schema if it's a defined type.
  if (schema.type === 'object' && schema['x-graphql-type-name']) {
    const rootTypeName = schema['x-graphql-type-name'];
    if (!context.processedDefs.has(rootTypeName)) {
      sdlParts.push(convertObjectType(rootTypeName, schema, context));
    }
  }

  return sdlParts.filter((part) => part).join('\n\n');
}

/**
 * Routes a definition from the schema to the correct conversion function based on its kind.
 * @param defName The name of the definition.
 * @param defSchema The schema object for the definition.
 * @param context The conversion context.
 * @returns A GraphQL SDL string for the definition, or an empty string if already processed.
 */
function convertDefinition(
  defName: string,
  defSchema: JsonSchema,
  context: ConversionContext
): string {
  const typeName = defSchema['x-graphql-type-name'] || defName;
  if (context.processedDefs.has(typeName)) {
    return ''; // Avoid duplicating definitions
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
  // Default to object/interface/input types
  return convertObjectType(typeName, defSchema, context);
}

const typeKindMap = {
  OBJECT: 'type',
  INTERFACE: 'interface',
  INPUT_OBJECT: 'input',
} as const;

/**
 * Converts a JSON Schema object into a GraphQL object, interface, or input type.
 * @param typeName The name of the GraphQL type.
 * @param schema The schema for the object.
 * @param context The conversion context.
 * @returns A GraphQL SDL string for the object type.
 */
function convertObjectType(
  typeName: string,
  schema: JsonSchema,
  context: ConversionContext
): string {
  if (context.building.has(typeName)) {
    throw new ConversionError(`Circular dependency detected for type "${typeName}"`);
  }
  context.building.add(typeName);

  const description = schema.description ? formatDescription(schema.description) : '';
  const kind = schema['x-graphql-type-kind'] || 'OBJECT';
  const keyword = typeKindMap[kind as keyof typeof typeKindMap] || 'type';

  let header = `${keyword} ${typeName}`;
  const implementsInterfaces = schema['x-graphql-implements'];
  if (Array.isArray(implementsInterfaces) && implementsInterfaces.length > 0) {
    header += ` implements ${implementsInterfaces.join(' & ')}`;
  }
  const allDirectives: GraphQLDirective[] = [...(schema['x-graphql-directives'] || [])];

  // Handle Apollo Federation @key directive from `x-graphql-federation-keys`
  if (Array.isArray(schema['x-graphql-federation-keys'])) {
    for (const key of schema['x-graphql-federation-keys']) {
      allDirectives.push({ name: 'key', arguments: { fields: (key as any).fields } });
    }
  }

  const directives = formatDirectives(allDirectives);
  if (directives) {
    header += ` ${directives}`;
  }

  const fields: string[] = [];
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

/**
 * Converts a JSON Schema property into a GraphQL field definition string.
 * @param propName The name of the property in the JSON Schema.
 * @param propSchema The schema for the property.
 * @param isRequired Whether the field is required.
 * @param context The conversion context.
 * @returns A GraphQL SDL string for the field.
 */
function convertField(
  propName: string,
  propSchema: JsonSchema,
  isRequired: boolean,
  context: ConversionContext
): string {
  const description = propSchema.description ? formatDescription(propSchema.description) : '';
  const fieldName = propSchema['x-graphql-field-name'] || propName;
  const gqlType = convertToGraphQLType(propSchema, isRequired, context);

  let argsStr = '';
  if (Array.isArray(propSchema['x-graphql-field-arguments'])) {
    const args = propSchema['x-graphql-field-arguments']
      .map((arg: any) => {
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

  const allDirectives: GraphQLDirective[] = [...(propSchema['x-graphql-directives'] || [])];
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

/**
 * Resolves the GraphQL type string for a given JSON Schema property.
 * @param propSchema The schema for the property.
 * @param isRequired Whether the type should be non-null.
 * @param context The conversion context.
 * @returns The GraphQL type string (e.g., "String!", "[User]", "ID!").
 */
function convertToGraphQLType(
  propSchema: JsonSchema,
  isRequired: boolean,
  context: ConversionContext
): string {
  let typeStr: string;

  if (propSchema.type === 'array') {
    const itemsSchema = (propSchema.items as JsonSchema) || { type: 'string' };
    const isListItemRequired = propSchema['x-graphql-field-list-item-non-null'] === true;
    const itemType = convertToGraphQLType(itemsSchema, isListItemRequired, context);
    typeStr = `[${itemType}]`;
  } else if (propSchema['x-graphql-field-type']) {
    // For non-array types, `x-graphql-field-type` is a reliable hint.
    // Strip any `!` as nullability is handled at the end.
    typeStr = (propSchema['x-graphql-field-type'] as string).replace(/!$/, '');
  } else if (propSchema.$ref) {
    const refPath = propSchema.$ref;
    if (typeof refPath !== 'string') {
      throw new ConversionError(
        `Invalid $ref format: ${JSON.stringify(refPath)}. Must be a string.`
      );
    }
    if (!refPath.startsWith('#/definitions/') && !refPath.startsWith('#/$defs/')) {
      throw new ConversionError(
        `Unsupported $ref format: ${refPath}. Only local definition references are supported.`
      );
    }
    typeStr = refPath.split('/').pop()!;
  } else {
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
        // For inline objects, fall back to a custom JSON scalar or a named type.
        typeStr = propSchema['x-graphql-type-name'] || 'JSON';
        break;
    }
  }

  const isFieldRequired = isRequired || propSchema['x-graphql-field-non-null'] === true;

  return isFieldRequired ? `${typeStr}!` : typeStr;
}

/**
 * Converts a schema to a GraphQL enum type.
 * @param typeName The name of the enum.
 * @param schema The schema for the enum.
 * @param context The conversion context.
 * @returns A GraphQL SDL string for the enum.
 */
function convertEnumType(typeName: string, schema: JsonSchema, context: ConversionContext): string {
  context.processedDefs.add(typeName);
  const description = schema.description ? formatDescription(schema.description) : '';
  const header = `enum ${typeName}`;
  const values = schema.enum?.map((val: unknown) => `  ${String(val)}`).join('\n') || '';
  return [description, `${header} {`, values, '}'].filter((p) => p).join('\n');
}

/**
 * Converts a schema to a GraphQL union type.
 * @param typeName The name of the union.
 * @param schema The schema for the union.
 * @param context The conversion context.
 * @returns A GraphQL SDL string for the union.
 */
function convertUnionType(
  typeName: string,
  schema: JsonSchema,
  context: ConversionContext
): string {
  context.processedDefs.add(typeName);
  const description = schema.description ? formatDescription(schema.description) : '';
  const schemas = schema.oneOf || schema.anyOf;
  if (!Array.isArray(schemas)) {
    throw new ConversionError(
      `Union type "${typeName}" must have a "oneOf" or "anyOf" array property.`
    );
  }

  const memberTypes = (schemas as JsonSchema[]).map((memberSchema) => {
    if (!memberSchema.$ref) {
      throw new ConversionError(`Union type "${typeName}" members must be $refs to other types.`);
    }
    return convertToGraphQLType(memberSchema, false, context);
  });

  const unionSDL = `union ${typeName} = ${memberTypes.join(' | ')}`;
  return description ? `${description}\n${unionSDL}` : unionSDL;
}

/**
 * Converts a schema to a GraphQL scalar type.
 * @param typeName The name of the scalar.
 * @param schema The schema for the scalar.
 * @param context The conversion context.
 * @returns A GraphQL SDL string for the scalar.
 */
function convertScalarType(
  typeName: string,
  schema: JsonSchema,
  context: ConversionContext
): string {
  context.processedDefs.add(typeName);
  const description = schema.description ? formatDescription(schema.description) : '';
  const scalarSDL = `scalar ${typeName}`;
  return description ? `${description}\n${scalarSDL}` : scalarSDL;
}
