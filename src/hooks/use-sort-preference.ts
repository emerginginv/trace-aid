import { useState, useEffect, useCallback } from "react";

export type SortDirection = "asc" | "desc";

export interface SortPreference {
  column: string;
  direction: SortDirection;
}

export function useSortPreference(
  storageKey: string,
  defaultColumn: string,
  defaultDirection: SortDirection = "asc"
) {
  const [sortColumn, setSortColumn] = useState<string>(() => {
    const saved = localStorage.getItem(`sort-preference-${storageKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.column || defaultColumn;
      } catch {
        // Invalid JSON, use default
      }
    }
    return defaultColumn;
  });

  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const saved = localStorage.getItem(`sort-preference-${storageKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.direction || defaultDirection;
      } catch {
        // Invalid JSON, use default
      }
    }
    return defaultDirection;
  });

  useEffect(() => {
    localStorage.setItem(
      `sort-preference-${storageKey}`,
      JSON.stringify({ column: sortColumn, direction: sortDirection })
    );
  }, [sortColumn, sortDirection, storageKey]);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn]);

  const resetSort = useCallback(() => {
    setSortColumn(defaultColumn);
    setSortDirection(defaultDirection);
  }, [defaultColumn, defaultDirection]);

  return {
    sortColumn,
    sortDirection,
    handleSort,
    resetSort,
    setSortColumn,
    setSortDirection,
  };
}
