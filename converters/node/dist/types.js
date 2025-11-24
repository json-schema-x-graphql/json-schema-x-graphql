export const DEFAULT_OPTIONS = {
    validate: false,
    includeDescriptions: true,
    preserveFieldOrder: false,
    prettyPrint: true,
    federationVersion: null,
    caseConversion: 'camel',
};
export var ConversionDirection;
(function (ConversionDirection) {
    ConversionDirection["JsonSchemaToGraphQL"] = "json-schema-to-graphql";
    ConversionDirection["GraphQLToJsonSchema"] = "graphql-to-json-schema";
})(ConversionDirection || (ConversionDirection = {}));
export class ConversionError extends Error {
    code;
    errors;
    constructor(message, errors, code) {
        super(message);
        this.name = 'ConversionError';
        this.errors = errors;
        this.code = code;
    }
}
//# sourceMappingURL=types.js.map