import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Search, List, LayoutGrid } from "lucide-react";
import { SubjectStatus } from "./types";

export type ViewMode = 'list' | 'cards';

interface SubjectFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: SubjectStatus | 'all';
  onStatusFilterChange: (status: SubjectStatus | 'all') => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const SubjectFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
}: SubjectFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-1">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search subjects..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as SubjectStatus | 'all')}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      <ToggleGroup 
        type="single" 
        value={viewMode} 
        onValueChange={(v) => v && onViewModeChange(v as ViewMode)}
        className="border rounded-md"
      >
        <ToggleGroupItem value="list" aria-label="List view" className="px-3">
          <List className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="cards" aria-label="Cards view" className="px-3">
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
