import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

export type BudgetStrategy = 'disabled' | 'hours_only' | 'money_only' | 'both' | null;

interface BudgetStrategyBadgeProps {
  strategy: BudgetStrategy;
  className?: string;
  showLabel?: boolean;
}

const strategyConfig: Record<NonNullable<BudgetStrategy>, {
  label: string;
  icon: React.ReactNode;
  variant: "default" | "secondary" | "destructive" | "outline";
}> = {
  disabled: {
    label: "Budgets Disabled",
    icon: <Ban className="h-3 w-3" />,
    variant: "destructive",
  },
  hours_only: {
    label: "Hours Only",
    icon: <Clock className="h-3 w-3" />,
    variant: "outline",
  },
  money_only: {
    label: "Dollars Only",
    icon: <DollarSign className="h-3 w-3" />,
    variant: "outline",
  },
  both: {
    label: "Hours & Dollars",
    icon: (
      <span className="flex items-center">
        <Clock className="h-3 w-3" />
        <DollarSign className="h-3 w-3 -ml-0.5" />
      </span>
    ),
    variant: "default",
  },
};

export function BudgetStrategyBadge({ 
  strategy, 
  className,
  showLabel = true 
}: BudgetStrategyBadgeProps) {
  // Don't show badge for "both" strategy (default behavior) or null
  if (!strategy || strategy === 'both') {
    return null;
  }
  
  const config = strategyConfig[strategy];
  
  return (
    <Badge 
      variant={config.variant} 
      className={cn("text-xs flex items-center gap-1", className)}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}

/**
 * Display component for showing budget strategy message when disabled
 */
interface BudgetDisabledMessageProps {
  className?: string;
}

export function BudgetDisabledMessage({ className }: BudgetDisabledMessageProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-2 py-6 text-center",
      className
    )}>
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
        <Ban className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Budgets Disabled</p>
        <p className="text-xs text-muted-foreground">
          This case type does not allow budget tracking.
        </p>
      </div>
    </div>
  );
}
