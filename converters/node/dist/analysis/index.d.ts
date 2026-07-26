/**
 * Schema analysis module.
 *
 * Computes statistics, structural metrics, diffs, and coverage
 * reports for JSON Schemas. Mirrors the Rust implementation in
 * `converters/rust/src/analysis/mod.rs`.
 */
export interface DefinitionStats {
    name: string;
    kind: string;
    fieldCount: number;
    requiredCount: number;
    nullableCount: number;
    description: string | undefined;
    hasFederationKey: boolean;
    hasSkipFields: boolean;
}
export interface SchemaStats {
    totalDefinitions: number;
    byKind: Record<string, number>;
    definitions: DefinitionStats[];
    totalFields: number;
    maxDepth: number;
    federatedTypes: string[];
    allFieldNames: Set<string>;
    uniqueFieldCount: number;
    refCount: number;
}
/** Compute statistics for a JSON Schema. */
export declare function computeStats(schema: any): SchemaStats;
export type DiffSeverity = "added" | "removed" | "modified";
export type DiffCategory = "type" | "field" | "fieldType" | "fieldRequired" | "federation" | "metadata";
export interface Diff {
    category: DiffCategory;
    severity: DiffSeverity;
    path: string;
    message: string;
}
export interface DiffResult {
    diffs: Diff[];
    breakingChanges: number;
    nonBreakingChanges: number;
}
export declare function diffSchemas(oldSchema: any, newSchema: any): DiffResult;
export interface TypeCoverage {
    typeName: string;
    totalSourceFields: number;
    mappedFields: number;
    missingFields: string[];
    coveragePercent: number;
}
export interface CoverageReport {
    typeCoverages: TypeCoverage[];
    totalSourceFields: number;
    totalMappedFields: number;
    overallCoveragePercent: number;
}
export declare function computeFieldCoverageByName(sourceSchema: any, targetSchema: any): CoverageReport;
