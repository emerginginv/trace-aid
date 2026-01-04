import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps {
  column: string;
  label: string;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  className?: string;
}

export function SortableTableHead({
  column,
  label,
  sortColumn,
  sortDirection,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = sortColumn === column;

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        isActive && "bg-muted/30",
        className
      )}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
}
