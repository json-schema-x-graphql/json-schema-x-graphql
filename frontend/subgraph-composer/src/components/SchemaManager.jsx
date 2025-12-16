import React from 'react';
import { getTemplateNames, getTemplate } from '../lib/templates';
import './SchemaManager.css';

export default function SchemaManager({
  schemas,
  activeSchemaId,
  onSelect,
  onAdd,
  onRemove,
  onRename,
  isLoading,
  onClear,
  onAddWithTemplate,
  onToggleSchema,
}) {
  const [renamingId, setRenamingId] = React.useState(null);
  const [renamingValue, setRenamingValue] = React.useState('');
  const [showTemplates, setShowTemplates] = React.useState(false);

  const handleRenameStart = (schema) => {
    setRenamingId(schema.id);
    setRenamingValue(schema.name);
  };

  const handleRenameSave = () => {
    if (renamingValue.trim()) {
      onRename(renamingId, renamingValue.trim());
    }
    setRenamingId(null);
  };

  const handleSelectTemplate = (templateKey) => {
    const template = getTemplate(templateKey);
    if (onAddWithTemplate) {
      onAddWithTemplate(template);
    }
    setShowTemplates(false);
  };

  return (
    <div className="schema-manager">
      <div className="manager-header">
        <h3>Schemas ({schemas.length}/10)</h3>
        <div className="manager-buttons">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            disabled={schemas.length >= 10 || isLoading}
            className="btn btn-secondary btn-small"
            title="Use a template to add a schema"
          >
            📋 Template
          </button>
          <button
            onClick={onAdd}
            disabled={schemas.length >= 10 || isLoading}
            className="btn btn-primary btn-small"
            title="Add blank schema"
          >
            ➕ Add
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="templates-panel">
          <div className="templates-header">
            <h4>Select a Template</h4>
            <button
              onClick={() => setShowTemplates(false)}
              className="btn-close"
            >
              ✕
            </button>
          </div>
          <div className="templates-grid">
            {getTemplateNames().map((template) => (
              <button
                key={template.key}
                onClick={() => handleSelectTemplate(template.key)}
                className="template-card"
                disabled={schemas.length >= 10}
              >
                <div className="template-name">{template.name}</div>
                <div className="template-description">{template.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="schemas-list">
        {schemas.length === 0 ? (
          <div className="empty-message">
            <p>No schemas yet</p>
            <p className="hint">Click Add to create one</p>
          </div>
        ) : (
          schemas.map((schema) => (
            <div
              key={schema.id}
              className={`schema-item ${
                activeSchemaId === schema.id ? 'active' : ''
              }`}
              onClick={() => onSelect(schema.id)}
            >
              <div className="schema-item-content">
                <div className="schema-toggle-wrapper">
                  <input
                    type="checkbox"
                    checked={schema.enabled ?? true}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleSchema(schema.id);
                    }}
                    className="schema-toggle"
                    title="Enable/disable schema for composition"
                  />
                </div>
                {renamingId === schema.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={renamingValue}
                    onChange={(e) => setRenamingValue(e.target.value)}
                    onBlur={handleRenameSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSave();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="schema-name-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="schema-name" title={schema.name}>
                    {schema.name}
                  </div>
                )}
                <div className="schema-meta">
                  {schema.lastModified && (
                    <span className="schema-time">
                      {new Date(schema.lastModified).toLocaleTimeString(
                        'en-US',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                  )}
                </div>
              </div>

              <div className="schema-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameStart(schema);
                  }}
                  className="btn-icon"
                  title="Rename"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(schema.id);
                  }}
                  className="btn-icon btn-danger"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {schemas.length > 0 && (
        <div className="manager-footer">
          <button
            onClick={onClear}
            className="btn btn-secondary btn-small"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
