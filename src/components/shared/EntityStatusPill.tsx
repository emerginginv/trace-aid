import { CheckCircle, Circle, PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccountStatus = 'active' | 'inactive' | 'on_hold';
export type ContactStatus = 'active' | 'inactive';

interface EntityStatusPillProps {
  status: AccountStatus | ContactStatus;
  entityType?: 'account' | 'contact';
  className?: string;
}

const statusConfig: Record<AccountStatus | ContactStatus, {
  label: string;
  bgColor: string;
  textColor: string;
  icon: React.ElementType;
}> = {
  active: {
    label: 'Active',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    icon: CheckCircle,
  },
  inactive: {
    label: 'Inactive',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    icon: Circle,
  },
  on_hold: {
    label: 'On Hold',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    icon: PauseCircle,
  },
};

export function EntityStatusPill({ status, className }: EntityStatusPillProps) {
  const config = statusConfig[status] || statusConfig.active;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export function deriveAccountStatus(status?: string | null): AccountStatus {
  if (status === 'inactive') return 'inactive';
  if (status === 'on_hold') return 'on_hold';
  return 'active';
}

export function deriveContactStatus(status?: string | null): ContactStatus {
  if (status === 'inactive') return 'inactive';
  return 'active';
}
