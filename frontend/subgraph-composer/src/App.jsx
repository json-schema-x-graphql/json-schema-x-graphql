import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
} from "react";
import "./App.css";
import SchemaManager from "./components/SchemaManager.jsx";
import SchemaEditor from "./components/SchemaEditor.jsx";
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

// Lazy-load ER diagram panel to avoid bundling @xyflow/react on initial load
const ERDiagramPanel = React.lazy(
  () => import("./components/ERDiagramPanel.jsx"),
);
// Lazy-load Voyager panel to avoid bundling graphql-voyager on initial load
const VoyagerPanel = React.lazy(() => import("./components/VoyagerPanel.jsx"));

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("editor"); // "editor" | "visualize" | "er"

  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [editorWidth, setEditorWidth] = useState(700);

  const sidebarWidthRef = useRef(300);
  const editorWidthRef = useRef(700);
  const containerRef = useRef(null);
  const isResizingSidebar = useRef(false);
  const isResizingEditor = useRef(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileView, setMobileView] = useState("schemas"); // "schemas" | "editor" | "preview"

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    editorWidthRef.current = editorWidth;
  }, [editorWidth]);

  const handleMouseMove = useCallback((e) => {
    if (isMobile) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (isResizingSidebar.current) {
      const newWidth = e.clientX - rect.left;
      if (newWidth >= 220 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    } else if (isResizingEditor.current) {
      const newWidth = e.clientX - rect.left - sidebarWidthRef.current - 6;
      if (newWidth >= 350) {
        setEditorWidth(newWidth);
      }
    }
  }, [isMobile]);

  const handleMouseUp = useCallback(() => {
    isResizingSidebar.current = false;
    isResizingEditor.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const startResizeSidebar = useCallback(
    (e) => {
      e.preventDefault();
      isResizingSidebar.current = true;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  const startResizeEditor = useCallback(
    (e) => {
      e.preventDefault();
      isResizingEditor.current = true;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

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

  const {
    supergraphSDL,
    compositionStats,
    compositionErrors,
    typeSources,
    compose,
  } = useComposition();

  const {
    suggestions,
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

  // Only call generateSuggestions when the supergraphSDL string actually changes.
  // Using a ref to track the previous value avoids the infinite loop caused by
  // `subgraphs` being a new array reference on every render.
  const prevSDLRef = useRef(null);
  useEffect(() => {
    if (
      supergraphSDL &&
      supergraphSDL !== prevSDLRef.current &&
      subgraphs.length > 1
    ) {
      prevSDLRef.current = supergraphSDL;
      generateSuggestions(subgraphs, supergraphSDL);
    }
  }, [supergraphSDL]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset active tab to editor if supergraphSDL is cleared
  useEffect(() => {
    if (!supergraphSDL && activeTab === "visualize") {
      setActiveTab("editor");
    }
  }, [supergraphSDL, activeTab]);

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

        <main
          className={`app-main ${isMobile ? "mobile-layout" : ""}`}
          ref={containerRef}
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          {isMobile && (
            <div className="mobile-tabs">
              <button 
                className={`tab-btn ${mobileView === "schemas" ? "active" : ""}`}
                onClick={() => setMobileView("schemas")}
              >
                1. Schemas
              </button>
              <button 
                className={`tab-btn ${mobileView === "editor" ? "active" : ""}`}
                onClick={() => setMobileView("editor")}
              >
                2. Editor
              </button>
              <button 
                className={`tab-btn ${mobileView === "preview" ? "active" : ""}`}
                onClick={() => setMobileView("preview")}
              >
                3. Preview
              </button>
            </div>
          )}

          <div
            className={`sidebar ${isMobile && mobileView !== "schemas" ? "mobile-hidden" : ""}`}
            style={{ width: isMobile ? "100%" : sidebarWidth, flex: isMobile ? "1" : "none", height: "100%" }}
          >
            <SchemaManager
              schemas={schemas}
              activeSchemaId={activeSchemaId}
              onSelect={(id) => {
                setActiveSchemaId(id);
                if (isMobile) setMobileView("editor");
              }}
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

          {!isMobile && <div className="resizer-col" onMouseDown={startResizeSidebar} />}

          <div
            className={`editor-and-directives ${isMobile && mobileView !== "editor" ? "mobile-hidden" : ""}`}
            style={{
              display: isMobile && mobileView !== "editor" ? "none" : "flex",
              flexDirection: "column",
              height: "100%",
              width: isMobile ? "100%" : editorWidth,
              flex: isMobile ? "1" : "none",
            }}
          >
            <div className="editor-section" style={{ flex: 1 }}>
              {activeSchema ? (
                <SchemaEditor
                  schema={activeSchema}
                  onUpdate={(content) => updateSchema(activeSchema.id, content)}
                  onGenerate={handleGenerate}
                  isLoading={isLoading}
                />
              ) : (
                <div className="empty-state">
                  <p>No schema selected</p>
                  <button onClick={handleAddSchema} className="btn btn-primary">
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

          {!isMobile && <div className="resizer-col" onMouseDown={startResizeEditor} />}

          <div 
            className={`editor-section ${isMobile && mobileView !== "preview" ? "mobile-hidden" : ""}`} 
            style={{ 
              display: isMobile && mobileView !== "preview" ? "none" : "flex",
              flex: 1, 
              minWidth: isMobile ? "100%" : 300 
            }}
          >
            {/* Tab bar to switch between Preview, Visualize, and ER Diagram */}
            <div
              className="desktop-tabs"
              style={{
                display: "flex",
                gap: 0,
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-bg-secondary)",
                flexShrink: 0,
              }}
            >
              <button
                className={`tab-btn desktop-tab ${activeTab === "editor" ? "active" : ""}`}
                onClick={() => setActiveTab("editor")}
              >
                Preview
              </button>
              {supergraphSDL && (
                <button
                  className={`tab-btn desktop-tab ${activeTab === "visualize" ? "active" : ""}`}
                  onClick={() => setActiveTab("visualize")}
                >
                  Visualize
                </button>
              )}
            </div>

            {activeTab === "editor" ? (
              <>
                {/* Subgraph Editor for the active subgraph with SDL/Stats */}
                {subgraphs && subgraphs.length > 0 ? (
                  <SubgraphEditor
                    subgraph={{
                      name: activeSchema?.name || "Subgraph 1",
                      content: subgraphs[0].sdl || "",
                    }}
                    onUpdate={(_content) => {
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
              </>
            ) : activeTab === "visualize" ? (
              <Suspense
                fallback={
                  <div className="empty-state">Loading ER diagram...</div>
                }
              >
                <ERDiagramPanel
                  supergraphSDL={supergraphSDL}
                  schemas={schemas}
                  typeSources={typeSources}
                />
              </Suspense>
            ) : (
              <div />
            )}
          </div>
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
