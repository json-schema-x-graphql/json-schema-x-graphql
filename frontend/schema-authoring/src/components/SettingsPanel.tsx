/**
 * SettingsPanel Component
 *
 * A modal dialog for configuring:
 * - Editor theme (light/dark/high-contrast)
 * - Converter engine preference (auto/wasm/node)
 * - Auto-validation and auto-conversion settings
 * - Debounce delays
 * - Editor preferences (font size, line numbers, etc.)
 * - Export/import settings
 */

import React, { useState } from "react";
import { useAppStore } from "../store/app-store";
import type { ConverterEngine, EditorTheme } from "../types";

export interface SettingsPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [localSettings, setLocalSettings] = useState(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings({
      converterEngine: localSettings.converterEngine,
      theme: localSettings.theme,
      autoValidate: localSettings.autoValidate,
      autoConvert: localSettings.autoConvert,
      debounceMs: localSettings.debounceMs,
    });
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      ...settings,
      converterEngine: "auto" as ConverterEngine,
      theme: "vs-dark" as EditorTheme,
      autoValidate: true,
      autoConvert: true,
      debounceMs: 300,
    };
    setLocalSettings(defaultSettings);
  };

  const handleEngineChange = (engine: ConverterEngine) => {
    setLocalSettings({ ...localSettings, converterEngine: engine });
  };

  const handleThemeChange = (theme: EditorTheme) => {
    setLocalSettings({ ...localSettings, theme });
  };

  const handleAutoValidateChange = (enabled: boolean) => {
    setLocalSettings({ ...localSettings, autoValidate: enabled });
  };

  const handleAutoConvertChange = (enabled: boolean) => {
    setLocalSettings({ ...localSettings, autoConvert: enabled });
  };

  const handleDebounceChange = (ms: number) => {
    setLocalSettings({ ...localSettings, debounceMs: ms });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={handleCancel} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">⚙️ Settings</h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Converter Engine Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Converter Engine
              </h3>
              <div className="space-y-2">
                {(["auto", "rust-wasm", "node"] as ConverterEngine[]).map((engine) => (
                  <label
                    key={engine}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      localSettings.converterEngine === engine
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="engine"
                      value={engine}
                      checked={localSettings.converterEngine === engine}
                      onChange={() => handleEngineChange(engine)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {engine === "rust-wasm" ? "WASM" : engine}
                        </span>
                        {engine === "auto" && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                        {engine === "rust-wasm" && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            Fastest
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {engine === "auto" &&
                          "Automatically selects the best available engine (WASM → Node)"}
                        {engine === "rust-wasm" &&
                          "WebAssembly converter - fastest performance, runs in browser"}
                        {engine === "node" &&
                          "Node.js converter - reliable fallback, may require server"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Editor Theme Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Editor Theme
              </h3>
              <div className="space-y-2">
                {(["vs-dark", "vs-light", "hc-black"] as EditorTheme[]).map((theme) => (
                  <label
                    key={theme}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      localSettings.theme === theme
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={theme}
                      checked={localSettings.theme === theme}
                      onChange={() => handleThemeChange(theme)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {theme === "vs-dark" && "🌙 Dark"}
                        {theme === "vs-light" && "☀️ Light"}
                        {theme === "hc-black" && "🔲 High Contrast"}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Behavior Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Behavior</h3>
              <div className="space-y-3">
                {/* Auto-validate toggle */}
                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      Auto-validate on change
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Automatically validate schemas as you type
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.autoValidate}
                    onChange={(e) => handleAutoValidateChange(e.target.checked)}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                </label>

                {/* Auto-convert toggle */}
                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      Auto-convert on change
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Automatically convert schemas as you type (debounced)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.autoConvert}
                    onChange={(e) => handleAutoConvertChange(e.target.checked)}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                </label>

                {/* Debounce delay */}
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        Debounce delay
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Wait time before triggering auto-actions: {localSettings.debounceMs}ms
                      </p>
                    </div>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={localSettings.debounceMs}
                    onChange={(e) => handleDebounceChange(Number(e.target.value))}
                    className="w-full mt-3"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>100ms (fast)</span>
                    <span>2000ms (slow)</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Advanced Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Advanced</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>AI API Access:</strong>
                  </p>
                  <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded font-mono block overflow-x-auto">
                    window.__schemaAuthoringAPI__.getAPI()
                  </code>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Use this API to programmatically control the editor from the browser console or
                    external scripts.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Keyboard Shortcuts:</strong>
                  </p>
                  <ul className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                    <li>
                      <kbd className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 font-mono">
                        Ctrl+S
                      </kbd>{" "}
                      - Export schemas
                    </li>
                    <li>
                      <kbd className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 font-mono">
                        Ctrl+K
                      </kbd>{" "}
                      - Format document
                    </li>
                    <li>
                      <kbd className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 font-mono">
                        F1
                      </kbd>{" "}
                      - Show help
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Reset to Defaults
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors font-medium"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
