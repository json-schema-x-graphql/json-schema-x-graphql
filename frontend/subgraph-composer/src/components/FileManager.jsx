import React from "react";
import {
  exportSchema,
  exportAllSchemas,
  importSchemaFile,
  exportSupergraph,
  inspectSchemaFile,
} from "../lib/fileIO";
import "./FileManager.css";

export default function FileManager({
  schemas,
  supergraphSDL,
  activeSchemaId,
  onImportSchemas,
  isLoading,
}) {
  const [dragActive, setDragActive] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type !== "dragleave" && e.type !== "dragend");
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    try {
      // First inspect the file
      const inspection = await inspectSchemaFile(file);

      if (inspection.success) {
        setImportPreview(inspection);

        // Then import it
        const result = await importSchemaFile(file);

        if (result.success) {
          if (result.type === "bulk" && result.schemas) {
            onImportSchemas(result.schemas);
          } else if (result.type === "single" && result.schema) {
            onImportSchemas([result.schema]);
          }
          setImportPreview(null);
        }
      }
    } catch (error) {
      console.error("File processing error:", error);
      setImportPreview({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleExportActive = () => {
    if (!activeSchemaId) {
      alert("No schema selected");
      return;
    }

    const schema = schemas.find((s) => s.id === activeSchemaId);
    if (schema) {
      exportSchema(schema);
    }
  };

  const handleExportAll = () => {
    if (schemas.length === 0) {
      alert("No schemas to export");
      return;
    }
    exportAllSchemas(schemas);
  };

  const handleExportSupergraph = () => {
    if (!supergraphSDL) {
      alert("No supergraph to export");
      return;
    }
    exportSupergraph(supergraphSDL);
  };

  return (
    <div className="file-manager">
      <div className="file-section">
        <h4>📥 Import Schemas</h4>

        <div
          className={`dropzone ${dragActive ? "active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="dropzone-content">
            <div className="dropzone-icon">📁</div>
            <p>Drag JSON schema files here</p>
            <p className="dropzone-hint">or click to browse</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileInput}
            className="file-input"
          />
        </div>

        {importPreview && (
          <div
            className={`import-preview ${importPreview.success ? "success" : "error"}`}
          >
            {importPreview.success ? (
              <>
                <div className="preview-header">
                  <span>✓ Ready to Import</span>
                </div>
                <div className="preview-details">
                  <p>
                    <strong>File:</strong> {importPreview.filename}
                  </p>
                  <p>
                    <strong>Size:</strong>{" "}
                    {(importPreview.size / 1024).toFixed(2)} KB
                  </p>
                  <p>
                    <strong>Schemas:</strong> {importPreview.count}
                  </p>
                  {importPreview.schemaNames && (
                    <div className="schema-names">
                      {importPreview.schemaNames.map((name, idx) => (
                        <span key={idx} className="schema-name">
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="preview-header error">
                  <span>✗ Import Failed</span>
                </div>
                <p className="error-message">{importPreview.error}</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="file-section">
        <h4>📤 Export Schemas</h4>

        <div className="export-buttons">
          <button
            onClick={handleExportActive}
            disabled={!activeSchemaId || isLoading}
            className="btn btn-secondary btn-small"
            title="Export selected schema as JSON"
          >
            💾 Export Active
          </button>

          <button
            onClick={handleExportAll}
            disabled={schemas.length === 0 || isLoading}
            className="btn btn-secondary btn-small"
            title="Export all schemas as JSON"
          >
            💾 Export All ({schemas.length})
          </button>

          <button
            onClick={handleExportSupergraph}
            disabled={!supergraphSDL || isLoading}
            className="btn btn-secondary btn-small"
            title="Export composed supergraph as GraphQL"
          >
            📄 Export GraphQL
          </button>
        </div>
      </div>

      <div className="file-section stats">
        <div className="stat-item">
          <span className="stat-label">Schemas:</span>
          <span className="stat-value">{schemas.length}/10</span>
        </div>
        {supergraphSDL && (
          <div className="stat-item">
            <span className="stat-label">Supergraph:</span>
            <span className="stat-value">
              {(supergraphSDL.length / 1024).toFixed(1)} KB
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
