import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse, buildSchema } from 'graphql';
export class Validator {
    ajv;
    constructor() {
        this.ajv = new Ajv({
            allErrors: true,
            strict: false,
            validateFormats: true,
        });
        addFormats(this.ajv);
    }
    validateJsonSchema(schema) {
        const errors = [];
        if (typeof schema !== 'object' || schema === null) {
            return {
                valid: false,
                errors: [{ message: 'Schema must be an object', code: 'INVALID_SCHEMA' }],
            };
        }
        if (schema['x-graphql-type-name']) {
            const nameValidation = this.validateGraphQLName(schema['x-graphql-type-name']);
            if (!nameValidation.valid) {
                errors.push(...(nameValidation.errors || []));
            }
        }
        if (schema['x-graphql-type']) {
            const typeValidation = this.validateGraphQLType(schema['x-graphql-type']);
            if (!typeValidation.valid) {
                errors.push(...(typeValidation.errors || []));
            }
        }
        if (schema.properties) {
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
                const propValidation = this.validateJsonSchema(propSchema);
                if (!propValidation.valid) {
                    errors.push(...(propValidation.errors || []).map((err) => ({
                        ...err,
                        path: `properties.${propName}${err.path ? '.' + err.path : ''}`,
                    })));
                }
            }
        }
        if (schema['x-graphql-directives']) {
            if (!Array.isArray(schema['x-graphql-directives'])) {
                errors.push({
                    message: 'x-graphql-directives must be an array',
                    code: 'INVALID_DIRECTIVES',
                });
            }
            else {
                for (const directive of schema['x-graphql-directives']) {
                    if (!directive.name || typeof directive.name !== 'string') {
                        errors.push({
                            message: 'Directive must have a name',
                            code: 'INVALID_DIRECTIVE',
                        });
                    }
                    else {
                        const nameValidation = this.validateGraphQLName(directive.name);
                        if (!nameValidation.valid) {
                            errors.push(...(nameValidation.errors || []));
                        }
                    }
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    validateGraphQLSdl(sdl) {
        try {
            parse(sdl);
            buildSchema(sdl);
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                errors: [
                    {
                        message: error.message,
                        code: 'INVALID_SDL',
                    },
                ],
            };
        }
    }
    validateGraphQLName(name) {
        const nameRegex = /^[_A-Za-z][_0-9A-Za-z]*$/;
        if (!name) {
            return {
                valid: false,
                errors: [{ message: 'Name cannot be empty', code: 'EMPTY_NAME' }],
            };
        }
        if (!nameRegex.test(name)) {
            return {
                valid: false,
                errors: [
                    {
                        message: `Invalid GraphQL name '${name}': must match /^[_A-Za-z][_0-9A-Za-z]*$/`,
                        code: 'INVALID_NAME',
                    },
                ],
            };
        }
        if (name.startsWith('__')) {
            return {
                valid: false,
                errors: [
                    {
                        message: `Invalid GraphQL name '${name}': names starting with '__' are reserved`,
                        code: 'RESERVED_NAME',
                    },
                ],
            };
        }
        return { valid: true };
    }
    validateGraphQLType(type) {
        const typeRegex = /^(\[)?[_A-Za-z][_0-9A-Za-z]*!?(\])?!?$/;
        if (!type) {
            return {
                valid: false,
                errors: [{ message: 'Type cannot be empty', code: 'EMPTY_TYPE' }],
            };
        }
        if (!typeRegex.test(type)) {
            return {
                valid: false,
                errors: [
                    {
                        message: `Invalid GraphQL type '${type}'`,
                        code: 'INVALID_TYPE',
                    },
                ],
            };
        }
        return { valid: true };
    }
    validateFederationFields(fields) {
        if (!fields || fields.trim() === '') {
            return {
                valid: false,
                errors: [{ message: 'Fields selection cannot be empty', code: 'EMPTY_FIELDS' }],
            };
        }
        const validChars = /^[_A-Za-z0-9\s"{}(),]+$/;
        if (!validChars.test(fields)) {
            return {
                valid: false,
                errors: [
                    {
                        message: `Invalid characters in fields selection: ${fields}`,
                        code: 'INVALID_FIELDS',
                    },
                ],
            };
        }
        return { valid: true };
    }
    validateUrl(url) {
        const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
        if (!url) {
            return {
                valid: false,
                errors: [{ message: 'URL cannot be empty', code: 'EMPTY_URL' }],
            };
        }
        if (!urlRegex.test(url)) {
            return {
                valid: false,
                errors: [
                    {
                        message: `Invalid URL format: ${url}`,
                        code: 'INVALID_URL',
                    },
                ],
            };
        }
        return { valid: true };
    }
}
//# sourceMappingURL=validator.js.map