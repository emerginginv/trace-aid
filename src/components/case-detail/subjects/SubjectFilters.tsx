import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-1 border rounded-md p-1 h-10">
        <Button
          variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('cards')}
          className="h-7 w-7 p-0"
          aria-label="Cards view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className="h-7 w-7 p-0"
          aria-label="List view"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
