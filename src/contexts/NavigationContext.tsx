import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export interface NavigationSource {
  view: string;
  route: string;
  filters?: Record<string, string>;
  scrollPosition?: number;
  timestamp: number;
}

interface NavigationContextValue {
  source: NavigationSource | null;
  setSource: (source: Omit<NavigationSource, 'timestamp'>) => void;
  clearSource: () => void;
  getBackRoute: (fallback: string) => string;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

const STORAGE_KEY = 'navigation_source';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [source, setSourceState] = useState<NavigationSource | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NavigationSource;
        // Check if expired
        if (Date.now() - parsed.timestamp > MAX_AGE_MS) {
          sessionStorage.removeItem(STORAGE_KEY);
          return null;
        }
        return parsed;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  });

  // Persist to sessionStorage when source changes
  useEffect(() => {
    if (source) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(source));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [source]);

  const setSource = useCallback((newSource: Omit<NavigationSource, 'timestamp'>) => {
    setSourceState({
      ...newSource,
      timestamp: Date.now(),
    });
  }, []);

  const clearSource = useCallback(() => {
    setSourceState(null);
  }, []);

  const getBackRoute = useCallback((fallback: string): string => {
    if (!source) return fallback;
    
    // Check if expired
    if (Date.now() - source.timestamp > MAX_AGE_MS) {
      clearSource();
      return fallback;
    }
    
    return source.route;
  }, [source, clearSource]);

  return (
    <NavigationContext.Provider value={{ source, setSource, clearSource, getBackRoute }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = (): NavigationContextValue => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
};
