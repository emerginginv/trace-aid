import { useState, useEffect, useCallback } from "react";

export function usePanelVisibility(
  storageKey: string,
  defaultVisible: boolean = true
) {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem(`panel-visibility-${storageKey}`);
    if (saved !== null) {
      return saved === "true";
    }
    return defaultVisible;
  });

  useEffect(() => {
    localStorage.setItem(`panel-visibility-${storageKey}`, String(isVisible));
  }, [isVisible, storageKey]);

  const toggle = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  return {
    isVisible,
    setIsVisible,
    toggle,
  };
}
