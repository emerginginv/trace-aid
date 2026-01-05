import { useState, useMemo } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { TimeByDimensionChart } from "@/components/analytics/TimeByDimensionChart";
import { ExpensesByCategoryChart } from "@/components/analytics/ExpensesByCategoryChart";
import { TimeVsBudgetChart } from "@/components/analytics/TimeVsBudgetChart";
import { ExpenseTrendChart } from "@/components/analytics/ExpenseTrendChart";
import { TimeExpenseTable } from "@/components/analytics/TimeExpenseTable";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveTimeRange, type ResolvedTimeRange } from "@/lib/analytics/time-ranges";
import type { TimeRangePreset } from "@/lib/analytics/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, DollarSign, Timer, Receipt, FileText, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatBudgetCurrency, formatBudgetHours } from "@/lib/budgetUtils";
import { cn } from "@/lib/utils";

interface SimpleKpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: number;
  subtitle?: string;
  loading?: boolean;
}

function SimpleKpiCard({ title, value, icon, change, subtitle, loading }: SimpleKpiCardProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <CardContent className="p-0 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return "";
    if (change > 0) return "text-emerald-600 dark:text-emerald-400";
    if (change < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <Card className="p-6">
      <CardContent className="p-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
            {getTrendIcon()}
            <span>{change >= 0 ? "+" : ""}{change.toFixed(1)}%</span>
            <span className="text-muted-foreground">vs prior</span>
          </div>
        )}
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function TimeExpenseAnalytics() {
  const { organization, loading: orgLoading } = useOrganization();
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>("last_30_days");

  const timeRange = useMemo(() => {
    const resolved = resolveTimeRange({ type: "preset", preset: timeRangePreset });
    return resolved;
  }, [timeRangePreset]);

  const previousTimeRange = useMemo((): ResolvedTimeRange => {
    const durationMs = timeRange.end.getTime() - timeRange.start.getTime();
    return {
      start: new Date(timeRange.start.getTime() - durationMs),
      end: new Date(timeRange.end.getTime() - durationMs),
    };
  }, [timeRange]);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["time-expense-metrics", organization?.id, timeRange],
    queryFn: async () => {
      if (!organization?.id) return null;

      // Current period query
      const { data: currentData, error: currentError } = await supabase
        .from("case_finances")
        .select("finance_type, hours, hourly_rate, amount, invoiced")
        .eq("organization_id", organization.id)
        .in("finance_type", ["time", "expense"])
        .gte("date", timeRange.start.toISOString().split("T")[0])
        .lte("date", timeRange.end.toISOString().split("T")[0]);

      if (currentError) throw currentError;

      // Previous period query
      const { data: previousData, error: previousError } = await supabase
        .from("case_finances")
        .select("finance_type, hours, hourly_rate, amount, invoiced")
        .eq("organization_id", organization.id)
        .in("finance_type", ["time", "expense"])
        .gte("date", previousTimeRange.start.toISOString().split("T")[0])
        .lte("date", previousTimeRange.end.toISOString().split("T")[0]);

      if (previousError) throw previousError;

      // Calculate current period metrics
      const timeEntries = (currentData || []).filter(e => e.finance_type === "time");
      const expenseEntries = (currentData || []).filter(e => e.finance_type === "expense");

      const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
      const totalTimeValue = timeEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
      const avgHourlyRate = totalHours > 0 ? totalTimeValue / totalHours : 0;
      const totalExpenses = expenseEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
      const expenseCount = expenseEntries.length;
      const timeEntryCount = timeEntries.length;
      const uninvoicedExpenses = expenseEntries
        .filter(e => !e.invoiced)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // Calculate previous period metrics
      const prevTimeEntries = (previousData || []).filter(e => e.finance_type === "time");
      const prevExpenseEntries = (previousData || []).filter(e => e.finance_type === "expense");

      const prevTotalHours = prevTimeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
      const prevTotalTimeValue = prevTimeEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
      const prevAvgHourlyRate = prevTotalHours > 0 ? prevTotalTimeValue / prevTotalHours : 0;
      const prevTotalExpenses = prevExpenseEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
      const prevExpenseCount = prevExpenseEntries.length;
      const prevTimeEntryCount = prevTimeEntries.length;

      return {
        totalHours,
        totalTimeValue,
        avgHourlyRate,
        totalExpenses,
        expenseCount,
        timeEntryCount,
        uninvoicedExpenses,
        prevTotalHours,
        prevTotalTimeValue,
        prevAvgHourlyRate,
        prevTotalExpenses,
        prevExpenseCount,
        prevTimeEntryCount,
      };
    },
    enabled: !!organization?.id,
  });

  if (orgLoading) {
    return <DashboardSkeleton />;
  }

  if (!organization) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    );
  }

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-6 p-6">
      <BreadcrumbNav
        items={[
          { label: "Analytics", href: "/analytics" },
          { label: "Time & Expenses" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time & Expense Analytics</h1>
          <p className="text-muted-foreground">
            Track hours logged and expenses recorded across cases
          </p>
        </div>
        <TimeRangeSelector value={timeRangePreset} onChange={setTimeRangePreset} />
      </div>

      {/* Time Metrics Row */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Metrics
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <SimpleKpiCard
            title="Total Hours Logged"
            value={formatBudgetHours(metrics?.totalHours || 0)}
            icon={<Clock className="h-4 w-4" />}
            change={calculateChange(metrics?.totalHours || 0, metrics?.prevTotalHours || 0)}
            loading={metricsLoading}
          />
          <SimpleKpiCard
            title="Time Entry Value"
            value={formatBudgetCurrency(metrics?.totalTimeValue || 0)}
            icon={<DollarSign className="h-4 w-4" />}
            change={calculateChange(metrics?.totalTimeValue || 0, metrics?.prevTotalTimeValue || 0)}
            loading={metricsLoading}
          />
          <SimpleKpiCard
            title="Avg Hourly Rate"
            value={`${formatBudgetCurrency(metrics?.avgHourlyRate || 0)}/hr`}
            icon={<Timer className="h-4 w-4" />}
            change={calculateChange(metrics?.avgHourlyRate || 0, metrics?.prevAvgHourlyRate || 0)}
            loading={metricsLoading}
          />
        </div>
      </div>

      {/* Expense Metrics Row */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Expense Metrics
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <SimpleKpiCard
            title="Total Expenses"
            value={formatBudgetCurrency(metrics?.totalExpenses || 0)}
            icon={<DollarSign className="h-4 w-4" />}
            change={calculateChange(metrics?.totalExpenses || 0, metrics?.prevTotalExpenses || 0)}
            loading={metricsLoading}
          />
          <SimpleKpiCard
            title="Expense Entries"
            value={String(metrics?.expenseCount || 0)}
            icon={<FileText className="h-4 w-4" />}
            change={calculateChange(metrics?.expenseCount || 0, metrics?.prevExpenseCount || 0)}
            loading={metricsLoading}
          />
          <SimpleKpiCard
            title="Uninvoiced Expenses"
            value={formatBudgetCurrency(metrics?.uninvoicedExpenses || 0)}
            icon={<AlertCircle className="h-4 w-4" />}
            subtitle="Needs billing"
            loading={metricsLoading}
          />
        </div>
      </div>

      {/* Charts Row 1: Time Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TimeByDimensionChart
          organizationId={organization.id}
          dimension="investigator"
          title="Time Logged by Investigator"
          timeRange={timeRange}
        />
        <TimeByDimensionChart
          organizationId={organization.id}
          dimension="case"
          title="Time Logged by Case (Top 10)"
          timeRange={timeRange}
        />
      </div>

      {/* Charts Row 2: Expense Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ExpensesByCategoryChart
          organizationId={organization.id}
          timeRange={timeRange}
        />
        <ExpenseTrendChart
          organizationId={organization.id}
          timeRange={timeRange}
        />
      </div>

      {/* Time vs Budget Efficiency */}
      <TimeVsBudgetChart
        organizationId={organization.id}
        timeRange={timeRange}
      />

      {/* Detailed Table */}
      <TimeExpenseTable
        organizationId={organization.id}
        timeRange={timeRange}
      />
    </div>
  );
}
