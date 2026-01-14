import React from 'react';
import { MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DataTableProps, RowAction } from './types';
import { DataTableHeader } from './DataTableHeader';
import { useDataTable } from './useDataTable';

/**
 * Reusable data table component with search, sort, select, and export capabilities.
 * Designed to replace repeated table patterns across the application.
 */
export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  error = null,
  selectable = false,
  rowActions = [],
  bulkActions = [],
  export: exportConfig,
  filter,
  emptyMessage = 'No data found',
  emptyIcon,
  getRowId = (row: TData) => (row as { id?: string }).id || String(Math.random()),
  onRowClick,
  toolbarContent,
  columnToggle = false,
  compact = false,
}: DataTableProps<TData>) {
  const {
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
    filteredData,
  } = useDataTable({
    data,
    columns,
    getRowId,
    searchKey: filter?.searchKey,
  });

  // Get visible columns
  const displayColumns = columns.filter((col) => visibleColumns.has(col.id));

  // Handle sort click
  const handleSort = (columnId: string) => {
    const existing = sorting.find((s) => s.id === columnId);
    if (!existing) {
      setSorting([{ id: columnId, desc: false }]);
    } else if (!existing.desc) {
      setSorting([{ id: columnId, desc: true }]);
    } else {
      setSorting([]);
    }
  };

  // Get sort icon for column
  const getSortIcon = (columnId: string) => {
    const sort = sorting.find((s) => s.id === columnId);
    if (!sort) return <ArrowUpDown className="h-4 w-4" />;
    return sort.desc ? (
      <ArrowDown className="h-4 w-4" />
    ) : (
      <ArrowUp className="h-4 w-4" />
    );
  };

  // Render cell value
  const renderCell = (row: TData, column: typeof columns[0]) => {
    const value = column.accessorFn
      ? column.accessorFn(row)
      : column.accessorKey
      ? (row as Record<string, unknown>)[column.accessorKey as string]
      : null;

    if (column.cell) {
      return column.cell({ row, value });
    }

    return value != null ? String(value) : '-';
  };

  // Handle bulk action
  const handleBulkAction = (action: typeof bulkActions[0]) => {
    action.onClick(getSelectedRows());
    clearSelection();
  };

  // Export handlers
  const handleExportCSV = exportConfig?.csv
    ? async () => {
        if (exportConfig.onExport) {
          await exportConfig.onExport('csv', filteredData);
        }
      }
    : undefined;

  const handleExportPDF = exportConfig?.pdf
    ? async () => {
        if (exportConfig.onExport) {
          await exportConfig.onExport('pdf', filteredData);
        }
      }
    : undefined;

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.slice(0, 5).map((col, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 5).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive mb-2">Failed to load data</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search, filters, and actions */}
      <DataTableHeader
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder={filter?.searchPlaceholder || 'Search...'}
        showSearch={filter?.search !== false}
        columns={columns}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        showColumnToggle={columnToggle}
        exportProps={{
          onExportCSV: handleExportCSV,
          onExportPDF: handleExportPDF,
        }}
        filterContent={filter?.customFilters}
        selectedCount={selectedIds.size}
        bulkActions={
          bulkActions.length > 0 && selectedIds.size > 0 ? (
            <>
              {bulkActions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => handleBulkAction(action)}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              ))}
            </>
          ) : undefined
        }
      >
        {toolbarContent}
      </DataTableHeader>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Selection checkbox column */}
              {selectable && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                    className={cn(someSelected && 'data-[state=checked]:bg-muted')}
                  />
                </TableHead>
              )}

              {/* Data columns */}
              {displayColumns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    column.width,
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.hideOnMobile && 'hidden md:table-cell'
                  )}
                >
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort(column.id)}
                    >
                      {column.header}
                      {getSortIcon(column.id)}
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}

              {/* Actions column */}
              {rowActions.length > 0 && <TableHead className="w-[70px]" />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={displayColumns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    {emptyIcon}
                    <p>{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedIds.has(rowId);

                return (
                  <TableRow
                    key={rowId}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      onRowClick && 'cursor-pointer hover:bg-muted/50',
                      compact && 'h-10'
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <TableCell className="w-[50px]" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(rowId)}
                          aria-label="Select row"
                        />
                      </TableCell>
                    )}

                    {/* Data cells */}
                    {displayColumns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.hideOnMobile && 'hidden md:table-cell'
                        )}
                      >
                        {renderCell(row, column)}
                      </TableCell>
                    ))}

                    {/* Row actions */}
                    {rowActions.length > 0 && (
                      <TableCell className="w-[70px]" onClick={(e) => e.stopPropagation()}>
                        <RowActionsDropdown row={row} actions={rowActions} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer with count */}
      <div className="text-sm text-muted-foreground">
        {filteredData.length} of {data.length} item{data.length !== 1 ? 's' : ''}
        {searchValue && ' (filtered)'}
      </div>
    </div>
  );
}

/**
 * Row actions dropdown component
 */
function RowActionsDropdown<TData>({
  row,
  actions,
}: {
  row: TData;
  actions: RowAction<TData>[];
}) {
  const visibleActions = actions.filter((action) => !action.show || action.show(row));

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        {visibleActions.map((action, index) => (
          <React.Fragment key={action.id}>
            {action.variant === 'destructive' && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => action.onClick(row)}
              disabled={action.disabled ? action.disabled(row) : false}
              className={cn(action.variant === 'destructive' && 'text-destructive')}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DataTable;
