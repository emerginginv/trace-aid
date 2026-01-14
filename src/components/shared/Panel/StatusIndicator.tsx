import React from 'react';
import { cn } from '@/lib/utils';

export interface StatusConfig {
  label: string;
  dotColor: string;
  textColor: string;
}

export interface StatusIndicatorProps {
  /** Status configuration */
  status: StatusConfig;
  /** Additional class name */
  className?: string;
}

/**
 * Get status display configuration for common statuses.
 */
export function getStatusDisplay(status: string): StatusConfig {
  switch (status) {
    case 'in_progress':
      return { label: 'In Progress', dotColor: 'bg-blue-500', textColor: 'text-blue-500' };
    case 'done':
    case 'completed':
      return { label: 'Done', dotColor: 'bg-emerald-500', textColor: 'text-emerald-500' };
    case 'scheduled':
      return { label: 'Scheduled', dotColor: 'bg-purple-500', textColor: 'text-purple-500' };
    case 'cancelled':
      return { label: 'Cancelled', dotColor: 'bg-red-500', textColor: 'text-red-500' };
    case 'on_hold':
      return { label: 'On Hold', dotColor: 'bg-orange-500', textColor: 'text-orange-500' };
    case 'to_do':
    default:
      return { label: 'To Do', dotColor: 'bg-amber-500', textColor: 'text-amber-500' };
  }
}

/**
 * A consistent status indicator with colored dot and label.
 * 
 * @example
 * <StatusIndicator status={getStatusDisplay(task.status)} />
 */
export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  return (
    <span className={cn('flex items-center gap-1.5 text-xs font-medium', status.textColor, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', status.dotColor)} />
      {status.label}
    </span>
  );
}

export default StatusIndicator;
