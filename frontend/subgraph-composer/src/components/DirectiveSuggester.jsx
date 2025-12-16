/**
 * DirectiveSuggester.jsx
 * 
 * UI component for previewing and managing federation directive suggestions
 * Shows before/after comparisons, allows individual selection and bulk operations
 */

import React, { useState, useMemo } from 'react';
import './DirectiveSuggester.css';

export function DirectiveSuggester({
  suggestions = [],
  supergraphSdl = '',
  onApplyDirectives = () => {},
  onDismissSuggestion = () => {},
  isLoading = false
}) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState(
    new Set(suggestions.map((_, i) => i))
  );
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s, i) => {
      if (filterType !== 'all' && s.type !== filterType) return false;
      if (filterSeverity !== 'all' && s.severity !== filterSeverity) return false;
      return true;
    });
  }, [suggestions, filterType, filterSeverity]);

  // Calculate preview SDL
  const previewSdl = useMemo(() => {
    let preview = supergraphSdl;
    const selected = Array.from(selectedSuggestions)
      .filter(i => suggestions[i])
      .map(i => suggestions[i]);

    for (const suggestion of selected) {
      preview = applySuggestionToSdl(preview, suggestion);
    }

    return preview;
  }, [supergraphSdl, suggestions, selectedSuggestions]);

  // Toggle suggestion selection
  const toggleSelection = (index) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  // Select all filtered suggestions
  const selectAll = () => {
    const indices = filteredSuggestions.map((_, i) => 
      suggestions.indexOf(filteredSuggestions[i])
    );
    setSelectedSuggestions(new Set(indices));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedSuggestions(new Set());
  };

  // Apply selected suggestions
  const applySelected = () => {
    const selected = Array.from(selectedSuggestions)
      .filter(i => suggestions[i])
      .map(i => suggestions[i]);

    if (selected.length === 0) return;

    onApplyDirectives(selected, previewSdl);
    setSelectedSuggestions(new Set());
  };

  // Dismiss all suggestions
  const dismissAll = () => {
    suggestions.forEach((_, i) => {
      if (selectedSuggestions.has(i)) {
        onDismissSuggestion(i);
      }
    });
    setSelectedSuggestions(new Set());
  };

  if (suggestions.length === 0) {
    return (
      <div className="directive-suggester empty-state">
        <div className="empty-message">
          <span className="icon">✓</span>
          <p>No directive suggestions at this time</p>
          <p className="hint">Compose multiple schemas to generate federation directives</p>
        </div>
      </div>
    );
  }

  const selectedCount = selectedSuggestions.size;
  const totalCount = filteredSuggestions.length;

  return (
    <div className="directive-suggester">
      {/* Header with stats */}
      <div className="suggester-header">
        <div className="header-title">
          <h3>Federation Directives ({selectedCount}/{totalCount})</h3>
          <span className="badge">{suggestions.length} total</span>
        </div>

        {/* Filters */}
        <div className="filter-group">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="requires">@requires</option>
            <option value="extension">Extensions</option>
            <option value="composite_key">Composite Keys</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Severities</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="bulk-actions">
        <button
          onClick={selectAll}
          disabled={selectedCount === totalCount || isLoading}
          className="btn-secondary"
        >
          Select All ({totalCount})
        </button>
        <button
          onClick={deselectAll}
          disabled={selectedCount === 0 || isLoading}
          className="btn-secondary"
        >
          Deselect All
        </button>
        
        <div className="spacer"></div>

        <button
          onClick={applySelected}
          disabled={selectedCount === 0 || isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Applying...' : `Apply (${selectedCount})`}
        </button>
        
        <button
          onClick={dismissAll}
          disabled={selectedCount === 0}
          className="btn-tertiary"
        >
          Dismiss
        </button>
      </div>

      {/* Suggestions list */}
      <div className="suggestions-list">
        {filteredSuggestions.map((suggestion, displayIdx) => {
          const actualIndex = suggestions.indexOf(suggestion);
          const isSelected = selectedSuggestions.has(actualIndex);
          const isExpanded = expandedIndex === actualIndex;

          return (
            <div
              key={actualIndex}
              className={`suggestion-item severity-${suggestion.severity} ${
                isSelected ? 'selected' : ''
              } ${isExpanded ? 'expanded' : ''}`}
            >
              {/* Checkbox and summary */}
              <div className="suggestion-summary">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(actualIndex)}
                  className="suggestion-checkbox"
                  disabled={isLoading}
                />

                <div className="summary-content">
                  <span className="severity-badge">{suggestion.severity}</span>
                  <span className="type-badge">{suggestion.type}</span>
                  <span className="type-name">{suggestion.typeName}</span>
                  {suggestion.fieldName && (
                    <span className="field-name">.{suggestion.fieldName}</span>
                  )}
                </div>

                <button
                  onClick={() =>
                    setExpandedIndex(isExpanded ? null : actualIndex)
                  }
                  className="expand-btn"
                  aria-label="Toggle details"
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              </div>

              {/* Details panel */}
              {isExpanded && (
                <div className="suggestion-details">
                  <div className="detail-row">
                    <label>Reason:</label>
                    <p>{suggestion.reason}</p>
                  </div>

                  <div className="detail-row">
                    <label>Directive:</label>
                    <code>{suggestion.directive}</code>
                  </div>

                  {suggestion.dependencies && suggestion.dependencies.length > 0 && (
                    <div className="detail-row">
                      <label>Dependencies:</label>
                      <div className="dependency-list">
                        {suggestion.dependencies.map((dep) => (
                          <span key={dep} className="dependency-tag">
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestion.schemas && (
                    <div className="detail-row">
                      <label>Schemas:</label>
                      <div className="schema-list">
                        {suggestion.schemas.map((schema) => (
                          <span key={schema} className="schema-tag">
                            {schema}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestion.fields && suggestion.fields.length > 0 && (
                    <div className="detail-row">
                      <label>Fields:</label>
                      <div className="field-list">
                        {suggestion.fields.map((field) => (
                          <span key={field} className="field-tag">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview section */}
      {selectedCount > 0 && (
        <div className="preview-section">
          <div className="preview-header">
            <h4>Preview ({selectedCount} suggestions)</h4>
            <button
              onClick={() => copyToClipboard(previewSdl)}
              className="btn-secondary"
              title="Copy preview to clipboard"
            >
              📋 Copy
            </button>
          </div>

          <div className="preview-container">
            <pre className="preview-code">
              <code>{previewSdl}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper: Apply a single suggestion to SDL
 */
function applySuggestionToSdl(sdl, suggestion) {
  if (suggestion.type !== 'requires') return sdl;

  const { typeName, fieldName, directive } = suggestion;

  // Find and update the field
  const typeRegex = new RegExp(
    `(type\\s+${typeName}\\s*[^{]*\\{[^}]*?)(\\s+${fieldName}\\s*(?:\\([^)]*\\))?:\\s*[!\\[\\w$]+)(\\s*)`,
    's'
  );

  return sdl.replace(typeRegex, (match, before, field, after) => {
    if (match.includes('@requires')) {
      return match; // Already has directive
    }
    return `${before}${field} ${directive}${after}`;
  });
}

/**
 * Helper: Copy text to clipboard
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show brief feedback
    const temp = document.createElement('div');
    temp.textContent = 'Copied!';
    temp.className = 'copy-feedback';
    document.body.appendChild(temp);
    setTimeout(() => temp.remove(), 1500);
  });
}

export default DirectiveSuggester;
