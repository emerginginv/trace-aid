import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'cw-guidance-dismissed-';

export interface UseFirstTimeGuidanceResult {
  shouldShow: boolean;
  dismiss: () => void;
  reset: () => void;
}

/**
 * Hook to manage first-time guidance visibility using localStorage.
 * Returns shouldShow: true only on first visit, and never again after dismissal.
 */
export function useFirstTimeGuidance(guidanceKey: string): UseFirstTimeGuidanceResult {
  const storageKey = `${STORAGE_PREFIX}${guidanceKey}`;
  
  const [shouldShow, setShouldShow] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) !== 'true';
  });

  // Sync with localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey) === 'true';
    if (dismissed && shouldShow) {
      setShouldShow(false);
    }
  }, [storageKey, shouldShow]);

  const dismiss = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setShouldShow(false);
  }, [storageKey]);

  const reset = useCallback(() => {
    localStorage.removeItem(storageKey);
    setShouldShow(true);
  }, [storageKey]);

  return { shouldShow, dismiss, reset };
}
