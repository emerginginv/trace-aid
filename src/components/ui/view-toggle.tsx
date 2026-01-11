import * as React from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  gridLabel?: string;
  listLabel?: string;
  className?: string;
}

export function ViewToggle({
  value,
  onChange,
  gridLabel = "Grid view",
  listLabel = "List view",
  className,
}: ViewToggleProps) {
  return (
    <div className={cn("flex gap-1 border rounded-md p-1 h-10", className)}>
      <Button
        variant={value === 'grid' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('grid')}
        className="h-7 w-7 p-0"
        aria-label={gridLabel}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={value === 'list' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('list')}
        className="h-7 w-7 p-0"
        aria-label={listLabel}
      >
        <List className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
