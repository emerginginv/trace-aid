import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPercentage, formatRelativeTime } from "@/lib/formatters";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Currency Display Component
interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "xl";
  showSign?: boolean;
}

export function CurrencyDisplay({
  amount,
  currency = "USD",
  className,
  size = "default",
  showSign = false,
}: CurrencyDisplayProps) {
  const isNegative = amount < 0;
  const displayAmount = Math.abs(amount);

  const sizeClasses = {
    sm: "text-sm",
    default: "text-base",
    lg: "text-lg",
    xl: "text-2xl font-semibold",
  };

  return (
    <span
      className={cn(
        "currency-display number-display",
        sizeClasses[size],
        isNegative && "text-destructive",
        className
      )}
    >
      {showSign && !isNegative && "+"}
      {isNegative && "-"}
      {formatCurrency(displayAmount, currency)}
    </span>
  );
}

// Percentage Display with trend indicator
interface PercentageDisplayProps {
  value: number;
  showTrend?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg";
  showSign?: boolean;
}

export function PercentageDisplay({
  value,
  showTrend = true,
  className,
  size = "default",
  showSign = true,
}: PercentageDisplayProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const sizeClasses = {
    sm: "text-xs",
    default: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    default: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium number-display",
        sizeClasses[size],
        isPositive && "text-success",
        isNegative && "text-destructive",
        isNeutral && "text-muted-foreground",
        className
      )}
    >
      {showTrend && (
        <>
          {isPositive && <TrendingUp className={iconSizes[size]} />}
          {isNegative && <TrendingDown className={iconSizes[size]} />}
          {isNeutral && <Minus className={iconSizes[size]} />}
        </>
      )}
      <span>
        {showSign && isPositive && "+"}
        {formatPercentage(value)}
      </span>
    </span>
  );
}

// Stat Card Component for dashboards
interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  className,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("p-6 rounded-lg bg-card border card-premium-shadow", className)}>
        <div className="skeleton-animated h-4 w-24 rounded mb-2" />
        <div className="skeleton-animated h-8 w-32 rounded mb-2" />
        <div className="skeleton-animated h-4 w-20 rounded" />
      </div>
    );
  }

  return (
    <div className={cn("p-6 rounded-lg bg-card border card-premium-shadow", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold mb-1 number-display">{value}</div>
      {change !== undefined && (
        <div className="flex items-center gap-2">
          <PercentageDisplay value={change} size="sm" />
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Timestamp Display with hover tooltip
interface TimestampDisplayProps {
  date: Date | string;
  format?: "relative" | "absolute" | "both";
  className?: string;
}

export function TimestampDisplay({
  date,
  format = "relative",
  className,
}: TimestampDisplayProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  const relative = formatRelativeTime(d);
  const absolute = d.toLocaleString();

  if (format === "relative") {
    return (
      <time
        dateTime={d.toISOString()}
        title={absolute}
        className={cn("text-sm text-muted-foreground cursor-help", className)}
      >
        {relative}
      </time>
    );
  }

  if (format === "absolute") {
    return (
      <time
        dateTime={d.toISOString()}
        className={cn("text-sm text-muted-foreground", className)}
      >
        {absolute}
      </time>
    );
  }

  // Both
  return (
    <div className={cn("text-sm", className)}>
      <time dateTime={d.toISOString()} className="text-foreground">
        {absolute}
      </time>
      <span className="text-muted-foreground ml-1">({relative})</span>
    </div>
  );
}

// Data Table Summary Row
interface TableSummaryProps {
  columns: {
    label?: string;
    value?: string | number;
    format?: "currency" | "number" | "percentage" | "text";
    className?: string;
    colSpan?: number;
  }[];
  className?: string;
}

export function TableSummary({ columns, className }: TableSummaryProps) {
  const formatValue = (
    value: string | number | undefined,
    format?: string
  ): string => {
    if (value === undefined) return "";
    if (typeof value === "string") return value;

    switch (format) {
      case "currency":
        return formatCurrency(value);
      case "number":
        return formatNumber(value);
      case "percentage":
        return formatPercentage(value);
      default:
        return String(value);
    }
  };

  return (
    <tr className={cn("bg-muted/50 font-medium border-t-2", className)}>
      {columns.map((col, index) => (
        <td
          key={index}
          colSpan={col.colSpan}
          className={cn("px-4 py-3", col.className)}
        >
          {col.label && (
            <span className="text-muted-foreground mr-2">{col.label}</span>
          )}
          {col.value !== undefined && (
            <span className="number-display">
              {formatValue(col.value, col.format)}
            </span>
          )}
        </td>
      ))}
    </tr>
  );
}

// Empty State for data tables
interface DataEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function DataEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: DataEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
