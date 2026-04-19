/**
 * Type definitions for JSON Schema ↔ GraphQL Schema Authoring UI
 *
 * This file defines all core types used throughout the application including
 * converter types, validation errors, editor state, and AI-accessible interfaces.
 */

// ============================================================================
// Converter Types
// ============================================================================

/**
 * Supported converter engines
 */
export type ConverterEngine = "rust-wasm" | "node" | "auto";

/**
 * Conversion direction
 */
export type ConversionDirection = "json-to-graphql" | "graphql-to-json";

/**
 * Converter options for JSON Schema → GraphQL SDL conversion
 */
export interface JsonToGraphQLOptions {
  includeFederationDirectives?: boolean;
  includeSchemaLink?: boolean;
  includeDescriptions?: boolean;
  customScalars?: Record<string, string>;
  typePrefix?: string;
  typeSuffix?: string;
  fieldNameCase?: "camelCase" | "snake_case" | "PascalCase" | "preserve";
  enumCase?: "UPPER_CASE" | "camelCase" | "preserve";
}

/**
 * Converter options for GraphQL SDL → JSON Schema conversion
 */
export interface GraphQLToJsonOptions {
  schemaVersion?: string;
  includeDescriptions?: boolean;
  includeDeprecated?: boolean;
  customScalarMappings?: Record<string, JsonSchemaType>;
}

/**
 * Result from a conversion operation
 */
export interface ConversionResult {
  success: boolean;
  output?: string;
  error?: ConversionError;
  warnings?: ValidationWarning[];
  metadata?: ConversionMetadata;
  engine: ConverterEngine;
  duration: number; // milliseconds
}

/**
 * Metadata about the conversion
 */
export interface ConversionMetadata {
  inputLength: number;
  outputLength: number;
  typesGenerated?: number;
  fieldsGenerated?: number;
  directivesApplied?: number;
  timestamp: string;
}

/**
 * Error from a conversion operation
 */
export interface ConversionError {
  message: string;
  code?: string;
  line?: number;
  column?: number;
  context?: string;
  suggestion?: string;
  stack?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation severity levels
 */
export type ValidationSeverity = "error" | "warning" | "info" | "hint";

/**
 * JSON Schema validation error
 */
export interface ValidationError {
  severity: ValidationSeverity;
  message: string;
  path?: string; // JSON path to the error location
  line?: number;
  column?: number;
  length?: number; // Length of the error span
  keyword?: string; // JSON Schema keyword that failed
  instancePath?: string;
  schemaPath?: string;
  params?: Record<string, unknown>;
  suggestion?: string;
  fix?: AutoFix;
  source?: string; // Source of the error (e.g., 'json-schema', 'graphql', 'validator')
}

/**
 * Validation warning (non-blocking)
 */
export interface ValidationWarning {
  severity: Exclude<ValidationSeverity, "error">;
  message: string;
  path?: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

/**
 * Auto-fix suggestion for validation errors
 */
export interface AutoFix {
  description: string;
  changes: TextChange[];
  confidence: "high" | "medium" | "low";
}

/**
 * Text change for auto-fixing
 */
export interface TextChange {
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  newText: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  schema?: unknown; // Parsed schema if valid
}

// ============================================================================
// Editor Types
// ============================================================================

/**
 * Editor theme
 */
export type EditorTheme = "vs-dark" | "vs-light" | "hc-black" | "hc-light";

/**
 * Editor language
 */
export type EditorLanguage = "json" | "graphql" | "typescript" | "javascript";

/**
 * Editor state
 */
export interface EditorState {
  content: string;
  language: EditorLanguage;
  cursorPosition: CursorPosition;
  selection?: Selection;
  isDirty: boolean;
  lastSaved?: string; // ISO timestamp
  version: number; // Increments on each change
}

/**
 * Cursor position in editor
 */
export interface CursorPosition {
  line: number;
  column: number;
}

/**
 * Text selection in editor
 */
export interface Selection {
  start: CursorPosition;
  end: CursorPosition;
}

/**
 * Editor marker (for errors, warnings, etc.)
 */
export interface EditorMarker {
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  source?: string;
  code?: string;
}

// ============================================================================
// Application State Types
// ============================================================================

/**
 * Application mode
 */
export type AppMode = "json-to-graphql" | "graphql-to-json" | "bidirectional";

/**
 * Application settings
 */
export interface AppSettings {
  converterEngine: ConverterEngine;
  theme: EditorTheme;
  autoConvert: boolean;
  autoValidate: boolean;
  showLineNumbers: boolean;
  wordWrap: boolean;
  minimap: boolean;
  fontSize: number;
  tabSize: number;
  insertSpaces: boolean;
  showWhitespace: boolean;
  formatOnSave: boolean;
  validateOnType: boolean;
  debounceMs: number;
  /** Persisted divider position between editors (percentage, 10-90) */
  dividerPosition: number;
}

/**
 * Main application state
 */
export interface AppState {
  mode: AppMode;
  settings: AppSettings;
  jsonSchemaEditor: EditorState;
  graphqlEditor: EditorState;
  validationResult: ValidationResult | null;
  conversionResult: ConversionResult | null;
  isConverting: boolean;
  isValidating: boolean;
  history: HistoryEntry[];
  historyIndex: number;
}

/**
 * History entry for undo/redo
 */
export interface HistoryEntry {
  timestamp: string;
  jsonSchema: string;
  graphql: string;
  action: string;
}

// ============================================================================
// AI-Accessible Interface Types
// ============================================================================

/**
 * AI-accessible API for retrieving editor contents
 * These methods are exposed globally for AI agents to interact with
 */
export interface AIAccessibleAPI {
  /**
   * Get the current JSON Schema content
   */
  getJsonSchema(): string;

  /**
   * Get the current GraphQL SDL content
   */
  getGraphQLSchema(): string;

  /**
   * Get both schemas
   */
  getAllSchemas(): {
    jsonSchema: string;
    graphqlSchema: string;
  };

  /**
   * Set JSON Schema content
   */
  setJsonSchema(content: string): Promise<void>;

  /**
   * Set GraphQL SDL content
   */
  setGraphQLSchema(content: string): Promise<void>;

  /**
   * Get current validation errors
   */
  getValidationErrors(): ValidationError[];

  /**
   * Get conversion metadata
   */
  getConversionMetadata(): ConversionMetadata | null;

  /**
   * Trigger conversion manually
   */
  convert(): Promise<ConversionResult>;

  /**
   * Validate current schema
   */
  validate(): Promise<ValidationResult>;

  /**
   * Get current settings
   */
  getSettings(): AppSettings;

  /**
   * Update settings
   */
  updateSettings(settings: Partial<AppSettings>): void;

  /**
   * Export schemas in various formats
   */
  exportSchemas(format: "json" | "yaml" | "typescript"): Promise<ExportResult>;

  /**
   * Get the current divider position (percentage)
   */
  getDividerPosition(): number;

  /**
   * Set the divider position (percentage, clamped 10-90)
   */
  setDividerPosition(pct: number): void;

  /**
   * Get application state snapshot
   */
  getStateSnapshot(): AppStateSnapshot;
}

/**
 * Export result
 */
export interface ExportResult {
  format: string;
  content: string;
  filename: string;
}

/**
 * Application state snapshot for AI agents
 */
export interface AppStateSnapshot {
  timestamp: string;
  jsonSchema: string;
  graphqlSchema: string;
  validationErrors: ValidationError[];
  conversionMetadata: ConversionMetadata | null;
  settings: AppSettings;
  isConverting: boolean;
  isValidating: boolean;
}

// ============================================================================
// Autocomplete Types
// ============================================================================

/**
 * Autocomplete suggestion
 */
export interface AutocompleteSuggestion {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText: string;
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  range?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

/**
 * Completion item kind (Monaco compatible)
 */
export enum CompletionItemKind {
  Method = 0,
  Function = 1,
  Constructor = 2,
  Field = 3,
  Variable = 4,
  Class = 5,
  Struct = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Event = 10,
  Operator = 11,
  Unit = 12,
  Value = 13,
  Constant = 14,
  Enum = 15,
  EnumMember = 16,
  Keyword = 17,
  Text = 18,
  Color = 19,
  File = 20,
  Reference = 21,
  Customcolor = 22,
  Folder = 23,
  TypeParameter = 24,
  User = 25,
  Issue = 26,
  Snippet = 27,
}

/**
 * JSON Schema type for autocompletion
 */
export type JsonSchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null";

/**
 * Autocomplete context
 */
export interface AutocompleteContext {
  path: string[];
  parentType?: JsonSchemaType;
  currentKey?: string;
  inArray?: boolean;
  inObject?: boolean;
  expectedKeys?: string[];
}

// ============================================================================
// Template Types
// ============================================================================

/**
 * Schema template for quick start
 */
export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  jsonSchema: string;
  graphqlSchema?: string;
  tags: string[];
  featured?: boolean;
}

/**
 * Template category
 */
export type TemplateCategory =
  | "basic"
  | "federation"
  | "ecommerce"
  | "social"
  | "enterprise"
  | "custom";

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep partial (recursive)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * JSON value types
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * Async function result
 */
export type AsyncResult<T, E = Error> = Promise<
  { success: true; data: T } | { success: false; error: E }
>;

// ============================================================================
// Event Types
// ============================================================================

/**
 * Application events
 */
export type AppEvent =
  | {
      type: "CONTENT_CHANGED";
      payload: { editor: "json" | "graphql"; content: string };
    }
  | { type: "CONVERSION_STARTED"; payload: { direction: ConversionDirection } }
  | { type: "CONVERSION_COMPLETED"; payload: ConversionResult }
  | { type: "VALIDATION_STARTED"; payload: { schema: string } }
  | { type: "VALIDATION_COMPLETED"; payload: ValidationResult }
  | { type: "SETTINGS_CHANGED"; payload: Partial<AppSettings> }
  | { type: "THEME_CHANGED"; payload: { theme: EditorTheme } }
  | { type: "ERROR_OCCURRED"; payload: { error: Error; context?: string } };

/**
 * Event listener
 */
export type EventListener<T extends AppEvent = AppEvent> = (event: T) => void;

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature flags for experimental features
 */
export interface FeatureFlags {
  enableWasmConverter: boolean;
  enableNodeConverter: boolean;
  enableAutoFix: boolean;
  enableAIAPI: boolean;
  enableTemplates: boolean;
  enableHistory: boolean;
  enableExport: boolean;
  enableImport: boolean;
  enableCollaboration: boolean;
  enableAnalytics: boolean;
}
