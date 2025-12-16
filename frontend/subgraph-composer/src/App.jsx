import React, { useState, useCallback, useEffect } from 'react';
import SplitPane from 'react-split-pane';
import './App.css';
import SchemaManager from './components/SchemaManager.jsx';
import SchemaEditor from './components/SchemaEditor.jsx';
import SupergraphPreview from './components/SupergraphPreview.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import DirectiveSuggester from './components/DirectiveSuggester.jsx';
import { useSchemaManager } from './hooks/useSchemaManager.js';
import { useSubgraphGenerator } from './hooks/useSubgraphGenerator.js';
import { useComposition } from './hooks/useComposition.js';
import { useDirectiveSuggestions } from './hooks/useDirectiveSuggestions.js';

export default function App() {
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
  } = useSchemaManager();

  const {
    generateSubgraph,
    subgraphs,
    isLoading,
  } = useSubgraphGenerator();

  const {
    supergraphSDL,
    compositionStats,
    compositionErrors,
    compose,
  } = useComposition();

  const {
    suggestions,
    appliedDirectives,
    isLoading: suggestionsLoading,
    showSuggestions,
    generateSuggestions,
    applySuggestions,
    dismissSuggestion,
    setShowSuggestions
  } = useDirectiveSuggestions();

  const activeSchema = schemas.find(s => s.id === activeSchemaId);

  // Generate suggestions when composition completes
  useEffect(() => {
    if (supergraphSDL && subgraphs.length > 1) {
      generateSuggestions(subgraphs, supergraphSDL);
    }
  }, [supergraphSDL, subgraphs]);

  const handleGenerate = useCallback(async () => {
    if (!activeSchema) return;

    try {
      const parsed = JSON.parse(activeSchema.content);
      const result = await generateSubgraph(parsed, activeSchema.id);

      if (result.success) {
        compose(subgraphs);
      }
    } catch (error) {
      console.error('Failed to generate subgraph:', error);
    }
  }, [activeSchema, generateSubgraph, subgraphs, compose]);

  const handleAddSchema = useCallback(async () => {
    if (schemas.length >= 10) {
      alert('Maximum 10 schemas allowed');
      return;
    }
    const newSchema = addSchema();
    setActiveSchemaId(newSchema.id);
  }, [schemas.length, addSchema, setActiveSchemaId]);

  const handleAddWithTemplate = useCallback((template) => {
    if (schemas.length >= 10) {
      alert('Maximum 10 schemas allowed');
      return;
    }
    const newSchema = addSchema(template.name, template.content);
    setActiveSchemaId(newSchema.id);
  }, [schemas.length, addSchema, setActiveSchemaId]);

  const handleApplyDirectives = useCallback((selectedSuggestions, newSdl) => {
    // Apply suggestions and update composition
    applySuggestions(selectedSuggestions, newSdl);
    compose(subgraphs);
    setShowSuggestions(false);
  }, [applySuggestions, subgraphs, compose, setShowSuggestions]);

  const handleDismissSuggestion = useCallback((index) => {
    dismissSuggestion(index);
  }, [dismissSuggestion]);

  return (
    <ErrorBoundary>
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <h1>Subgraph Composer</h1>
            <p>Convert JSON Schemas to GraphQL Subgraphs & Compose Supergraphs</p>
          </div>
          <div className="header-stats">
            {schemas.length > 0 && (
              <>
                <span>{schemas.length} schema(s)</span>
                {compositionStats && (
                  <span>
                    {compositionStats.totalTypes} types,{' '}
                    {compositionStats.totalFields} fields
                  </span>
                )}
              </>
            )}
          </div>
        </header>


        <main className="app-main">
          <SplitPane
            split="vertical"
            minSize={220}
            defaultSize={300}
            maxSize={500}
            allowResize
            paneStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            style={{ display: 'flex', flex: 1, height: '100%' }}
            resizerStyle={{ background: '#eee', width: '6px', cursor: 'col-resize', zIndex: 2 }}
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
                isLoading={isLoading}
              />
            </div>
            <SplitPane
              split="vertical"
              minSize={350}
              defaultSize={700}
              maxSize={-300}
              allowResize
              paneStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
              style={{ display: 'flex', flex: 1, height: '100%' }}
              resizerStyle={{ background: '#eee', width: '6px', cursor: 'col-resize', zIndex: 2 }}
            >
              <div className="editor-and-directives" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="editor-section">
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
              <div className="preview-section">
                <SupergraphPreview
                  sdl={supergraphSDL}
                  stats={compositionStats}
                  errors={compositionErrors}
                  schemas={schemas}
                  subgraphs={subgraphs}
                />
              </div>
            </SplitPane>
          </SplitPane>
        </main>

        <footer className="app-footer">
          <p>
            Powered by{' '}
            <code>@json-schema-x-graphql/core</code> & graphql-editor
          </p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
