import { useState, useEffect, useCallback } from "react";

type ViewMode = 'list' | 'cards' | 'grid';

/**
 * Hook for managing view mode state with localStorage persistence
 * @param key - Unique key for localStorage (e.g., 'activities-view-mode')
 * @param defaultMode - Default view mode if none is stored
 * @returns [viewMode, setViewMode] tuple
 */
export function useViewMode<T extends ViewMode>(
  key: string,
  defaultMode: T
): [T, (mode: T) => void] {
  const [viewMode, setViewModeState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultMode;
    const stored = localStorage.getItem(key) as T | null;
    if (stored && (stored === 'list' || stored === 'cards' || stored === 'grid')) {
      return stored;
    }
    return defaultMode;
  });

  // Persist to localStorage whenever viewMode changes
  useEffect(() => {
    localStorage.setItem(key, viewMode);
  }, [key, viewMode]);

  const setViewMode = useCallback((mode: T) => {
    setViewModeState(mode);
  }, []);

  return [viewMode, setViewMode];
}
