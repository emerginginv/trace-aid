import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  getMetricValue,
  compareMetricPeriods,
  getMetricDefinition,
  createPresetTimeRange,
  analytics,
  type TimeRange,
  type TimeRangePreset,
} from "@/lib/analytics";

interface MetricKpiCardProps {
  metricId: string;
  organizationId: string;
  timeRange: TimeRange;
  comparisonPreset?: TimeRangePreset;
  showComparison?: boolean;
  className?: string;
}

export function MetricKpiCard({
  metricId,
  organizationId,
  timeRange,
  comparisonPreset,
  showComparison = true,
  className,
}: MetricKpiCardProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState<number | null>(null);
  const [comparison, setComparison] = useState<{
    change: number;
    changePercent: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const metric = getMetricDefinition(metricId);

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      
      setIsLoading(true);
      try {
        const currentValue = await getMetricValue(metricId, organizationId, undefined, timeRange);
        setValue(currentValue);

        if (showComparison && comparisonPreset) {
          const previousRange = createPresetTimeRange(comparisonPreset);
          const comparisonData = await compareMetricPeriods(
            metricId,
            organizationId,
            timeRange,
            previousRange
          );
          setComparison({
            change: comparisonData.change,
            changePercent: comparisonData.changePercent,
          });
        }
      } catch (error) {
        console.error(`Failed to fetch metric ${metricId}:`, error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [metricId, organizationId, timeRange, comparisonPreset, showComparison]);

  const handleClick = () => {
    const drillDownUrl = analytics.getDrillDownUrl(metricId);
    if (drillDownUrl) {
      navigate(drillDownUrl);
    }
  };

  const formatValue = (val: number): string => {
    if (!metric) return val.toString();

    switch (metric.unit) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case "percentage":
        return `${val.toFixed(1)}%`;
      case "days":
        return `${val.toFixed(1)} days`;
      case "hours":
        return `${val.toFixed(1)} hrs`;
      case "count":
      default:
        return val.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    if (!comparison) return null;
    if (comparison.change > 0) return <TrendingUp className="h-4 w-4" />;
    if (comparison.change < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!comparison) return "";
    // For most metrics, up is good. For duration metrics, down is good.
    const isNegativeGood = metric?.unit === "days";
    if (comparison.change > 0) {
      return isNegativeGood ? "text-destructive" : "text-emerald-600 dark:text-emerald-400";
    }
    if (comparison.change < 0) {
      return isNegativeGood ? "text-emerald-600 dark:text-emerald-400" : "text-destructive";
    }
    return "text-muted-foreground";
  };

  const drillDownUrl = analytics.getDrillDownUrl(metricId);

  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <CardContent className="p-0 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "p-6 transition-all",
        drillDownUrl && "cursor-pointer hover:shadow-md hover:border-primary/50",
        className
      )}
      onClick={drillDownUrl ? handleClick : undefined}
    >
      <CardContent className="p-0 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {metric?.name || metricId}
        </p>
        <p className="text-3xl font-bold tracking-tight">
          {value !== null ? formatValue(value) : "—"}
        </p>
        {showComparison && comparison && (
          <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
            {getTrendIcon()}
            <span>
              {comparison.change >= 0 ? "+" : ""}
              {formatValue(Math.abs(comparison.change))}
            </span>
            <span className="text-muted-foreground">vs prior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
