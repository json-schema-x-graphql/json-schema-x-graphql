
import React from 'react';
import SplitPane from 'react-split-pane';
import './SchemaEditor.css';

export default function SupergraphPreview({
  sdl,
  stats,
  errors,
  schemas,
  subgraphs,
}) {
  const [expandedSections, setExpandedSections] = React.useState({
    preview: true,
    errors: errors?.length > 0,
    stats: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const copyToClipboard = async () => {
    if (sdl) {
      await navigator.clipboard.writeText(sdl);
      alert('Supergraph SDL copied to clipboard');
    }
  };

  const downloadSDL = () => {
    if (!sdl) return;

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      `data:text/plain;charset=utf-8,${encodeURIComponent(sdl)}`
    );
    element.setAttribute('download', 'supergraph.graphql');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const openInEditor = () => {
    // In a real app, this would open the graphql-editor app with the SDL
    const url = `/graphql-editor?schema=${encodeURIComponent(sdl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="preview-container">
      <div className="preview-header">
        <h3>Supergraph</h3>
        <div className="preview-controls">
          {sdl && (
            <>
              <button
                onClick={copyToClipboard}
                className="btn-icon"
                title="Copy SDL"
              >
                📋
              </button>
              <button
                onClick={downloadSDL}
                className="btn-icon"
                title="Download SDL"
              >
                ⬇️
              </button>
              <button
                onClick={openInEditor}
                className="btn-icon"
                title="Open in GraphQL Editor"
              >
                🔗
              </button>
            </>
          )}
        </div>
      </div>

      {sdl ? (
        <SplitPane
          split="horizontal"
          minSize={80}
          defaultSize={180}
          allowResize
          paneStyle={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}
          style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
          resizerStyle={{ background: '#eee', height: '6px', cursor: 'row-resize', zIndex: 2 }}
        >
          {/* SDL Preview Section */}
          <div className="preview-section">
            <div
              className="section-header"
              onClick={() => toggleSection('preview')}
              role="button"
              tabIndex="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('preview');
                }
              }}
            >
              <span className="section-title">
                <span style={{ width: '20px' }}>
                  {expandedSections.preview ? '▼' : '▶'}
                </span>
                SDL Preview
              </span>
            </div>
            {expandedSections.preview && (
              <div className="sdl-display">
                <pre>{sdl}</pre>
              </div>
            )}
          </div>
          {/* Nested SplitPane for Stats and Errors */}
          <SplitPane
            split="horizontal"
            minSize={60}
            defaultSize={120}
            allowResize
            paneStyle={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}
            style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
            resizerStyle={{ background: '#eee', height: '6px', cursor: 'row-resize', zIndex: 2 }}
          >
            {/* Stats Section */}
            {stats ? (
              <div className="preview-section">
                <div
                  className="section-header"
                  onClick={() => toggleSection('stats')}
                  role="button"
                  tabIndex="0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSection('stats');
                    }
                  }}
                >
                  <span className="section-title">
                    <span style={{ width: '20px' }}>
                      {expandedSections.stats ? '▼' : '▶'}
                    </span>
                    Statistics
                  </span>
                </div>
                {expandedSections.stats && (
                  <div className="stats-display">
                    <div className="stat-item">
                      <span className="stat-label">Types:</span>
                      <span className="stat-value">{stats.totalTypes}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Fields:</span>
                      <span className="stat-value">{stats.totalFields}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Schemas:</span>
                      <span className="stat-value">{subgraphs.size}</span>
                    </div>
                    {stats.conflicts?.length > 0 && (
                      <>
                        <div className="stat-item warning">
                          <span className="stat-label">Conflicts:</span>
                          <span className="stat-value">
                            {stats.conflicts.length}
                          </span>
                        </div>
                        <div className="conflicts-details">
                          <div className="conflicts-title">Conflicting Types:</div>
                          {stats.conflicts.map((conflict, idx) => (
                            <div key={idx} className="conflict-item">
                              <div className="conflict-type">
                                <strong>{conflict.type}</strong>
                              </div>
                              <div className="conflict-sources">
                                <small>Found in: {conflict.sources.join(', ')}</small>
                              </div>
                              {conflict.fieldCount > 0 && (
                                <div className="conflict-fields">
                                  <small>{conflict.fieldCount} field(s)</small>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : <div />}
            {/* Errors Section */}
            {errors && errors.length > 0 ? (
              <div className="preview-section">
                <div
                  className="section-header error"
                  onClick={() => toggleSection('errors')}
                  role="button"
                  tabIndex="0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSection('errors');
                    }
                  }}
                >
                  <span className="section-title">
                    <span style={{ width: '20px' }}>
                      {expandedSections.errors ? '▼' : '▶'}
                    </span>
                    Errors ({errors.length})
                  </span>
                </div>
                {expandedSections.errors && (
                  <div className="errors-display">
                    {errors.map((error, idx) => (
                      <div key={idx} className="error-item">
                        <span className="error-icon">❌</span>
                        <span className="error-text">{error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : <div />}
          </SplitPane>
        </SplitPane>
      ) : (
        <div className="empty-preview">
          <p>No supergraph generated yet</p>
          <p className="hint">
            {subgraphs.size === 0
              ? 'Add and generate schemas to see results'
              : 'Check for errors in schema generation'}
          </p>
        </div>
      )}
    </div>
  );
}
