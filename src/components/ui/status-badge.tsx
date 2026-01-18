import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// Enhanced status configurations with semantic colors
const statusConfig: Record<
  string,
  { label: string; className: string; pulse?: boolean }
> = {
  // Invoice statuses
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border border-border",
  },
  sent: {
    label: "Sent",
    className: "bg-info-100 text-info-700 border border-info-200 dark:bg-info-900/30 dark:text-info-400 dark:border-info-800",
  },
  viewed: {
    label: "Viewed",
    className: "bg-primary-100 text-primary-700 border border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800",
  },
  paid: {
    label: "Paid",
    className: "bg-success-100 text-success-700 border border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800",
  },
  partial: {
    label: "Partial",
    className: "bg-warning-100 text-warning-700 border border-warning-200 dark:bg-warning-900/30 dark:text-warning-500 dark:border-warning-800",
  },
  overdue: {
    label: "Overdue",
    className: "bg-destructive-100 text-destructive-700 border border-destructive-200 dark:bg-destructive-900/30 dark:text-destructive-400 dark:border-destructive-800",
    pulse: true,
  },
  unpaid: {
    label: "Unpaid",
    className: "bg-muted text-muted-foreground border border-border",
  },
  // Case statuses
  open: {
    label: "Open",
    className: "bg-success-100 text-success-700 border border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800",
    pulse: true,
  },
  active: {
    label: "Active",
    className: "bg-success-100 text-success-700 border border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800",
    pulse: true,
  },
  pending: {
    label: "Pending",
    className: "bg-warning-100 text-warning-700 border border-warning-200 dark:bg-warning-900/30 dark:text-warning-500 dark:border-warning-800",
  },
  "on-hold": {
    label: "On Hold",
    className: "bg-warning-100 text-warning-700 border border-warning-200 dark:bg-warning-900/30 dark:text-warning-500 dark:border-warning-800",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border border-border",
  },
  archived: {
    label: "Archived",
    className: "bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700",
  },
  // Task statuses
  todo: {
    label: "To Do",
    className: "bg-muted text-muted-foreground border border-border",
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-info-100 text-info-700 border border-info-200 dark:bg-info-900/30 dark:text-info-400 dark:border-info-800",
    pulse: true,
  },
  completed: {
    label: "Completed",
    className: "bg-success-100 text-success-700 border border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800",
  },
  blocked: {
    label: "Blocked",
    className: "bg-destructive-100 text-destructive-700 border border-destructive-200 dark:bg-destructive-900/30 dark:text-destructive-400 dark:border-destructive-800",
  },
  // Priority
  high: {
    label: "High",
    className: "bg-destructive-100 text-destructive-700 border border-destructive-200 dark:bg-destructive-900/30 dark:text-destructive-400 dark:border-destructive-800",
  },
  medium: {
    label: "Medium",
    className: "bg-warning-100 text-warning-700 border border-warning-200 dark:bg-warning-900/30 dark:text-warning-500 dark:border-warning-800",
  },
  low: {
    label: "Low",
    className: "bg-muted text-muted-foreground border border-border",
  },
  // Case Request statuses
  approved: {
    label: "Approved",
    className: "bg-success-100 text-success-700 border border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800",
  },
  declined: {
    label: "Declined",
    className: "bg-destructive-100 text-destructive-700 border border-destructive-200 dark:bg-destructive-900/30 dark:text-destructive-400 dark:border-destructive-800",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  showPulse?: boolean;
  size?: "sm" | "default" | "lg";
}

export function StatusBadge({
  status,
  className,
  showPulse = true,
  size = "default",
}: StatusBadgeProps) {
  // Format status for display if not found in config
  const formatStatusLabel = (s: string) => 
    s.split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

  const config = statusConfig[status.toLowerCase()] || {
    label: formatStatusLabel(status),
    className: "bg-muted text-muted-foreground border border-border",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-2xs",
    default: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors",
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {showPulse && config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {config.label}
    </span>
  );
}

// Priority badge with specific styling
interface PriorityBadgeProps {
  priority: "high" | "medium" | "low";
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return <StatusBadge status={priority} className={className} showPulse={false} />;
}
