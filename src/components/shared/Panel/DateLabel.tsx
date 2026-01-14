import React from 'react';
import { format, isToday, isTomorrow, isYesterday, parseISO, isPast } from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateLabelProps {
  /** Date string in ISO format */
  date: string;
  /** Whether to show clock icon */
  showIcon?: boolean;
  /** Whether to highlight overdue dates */
  highlightOverdue?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Get human-readable date label (Today, Yesterday, Tomorrow, or formatted date)
 */
export function getDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM dd');
}

/**
 * Check if a date is overdue (past and not today)
 */
export function isOverdue(dateStr: string): boolean {
  const date = parseISO(dateStr);
  return isPast(date) && !isToday(date);
}

/**
 * A consistent date label component with optional icon and overdue highlighting.
 * 
 * @example
 * <DateLabel date={task.dueDate} showIcon highlightOverdue />
 */
export function DateLabel({
  date,
  showIcon = false,
  highlightOverdue = false,
  className,
}: DateLabelProps) {
  const overdue = highlightOverdue && isOverdue(date);
  const label = getDateLabel(date);

  return (
    <span
      className={cn(
        'flex items-center gap-1 text-xs',
        overdue ? 'text-destructive font-medium' : 'text-muted-foreground',
        className
      )}
    >
      {showIcon && <Clock className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default DateLabel;
