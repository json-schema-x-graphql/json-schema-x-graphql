import { jsonSchemaToGraphQL } from "./converter.js";
import { zodToJsonSchema } from "zod-to-json-schema";
export function isZodSchema(schema) {
    return (schema &&
        typeof schema === "object" &&
        typeof schema.parse === "function" &&
        schema._def !== undefined);
}
export function isStandardSchema(schema) {
    return schema && typeof schema === "object" && "~standard" in schema;
}
/**
 * Converts a Zod or Standard Schema to GraphQL SDL.
 * Uses `zod-to-json-schema` to bridge to JSON Schema, then runs the converter.
 *
 * @param schema A Zod schema or Standard Schema-compliant object.
 * @param options Converter options.
 */
export function convertStandardSchemaToGraphQL(schema, options) {
    let jsonSchema;
    if (isZodSchema(schema)) {
        jsonSchema = zodToJsonSchema(schema, {
            // jsonSchema7 is the most widely compatible with our converter's handling
            target: "jsonSchema7",
        });
    }
    else if (isStandardSchema(schema)) {
        const vendor = schema["~standard"]?.vendor;
        if (vendor === "zod" || isZodSchema(schema)) {
            jsonSchema = zodToJsonSchema(schema, { target: "jsonSchema7" });
        }
        else {
            throw new Error(`Unsupported Standard Schema vendor: "${vendor}". ` +
                `Currently only Zod schemas are supported. ` +
                `To add support for "${vendor}", convert it to JSON Schema first ` +
                `and use jsonSchemaToGraphQL() directly.`);
        }
    }
    else {
        throw new Error("Provided object is not a valid Zod or Standard Schema. " +
            "Expected a Zod schema (with .parse()) or a Standard Schema " +
            "(with `~standard` property).");
    }
    // Ensure $schema declaration is set so downstream validators can identify the draft.
    // zod-to-json-schema outputs Draft-07 compatible JSON Schema.
    if (!jsonSchema.$schema) {
        jsonSchema.$schema = "http://json-schema.org/draft-07/schema#";
    }
    // Generate SDL using the existing converter
    return jsonSchemaToGraphQL(JSON.stringify(jsonSchema), options);
}
//# sourceMappingURL=standard-schema.js.map