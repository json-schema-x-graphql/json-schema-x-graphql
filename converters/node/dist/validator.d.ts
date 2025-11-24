import { JsonSchema, ValidationResult } from './types.js';
export declare class Validator {
    private ajv;
    constructor();
    validateJsonSchema(schema: JsonSchema): ValidationResult;
    validateGraphQLSdl(sdl: string): ValidationResult;
    validateGraphQLName(name: string): ValidationResult;
    validateGraphQLType(type: string): ValidationResult;
    validateFederationFields(fields: string): ValidationResult;
    validateUrl(url: string): ValidationResult;
}
//# sourceMappingURL=validator.d.ts.map