import * as React from "react";
import { useLocation } from "react-router-dom";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";

export function useRouteTransition() {
  const location = useLocation();
  const { setNavigating } = useGlobalLoading();
  const previousPathRef = React.useRef(location.pathname);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    // Check if path actually changed
    if (previousPathRef.current !== location.pathname) {
      setNavigating(true);
      previousPathRef.current = location.pathname;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Reset navigating state after content has likely loaded
      timeoutRef.current = setTimeout(() => {
        setNavigating(false);
      }, 100);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname, setNavigating]);
}

// Component wrapper to use the hook
export function RouteTransitionDetector() {
  useRouteTransition();
  return null;
}
