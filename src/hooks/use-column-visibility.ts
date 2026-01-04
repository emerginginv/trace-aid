import { useState, useEffect, useCallback } from "react";

export interface ColumnDefinition {
  key: string;
  label: string;
  defaultVisible?: boolean;
  hideable?: boolean;
}

export function useColumnVisibility(
  storageKey: string,
  columns: ColumnDefinition[]
) {
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`column-visibility-${storageKey}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Invalid JSON, use defaults
      }
    }
    const defaults: Record<string, boolean> = {};
    columns.forEach((col) => {
      defaults[col.key] = col.defaultVisible !== false;
    });
    return defaults;
  });

  useEffect(() => {
    if (Object.keys(visibility).length > 0) {
      localStorage.setItem(
        `column-visibility-${storageKey}`,
        JSON.stringify(visibility)
      );
    }
  }, [visibility, storageKey]);

  const isVisible = useCallback(
    (key: string) => visibility[key] !== false,
    [visibility]
  );

  const toggleColumn = useCallback((key: string) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults: Record<string, boolean> = {};
    columns.forEach((col) => {
      defaults[col.key] = col.defaultVisible !== false;
    });
    setVisibility(defaults);
  }, [columns]);

  return { visibility, isVisible, toggleColumn, resetToDefaults };
}
