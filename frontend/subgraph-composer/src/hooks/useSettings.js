import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'subgraph-composer-settings';
const DEFAULT_SETTINGS = {
  // Converter options
  validate: true,
  descriptions: true,
  federation: true,
  federationVersion: 'AUTO',
  naming: 'GRAPHQL_IDIOMATIC',
  
  // UI preferences
  autoCompose: true,
  showStats: true,
  darkMode: false,
  fontSize: 14,
  
  // Feature flags
  showAdvancedOptions: false,
  autoFormat: true
};

/**
 * Hook to manage converter and application settings
 * @returns {Object} Settings state and controls
 */
export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...JSON.parse(stored)
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    setIsDirty(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, []);

  // Update a single setting
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      setIsDirty(true);
      return updated;
    });
  }, []);

  // Update multiple settings at once
  const updateSettings = useCallback((updates) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };
      setIsDirty(true);
      return updated;
    });
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  // Get converter options (filtered settings for converter)
  const getConverterOptions = useCallback(() => {
    return {
      validate: settings.validate,
      descriptions: settings.descriptions,
      federation: settings.federation,
      federationVersion: settings.federationVersion,
      naming: settings.naming
    };
  }, [settings]);

  return {
    settings,
    isDirty,
    updateSetting,
    updateSettings,
    saveSettings,
    resetToDefaults,
    getConverterOptions
  };
}
