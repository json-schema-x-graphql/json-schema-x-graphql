import { jsonSchemaToGraphQL } from "./converter.js";
import { zodToJsonSchema } from "zod-to-json-schema";
export function isZodSchema(schema) {
    return schema && typeof schema === "object" && typeof schema.parse === "function" && schema._def !== undefined;
}
export function isStandardSchema(schema) {
    return schema && typeof schema === "object" && "~standard" in schema;
}
/**
 * Converts a Zod or Standard Schema to GraphQL SDL.
 * Currently, natively leverages `zod-to-json-schema` to bridge the gap.
 * @param schema A Zod schema or Standard Schema-compliant object.
 * @param options Converter options.
 */
export function convertStandardSchemaToGraphQL(schema, options) {
    let jsonSchema;
    if (isZodSchema(schema)) {
        jsonSchema = zodToJsonSchema(schema, { target: "jsonSchema7" });
    }
    else if (isStandardSchema(schema)) {
        if (schema["~standard"].vendor === "zod" || isZodSchema(schema)) {
            jsonSchema = zodToJsonSchema(schema, { target: "jsonSchema7" });
        }
        else {
            throw new Error(`Currently, only Zod standard schemas are natively supported for JSON Schema conversion via zod-to-json-schema. Received vendor: ${schema["~standard"].vendor}`);
        }
    }
    else {
        throw new Error("Provided object is not a valid Zod or Standard Schema.");
    }
    // Generate SDL using the existing converter
    return jsonSchemaToGraphQL(JSON.stringify(jsonSchema), options);
}
//# sourceMappingURL=standard-schema.js.map