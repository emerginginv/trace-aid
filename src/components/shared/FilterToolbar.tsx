import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImportTemplateButton } from "@/components/ui/import-template-button";
import { Search, Download, FileSpreadsheet, FileText, LayoutGrid, List } from "lucide-react";
import { ReactNode } from "react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: Array<{
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    placeholder?: string;
    width?: string;
  }>;
  viewMode?: 'list' | 'cards';
  onViewModeChange?: (mode: 'list' | 'cards') => void;
  showViewToggle?: boolean;
  showExport?: boolean;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  importTemplateFileName?: string;
  importEntityDisplayName?: string;
  additionalActions?: ReactNode;
}

export function FilterToolbar({
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filters = [],
  viewMode,
  onViewModeChange,
  showViewToggle = false,
  showExport = false,
  onExportCSV,
  onExportPDF,
  importTemplateFileName,
  importEntityDisplayName,
  additionalActions,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {onSearchChange && (
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      
      {filters.map((filter, index) => (
        <Select key={index} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className={filter.width || "w-[160px]"}>
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      
      {showExport && (onExportCSV || onExportPDF) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onExportCSV && (
              <DropdownMenuItem onClick={onExportCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to CSV
              </DropdownMenuItem>
            )}
            {onExportPDF && (
              <DropdownMenuItem onClick={onExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export to PDF
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      {importTemplateFileName && importEntityDisplayName && (
        <ImportTemplateButton 
          templateFileName={importTemplateFileName} 
          entityDisplayName={importEntityDisplayName} 
        />
      )}
      
      {additionalActions}
      
      {showViewToggle && onViewModeChange && (
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
