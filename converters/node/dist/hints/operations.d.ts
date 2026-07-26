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
/** Parse `x-graphql-operations` from the schema root. */
export declare function parseOperations(schema: any): OperationsConfig;
/** Generate SDL for an operation type (Query, Mutation, or Subscription). */
export declare function generateOperationType(typeName: string, fields: OperationField[]): string | null;
/** Generate all operation type SDL blocks. */
export declare function generateOperationsSdl(config: OperationsConfig, existingSdl?: string): string;
/** Append operation types to existing SDL. */
export declare function injectOperations(sdl: string, config: OperationsConfig): string;
