import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Circle, Calendar, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';
import { isPast, parseISO, isToday } from 'date-fns';

export type ActivityDisplayStatus = 'to_do' | 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export interface ActivityStatusPillProps {
  status: ActivityDisplayStatus;
  className?: string;
}

/**
 * Get display configuration for activity status
 */
const STATUS_CONFIG: Record<ActivityDisplayStatus, {
  label: string;
  icon: typeof Circle;
  className: string;
}> = {
  to_do: {
    label: 'To Do',
    icon: Circle,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Calendar,
    className: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
  },
  overdue: {
    label: 'Overdue',
    icon: AlertCircle,
    className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400',
  },
};

/**
 * Derive the display status from activity data.
 * This centralizes status logic so it's not duplicated across components.
 * 
 * Status rules:
 * - TASKS: Can be to_do, in_progress, completed, cancelled (can also show overdue if past due)
 * - SCHEDULED activities: Can be scheduled, completed, cancelled (never "overdue")
 */
export function deriveActivityDisplayStatus(activity: {
  status?: string;
  completed?: boolean | null;
  is_scheduled?: boolean | null;
  due_date?: string | null;
}): ActivityDisplayStatus {
  // Check cancelled first - applies to both types
  if (activity.status === 'cancelled') return 'cancelled';

  // Check if completed
  const isComplete = 
    activity.status === 'completed' || 
    activity.status === 'done' || 
    activity.completed === true;
  
  if (isComplete) return 'completed';

  // Check in_progress - applies to tasks only but we show it if set
  if (activity.status === 'in_progress') return 'in_progress';

  // Check if this is a SCHEDULED activity (event/appointment)
  // Scheduled activities don't have "overdue" - they either happened or were missed
  if (activity.is_scheduled || activity.status === 'scheduled') {
    return 'scheduled';
  }

  // For TASKS only - check if overdue (has due date in the past and not complete)
  if (activity.due_date) {
    try {
      const dueDate = parseISO(activity.due_date);
      if (isPast(dueDate) && !isToday(dueDate)) {
        return 'overdue';
      }
    } catch {
      // Invalid date format, continue
    }
  }

  return 'to_do';
}

/**
 * A unified status pill for activities.
 * Displays exactly one status with icon for accessibility (color is not only indicator).
 */
export function ActivityStatusPill({ status, className }: ActivityStatusPillProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn('text-xs gap-1 font-medium', config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default ActivityStatusPill;
