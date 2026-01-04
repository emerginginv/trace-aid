import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDefinition } from "@/hooks/use-column-visibility";

interface ColumnVisibilityProps {
  columns: ColumnDefinition[];
  visibility: Record<string, boolean>;
  onToggle: (key: string) => void;
  onReset: () => void;
}

export function ColumnVisibility({
  columns,
  visibility,
  onToggle,
  onReset,
}: ColumnVisibilityProps) {
  const hideableColumns = columns.filter((col) => col.hideable !== false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Settings2 className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={visibility[column.key] !== false}
            onCheckedChange={() => onToggle(column.key)}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={onReset}
        >
          Reset to default
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
