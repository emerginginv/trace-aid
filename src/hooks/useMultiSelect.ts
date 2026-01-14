import { useState, useCallback } from 'react';

/**
 * Hook for managing multi-select state in lists/tables.
 */
export function useMultiSelect<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectItems = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  // Computed values
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const someSelected = !allSelected && items.some((item) => selectedIds.has(item.id));
  const selectedCount = selectedIds.size;

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return {
    selectedIds,
    selectedItems,
    selectedCount,
    allSelected,
    someSelected,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    selectItems,
  };
}

export default useMultiSelect;
