import React, { ReactNode } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExportDropdown, ExportDropdownProps } from '../ExportDropdown';
import { DataTableColumn } from './types';

interface DataTableHeaderProps<TData> {
  /** Search value */
  searchValue: string;
  /** Search value setter */
  onSearchChange: (value: string) => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Enable search */
  showSearch?: boolean;
  /** Column definitions for toggle */
  columns?: DataTableColumn<TData>[];
  /** Visible column IDs */
  visibleColumns?: Set<string>;
  /** Toggle column visibility */
  onToggleColumn?: (id: string) => void;
  /** Show column toggle */
  showColumnToggle?: boolean;
  /** Export props */
  exportProps?: ExportDropdownProps;
  /** Additional toolbar content */
  children?: ReactNode;
  /** Custom filter content */
  filterContent?: ReactNode;
  /** Selected count for bulk actions */
  selectedCount?: number;
  /** Bulk action buttons */
  bulkActions?: ReactNode;
}

/**
 * Header component for DataTable with search, filters, and column toggle.
 */
export function DataTableHeader<TData>({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  showSearch = true,
  columns = [],
  visibleColumns,
  onToggleColumn,
  showColumnToggle = false,
  exportProps,
  children,
  filterContent,
  selectedCount = 0,
  bulkActions,
}: DataTableHeaderProps<TData>) {
  const hasExport = exportProps && (exportProps.onExportCSV || exportProps.onExportPDF);

  return (
    <div className="flex flex-col gap-4 mb-4">
      {/* Main toolbar row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Left side: Search and filters */}
        <div className="flex flex-1 gap-2 items-center w-full sm:w-auto">
          {showSearch && (
            <div className="relative flex-1 sm:flex-initial sm:min-w-[200px] sm:max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          )}
          {filterContent}
        </div>

        {/* Right side: Actions */}
        <div className="flex gap-2 items-center">
          {children}

          {showColumnToggle && columns.length > 0 && visibleColumns && onToggleColumn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px] bg-popover">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={visibleColumns.has(column.id)}
                    onCheckedChange={() => onToggleColumn(column.id)}
                  >
                    {typeof column.header === 'string' ? column.header : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {hasExport && <ExportDropdown {...exportProps} />}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedCount > 0 && bulkActions && (
        <div className="flex items-center gap-4 px-4 py-2 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">{bulkActions}</div>
        </div>
      )}
    </div>
  );
}

export default DataTableHeader;
