import { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { MetricKpiCard } from "@/components/analytics/MetricKpiCard";
import { CaseVolumeChart } from "@/components/analytics/CaseVolumeChart";
import { CaseStatusChart } from "@/components/analytics/CaseStatusChart";
import { CasesByDimensionChart } from "@/components/analytics/CasesByDimensionChart";
import { createPresetTimeRange, type TimeRangePreset } from "@/lib/analytics";
import { Briefcase } from "lucide-react";

const COMPARISON_MAP: Record<TimeRangePreset, TimeRangePreset> = {
  last_7_days: "last_7_days",
  last_30_days: "last_30_days",
  this_month: "last_month",
  last_month: "last_month",
  this_quarter: "last_quarter",
  last_quarter: "last_quarter",
  this_year: "last_year",
  last_year: "last_year",
  all_time: "all_time",
  today: "yesterday",
  yesterday: "yesterday",
  this_week: "last_week",
  last_week: "last_week",
  last_90_days: "last_90_days",
  last_365_days: "last_365_days",
};

export default function CaseAnalytics() {
  const { organization } = useOrganization();
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>("last_30_days");

  const timeRange = createPresetTimeRange(timeRangePreset);
  const comparisonPreset = COMPARISON_MAP[timeRangePreset];
  const organizationId = organization?.id || "";

  const breadcrumbItems = [
    { label: "Analytics", href: "/analytics" },
    { label: "Case Analytics" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <BreadcrumbNav items={breadcrumbItems} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Case Analytics</h1>
              <p className="text-muted-foreground">
                Track case performance, trends, and key metrics
              </p>
            </div>
          </div>
          <TimeRangeSelector value={timeRangePreset} onChange={setTimeRangePreset} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricKpiCard
          metricId="cases.active_count"
          organizationId={organizationId}
          timeRange={timeRange}
          comparisonPreset={comparisonPreset}
        />
        <MetricKpiCard
          metricId="cases.closed_count"
          organizationId={organizationId}
          timeRange={timeRange}
          comparisonPreset={comparisonPreset}
        />
        <MetricKpiCard
          metricId="cases.avg_days_to_close"
          organizationId={organizationId}
          timeRange={timeRange}
          comparisonPreset={comparisonPreset}
        />
        <MetricKpiCard
          metricId="cases.total_count"
          organizationId={organizationId}
          timeRange={timeRange}
          comparisonPreset={comparisonPreset}
        />
        <MetricKpiCard
          metricId="cases.close_rate"
          organizationId={organizationId}
          timeRange={timeRange}
          comparisonPreset={comparisonPreset}
        />
        <MetricKpiCard
          metricId="cases.created_this_period"
          organizationId={organizationId}
          timeRange={timeRange}
          comparisonPreset={comparisonPreset}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CaseVolumeChart organizationId={organizationId} timeRange={timeRange} />
        <CaseStatusChart organizationId={organizationId} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CasesByDimensionChart
          organizationId={organizationId}
          dimension="client"
          title="Cases by Client (Top 10)"
        />
        <CasesByDimensionChart
          organizationId={organizationId}
          dimension="investigator"
          title="Cases by Investigator"
        />
      </div>
    </div>
  );
}
