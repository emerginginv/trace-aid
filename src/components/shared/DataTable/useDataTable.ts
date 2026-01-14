import { useState, useMemo, useCallback } from 'react';
import { DataTableColumn, DataTableState } from './types';

interface UseDataTableOptions<TData> {
  data: TData[];
  columns: DataTableColumn<TData>[];
  getRowId?: (row: TData) => string;
  searchKey?: string;
  defaultPageSize?: number;
}

/**
 * Hook for managing DataTable state.
 * Handles search, selection, sorting, and column visibility.
 */
export function useDataTable<TData>({
  data,
  columns,
  getRowId = (row: TData) => (row as { id?: string }).id || String(Math.random()),
  searchKey,
}: UseDataTableOptions<TData>): DataTableState<TData> {
  // Search state
  const [searchValue, setSearchValue] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    return new Set(
      columns
        .filter((col) => col.defaultVisible !== false)
        .map((col) => col.id)
    );
  });

  // Sorting state
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchValue.trim()) {
      return data;
    }

    const searchLower = searchValue.toLowerCase();

    return data.filter((row) => {
      // If searchKey specified, only search that field
      if (searchKey) {
        const value = (row as Record<string, unknown>)[searchKey];
        return String(value || '').toLowerCase().includes(searchLower);
      }

      // Otherwise, search all string fields
      return Object.values(row as Record<string, unknown>).some((value) => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchLower);
        }
        if (typeof value === 'number') {
          return String(value).includes(searchValue);
        }
        return false;
      });
    });
  }, [data, searchValue, searchKey]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (sorting.length === 0) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      for (const sort of sorting) {
        const column = columns.find((col) => col.id === sort.id);
        if (!column) continue;

        const aValue = column.accessorFn
          ? column.accessorFn(a)
          : column.accessorKey
          ? (a as Record<string, unknown>)[column.accessorKey as string]
          : null;
        const bValue = column.accessorFn
          ? column.accessorFn(b)
          : column.accessorKey
          ? (b as Record<string, unknown>)[column.accessorKey as string]
          : null;

        if (aValue === bValue) continue;
        if (aValue == null) return sort.desc ? -1 : 1;
        if (bValue == null) return sort.desc ? 1 : -1;

        const comparison = aValue < bValue ? -1 : 1;
        return sort.desc ? -comparison : comparison;
      }
      return 0;
    });
  }, [filteredData, sorting, columns]);

  // Selection handlers
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

  const toggleAll = useCallback(() => {
    const allIds = sortedData.map(getRowId);
    const allSelected = allIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [sortedData, selectedIds, getRowId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getSelectedRows = useCallback(() => {
    return sortedData.filter((row) => selectedIds.has(getRowId(row)));
  }, [sortedData, selectedIds, getRowId]);

  // Column visibility handler
  const toggleColumn = useCallback((id: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Compute selection state
  const allIds = sortedData.map(getRowId);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && allIds.some((id) => selectedIds.has(id));

  return {
    searchValue,
    setSearchValue,
    selectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    allSelected,
    someSelected,
    getSelectedRows,
    visibleColumns,
    toggleColumn,
    sorting,
    setSorting,
    filteredData: sortedData,
  };
}

export default useDataTable;
