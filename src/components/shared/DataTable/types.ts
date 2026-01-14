import { ReactNode } from 'react';
import { ColumnDef } from '@tanstack/react-table';

/**
 * Configuration for a data table column
 */
export interface DataTableColumn<TData> {
  /** Unique identifier for the column */
  id: string;
  /** Header text or component */
  header: string | ReactNode;
  /** Accessor key for the data */
  accessorKey?: keyof TData | string;
  /** Custom accessor function */
  accessorFn?: (row: TData) => unknown;
  /** Custom cell renderer */
  cell?: (props: { row: TData; value: unknown }) => ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Enable filtering for this column */
  filterable?: boolean;
  /** Column width (Tailwind class or CSS) */
  width?: string;
  /** Alignment */
  align?: 'left' | 'center' | 'right';
  /** Hide on mobile */
  hideOnMobile?: boolean;
  /** Whether column is visible by default */
  defaultVisible?: boolean;
}

/**
 * Export configuration
 */
export interface ExportConfig {
  /** Enable CSV export */
  csv?: boolean;
  /** Enable PDF export */
  pdf?: boolean;
  /** Filename without extension */
  filename?: string;
  /** Custom export handler */
  onExport?: (format: 'csv' | 'pdf', data: unknown[]) => void | Promise<void>;
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  /** Enable search input */
  search?: boolean;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Key to search on (defaults to all text columns) */
  searchKey?: string;
  /** Custom filter components */
  customFilters?: ReactNode;
}

/**
 * Action configuration for row actions
 */
export interface RowAction<TData> {
  /** Unique identifier */
  id: string;
  /** Label text */
  label: string;
  /** Icon component */
  icon?: ReactNode;
  /** Action handler */
  onClick: (row: TData) => void;
  /** Conditionally show action */
  show?: (row: TData) => boolean;
  /** Conditionally disable action */
  disabled?: (row: TData) => boolean;
  /** Variant for styling */
  variant?: 'default' | 'destructive';
}

/**
 * Bulk action configuration
 */
export interface BulkAction<TData> {
  /** Unique identifier */
  id: string;
  /** Label text */
  label: string;
  /** Icon component */
  icon?: ReactNode;
  /** Action handler with selected rows */
  onClick: (rows: TData[]) => void;
  /** Variant for styling */
  variant?: 'default' | 'destructive';
}

/**
 * Main DataTable props
 */
export interface DataTableProps<TData> {
  /** Data to display */
  data: TData[];
  /** Column definitions */
  columns: DataTableColumn<TData>[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Enable row selection */
  selectable?: boolean;
  /** Row actions dropdown */
  rowActions?: RowAction<TData>[];
  /** Bulk actions for selected rows */
  bulkActions?: BulkAction<TData>[];
  /** Export configuration */
  export?: ExportConfig;
  /** Filter configuration */
  filter?: FilterConfig;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: ReactNode;
  /** Get unique row ID */
  getRowId?: (row: TData) => string;
  /** Callback when row is clicked */
  onRowClick?: (row: TData) => void;
  /** Additional toolbar content */
  toolbarContent?: ReactNode;
  /** Enable column visibility toggle */
  columnToggle?: boolean;
  /** Default page size */
  pageSize?: number;
  /** Compact mode */
  compact?: boolean;
}

/**
 * State returned by useDataTable hook
 */
export interface DataTableState<TData> {
  /** Search/filter value */
  searchValue: string;
  /** Set search value */
  setSearchValue: (value: string) => void;
  /** Selected row IDs */
  selectedIds: Set<string>;
  /** Toggle row selection */
  toggleSelection: (id: string) => void;
  /** Toggle all rows */
  toggleAll: () => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Whether all are selected */
  allSelected: boolean;
  /** Whether some are selected */
  someSelected: boolean;
  /** Get selected rows */
  getSelectedRows: () => TData[];
  /** Visible columns */
  visibleColumns: Set<string>;
  /** Toggle column visibility */
  toggleColumn: (id: string) => void;
  /** Sorting state */
  sorting: { id: string; desc: boolean }[];
  /** Set sorting */
  setSorting: (sorting: { id: string; desc: boolean }[]) => void;
  /** Filtered data */
  filteredData: TData[];
}
