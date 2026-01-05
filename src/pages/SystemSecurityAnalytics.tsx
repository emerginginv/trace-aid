import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { SharingActivityChart } from "@/components/analytics/SharingActivityChart";
import { LinkStatusDistributionChart } from "@/components/analytics/LinkStatusDistributionChart";
import { RevokedAccessTable } from "@/components/analytics/RevokedAccessTable";
import { UserActivitySummaryTable } from "@/components/analytics/UserActivitySummaryTable";
import { LoginActivityChart } from "@/components/analytics/LoginActivityChart";
import { SharingAuditTable } from "@/components/analytics/SharingAuditTable";
import type { TimeRangePreset } from "@/lib/analytics/types";
import { resolveTimeRange } from "@/lib/analytics/time-ranges";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Link, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface SimpleKpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  change?: number;
  isLoading?: boolean;
}

function SimpleKpiCard({ title, value, subtitle, icon, change, isLoading }: SimpleKpiCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            {icon}
          </div>
        </div>
        {change !== undefined && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {change > 0 ? (
              <>
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">+{change}%</span>
              </>
            ) : change < 0 ? (
              <>
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="text-destructive">{change}%</span>
              </>
            ) : (
              <>
                <Minus className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">0%</span>
              </>
            )}
            <span className="text-muted-foreground">vs prior period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface ResolvedTimeRangeSimple {
  startDate: Date;
  endDate: Date;
}

export default function SystemSecurityAnalytics() {
  const { organization } = useOrganization();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>("last_30_days");

  const timeRange = useMemo((): ResolvedTimeRangeSimple => {
    const resolved = resolveTimeRange({ type: "preset", preset: timeRangePreset });
    return { startDate: resolved.start, endDate: resolved.end };
  }, [timeRangePreset]);

  const previousTimeRange = useMemo((): ResolvedTimeRangeSimple => {
    const duration = timeRange.endDate.getTime() - timeRange.startDate.getTime();
    return {
      startDate: new Date(timeRange.startDate.getTime() - duration),
      endDate: new Date(timeRange.startDate.getTime() - 1),
    };
  }, [timeRange]);

  // Fetch KPI metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["security-metrics", organization?.id, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return null;

      const now = new Date();

      // Current period data
      const { data: currentData, error } = await supabase
        .from("attachment_access")
        .select("id, expires_at, revoked_at, access_count")
        .eq("organization_id", organization.id)
        .gte("created_at", timeRange.startDate.toISOString())
        .lte("created_at", timeRange.endDate.toISOString());

      if (error) throw error;

      // Previous period data
      const { data: previousData } = await supabase
        .from("attachment_access")
        .select("id, expires_at, revoked_at, access_count")
        .eq("organization_id", organization.id)
        .gte("created_at", previousTimeRange.startDate.toISOString())
        .lte("created_at", previousTimeRange.endDate.toISOString());

      // Calculate current metrics
      let active = 0;
      let expired = 0;
      let revoked = 0;
      let totalAccesses = 0;

      (currentData || []).forEach((item) => {
        totalAccesses += item.access_count;
        if (item.revoked_at) {
          revoked++;
        } else if (item.expires_at && new Date(item.expires_at) < now) {
          expired++;
        } else {
          active++;
        }
      });

      // Calculate previous metrics
      let previousTotal = 0;
      (previousData || []).forEach(() => {
        previousTotal++;
      });

      const currentTotal = currentData?.length || 0;
      const change = previousTotal > 0 
        ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
        : 0;

      return {
        linksCreated: currentTotal,
        activeLinks: active,
        expiredLinks: expired,
        revokedLinks: revoked,
        totalAccesses,
        change,
      };
    },
    enabled: !!organization?.id && isAdmin,
  });

  // Loading state
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-rose-500/10 p-2">
            <Shield className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System & Security Analytics</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">
                Monitor access, sharing, and user activity
              </p>
              <Badge variant="secondary" className="text-xs">Admin Only</Badge>
            </div>
          </div>
        </div>
        <TimeRangeSelector value={timeRangePreset} onChange={setTimeRangePreset} />
      </div>

      {/* KPI Cards - Sharing & Access */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SimpleKpiCard
          title="Links Created"
          value={metrics?.linksCreated ?? 0}
          icon={<Link className="h-5 w-5" />}
          change={metrics?.change}
          isLoading={metricsLoading}
        />
        <SimpleKpiCard
          title="Active Links"
          value={metrics?.activeLinks ?? 0}
          subtitle="Still valid"
          icon={<CheckCircle className="h-5 w-5" />}
          isLoading={metricsLoading}
        />
        <SimpleKpiCard
          title="Revoked Links"
          value={metrics?.revokedLinks ?? 0}
          subtitle="Manual revokes"
          icon={<XCircle className="h-5 w-5" />}
          isLoading={metricsLoading}
        />
        <SimpleKpiCard
          title="Expired Links"
          value={metrics?.expiredLinks ?? 0}
          subtitle="Auto-expired"
          icon={<Clock className="h-5 w-5" />}
          isLoading={metricsLoading}
        />
        <SimpleKpiCard
          title="Total Accesses"
          value={metrics?.totalAccesses ?? 0}
          subtitle="Link clicks"
          icon={<Eye className="h-5 w-5" />}
          isLoading={metricsLoading}
        />
        <SimpleKpiCard
          title="Access Rate"
          value={
            metrics && metrics.linksCreated > 0
              ? `${((metrics.totalAccesses / metrics.linksCreated) * 100).toFixed(0)}%`
              : "0%"
          }
          subtitle="Per link"
          icon={<TrendingUp className="h-5 w-5" />}
          isLoading={metricsLoading}
        />
      </div>

      {/* Sharing Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SharingActivityChart timeRange={timeRange} />
        <LinkStatusDistributionChart timeRange={timeRange} />
      </div>

      {/* Revoked Access & Daily Active Users */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevokedAccessTable timeRange={timeRange} />
        <LoginActivityChart timeRange={timeRange} />
      </div>

      {/* User Activity Summary */}
      <UserActivitySummaryTable timeRange={timeRange} />

      {/* Full Audit Log */}
      <SharingAuditTable timeRange={timeRange} />
    </div>
  );
}
