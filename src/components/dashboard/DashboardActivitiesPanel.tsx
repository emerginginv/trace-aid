import React from 'react';
import { ClipboardList } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { BasePanel, PanelListItem } from '@/components/shared/Panel';
import { ActivityStatusPill, deriveActivityDisplayStatus } from '@/components/shared/ActivityStatusPill';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { format, parseISO } from 'date-fns';
import { Calendar } from 'lucide-react';

export interface DashboardActivity {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  is_scheduled?: boolean;
  completed?: boolean;
  caseId: string;
  assignedUserName: string | null;
  activityData: Record<string, unknown>;
  start_time?: string | null;
  end_time?: string | null;
}

interface DashboardActivitiesPanelProps {
  activities: DashboardActivity[];
  filter: 'my' | 'all';
  onFilterChange: (filter: 'my' | 'all') => void;
  canViewAll: boolean;
  onActivityToggle: (activityId: string) => void;
  onActivityEdit: (activity: DashboardActivity) => void;
  isLoading?: boolean;
}

/**
 * Unified Activities panel for dashboard.
 * Displays both tasks and events in a single list.
 * No visual separation between tasks and events.
 */
export function DashboardActivitiesPanel({
  activities,
  filter,
  onFilterChange,
  canViewAll,
  onActivityToggle,
  onActivityEdit,
  isLoading = false,
}: DashboardActivitiesPanelProps) {
  const filterOptions = canViewAll
    ? [
        { value: 'my', label: 'My Activities' },
        { value: 'all', label: 'All Activities' },
      ]
    : [];

  // Format date display based on activity type
  const formatDate = (activity: DashboardActivity) => {
    if (!activity.dueDate) return null;
    try {
      const isScheduled = activity.is_scheduled;
      if (isScheduled && activity.start_time && activity.end_time) {
        const date = format(parseISO(activity.dueDate), 'MMM d');
        return `${date} ${activity.start_time} – ${activity.end_time}`;
      }
      return format(parseISO(activity.dueDate), 'MMM d, yyyy');
    } catch {
      return activity.dueDate;
    }
  };

  return (
    <BasePanel
      title="Activities"
      count={activities.length}
      emptyIcon={ClipboardList}
      emptyMessage="No pending activities"
      showFilter={canViewAll}
      filterOptions={filterOptions}
      filterValue={filter}
      onFilterChange={(v) => onFilterChange(v as 'my' | 'all')}
      filterWidth="w-[140px]"
      isLoading={isLoading}
    >
      {activities.slice(0, 8).map((activity) => {
        const displayStatus = deriveActivityDisplayStatus({
          status: activity.status,
          completed: activity.completed,
          is_scheduled: activity.is_scheduled,
          due_date: activity.dueDate,
        });
        const isCompleted = displayStatus === 'completed';
        const dateDisplay = formatDate(activity);

        return (
          <PanelListItem key={activity.id} onClick={() => onActivityEdit(activity)}>
            <div className="flex items-start gap-3">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => onActivityToggle(activity.id)}
                  className="mt-0.5"
                />
              </div>
              <div className="flex-1 min-w-0">
                {/* Header: Title + Status */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-sm font-medium leading-tight line-clamp-1 ${
                      isCompleted ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {activity.title}
                  </span>
                  <ActivityStatusPill status={displayStatus} />
                </div>
                
                {/* Date + User row */}
                <div className="flex items-center gap-3 mt-1.5">
                  {dateDisplay && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {dateDisplay}
                    </span>
                  )}
                  {activity.assignedUserName && (
                    <UserAvatar name={activity.assignedUserName} size="xs" showName />
                  )}
                </div>
              </div>
            </div>
          </PanelListItem>
        );
      })}
      {activities.length > 8 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          +{activities.length - 8} more activities
        </p>
      )}
    </BasePanel>
  );
}

export default DashboardActivitiesPanel;
