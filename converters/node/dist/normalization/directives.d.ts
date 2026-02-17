import { JsonSchema, NormalizedConverterOptions } from "../interfaces.js";
export interface GeneralizedDirective {
    name: string;
    args?: Record<string, any>;
    raw?: string;
}
export declare function extractDirectives(schema: JsonSchema, options?: NormalizedConverterOptions): GeneralizedDirective[];
export declare function printDirectives(directives: GeneralizedDirective[]): string;
