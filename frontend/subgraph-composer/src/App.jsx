import React, { useState, useCallback, useEffect } from "react";
import SplitPane from "react-split-pane";
import "./App.css";
import SchemaManager from "./components/SchemaManager.jsx";
import SchemaEditor from "./components/SchemaEditor.jsx";
import SupergraphPreview from "./components/SupergraphPreview.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import DirectiveSuggester from "./components/DirectiveSuggester.jsx";
import SubgraphEditor from "./components/SubgraphEditor.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import { useSchemaManager } from "./hooks/useSchemaManager.js";
import { useSubgraphGenerator } from "./hooks/useSubgraphGenerator.js";
import { useComposition } from "./hooks/useComposition.js";
import { useDirectiveSuggestions } from "./hooks/useDirectiveSuggestions.js";
import { useSettings } from "./hooks/useSettings.js";
import { getTemplate } from "./lib/templates.js";

export default function App() {
  const [showSettings, setShowSettings] = useState(false);

  const {
    schemas,
    activeSchemaId,
    setActiveSchemaId,
    addSchema,
    removeSchema,
    updateSchema,
    renameSchema,
    reorderSchemas,
    clearAll,
    toggleSchema,
  } = useSchemaManager();

  const { generateSubgraph, subgraphs, subgraphsMap, isLoading } =
    useSubgraphGenerator();

  const { supergraphSDL, compositionStats, compositionErrors, compose } =
    useComposition();

  const {
    suggestions,
    appliedDirectives,
    isLoading: suggestionsLoading,
    showSuggestions,
    generateSuggestions,
    applySuggestions,
    dismissSuggestion,
    setShowSuggestions,
  } = useDirectiveSuggestions();

  const {
    settings,
    isDirty,
    updateSetting,
    updateSettings,
    saveSettings,
    resetToDefaults,
    getConverterOptions,
  } = useSettings();

  const activeSchema = schemas.find((s) => s.id === activeSchemaId);

  // Initialize with 3 template schemas on mount
  useEffect(() => {
    if (schemas.length === 0) {
      const templates = ["basic_scalars", "enums", "nested_objects"];
      templates.forEach((templateKey) => {
        if (schemas.length < 10) {
          const template = getTemplate(templateKey);
          if (template) {
            addSchema(template.name, template.content);
          }
        }
      });
    }
  }, []); // Only run once on mount

  // Generate suggestions when composition completes
  useEffect(() => {
    if (supergraphSDL && subgraphs.length > 1) {
      generateSuggestions(subgraphs, supergraphSDL);
    }
  }, [supergraphSDL, subgraphs]);

  const handleGenerate = useCallback(async () => {
    if (schemas.length === 0) {
      console.warn("No schemas to generate");
      return;
    }

    try {
      const converterOptions = getConverterOptions();

      // Generate subgraphs only for ENABLED schemas
      const enabledSchemas = schemas.filter((s) => s.enabled);
      if (enabledSchemas.length === 0) {
        console.warn("No enabled schemas to generate");
        return;
      }

      const results = await Promise.all(
        enabledSchemas.map((schema) => {
          try {
            const parsed = JSON.parse(schema.content);
            return generateSubgraph(parsed, schema.id, converterOptions);
          } catch (error) {
            console.error(`Failed to parse schema ${schema.id}:`, error);
            return { success: false, error: error.message, sdl: null };
          }
        }),
      );

      // Check if at least one succeeded
      const successfulResults = results.filter((r) => r.success);
      if (successfulResults.length > 0) {
        // Build map directly from results - Map<schemaId, sdlString>
        const enabledSubgraphsMap = new Map();
        enabledSchemas.forEach((schema, idx) => {
          const result = results[idx];
          if (result.success && result.sdl) {
            enabledSubgraphsMap.set(schema.id, result.sdl);
          }
        });

        // Compose only enabled subgraphs into supergraph
        if (enabledSubgraphsMap.size > 0) {
          compose(enabledSubgraphsMap);
        }
      } else {
        console.error("All enabled schemas failed to convert");
      }
    } catch (error) {
      console.error("Failed to generate subgraphs:", error);
    }
  }, [schemas, generateSubgraph, subgraphsMap, compose, getConverterOptions]);

  const handleAddSchema = useCallback(async () => {
    if (schemas.length >= 10) {
      alert("Maximum 10 schemas allowed");
      return;
    }
    const newSchema = addSchema();
    setActiveSchemaId(newSchema.id);
  }, [schemas.length, addSchema, setActiveSchemaId]);

  const handleAddWithTemplate = useCallback(
    (template) => {
      if (schemas.length >= 10) {
        alert("Maximum 10 schemas allowed");
        return;
      }
      const newSchema = addSchema(template.name, template.content);
      setActiveSchemaId(newSchema.id);
    },
    [schemas.length, addSchema, setActiveSchemaId],
  );

  const handleApplyDirectives = useCallback(
    (selectedSuggestions, newSdl) => {
      // Apply suggestions and update composition
      applySuggestions(selectedSuggestions, newSdl);
      compose(subgraphsMap);
      setShowSuggestions(false);
    },
    [applySuggestions, subgraphsMap, compose, setShowSuggestions],
  );

  const handleDismissSuggestion = useCallback(
    (index) => {
      dismissSuggestion(index);
    },
    [dismissSuggestion],
  );

  return (
    <ErrorBoundary>
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <h1>Subgraph Composer</h1>
            <p>
              Convert JSON Schemas to GraphQL Subgraphs & Compose Supergraphs
            </p>
          </div>
          <div className="header-stats">
            {schemas.length > 0 && (
              <>
                <span>{schemas.length} schema(s)</span>
                {compositionStats && (
                  <span>
                    {compositionStats.totalTypes} types,{" "}
                    {compositionStats.totalFields} fields
                  </span>
                )}
              </>
            )}
          </div>
          <div className="header-actions">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn btn-icon-lg"
              title="Open settings"
            >
              ⚙️
            </button>
          </div>
        </header>

        <main className="app-main">
          <SplitPane
            split="vertical"
            minSize={220}
            defaultSize={300}
            maxSize={500}
            allowResize
            paneStyle={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
            style={{ display: "flex", flex: 1, height: "100%" }}
            resizerStyle={{
              background: "#eee",
              width: "6px",
              cursor: "col-resize",
              zIndex: 2,
            }}
          >
            <div className="sidebar">
              <SchemaManager
                schemas={schemas}
                activeSchemaId={activeSchemaId}
                onSelect={setActiveSchemaId}
                onAdd={handleAddSchema}
                onAddWithTemplate={handleAddWithTemplate}
                onRemove={removeSchema}
                onRename={renameSchema}
                onReorder={reorderSchemas}
                onClear={clearAll}
                onToggleSchema={toggleSchema}
                isLoading={isLoading}
              />
            </div>
            <SplitPane
              split="vertical"
              minSize={350}
              defaultSize={700}
              maxSize={-300}
              allowResize
              paneStyle={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
              style={{ display: "flex", flex: 1, height: "100%" }}
              resizerStyle={{
                background: "#eee",
                width: "6px",
                cursor: "col-resize",
                zIndex: 2,
              }}
            >
              <div
                className="editor-and-directives"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <div className="editor-section">
                  {activeSchema ? (
                    <SchemaEditor
                      schema={activeSchema}
                      onUpdate={(content) =>
                        updateSchema(activeSchema.id, content)
                      }
                      onGenerate={handleGenerate}
                      isLoading={isLoading}
                    />
                  ) : (
                    <div className="empty-state">
                      <p>No schema selected</p>
                      <button
                        onClick={handleAddSchema}
                        className="btn btn-primary"
                      >
                        Add First Schema
                      </button>
                    </div>
                  )}
                </div>
                {/* Federation Directive Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="directives-panel">
                    <DirectiveSuggester
                      suggestions={suggestions}
                      supergraphSdl={supergraphSDL}
                      onApplyDirectives={handleApplyDirectives}
                      onDismissSuggestion={handleDismissSuggestion}
                      isLoading={suggestionsLoading}
                    />
                  </div>
                )}
              </div>
              <div className="editor-section">
                {/* Subgraph Editor for the active subgraph with SDL/Stats */}
                {subgraphs && subgraphs.length > 0 ? (
                  <SubgraphEditor
                    subgraph={{
                      name: activeSchema?.name || "Subgraph 1",
                      content: subgraphs[0].sdl || "",
                    }}
                    onUpdate={(content) => {
                      /* TODO: implement subgraph update logic */
                    }}
                    isLoading={isLoading}
                    sdl={supergraphSDL}
                    stats={compositionStats}
                    errors={compositionErrors}
                    schemas={schemas}
                    subgraphCount={subgraphs.length}
                  />
                ) : (
                  <div
                    className="schema-editor"
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      background: "white",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-sm)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div className="editor-header">
                      <div className="editor-title">Subgraph Preview</div>
                    </div>
                    <div className="empty-state">
                      <p>Click "Generate" to create a subgraph</p>
                    </div>
                  </div>
                )}
              </div>
            </SplitPane>
          </SplitPane>
        </main>

        <footer className="app-footer">
          <p>
            Powered by <code>@json-schema-x-graphql/core</code> & graphql-editor
          </p>
        </footer>

        {/* Settings Modal */}
        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <SettingsPanel
                settings={settings}
                onUpdateSetting={updateSetting}
                onUpdateSettings={updateSettings}
                onSaveSettings={saveSettings}
                onResetDefaults={resetToDefaults}
                isDirty={isDirty}
                onClose={() => setShowSettings(false)}
              />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
