import React, { useState } from 'react';
import './SettingsPanel.css';

export default function SettingsPanel({
  settings,
  onUpdateSetting,
  onUpdateSettings,
  onSaveSettings,
  onResetDefaults,
  isDirty,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('converter');

  const handleSave = () => {
    onSaveSettings(settings);
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      onResetDefaults();
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>⚙️ Settings</h2>
        <button className="btn-close" onClick={onClose} title="Close settings">
          ✕
        </button>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'converter' ? 'active' : ''}`}
          onClick={() => setActiveTab('converter')}
        >
          Converter
        </button>
        <button
          className={`tab-btn ${activeTab === 'ui' ? 'active' : ''}`}
          onClick={() => setActiveTab('ui')}
        >
          UI & Display
        </button>
        <button
          className={`tab-btn ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          Features
        </button>
      </div>

      <div className="settings-content">
        {/* CONVERTER SETTINGS */}
        {activeTab === 'converter' && (
          <div className="settings-section">
            <h3>Converter Configuration</h3>
            
            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.validate}
                  onChange={(e) => onUpdateSetting('validate', e.target.checked)}
                  className="setting-checkbox"
                />
                <span>Validate Schemas</span>
              </label>
              <p className="setting-description">
                Validate JSON Schemas before conversion
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.descriptions}
                  onChange={(e) => onUpdateSetting('descriptions', e.target.checked)}
                  className="setting-checkbox"
                />
                <span>Include Descriptions</span>
              </label>
              <p className="setting-description">
                Include description fields in generated GraphQL SDL
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.federation}
                  onChange={(e) => onUpdateSetting('federation', e.target.checked)}
                  className="setting-checkbox"
                />
                <span>Apollo Federation Support</span>
              </label>
              <p className="setting-description">
                Enable federation directives in output (@key, @extends, etc.)
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">Federation Version</label>
              <select
                value={settings.federationVersion}
                onChange={(e) => onUpdateSetting('federationVersion', e.target.value)}
                className="setting-select"
                disabled={!settings.federation}
              >
                <option value="AUTO">Auto-Detect</option>
                <option value="1">Federation v1</option>
                <option value="2">Federation v2</option>
              </select>
              <p className="setting-description">
                Which Apollo Federation version to target
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">Naming Convention</label>
              <select
                value={settings.naming}
                onChange={(e) => onUpdateSetting('naming', e.target.value)}
                className="setting-select"
              >
                <option value="GRAPHQL_IDIOMATIC">GraphQL Idiomatic (camelCase)</option>
                <option value="KEEP_ORIGINAL">Keep Original (snake_case)</option>
                <option value="PASCAL_CASE">PascalCase</option>
              </select>
              <p className="setting-description">
                How to convert field names from JSON Schema format
              </p>
            </div>
          </div>
        )}

        {/* UI & DISPLAY SETTINGS */}
        {activeTab === 'ui' && (
          <div className="settings-section">
            <h3>User Interface</h3>

            <div className="setting-group">
              <label className="setting-label">Font Size</label>
              <div className="setting-input-group">
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSetting('fontSize', parseInt(e.target.value))}
                  className="setting-slider"
                />
                <span className="setting-value">{settings.fontSize}px</span>
              </div>
              <p className="setting-description">
                Editor and UI font size
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => onUpdateSetting('darkMode', e.target.checked)}
                  className="setting-checkbox"
                />
                <span>Dark Mode</span>
              </label>
              <p className="setting-description">
                Enable dark theme (coming soon)
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showStats}
                  onChange={(e) => onUpdateSetting('showStats', e.target.checked)}
                  className="setting-checkbox"
                />
                <span>Show Composition Statistics</span>
              </label>
              <p className="setting-description">
                Display type and field counts in supergraph preview
              </p>
            </div>
          </div>
        )}

        {/* FEATURE FLAGS */}
        {activeTab === 'features' && (
          <div className="settings-section">
            <h3>Feature Configuration</h3>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.autoCompose}
                  onChange={(e) => onUpdateSetting('autoCompose', e.target.checked)}
                  className="setting-checkbox"
                />
                <span>Auto-Compose on Generate</span>
              </label>
              <p className="setting-description">
                Automatically compose supergraph when subgraph is generated
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.autoFormat}
                  onChange={(e) => onUpdateSetting('autoFormat', e.target.checked)}
                  className="setting-checkbox"
                />
                <span>Auto-Format SDL</span>
              </label>
              <p className="setting-description">
                Automatically format generated GraphQL SDL
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.showAdvancedOptions}
                  onChange={(e) => onUpdateSetting('showAdvancedOptions', e.target.checked)}
                  className="setting-checkbox"
                />
                <span>Show Advanced Options</span>
              </label>
              <p className="setting-description">
                Display advanced converter options in schema editor
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="settings-footer">
        <div className="settings-actions">
          <button
            onClick={handleReset}
            className="btn btn-secondary"
            title="Reset all settings to defaults"
          >
            ↻ Reset Defaults
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!isDirty}
          >
            {isDirty ? '💾 Save Changes' : '✓ Saved'}
          </button>
        </div>
        {isDirty && (
          <p className="settings-notice">You have unsaved changes</p>
        )}
      </div>
    </div>
  );
}
