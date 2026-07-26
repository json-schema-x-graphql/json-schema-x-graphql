/**
 * X-GraphQL attribute linting.
 *
 * Detects deprecated attributes, missing type names,
 * and naming convention violations.
 */
export interface ValidationIssue {
    path: string;
    message: string;
    severity: "error" | "warning";
    validator: string;
}
/** Lint a JSON Schema value for x-graphql attribute issues. */
export declare function lintSchema(schema: any): ValidationIssue[];
/** Validate completeness of x-graphql annotations on definitions. */
export declare function lintDefinitionsCompleteness(schema: any): ValidationIssue[];
/** Run all linting rules and return combined issues. */
export declare function lintAll(schema: any): ValidationIssue[];
