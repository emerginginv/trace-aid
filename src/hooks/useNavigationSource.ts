import { useCallback } from 'react';
import { useLocation, NavigateFunction } from 'react-router-dom';
import { useNavigationContext, NavigationSource } from '@/contexts/NavigationContext';

export function useNavigationSource() {
  const { source, setSource, getBackRoute, clearSource } = useNavigationContext();
  const location = useLocation();

  const navigateWithSource = useCallback(
    (navigate: NavigateFunction, to: string, sourceView: string, filters?: Record<string, string>) => {
      setSource({
        view: sourceView,
        route: location.pathname + location.search,
        filters,
        scrollPosition: window.scrollY, // Capture current scroll position
      });
      navigate(to);
    },
    [setSource, location.pathname, location.search]
  );

  /**
   * Navigate back to the source route with scroll position restoration
   */
  const navigateBack = useCallback(
    (navigate: NavigateFunction, fallbackRoute: string) => {
      const backRoute = getBackRoute(fallbackRoute);
      const savedScroll = source?.scrollPosition ?? 0;
      
      navigate(backRoute);
      
      // Restore scroll position after navigation
      if (savedScroll > 0) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo({ top: savedScroll, behavior: 'instant' });
          }, 100);
        });
      }
      
      clearSource();
    },
    [getBackRoute, source, clearSource]
  );

  /**
   * Get a human-readable label for the back button based on source view
   */
  const getBackButtonLabel = useCallback((): string => {
    if (!source) return 'Back to Case';
    switch (source.view) {
      case 'case-updates': return 'Back to Updates';
      case 'case-timeline': return 'Back to Timeline';
      case 'dashboard-updates': return 'Back to Dashboard';
      case 'standalone-updates': return 'Back to Updates';
      default: return 'Back to Case';
    }
  }, [source]);

  return { 
    navigateWithSource, 
    navigateBack,
    getBackRoute, 
    getBackButtonLabel,
    source, 
    clearSource 
  };
}
