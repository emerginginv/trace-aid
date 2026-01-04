import * as React from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

interface GlobalLoadingState {
  isLoading: boolean;
  isFetching: boolean;
  isMutating: boolean;
  isNavigating: boolean;
  setNavigating: (value: boolean) => void;
}

const GlobalLoadingContext = React.createContext<GlobalLoadingState | undefined>(undefined);

const MIN_LOADING_DURATION = 200; // Minimum display time to prevent flashing

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [isNavigating, setNavigating] = React.useState(false);
  const [showLoading, setShowLoading] = React.useState(false);
  const loadingStartRef = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const isActive = isFetching > 0 || isMutating > 0 || isNavigating;

  React.useEffect(() => {
    if (isActive) {
      // Start loading
      if (!loadingStartRef.current) {
        loadingStartRef.current = Date.now();
      }
      setShowLoading(true);
      
      // Clear any pending hide timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else if (loadingStartRef.current) {
      // Calculate remaining time to show loading
      const elapsed = Date.now() - loadingStartRef.current;
      const remaining = Math.max(0, MIN_LOADING_DURATION - elapsed);
      
      // Hide after minimum duration
      timeoutRef.current = setTimeout(() => {
        setShowLoading(false);
        loadingStartRef.current = null;
      }, remaining);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isActive]);

  const value: GlobalLoadingState = {
    isLoading: showLoading,
    isFetching: isFetching > 0,
    isMutating: isMutating > 0,
    isNavigating,
    setNavigating,
  };

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
    </GlobalLoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  const context = React.useContext(GlobalLoadingContext);
  if (context === undefined) {
    throw new Error("useGlobalLoading must be used within a GlobalLoadingProvider");
  }
  return context;
}
