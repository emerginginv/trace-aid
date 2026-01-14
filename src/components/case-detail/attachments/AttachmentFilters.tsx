import React from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColumnVisibility } from '@/components/ui/column-visibility';
import { ColumnDefinition } from '@/hooks/use-column-visibility';

interface AttachmentFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  allTags: string[];
  viewMode: 'list' | 'card';
  onViewModeChange: (mode: 'list' | 'card') => void;
  // Column visibility
  columns: ColumnDefinition[];
  visibility: Record<string, boolean>;
  onToggleColumn: (key: string) => void;
  onResetColumns: () => void;
}

export function AttachmentFilters({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  tagFilter,
  onTagFilterChange,
  allTags,
  viewMode,
  onViewModeChange,
  columns,
  visibility,
  onToggleColumn,
  onResetColumns,
}: AttachmentFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex gap-3 w-full sm:w-auto">
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="flex-1 sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={onTagFilterChange}>
          <SelectTrigger className="flex-1 sm:w-40">
            <SelectValue placeholder="Tags" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.length === 0 ? (
              <SelectItem value="none" disabled>
                No tags
              </SelectItem>
            ) : (
              allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-md p-1 h-10">
          <Button
            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('card')}
            className="h-7 w-7 p-0"
            aria-label="Card view"
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
        <ColumnVisibility
          columns={columns}
          visibility={visibility}
          onToggle={onToggleColumn}
          onReset={onResetColumns}
        />
      </div>
    </div>
  );
}

export default AttachmentFilters;
