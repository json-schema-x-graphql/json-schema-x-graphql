/**
 * Validation utilities for JSON Schema and GraphQL SDL
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse, buildSchema } from 'graphql';
import { JsonSchema, ValidationResult, ValidationError } from './types.js';

/**
 * Validator for JSON Schema and GraphQL SDL
 */
export class Validator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
    });
    addFormats(this.ajv);
  }

  /**
   * Validate JSON Schema structure and x-graphql-* extensions
   *
   * @param schema - JSON Schema to validate
   * @returns Validation result
   */
  public validateJsonSchema(schema: JsonSchema): ValidationResult {
    const errors: ValidationError[] = [];

    // Basic structure validation
    if (typeof schema !== 'object' || schema === null) {
      return {
        valid: false,
        errors: [{ message: 'Schema must be an object', code: 'INVALID_SCHEMA' }],
      };
    }

    // Validate x-graphql-type-name if present
    if (schema['x-graphql-type-name']) {
      const nameValidation = this.validateGraphQLName(schema['x-graphql-type-name']);
      if (!nameValidation.valid) {
        errors.push(...(nameValidation.errors || []));
      }
    }

    // Validate x-graphql-type if present
    if (schema['x-graphql-type']) {
      const typeValidation = this.validateGraphQLType(schema['x-graphql-type']);
      if (!typeValidation.valid) {
        errors.push(...(typeValidation.errors || []));
      }
    }

    // Validate properties recursively
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const propValidation = this.validateJsonSchema(propSchema as JsonSchema);
        if (!propValidation.valid) {
          errors.push(
            ...(propValidation.errors || []).map((err) => ({
              ...err,
              path: `properties.${propName}${err.path ? '.' + err.path : ''}`,
            }))
          );
        }
      }
    }

    // Validate directives if present
    if (schema['x-graphql-directives']) {
      if (!Array.isArray(schema['x-graphql-directives'])) {
        errors.push({
          message: 'x-graphql-directives must be an array',
          code: 'INVALID_DIRECTIVES',
        });
      } else {
        for (const directive of schema['x-graphql-directives']) {
          if (!directive.name || typeof directive.name !== 'string') {
            errors.push({
              message: 'Directive must have a name',
              code: 'INVALID_DIRECTIVE',
            });
          } else {
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

  /**
   * Validate GraphQL SDL syntax
   *
   * @param sdl - GraphQL SDL string
   * @returns Validation result
   */
  public validateGraphQLSdl(sdl: string): ValidationResult {
    try {
      // Try to parse the SDL
      parse(sdl);

      // Try to build a schema (more comprehensive validation)
      buildSchema(sdl);

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            message: (error as Error).message,
            code: 'INVALID_SDL',
          },
        ],
      };
    }
  }

  /**
   * Validate a GraphQL name
   *
   * @param name - Name to validate
   * @returns Validation result
   */
  public validateGraphQLName(name: string): ValidationResult {
    // GraphQL names must match: /^[_A-Za-z][_0-9A-Za-z]*$/
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

    // Check for reserved names (starting with __)
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

  /**
   * Validate a GraphQL type reference
   *
   * @param type - Type string to validate (e.g., "String!", "[Int]")
   * @returns Validation result
   */
  public validateGraphQLType(type: string): ValidationResult {
    // Basic validation for GraphQL type syntax
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

  /**
   * Validate federation field selection syntax
   *
   * @param fields - Fields selection string
   * @returns Validation result
   */
  public validateFederationFields(fields: string): ValidationResult {
    if (!fields || fields.trim() === '') {
      return {
        valid: false,
        errors: [{ message: 'Fields selection cannot be empty', code: 'EMPTY_FIELDS' }],
      };
    }

    // Basic validation - would need more sophisticated parsing for full support
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

  /**
   * Validate a URL
   *
   * @param url - URL string to validate
   * @returns Validation result
   */
  public validateUrl(url: string): ValidationResult {
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
