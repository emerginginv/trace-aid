import { ArrowUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimelineEntryType } from "@/types/timeline";

interface TimelineFiltersProps {
  entryTypeFilter: 'all' | TimelineEntryType;
  onEntryTypeChange: (value: 'all' | TimelineEntryType) => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (value: 'asc' | 'desc') => void;
}

export function TimelineFilters({
  entryTypeFilter,
  onEntryTypeChange,
  sortDirection,
  onSortDirectionChange,
}: TimelineFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select 
          value={entryTypeFilter} 
          onValueChange={(value) => onEntryTypeChange(value as 'all' | TimelineEntryType)}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Entry Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entries</SelectItem>
            <SelectItem value="subject">Subjects</SelectItem>
            <SelectItem value="update">Updates</SelectItem>
            <SelectItem value="event">Events</SelectItem>
            <SelectItem value="attachment">Attachments</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
      >
        <ArrowUpDown className="h-4 w-4 mr-2" />
        {sortDirection === 'asc' ? 'Oldest First' : 'Newest First'}
      </Button>
    </div>
  );
}
