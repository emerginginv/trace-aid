import { useState, useMemo } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  LayoutTemplate, 
  Download,
  Briefcase,
  User,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { resolveTimeRange, type ResolvedTimeRange } from "@/lib/analytics/time-ranges";
import type { TimeRangePreset } from "@/lib/analytics/types";
import { ReportGenerationChart } from "@/components/analytics/ReportGenerationChart";
import { ReportTypeUsageChart } from "@/components/analytics/ReportTypeUsageChart";
import { ReportsByDimensionChart } from "@/components/analytics/ReportsByDimensionChart";
import { ReportDetailsTable } from "@/components/analytics/ReportDetailsTable";

interface SimpleKpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  subtitle?: string;
  loading?: boolean;
}

function SimpleKpiCard({ title, value, icon, change, subtitle, loading }: SimpleKpiCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16 mt-2" />
          <Skeleton className="h-4 w-20 mt-1" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="p-2 bg-primary/10 rounded-full text-primary">
            {icon}
          </div>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {change !== undefined && (
            <span className={`flex items-center text-xs font-medium ${
              change >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {change >= 0 ? "+" : ""}{change}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportAnalytics() {
  const { organization } = useOrganization();
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>("last_30_days");

  const timeRange = useMemo(() => {
    const resolved = resolveTimeRange({ type: "preset", preset: timeRangePreset });
    return { startDate: resolved.start, endDate: resolved.end };
  }, [timeRangePreset]);

  const previousTimeRange = useMemo(() => {
    const duration = timeRange.endDate.getTime() - timeRange.startDate.getTime();
    return {
      startDate: new Date(timeRange.startDate.getTime() - duration),
      endDate: new Date(timeRange.startDate.getTime() - 1),
    };
  }, [timeRange]);

  // Fetch current period metrics
  const { data: currentMetrics, isLoading: loadingCurrent } = useQuery({
    queryKey: ["report-metrics-current", organization?.id, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return null;

      // Fetch reports
      const { data: reports, error } = await supabase
        .from("report_instances")
        .select(`
          id,
          template_snapshot,
          case_id,
          user_id,
          exported_at,
          export_format
        `)
        .eq("organization_id", organization.id)
        .gte("generated_at", timeRange.startDate.toISOString())
        .lte("generated_at", timeRange.endDate.toISOString());

      if (error) throw error;

      // Get unique user IDs and fetch profiles separately
      const userIds = [...new Set(reports?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Calculate metrics
      const totalReports = reports?.length || 0;
      const uniqueTemplates = new Set(
        reports?.map(r => {
          const snapshot = r.template_snapshot as { name?: string } | null;
          return snapshot?.name;
        }).filter(Boolean)
      ).size;
      const uniqueCases = new Set(reports?.map(r => r.case_id)).size;
      const exportedCount = reports?.filter(r => r.exported_at).length || 0;

      // Find most active generator
      const userCounts = new Map<string, { name: string; count: number }>();
      reports?.forEach(r => {
        const profile = profileMap.get(r.user_id);
        const name = profile?.full_name || profile?.email || "Unknown";
        const existing = userCounts.get(r.user_id);
        if (existing) {
          existing.count++;
        } else {
          userCounts.set(r.user_id, { name, count: 1 });
        }
      });

      let topGenerator = { name: "N/A", count: 0 };
      userCounts.forEach(value => {
        if (value.count > topGenerator.count) {
          topGenerator = value;
        }
      });

      // Export format breakdown
      const formatCounts: Record<string, number> = {};
      reports?.filter(r => r.exported_at).forEach(r => {
        const format = r.export_format?.toUpperCase() || "PDF";
        formatCounts[format] = (formatCounts[format] || 0) + 1;
      });
      const formatBreakdown = Object.entries(formatCounts)
        .map(([format, count]) => `${format}: ${count}`)
        .join(", ");

      return {
        totalReports,
        uniqueTemplates,
        uniqueCases,
        exportedCount,
        topGenerator,
        formatBreakdown: formatBreakdown || "None",
      };
    },
    enabled: !!organization?.id,
  });

  // Fetch previous period metrics for comparison
  const { data: previousMetrics, isLoading: loadingPrevious } = useQuery({
    queryKey: ["report-metrics-previous", organization?.id, previousTimeRange.startDate, previousTimeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return null;

      const { count, error } = await supabase
        .from("report_instances")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .gte("generated_at", previousTimeRange.startDate.toISOString())
        .lte("generated_at", previousTimeRange.endDate.toISOString());

      if (error) throw error;

      return { totalReports: count || 0 };
    },
    enabled: !!organization?.id,
  });

  const isLoading = loadingCurrent || loadingPrevious;

  // Calculate change percentages
  const reportsChange = previousMetrics?.totalReports
    ? Math.round(((currentMetrics?.totalReports || 0) - previousMetrics.totalReports) / previousMetrics.totalReports * 100)
    : undefined;

  if (!organization) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center text-muted-foreground">Loading organization...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Analytics", href: "/analytics" },
          { label: "Reports", href: "/analytics/reports" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Report & Output Analytics</h1>
          <p className="text-muted-foreground">
            Track report generation and template usage across your organization
          </p>
        </div>
        <TimeRangeSelector value={timeRangePreset} onChange={setTimeRangePreset} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SimpleKpiCard
          title="Reports Generated"
          value={currentMetrics?.totalReports || 0}
          icon={<FileText className="h-4 w-4" />}
          change={reportsChange}
          subtitle="vs prior period"
          loading={isLoading}
        />
        <SimpleKpiCard
          title="Templates Used"
          value={currentMetrics?.uniqueTemplates || 0}
          icon={<LayoutTemplate className="h-4 w-4" />}
          subtitle="Unique templates"
          loading={isLoading}
        />
        <SimpleKpiCard
          title="Reports Exported"
          value={currentMetrics?.exportedCount || 0}
          icon={<Download className="h-4 w-4" />}
          subtitle={currentMetrics?.formatBreakdown || "None"}
          loading={isLoading}
        />
        <SimpleKpiCard
          title="Cases with Reports"
          value={currentMetrics?.uniqueCases || 0}
          icon={<Briefcase className="h-4 w-4" />}
          subtitle="Unique cases"
          loading={isLoading}
        />
        <SimpleKpiCard
          title="Top Generator"
          value={currentMetrics?.topGenerator?.name || "N/A"}
          icon={<User className="h-4 w-4" />}
          subtitle={currentMetrics?.topGenerator?.count ? `${currentMetrics.topGenerator.count} reports` : undefined}
          loading={isLoading}
        />
        <SimpleKpiCard
          title="Export Rate"
          value={currentMetrics?.totalReports 
            ? `${Math.round((currentMetrics.exportedCount / currentMetrics.totalReports) * 100)}%` 
            : "0%"}
          icon={<Download className="h-4 w-4" />}
          subtitle="Of generated reports"
          loading={isLoading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportGenerationChart timeRange={timeRange} />
        <ReportTypeUsageChart timeRange={timeRange} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportsByDimensionChart timeRange={timeRange} dimension="client" />
        <ReportsByDimensionChart timeRange={timeRange} dimension="investigator" />
      </div>

      {/* Details Table */}
      <ReportDetailsTable timeRange={timeRange} />
    </div>
  );
}
