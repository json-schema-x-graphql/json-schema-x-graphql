export declare function camelToSnake(str: string): string;
export declare function snakeToCamel(str: string): string;
type KeyConverter = (key: string) => string;
export declare function convertObjectKeys(obj: unknown, converter: KeyConverter): unknown;
export declare function convertGraphQLFields(sdl: string, converter: KeyConverter): string;
export {};
//# sourceMappingURL=case-conversion.d.ts.map