/**
 * useDirectiveSuggestions.js
 * 
 * Custom React hook for managing federation directive suggestions
 * Handles generation, filtering, application, and persistence
 */

import { useState, useCallback, useEffect } from 'react';
import {
  generateDirectiveSuggestions,
  applySuggestionsToSdl,
  filterSuggestions,
  rankSuggestions,
  validateSuggestion
} from '../lib/federationDirectiveGenerator';

export function useDirectiveSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [appliedDirectives, setAppliedDirectives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());

  /**
   * Generate suggestions from subgraphs
   */
  const generateSuggestions = useCallback(async (subgraphs, supergraphSdl) => {
    setIsLoading(true);
    setError(null);

    try {
      // Run generation in a timeout to avoid blocking
      const sugs = await new Promise((resolve) => {
        setTimeout(() => {
          const results = generateDirectiveSuggestions(subgraphs, supergraphSdl);
          resolve(results);
        }, 0);
      });

      // Filter out dismissed suggestions
      const activeSuggestions = sugs.filter((_, i) => !dismissedSuggestions.has(i));
      
      // Rank by importance
      const rankedSuggestions = rankSuggestions(activeSuggestions);
      
      setSuggestions(rankedSuggestions);
      setShowSuggestions(rankedSuggestions.length > 0);

      return rankedSuggestions;
    } catch (err) {
      setError(err.message);
      console.error('Error generating suggestions:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [dismissedSuggestions]);

  /**
   * Apply selected suggestions to SDL
   */
  const applySuggestions = useCallback((selectedSuggestions, newSdl) => {
    try {
      // Validate all suggestions before applying
      const validSuggestions = selectedSuggestions.filter((sug) => {
        const validation = validateSuggestion(sug, newSdl);
        if (!validation.valid) {
          console.warn(`Invalid suggestion for ${sug.typeName}:`, validation.errors);
        }
        return validation.valid;
      });

      // Apply all valid suggestions
      let appliedSdl = newSdl;
      for (const suggestion of validSuggestions) {
        appliedSdl = applySuggestionsToSdl(appliedSdl, [suggestion]);
      }

      // Track applied directives
      setAppliedDirectives((prev) => [...prev, ...validSuggestions]);

      // Remove applied suggestions from list
      const appliedIndices = selectedSuggestions.map((sug) =>
        suggestions.indexOf(sug)
      );
      const remainingSuggestions = suggestions.filter(
        (_, i) => !appliedIndices.includes(i)
      );

      setSuggestions(remainingSuggestions);
      setShowSuggestions(remainingSuggestions.length > 0);

      return appliedSdl;
    } catch (err) {
      setError(err.message);
      console.error('Error applying suggestions:', err);
      return newSdl;
    }
  }, [suggestions]);

  /**
   * Dismiss a suggestion without applying
   */
  const dismissSuggestion = useCallback((index) => {
    const newDismissed = new Set(dismissedSuggestions);
    newDismissed.add(index);
    setDismissedSuggestions(newDismissed);

    const newSuggestions = suggestions.filter((_, i) => i !== index);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  }, [dismissedSuggestions, suggestions]);

  /**
   * Dismiss all suggestions
   */
  const dismissAll = useCallback(() => {
    setDismissedSuggestions(new Set(suggestions.map((_, i) => i)));
    setSuggestions([]);
    setShowSuggestions(false);
  }, [suggestions]);

  /**
   * Reset suggestions (e.g., when schemas change)
   */
  const reset = useCallback(() => {
    setSuggestions([]);
    setAppliedDirectives([]);
    setDismissedSuggestions(new Set());
    setShowSuggestions(false);
    setError(null);
  }, []);

  /**
   * Filter suggestions by type and severity
   */
  const filterSuggestionsBy = useCallback((filters) => {
    return filterSuggestions(suggestions, filters);
  }, [suggestions]);

  /**
   * Get statistics about suggestions
   */
  const getStats = useCallback(() => {
    const byType = {};
    const bySeverity = {};
    let totalTypes = new Set();
    let totalFields = 0;

    for (const sug of suggestions) {
      byType[sug.type] = (byType[sug.type] || 0) + 1;
      bySeverity[sug.severity] = (bySeverity[sug.severity] || 0) + 1;

      if (sug.typeName) totalTypes.add(sug.typeName);
      if (sug.fieldName) totalFields++;
    }

    return {
      total: suggestions.length,
      byType,
      bySeverity,
      typeCount: totalTypes.size,
      fieldCount: totalFields,
      appliedCount: appliedDirectives.length,
      dismissedCount: dismissedSuggestions.size
    };
  }, [suggestions, appliedDirectives, dismissedSuggestions]);

  /**
   * Undo the last applied suggestions (limited implementation)
   */
  const undoLastApplied = useCallback(() => {
    if (appliedDirectives.length === 0) return;

    const lastApplied = appliedDirectives.slice(-1)[0];
    setAppliedDirectives((prev) => prev.slice(0, -1));

    // Note: Full undo would require tracking the original SDL
    // This is a placeholder for demonstration
    return lastApplied;
  }, [appliedDirectives]);

  return {
    suggestions,
    appliedDirectives,
    isLoading,
    error,
    showSuggestions,
    dismissedSuggestions,
    
    // Actions
    generateSuggestions,
    applySuggestions,
    dismissSuggestion,
    dismissAll,
    reset,
    filterSuggestionsBy,
    undoLastApplied,
    
    // Utilities
    getStats,
    
    // State setters
    setShowSuggestions
  };
}

export default useDirectiveSuggestions;
