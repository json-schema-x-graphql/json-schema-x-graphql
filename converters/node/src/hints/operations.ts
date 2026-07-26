/**
 * GraphQL operation type generation from x-graphql-operations extension.
 *
 * Parses the `x-graphql-operations` top-level schema extension and
 * generates `type Query`, `type Mutation`, and `type Subscription`
 * blocks in the output SDL.
 *
 * Mirrors the Rust implementation in `converters/rust/src/hints/operations.rs`.
 */

export interface OperationArgument {
  name: string;
  graphqlType: string;
  description?: string;
  defaultValue?: string;
}

export interface OperationField {
  name: string;
  graphqlType: string;
  description?: string;
  arguments: OperationArgument[];
  deprecated?: string;
}

export interface OperationsConfig {
  queries: OperationField[];
  mutations: OperationField[];
  subscriptions: OperationField[];
}

interface ArgumentConfig {
  type?: string;
  "x-graphql-type"?: string;
  description?: string;
  default?: unknown;
}

interface FieldConfig {
  type?: string;
  description?: string;
  args?: Record<string, ArgumentConfig>;
  arguments?: Record<string, ArgumentConfig>;
  deprecated?: boolean | string;
}

/** Parse `x-graphql-operations` from the schema root. */
export function parseOperations(schema: any): OperationsConfig {
  const obj = schema as Record<string, unknown> | undefined;
  if (!obj || typeof obj !== "object") {
    return { queries: [], mutations: [], subscriptions: [] };
  }

  const ops = (obj as Record<string, unknown>)["x-graphql-operations"] as
    Record<string, unknown> | undefined;
  if (!ops) {
    return { queries: [], mutations: [], subscriptions: [] };
  }

  return {
    queries: parseOperationGroup(ops["queries"]),
    mutations: parseOperationGroup(ops["mutations"]),
    subscriptions: parseOperationGroup(ops["subscriptions"]),
  };
}

function parseOperationGroup(group: unknown): OperationField[] {
  const fieldsObj = (group as Record<string, unknown> | undefined) ?? undefined;
  if (!fieldsObj || typeof fieldsObj !== "object") {
    return [];
  }

  return Object.entries(fieldsObj as Record<string, unknown>)
    .map(([name, fieldConfig]) => {
      const fieldObj = fieldConfig as FieldConfig;
      if (!fieldObj || typeof fieldObj !== "object") {
        return null;
      }
      const graphqlType = fieldObj.type ?? "String";
      const description = fieldObj.description;
      const deprecated =
        typeof fieldObj.deprecated === "string"
          ? fieldObj.deprecated
          : fieldObj.deprecated === true
            ? ""
            : undefined;
      const arguments_ = parseArguments(fieldObj.args ?? fieldObj.arguments);
      const result: OperationField = {
        name,
        graphqlType,
        description,
        arguments: arguments_,
        deprecated,
      };
      return result;
    })
    .filter((f): f is OperationField => f !== null);
}

function parseArguments(argsValue: unknown): OperationArgument[] {
  if (!argsValue || typeof argsValue !== "object") {
    return [];
  }
  const result: OperationArgument[] = [];
  for (const [name, argConfig] of Object.entries(
    argsValue as Record<string, unknown>,
  )) {
    const argObj = argConfig as ArgumentConfig;
    if (!argObj || typeof argObj !== "object") continue;
    const graphqlType = argObj.type ?? argObj["x-graphql-type"] ?? "String";
    const description = argObj.description;
    const defaultValue =
      argObj.default !== undefined
        ? formatDefaultValue(argObj.default)
        : undefined;
    result.push({ name, graphqlType, description, defaultValue });
  }
  return result;
}

function formatDefaultValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (value === null) return "null";
  return JSON.stringify(value);
}

/** Format a description as a GraphQL block string or single-line string. */
function formatDescription(desc: string): string {
  const trimmed = desc.trim();
  if (!trimmed) return "";
  if (trimmed.includes("\n")) {
    return `"""\n${trimmed}\n"""`;
  }
  return `"""${trimmed}"""`;
}

/** Generate SDL for an operation type (Query, Mutation, or Subscription). */
export function generateOperationType(
  typeName: string,
  fields: OperationField[],
): string | null {
  if (fields.length === 0) return null;

  const lines: string[] = [`type ${typeName} {`];

  for (const field of fields) {
    if (field.description) {
      lines.push(`  ${formatDescription(field.description)}`);
    }

    let argsStr = "";
    if (field.arguments.length > 0) {
      const hasDescriptions = field.arguments.some((a) => a.description);
      if (hasDescriptions) {
        const argLines: string[] = [];
        for (const arg of field.arguments) {
          if (arg.description) {
            argLines.push(`    ${formatDescription(arg.description)}`);
          }
          let argStr = `    ${arg.name}: ${arg.graphqlType}`;
          if (arg.defaultValue) {
            argStr += ` = ${arg.defaultValue}`;
          }
          argLines.push(argStr);
        }
        argsStr = `(\n${argLines.join("\n")}\n  )`;
      } else {
        const argParts: string[] = [];
        for (const arg of field.arguments) {
          let argStr = `${arg.name}: ${arg.graphqlType}`;
          if (arg.defaultValue) {
            argStr += ` = ${arg.defaultValue}`;
          }
          argParts.push(argStr);
        }
        argsStr = `(${argParts.join(", ")})`;
      }
    }

    let fieldLine = `  ${field.name}${argsStr}: ${field.graphqlType}`;

    if (field.deprecated !== undefined) {
      if (field.deprecated === "") {
        fieldLine += " @deprecated";
      } else {
        fieldLine += ` @deprecated(reason: "${field.deprecated}")`;
      }
    }

    lines.push(fieldLine);
  }

  lines.push("}");
  return lines.join("\n");
}

/** Generate all operation type SDL blocks. */
export function generateOperationsSdl(
  config: OperationsConfig,
  existingSdl: string = "",
): string {
  const blocks: string[] = [];
  const querySdl = generateOperationType("Query", config.queries);
  const mutationSdl = generateOperationType("Mutation", config.mutations);
  const subscriptionSdl = generateOperationType(
    "Subscription",
    config.subscriptions,
  );

  if (querySdl) blocks.push(querySdl);
  if (mutationSdl) blocks.push(mutationSdl);
  if (subscriptionSdl) blocks.push(subscriptionSdl);

  if (blocks.length === 0) return "";
  blocks.push("");

  // Append to existing SDL, but skip if existing SDL already has these types
  if (existingSdl.includes("type Query")) return existingSdl;
  if (existingSdl.includes("type Mutation")) {
    // Could merge, but for simplicity, skip
  }
  return blocks.join("\n\n");
}

/** Append operation types to existing SDL. */
export function injectOperations(
  sdl: string,
  config: OperationsConfig,
): string {
  const opsSdl = generateOperationsSdl(config, sdl);
  if (!opsSdl) return sdl;
  return `${sdl.trimEnd()}\n${opsSdl}`;
}
