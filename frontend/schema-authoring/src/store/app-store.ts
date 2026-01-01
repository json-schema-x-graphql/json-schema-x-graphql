/**
 * Application Store (Zustand)
 *
 * Central state management for the JSON Schema authoring UI.
 * Manages editor state, conversion state, validation, settings, and history.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  AppState,
  AppSettings,
  EditorState,
  ConverterEngine,
  EditorTheme,
  HistoryEntry,
  AIAccessibleAPI,
  AppStateSnapshot,
  ExportResult,
  JsonToGraphQLOptions,
  GraphQLToJsonOptions,
  AppMode,
  ValidationError,
} from "../types";
import { converterManager } from "../converters/converter-manager";
import { validateJsonSchema } from "../lib/validators";

/**
 * Default settings
 */
const DEFAULT_SETTINGS: AppSettings = {
  converterEngine: "auto",
  theme: "vs-dark",
  autoConvert: true,
  autoValidate: true,
  showLineNumbers: true,
  wordWrap: true,
  minimap: false,
  fontSize: 14,
  tabSize: 2,
  insertSpaces: true,
  showWhitespace: false,
  formatOnSave: true,
  validateOnType: false,
  debounceMs: 500,
};

/**
 * Default editor state
 */
const createDefaultEditorState = (
  language: "json" | "graphql",
): EditorState => ({
  content: "",
  language,
  cursorPosition: { line: 1, column: 1 },
  selection: undefined,
  isDirty: false,
  lastSaved: undefined,
  version: 0,
});

/**
 * Default application state
 */
const DEFAULT_STATE: Omit<AppState, "settings"> = {
  mode: "json-to-graphql",
  jsonSchemaEditor: createDefaultEditorState("json"),
  graphqlEditor: createDefaultEditorState("graphql"),
  validationResult: null,
  conversionResult: null,
  isConverting: false,
  isValidating: false,
  history: [],
  historyIndex: -1,
};

/**
 * Store actions
 */
interface AppActions {
  // Editor actions
  setJsonSchemaContent: (content: string) => void;
  setGraphQLContent: (content: string) => void;
  updateJsonSchemaCursor: (line: number, column: number) => void;
  updateGraphQLCursor: (line: number, column: number) => void;
  markJsonSchemaDirty: (isDirty: boolean) => void;
  markGraphQLDirty: (isDirty: boolean) => void;

  // Conversion actions
  convertJsonToGraphQL: (options?: JsonToGraphQLOptions) => Promise<void>;
  convertGraphQLToJson: (options?: GraphQLToJsonOptions) => Promise<void>;
  cancelConversion: () => void;
  convert: () => Promise<void>; // Unified convert method
  setMode: (mode: AppMode) => void;

  // Validation actions
  validateJsonSchema: () => Promise<void>;
  validateGraphQL: () => Promise<void>;
  clearValidationErrors: () => void;
  validate: () => Promise<void>; // Unified validate method
  applyAutoFix: (error: ValidationError) => Promise<void>;
  clearValidationResult: () => void;

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  setTheme: (theme: EditorTheme) => void;
  setConverterEngine: (engine: ConverterEngine) => void;
  resetSettings: () => void;

  // History actions
  addHistoryEntry: (action: string) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Template actions
  loadTemplate: (jsonSchema: string, graphql?: string) => void;

  // Export actions
  exportSchemas: (
    format: "json" | "yaml" | "typescript",
  ) => Promise<ExportResult | null>;

  // Reset actions
  reset: () => void;
  resetEditors: () => void;

  // AI-accessible API
  getAIAPI: () => AIAccessibleAPI;
}

/**
 * Store type
 */
type AppStore = AppState & AppActions;

/**
 * Create the store
 */
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        ...DEFAULT_STATE,
        settings: DEFAULT_SETTINGS,

        // ============================================================================
        // Editor Actions
        // ============================================================================

        setJsonSchemaContent: (content: string) => {
          set((state) => {
            state.jsonSchemaEditor.content = content;
            state.jsonSchemaEditor.version += 1;
            state.jsonSchemaEditor.isDirty = true;
          });

          // Auto-validate if enabled
          if (get().settings.autoValidate) {
            get().validateJsonSchema();
          }

          // Auto-convert if enabled
          if (get().settings.autoConvert) {
            const debounceMs = get().settings.debounceMs;
            setTimeout(() => {
              get().convertJsonToGraphQL();
            }, debounceMs);
          }
        },

        setGraphQLContent: (content: string) => {
          set((state) => {
            state.graphqlEditor.content = content;
            state.graphqlEditor.version += 1;
            state.graphqlEditor.isDirty = true;
          });

          // Auto-validate if enabled
          if (get().settings.autoValidate && get().mode === "graphql-to-json") {
            get().validateGraphQL();
          }

          // Auto-convert if enabled (for bidirectional mode)
          if (get().settings.autoConvert && get().mode === "graphql-to-json") {
            const debounceMs = get().settings.debounceMs;
            setTimeout(() => {
              get().convertGraphQLToJson();
            }, debounceMs);
          }
        },

        updateJsonSchemaCursor: (line: number, column: number) => {
          set((state) => {
            state.jsonSchemaEditor.cursorPosition = { line, column };
          });
        },

        updateGraphQLCursor: (line: number, column: number) => {
          set((state) => {
            state.graphqlEditor.cursorPosition = { line, column };
          });
        },

        markJsonSchemaDirty: (isDirty: boolean) => {
          set((state) => {
            state.jsonSchemaEditor.isDirty = isDirty;
            if (!isDirty) {
              state.jsonSchemaEditor.lastSaved = new Date().toISOString();
            }
          });
        },

        markGraphQLDirty: (isDirty: boolean) => {
          set((state) => {
            state.graphqlEditor.isDirty = isDirty;
            if (!isDirty) {
              state.graphqlEditor.lastSaved = new Date().toISOString();
            }
          });
        },

        // ============================================================================
        // Conversion Actions
        // ============================================================================

        convertJsonToGraphQL: async (options?: JsonToGraphQLOptions) => {
          const state = get();
          const jsonSchema = state.jsonSchemaEditor.content;

          if (!jsonSchema.trim()) {
            set((state) => {
              state.conversionResult = {
                success: false,
                error: { message: "JSON Schema is empty" },
                engine: state.settings.converterEngine,
                duration: 0,
              };
            });
            return;
          }

          set((state) => {
            state.isConverting = true;
            state.conversionResult = null;
          });

          try {
            const result = await converterManager.convertJsonToGraphQL(
              jsonSchema,
              options || {},
              state.settings.converterEngine,
            );

            set((state) => {
              state.conversionResult = result;
              state.isConverting = false;

              if (result.success && result.output) {
                state.graphqlEditor.content = result.output;
                state.graphqlEditor.version += 1;
                state.graphqlEditor.isDirty = false;
              }
            });

            // Add to history
            if (result.success) {
              get().addHistoryEntry("convert-json-to-graphql");
            }
          } catch (error) {
            set((state) => {
              state.conversionResult = {
                success: false,
                error: {
                  message:
                    error instanceof Error ? error.message : "Unknown error",
                },
                engine: state.settings.converterEngine,
                duration: 0,
              };
              state.isConverting = false;
            });
          }
        },

        convertGraphQLToJson: async (options?: GraphQLToJsonOptions) => {
          const state = get();
          const graphqlSchema = state.graphqlEditor.content;

          if (!graphqlSchema.trim()) {
            set((state) => {
              state.conversionResult = {
                success: false,
                error: { message: "GraphQL schema is empty" },
                engine: state.settings.converterEngine,
                duration: 0,
              };
            });
            return;
          }

          set((state) => {
            state.isConverting = true;
            state.conversionResult = null;
          });

          try {
            const result = await converterManager.convertGraphQLToJson(
              graphqlSchema,
              options || {},
              state.settings.converterEngine,
            );

            set((state) => {
              state.conversionResult = result;
              state.isConverting = false;

              if (result.success && result.output) {
                state.jsonSchemaEditor.content = result.output;
                state.jsonSchemaEditor.version += 1;
                state.jsonSchemaEditor.isDirty = false;
              }
            });

            // Add to history
            if (result.success) {
              get().addHistoryEntry("convert-graphql-to-json");
            }
          } catch (error) {
            set((state) => {
              state.conversionResult = {
                success: false,
                error: {
                  message:
                    error instanceof Error ? error.message : "Unknown error",
                },
                engine: state.settings.converterEngine,
                duration: 0,
              };
              state.isConverting = false;
            });
          }
        },

        cancelConversion: () => {
          converterManager.cancelAll();
          set((state) => {
            state.isConverting = false;
          });
        },

        convert: async () => {
          const state = get();
          if (state.mode === "json-to-graphql") {
            return get().convertJsonToGraphQL();
          } else {
            return get().convertGraphQLToJson();
          }
        },

        setMode: (mode: AppMode) => {
          set((state) => {
            state.mode = mode;
          });
        },

        // ============================================================================
        // Validation Actions
        // ============================================================================

        validateJsonSchema: async () => {
          const jsonSchema = get().jsonSchemaEditor.content;

          if (!jsonSchema.trim()) {
            set((state) => {
              state.validationResult = {
                valid: false,
                errors: [
                  {
                    severity: "error",
                    message: "JSON Schema is empty",
                    path: "",
                  },
                ],
                warnings: [],
              };
            });
            return;
          }

          set((state) => {
            state.isValidating = true;
          });

          try {
            const result = await validateJsonSchema(jsonSchema);

            set((state) => {
              state.validationResult = result;
              state.isValidating = false;
            });
          } catch (error) {
            set((state) => {
              state.validationResult = {
                valid: false,
                errors: [
                  {
                    severity: "error",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Validation failed",
                    path: "",
                  },
                ],
                warnings: [],
              };
              state.isValidating = false;
            });
          }
        },

        validateGraphQL: async () => {
          // TODO: Implement GraphQL validation
          set((state) => {
            state.isValidating = false;
          });
        },

        clearValidationErrors: () => {
          set((state) => {
            state.validationResult = null;
          });
        },

        validate: async () => {
          const state = get();
          if (state.mode === "json-to-graphql") {
            return get().validateJsonSchema();
          } else {
            return get().validateGraphQL();
          }
        },

        applyAutoFix: async (error: ValidationError) => {
          if (!error.fix) {
            console.warn("No fix available for this error");
            return;
          }

          const state = get();
          const currentContent =
            state.mode === "json-to-graphql"
              ? state.jsonSchemaEditor.content
              : state.graphqlEditor.content;

          // Apply the text changes from the fix (apply in reverse order to maintain positions)
          let newContent = currentContent;
          const changes = [...error.fix.changes].sort(
            (a, b) =>
              b.range.startLine * 10000 +
              b.range.startColumn -
              (a.range.startLine * 10000 + a.range.startColumn),
          );

          for (const change of changes) {
            const lines = newContent.split("\n");
            if (change.range.startLine <= lines.length) {
              const line = lines[change.range.startLine - 1];
              const before = line.substring(0, change.range.startColumn - 1);
              const after = line.substring(change.range.endColumn - 1);
              lines[change.range.startLine - 1] =
                before + change.newText + after;
              newContent = lines.join("\n");
            }
          }

          // Update the appropriate editor
          if (state.mode === "json-to-graphql") {
            get().setJsonSchemaContent(newContent);
          } else {
            get().setGraphQLContent(newContent);
          }

          console.log("Applied auto-fix for:", error.message);
        },

        clearValidationResult: () => {
          set((state) => {
            state.validationResult = null;
          });
        },

        // ============================================================================
        // Settings Actions
        // ============================================================================

        updateSettings: (settings: Partial<AppSettings>) => {
          set((state) => {
            state.settings = { ...state.settings, ...settings };
          });
        },

        setTheme: (theme: EditorTheme) => {
          set((state) => {
            state.settings.theme = theme;
          });
        },

        setConverterEngine: (engine: ConverterEngine) => {
          set((state) => {
            state.settings.converterEngine = engine;
          });
        },

        resetSettings: () => {
          set((state) => {
            state.settings = { ...DEFAULT_SETTINGS };
          });
        },

        // ============================================================================
        // History Actions
        // ============================================================================

        addHistoryEntry: (action: string) => {
          const state = get();
          const entry: HistoryEntry = {
            timestamp: new Date().toISOString(),
            jsonSchema: state.jsonSchemaEditor.content,
            graphql: state.graphqlEditor.content,
            action,
          };

          set((state) => {
            // Remove any history after current index
            state.history = state.history.slice(0, state.historyIndex + 1);

            // Add new entry
            state.history.push(entry);
            state.historyIndex = state.history.length - 1;

            // Limit history size (keep last 50 entries)
            if (state.history.length > 50) {
              state.history.shift();
              state.historyIndex -= 1;
            }
          });
        },

        undo: () => {
          const state = get();
          if (state.historyIndex > 0) {
            const prevEntry = state.history[state.historyIndex - 1];
            set((state) => {
              state.historyIndex -= 1;
              state.jsonSchemaEditor.content = prevEntry.jsonSchema;
              state.graphqlEditor.content = prevEntry.graphql;
              state.jsonSchemaEditor.version += 1;
              state.graphqlEditor.version += 1;
            });
          }
        },

        redo: () => {
          const state = get();
          if (state.historyIndex < state.history.length - 1) {
            const nextEntry = state.history[state.historyIndex + 1];
            set((state) => {
              state.historyIndex += 1;
              state.jsonSchemaEditor.content = nextEntry.jsonSchema;
              state.graphqlEditor.content = nextEntry.graphql;
              state.jsonSchemaEditor.version += 1;
              state.graphqlEditor.version += 1;
            });
          }
        },

        clearHistory: () => {
          set((state) => {
            state.history = [];
            state.historyIndex = -1;
          });
        },

        // ============================================================================
        // Template Actions
        // ============================================================================

        loadTemplate: (jsonSchema: string, graphql?: string) => {
          set((state) => {
            state.jsonSchemaEditor.content = jsonSchema;
            state.jsonSchemaEditor.version += 1;
            state.jsonSchemaEditor.isDirty = false;

            if (graphql) {
              state.graphqlEditor.content = graphql;
              state.graphqlEditor.version += 1;
              state.graphqlEditor.isDirty = false;
            }
          });

          get().addHistoryEntry("load-template");

          // Convert if graphql not provided
          if (!graphql && get().settings.autoConvert) {
            get().convertJsonToGraphQL();
          }
        },

        // ============================================================================
        // Export Actions
        // ============================================================================

        exportSchemas: async (format: "json" | "yaml" | "typescript") => {
          try {
            const state = get();

            // Simple export implementation
            const content = JSON.stringify(
              {
                jsonSchema: state.jsonSchemaEditor.content,
                graphqlSchema: state.graphqlEditor.content,
                settings: state.settings,
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            );

            return {
              format,
              content,
              filename: `schema-export-${Date.now()}.${format === "typescript" ? "ts" : format}`,
            };
          } catch (error) {
            console.error("Export failed:", error);
            return null;
          }
        },

        // ============================================================================
        // Reset Actions
        // ============================================================================

        reset: () => {
          set((state) => {
            Object.assign(state, DEFAULT_STATE);
            state.settings = { ...DEFAULT_SETTINGS };
          });
        },

        resetEditors: () => {
          set((state) => {
            state.jsonSchemaEditor = createDefaultEditorState("json");
            state.graphqlEditor = createDefaultEditorState("graphql");
            state.validationResult = null;
            state.conversionResult = null;
          });
        },

        // ============================================================================
        // AI-Accessible API
        // ============================================================================

        getAIAPI: (): AIAccessibleAPI => ({
          getJsonSchema: () => get().jsonSchemaEditor.content,

          getGraphQLSchema: () => get().graphqlEditor.content,

          getAllSchemas: () => ({
            jsonSchema: get().jsonSchemaEditor.content,
            graphqlSchema: get().graphqlEditor.content,
          }),

          setJsonSchema: async (content: string) => {
            get().setJsonSchemaContent(content);
          },

          setGraphQLSchema: async (content: string) => {
            get().setGraphQLContent(content);
          },

          getValidationErrors: () => {
            const result = get().validationResult;
            return result?.errors || [];
          },

          getConversionMetadata: () => {
            const result = get().conversionResult;
            return result?.metadata || null;
          },

          convert: async () => {
            await get().convertJsonToGraphQL();
            return get().conversionResult!;
          },

          validate: async () => {
            await get().validateJsonSchema();
            return get().validationResult!;
          },

          getSettings: () => get().settings,

          updateSettings: (settings: Partial<AppSettings>) => {
            get().updateSettings(settings);
          },

          exportSchemas: async (format: "json" | "yaml" | "typescript") => {
            const result = await get().exportSchemas(format);
            if (!result) {
              throw new Error("Export failed");
            }
            return result;
          },

          getStateSnapshot: (): AppStateSnapshot => ({
            timestamp: new Date().toISOString(),
            jsonSchema: get().jsonSchemaEditor.content,
            graphqlSchema: get().graphqlEditor.content,
            validationErrors: get().validationResult?.errors || [],
            conversionMetadata: get().conversionResult?.metadata || null,
            settings: get().settings,
            isConverting: get().isConverting,
            isValidating: get().isValidating,
          }),
        }),
      })),
      {
        name: "json-schema-authoring-storage",
        partialize: (state) => ({
          settings: state.settings,
          jsonSchemaEditor: {
            content: state.jsonSchemaEditor.content,
          },
          graphqlEditor: {
            content: state.graphqlEditor.content,
          },
        }),
      },
    ),
    { name: "AppStore" },
  ),
);

/**
 * Expose AI API globally for AI agents
 */
if (typeof window !== "undefined") {
  (window as any).__schemaAuthoringAPI__ = {
    getAPI: () => useAppStore.getState().getAIAPI(),
  };
}

/**
 * Export selectors
 */
export const selectJsonSchema = (state: AppStore) =>
  state.jsonSchemaEditor.content;
export const selectGraphQLSchema = (state: AppStore) =>
  state.graphqlEditor.content;
export const selectValidationErrors = (state: AppStore) =>
  state.validationResult?.errors || [];
export const selectConversionResult = (state: AppStore) =>
  state.conversionResult;
export const selectIsConverting = (state: AppStore) => state.isConverting;
export const selectIsValidating = (state: AppStore) => state.isValidating;
export const selectSettings = (state: AppStore) => state.settings;
export const selectTheme = (state: AppStore) => state.settings.theme;
export const selectConverterEngine = (state: AppStore) =>
  state.settings.converterEngine;
