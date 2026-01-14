import React from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ExportDropdownProps {
  /** Called when CSV export is triggered */
  onExportCSV?: () => void | Promise<void>;
  /** Called when PDF export is triggered */
  onExportPDF?: () => void | Promise<void>;
  /** Whether export is in progress */
  isExporting?: boolean;
  /** Disable the dropdown */
  disabled?: boolean;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Custom label */
  label?: string;
  /** Show only icons */
  iconOnly?: boolean;
}

/**
 * Reusable export dropdown component for CSV/PDF exports.
 * Consolidates the export UI pattern used across the application.
 */
export function ExportDropdown({
  onExportCSV,
  onExportPDF,
  isExporting = false,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  label = 'Export',
  iconOnly = false,
}: ExportDropdownProps) {
  const hasAnyExport = onExportCSV || onExportPDF;

  if (!hasAnyExport) {
    return null;
  }

  // If only one export option, render as simple button
  if ((onExportCSV && !onExportPDF) || (!onExportCSV && onExportPDF)) {
    const handleClick = onExportCSV || onExportPDF;
    const Icon = onExportCSV ? FileSpreadsheet : FileText;
    const exportLabel = onExportCSV ? 'Export CSV' : 'Export PDF';

    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
        {!iconOnly && <span className="ml-2">{exportLabel}</span>}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {!iconOnly && <span className="ml-2">{label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        {onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
        )}
        {onExportPDF && (
          <DropdownMenuItem onClick={onExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportDropdown;
