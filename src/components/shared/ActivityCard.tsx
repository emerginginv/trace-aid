import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ActivityStatusPill, deriveActivityDisplayStatus, ActivityDisplayStatus } from './ActivityStatusPill';
import { UserAvatar } from './UserAvatar';

export interface ActivityCardData {
  id: string;
  title: string;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  end_date?: string | null;
  status?: string;
  is_scheduled?: boolean | null;
  completed?: boolean | null;
  address?: string | null;
  case_number?: string;
  case_title?: string;
  assigned_user_name?: string | null;
  assigned_user_avatar?: string | null;
}

export interface ActivityCardProps {
  activity: ActivityCardData;
  onClick?: () => void;
  variant?: 'card' | 'list-item';
  showCase?: boolean;
  className?: string;
}

/**
 * Format the date row based on activity type
 */
function formatActivityDate(activity: ActivityCardData): string | null {
  const isScheduled = activity.is_scheduled;
  
  if (!activity.due_date) return null;

  try {
    // For scheduled activities with start/end time, show time range
    if (isScheduled && activity.start_time && activity.end_time) {
      const date = format(parseISO(activity.due_date), 'MMM d, yyyy');
      return `${date} ${activity.start_time} – ${activity.end_time}`;
    }
    
    // For scheduled with end_date (multi-day), show date range
    if (isScheduled && activity.end_date && activity.end_date !== activity.due_date) {
      const startDate = format(parseISO(activity.due_date), 'MMM d');
      const endDate = format(parseISO(activity.end_date), 'MMM d, yyyy');
      return `${startDate} – ${endDate}`;
    }
    
    // For tasks or simple scheduled, just show due date
    const prefix = isScheduled ? '' : 'Due: ';
    return `${prefix}${format(parseISO(activity.due_date), 'MMM d, yyyy')}`;
  } catch {
    return activity.due_date;
  }
}

/**
 * Unified Activity Card component.
 * Enforces consistent structure across all activity displays.
 * 
 * Structure (top to bottom):
 * - Header: Title (left), single Status Pill (right)
 * - Date row: Dynamic based on task/event
 * - Case row: Case number (bold) + subject (muted) - optional
 * - Location row: Only if address present
 * - Footer: Assigned user
 */
export function ActivityCard({ 
  activity, 
  onClick, 
  variant = 'card',
  showCase = true,
  className 
}: ActivityCardProps) {
  const displayStatus = deriveActivityDisplayStatus(activity);
  const dateDisplay = formatActivityDate(activity);
  const isCompleted = displayStatus === 'completed';

  if (variant === 'list-item') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer',
          isCompleted && 'opacity-70',
          className
        )}
      >
        {/* Header: Title + Status */}
        <div className="flex items-start justify-between gap-2">
          <span 
            className={cn(
              'text-sm font-medium leading-tight line-clamp-1',
              isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {activity.title}
          </span>
          <ActivityStatusPill status={displayStatus} />
        </div>

        {/* Date row */}
        {dateDisplay && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{dateDisplay}</span>
          </div>
        )}

        {/* Case row */}
        {showCase && activity.case_number && (
          <div className="text-xs">
            <span className="font-semibold">{activity.case_number}</span>
            {activity.case_title && (
              <span className="text-muted-foreground"> • {activity.case_title}</span>
            )}
          </div>
        )}

        {/* Location row */}
        {activity.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{activity.address}</span>
          </div>
        )}

        {/* Footer: Assigned user */}
        {activity.assigned_user_name && (
          <div className="flex items-center gap-1.5 pt-1">
            <UserAvatar 
              name={activity.assigned_user_name} 
              avatarUrl={activity.assigned_user_avatar} 
              size="xs" 
              showName 
            />
          </div>
        )}
      </div>
    );
  }

  // Card variant (full card)
  return (
    <Card
      onClick={onClick}
      className={cn(
        'transition-shadow hover:shadow-md cursor-pointer group',
        isCompleted && 'opacity-70',
        className
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Title + Status */}
        <div className="flex items-start justify-between gap-2">
          <h3 
            className={cn(
              'font-semibold text-foreground line-clamp-2 flex-1',
              isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {activity.title}
          </h3>
          <ActivityStatusPill status={displayStatus} className="shrink-0" />
        </div>

        {/* Date row */}
        {dateDisplay && (
          <div className={cn(
            'flex items-center gap-1.5 text-sm',
            displayStatus === 'overdue' ? 'text-red-500' : 'text-muted-foreground'
          )}>
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateDisplay}</span>
          </div>
        )}

        {/* Location row */}
        {activity.address && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{activity.address}</span>
          </div>
        )}

        {/* Case row */}
        {showCase && activity.case_number && (
          <div className="text-sm">
            <span className="font-semibold">{activity.case_number}</span>
            {activity.case_title && (
              <span className="text-muted-foreground"> • {activity.case_title}</span>
            )}
          </div>
        )}

        {/* Footer: Assigned user */}
        {activity.assigned_user_name && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <UserAvatar 
              name={activity.assigned_user_name} 
              avatarUrl={activity.assigned_user_avatar} 
              size="sm" 
            />
            <span className="text-sm text-muted-foreground">{activity.assigned_user_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivityCard;
