import React from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar } from 'lucide-react';
import { DashboardEvent } from '@/hooks/useDashboardData';
import { BasePanel, PanelListItem, StatusIndicator, DateLabel, getStatusDisplay } from '@/components/shared/Panel';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface DashboardEventsPanelProps {
  events: DashboardEvent[];
  filter: 'my' | 'all';
  onFilterChange: (filter: 'my' | 'all') => void;
  canViewAll: boolean;
  onEventClick: (event: DashboardEvent) => void;
  isLoading?: boolean;
}

export function DashboardEventsPanel({
  events,
  filter,
  onFilterChange,
  canViewAll,
  onEventClick,
  isLoading = false,
}: DashboardEventsPanelProps) {
  const filterOptions = canViewAll
    ? [
        { value: 'my', label: 'My Events' },
        { value: 'all', label: 'All Events' },
      ]
    : [];

  return (
    <BasePanel
      title="Upcoming Events"
      count={events.length}
      emptyIcon={Calendar}
      emptyMessage="No upcoming events"
      showFilter={canViewAll}
      filterOptions={filterOptions}
      filterValue={filter}
      onFilterChange={(v) => onFilterChange(v as 'my' | 'all')}
      filterWidth="w-[110px]"
      isLoading={isLoading}
    >
      {events.slice(0, 6).map((event) => {
        const statusDisplay = getStatusDisplay(event.eventStatus);

        return (
          <PanelListItem key={event.id} onClick={() => onEventClick(event)}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
                <span className="text-xs font-medium uppercase">
                  {format(parseISO(event.date), 'MMM')}
                </span>
                <span className="text-lg font-bold leading-none">
                  {format(parseISO(event.date), 'd')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium leading-tight block truncate">
                  {event.title}
                </span>
                <div className="flex items-center gap-3 mt-1.5">
                  <DateLabel date={event.date} />
                  <StatusIndicator status={statusDisplay} />
                  {event.assignedUserName && (
                    <UserAvatar name={event.assignedUserName} size="xs" showName />
                  )}
                </div>
              </div>
            </div>
          </PanelListItem>
        );
      })}
      {events.length > 6 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          +{events.length - 6} more events
        </p>
      )}
    </BasePanel>
  );
}

export default DashboardEventsPanel;
