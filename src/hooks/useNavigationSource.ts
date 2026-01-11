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
      });
      navigate(to);
    },
    [setSource, location.pathname, location.search]
  );

  return { 
    navigateWithSource, 
    getBackRoute, 
    source, 
    clearSource 
  };
}
