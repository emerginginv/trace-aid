import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface FilterOption {
  value: string;
  label: string;
}

export interface BasePanelProps {
  /** Panel title */
  title: string;
  /** Badge count to display */
  count?: number;
  /** Icon for empty state */
  emptyIcon?: LucideIcon;
  /** Message for empty state */
  emptyMessage?: string;
  /** Whether to show filter dropdown */
  showFilter?: boolean;
  /** Filter options */
  filterOptions?: FilterOption[];
  /** Current filter value */
  filterValue?: string;
  /** Filter change handler */
  onFilterChange?: (value: string) => void;
  /** Filter trigger width class */
  filterWidth?: string;
  /** Whether panel is expanded */
  expanded?: boolean;
  /** Default expanded state */
  defaultExpanded?: boolean;
  /** Expansion change handler */
  onExpandedChange?: (expanded: boolean) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Panel content */
  children: React.ReactNode;
  /** Additional class for Card */
  className?: string;
  /** Additional header actions */
  headerActions?: React.ReactNode;
}

/**
 * A reusable base panel component with consistent header pattern.
 * Includes title, count badge, filter dropdown, and expand/collapse button.
 * 
 * @example
 * <BasePanel
 *   title="Tasks"
 *   count={5}
 *   emptyIcon={CheckCircle2}
 *   emptyMessage="No pending tasks"
 *   showFilter
 *   filterOptions={[{ value: 'my', label: 'My Tasks' }, { value: 'all', label: 'All Tasks' }]}
 *   filterValue={filter}
 *   onFilterChange={setFilter}
 * >
 *   {tasks.map(task => <TaskItem key={task.id} task={task} />)}
 * </BasePanel>
 */
export function BasePanel({
  title,
  count,
  emptyIcon: EmptyIcon,
  emptyMessage = 'No items found',
  showFilter = false,
  filterOptions = [],
  filterValue,
  onFilterChange,
  filterWidth = 'w-[110px]',
  expanded: controlledExpanded,
  defaultExpanded = true,
  onExpandedChange,
  isLoading = false,
  children,
  className,
  headerActions,
}: BasePanelProps) {
  const [internalExpanded, setInternalExpanded] = React.useState(defaultExpanded);
  
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  const handleExpandedChange = () => {
    const newExpanded = !isExpanded;
    setInternalExpanded(newExpanded);
    onExpandedChange?.(newExpanded);
  };

  const isEmpty = React.Children.count(children) === 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {count !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          {showFilter && filterOptions.length > 0 && (
            <Select value={filterValue} onValueChange={onFilterChange}>
              <SelectTrigger className={cn('h-8 text-xs', filterWidth)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpandedChange}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <BasePanelSkeleton />
          ) : isEmpty && EmptyIcon ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <EmptyIcon className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-2">{children}</div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Skeleton loader for BasePanel content
 */
export function BasePanelSkeleton({ itemCount = 3 }: { itemCount?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default BasePanel;
