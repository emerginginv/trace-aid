import { useState, useMemo } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { UpdateFrequencyChart } from "@/components/analytics/UpdateFrequencyChart";
import { EventActivityChart } from "@/components/analytics/EventActivityChart";
import { SurveillanceDaysChart } from "@/components/analytics/SurveillanceDaysChart";
import { ActivityTimelineChart } from "@/components/analytics/ActivityTimelineChart";
import { InvestigatorHeatmapChart } from "@/components/analytics/InvestigatorHeatmapChart";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveTimeRange, type ResolvedTimeRange } from "@/lib/analytics/time-ranges";
import type { TimeRangePreset } from "@/lib/analytics/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calendar, ClipboardList, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

export default function ActivityAnalytics() {
  const { organization, loading: orgLoading } = useOrganization();
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>("last_30_days");

  const timeRange = useMemo(() => {
    return resolveTimeRange({ type: "preset", preset: timeRangePreset });
  }, [timeRangePreset]);

  const previousTimeRange = useMemo((): ResolvedTimeRange => {
    const durationMs = timeRange.end.getTime() - timeRange.start.getTime();
    return {
      start: new Date(timeRange.start.getTime() - durationMs),
      end: new Date(timeRange.end.getTime() - durationMs),
    };
  }, [timeRange]);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["activity-metrics", organization?.id, timeRange],
    queryFn: async () => {
      if (!organization?.id) return null;

      // Fetch current period data
      const [updatesRes, eventsRes, tasksRes] = await Promise.all([
        supabase
          .from("case_updates")
          .select("id", { count: "exact" })
          .eq("organization_id", organization.id)
          .gte("created_at", timeRange.start.toISOString())
          .lte("created_at", timeRange.end.toISOString()),
        supabase
          .from("case_activities")
          .select("id", { count: "exact" })
          .eq("organization_id", organization.id)
          .eq("activity_type", "event")
          .gte("created_at", timeRange.start.toISOString())
          .lte("created_at", timeRange.end.toISOString()),
        supabase
          .from("case_activities")
          .select("id, completed", { count: "exact" })
          .eq("organization_id", organization.id)
          .eq("activity_type", "task")
          .gte("created_at", timeRange.start.toISOString())
          .lte("created_at", timeRange.end.toISOString()),
      ]);

      if (updatesRes.error) throw updatesRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      // Fetch previous period data
      const [prevUpdatesRes, prevEventsRes, prevTasksRes] = await Promise.all([
        supabase
          .from("case_updates")
          .select("id", { count: "exact" })
          .eq("organization_id", organization.id)
          .gte("created_at", previousTimeRange.start.toISOString())
          .lte("created_at", previousTimeRange.end.toISOString()),
        supabase
          .from("case_activities")
          .select("id", { count: "exact" })
          .eq("organization_id", organization.id)
          .eq("activity_type", "event")
          .gte("created_at", previousTimeRange.start.toISOString())
          .lte("created_at", previousTimeRange.end.toISOString()),
        supabase
          .from("case_activities")
          .select("id", { count: "exact" })
          .eq("organization_id", organization.id)
          .eq("activity_type", "task")
          .gte("created_at", previousTimeRange.start.toISOString())
          .lte("created_at", previousTimeRange.end.toISOString()),
      ]);

      if (prevUpdatesRes.error) throw prevUpdatesRes.error;
      if (prevEventsRes.error) throw prevEventsRes.error;
      if (prevTasksRes.error) throw prevTasksRes.error;

      const currentUpdates = updatesRes.count || 0;
      const currentEvents = eventsRes.count || 0;
      const currentTasks = tasksRes.count || 0;
      const totalActivities = currentUpdates + currentEvents + currentTasks;

      const prevUpdates = prevUpdatesRes.count || 0;
      const prevEvents = prevEventsRes.count || 0;
      const prevTasks = prevTasksRes.count || 0;
      const prevTotalActivities = prevUpdates + prevEvents + prevTasks;

      return {
        updates: currentUpdates,
        events: currentEvents,
        tasks: currentTasks,
        totalActivities,
        prevUpdates,
        prevEvents,
        prevTasks,
        prevTotalActivities,
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
          { label: "Activity & Operations" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity & Operations Analytics</h1>
          <p className="text-muted-foreground">
            Track updates, events, and operational activity patterns
          </p>
        </div>
        <TimeRangeSelector value={timeRangePreset} onChange={setTimeRangePreset} />
      </div>

      {/* KPI Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <SimpleKpiCard
          title="Total Updates"
          value={String(metrics?.updates || 0)}
          icon={<FileText className="h-4 w-4" />}
          change={calculateChange(metrics?.updates || 0, metrics?.prevUpdates || 0)}
          loading={metricsLoading}
        />
        <SimpleKpiCard
          title="Total Events"
          value={String(metrics?.events || 0)}
          icon={<Calendar className="h-4 w-4" />}
          change={calculateChange(metrics?.events || 0, metrics?.prevEvents || 0)}
          loading={metricsLoading}
        />
        <SimpleKpiCard
          title="Total Tasks"
          value={String(metrics?.tasks || 0)}
          icon={<ClipboardList className="h-4 w-4" />}
          change={calculateChange(metrics?.tasks || 0, metrics?.prevTasks || 0)}
          loading={metricsLoading}
        />
        <SimpleKpiCard
          title="All Activities"
          value={String(metrics?.totalActivities || 0)}
          icon={<Activity className="h-4 w-4" />}
          change={calculateChange(metrics?.totalActivities || 0, metrics?.prevTotalActivities || 0)}
          loading={metricsLoading}
        />
      </div>

      {/* Activity Timeline - Full Width */}
      <ActivityTimelineChart
        organizationId={organization.id}
        timeRange={timeRange}
      />

      {/* Charts Row 1: Updates and Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UpdateFrequencyChart
          organizationId={organization.id}
          timeRange={timeRange}
        />
        <EventActivityChart
          organizationId={organization.id}
          timeRange={timeRange}
        />
      </div>

      {/* Charts Row 2: Surveillance and Heatmap */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SurveillanceDaysChart
          organizationId={organization.id}
          timeRange={timeRange}
        />
        <InvestigatorHeatmapChart
          organizationId={organization.id}
          timeRange={timeRange}
        />
      </div>
    </div>
  );
}
