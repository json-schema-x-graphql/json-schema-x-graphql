import React from "react";
import { useEditorStore } from "./store";

interface ConverterSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConverterSettingsPanel: React.FC<ConverterSettingsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { options, setOptions } = useEditorStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 bg-gray-800 rounded-lg shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Converter Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Validation & Processing */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Validation & Processing
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.validate}
                  onChange={(e) => setOptions({ validate: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-gray-300">Validate input</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.includeDescriptions}
                  onChange={(e) =>
                    setOptions({ includeDescriptions: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-gray-300">Include descriptions</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.preserveFieldOrder}
                  onChange={(e) =>
                    setOptions({ preserveFieldOrder: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-gray-300">Preserve field order</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.failOnWarning}
                  onChange={(e) =>
                    setOptions({ failOnWarning: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-gray-300">Fail on warning</span>
              </label>
            </div>
          </div>

          {/* Federation Settings */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Apollo Federation
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Federation Version
                </label>
                <select
                  value={options.federationVersion}
                  onChange={(e) =>
                    setOptions({
                      federationVersion: e.target.value as
                        | "NONE"
                        | "V1"
                        | "V2"
                        | "AUTO",
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                >
                  <option value="NONE">None (No Federation)</option>
                  <option value="V1">Apollo Federation v1</option>
                  <option value="V2">Apollo Federation v2</option>
                  <option value="AUTO">Auto-detect</option>
                </select>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.includeFederationDirectives}
                  onChange={(e) =>
                    setOptions({
                      includeFederationDirectives: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-gray-300">Include federation directives</span>
              </label>
            </div>
          </div>

          {/* Naming & ID Strategy */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Naming & ID Strategy
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Naming Convention
                </label>
                <select
                  value={options.namingConvention}
                  onChange={(e) =>
                    setOptions({
                      namingConvention: e.target.value as
                        | "PRESERVE"
                        | "GRAPHQL_IDIOMATIC",
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                >
                  <option value="PRESERVE">Preserve original names</option>
                  <option value="GRAPHQL_IDIOMATIC">GraphQL idiomatic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  ID Field Strategy
                </label>
                <select
                  value={options.idStrategy}
                  onChange={(e) =>
                    setOptions({
                      idStrategy: e.target.value as
                        | "NONE"
                        | "COMMON_PATTERNS"
                        | "ALL_STRINGS",
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                >
                  <option value="NONE">None (No ID inference)</option>
                  <option value="COMMON_PATTERNS">
                    Common patterns (id, _id, *Id)
                  </option>
                  <option value="ALL_STRINGS">All string fields as ID</option>
                </select>
              </div>
            </div>
          </div>

          {/* Output Format */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Output Format
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Format
                </label>
                <select
                  value={options.outputFormat}
                  onChange={(e) =>
                    setOptions({
                      outputFormat: e.target.value as
                        | "SDL"
                        | "SDL_WITH_FEDERATION_METADATA"
                        | "AST_JSON",
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                >
                  <option value="SDL">GraphQL SDL (default)</option>
                  <option value="SDL_WITH_FEDERATION_METADATA">
                    SDL with Federation metadata
                  </option>
                  <option value="AST_JSON">AST JSON (advanced)</option>
                </select>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.prettyPrint}
                  onChange={(e) =>
                    setOptions({ prettyPrint: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-gray-300">Pretty-print output</span>
              </label>
            </div>
          </div>

          {/* Info Panel */}
          <div className="border-t border-gray-700 pt-4 bg-gray-700 rounded p-3">
            <p className="text-sm text-gray-300">
              <strong>Tip:</strong> Output format changes how the conversion result
              is displayed. "SDL" shows readable GraphQL schema. "AST JSON" shows
              the abstract syntax tree for advanced use cases.
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
