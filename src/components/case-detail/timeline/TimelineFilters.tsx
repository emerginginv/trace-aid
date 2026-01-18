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
import { DelayedTooltip } from "@/components/ui/tooltip";

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
        <DelayedTooltip content="Filter timeline by entry type to focus on specific activities">
          <Filter className="h-4 w-4 text-muted-foreground" />
        </DelayedTooltip>
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
            <SelectItem value="event">Activities</SelectItem>
            <SelectItem value="attachment">Attachments</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DelayedTooltip content={sortDirection === 'desc' ? "Showing newest first - click to show oldest first" : "Showing oldest first - click to show newest first"}>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          {sortDirection === 'asc' ? 'Oldest First' : 'Newest First'}
        </Button>
      </DelayedTooltip>
    </div>
  );
}
