import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import type { ResolvedTimeRange } from "@/lib/analytics/time-ranges";

interface EventActivityChartProps {
  organizationId: string;
  timeRange: ResolvedTimeRange;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "hsl(var(--chart-1))",
  completed: "hsl(var(--chart-2))",
  cancelled: "hsl(var(--chart-4))",
  in_progress: "hsl(var(--chart-3))",
};

const EVENT_SUBTYPE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function EventActivityChart({ organizationId, timeRange }: EventActivityChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["event-activity-by-type", organizationId, timeRange],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from("case_activities")
        .select("id, event_subtype, status, created_at")
        .eq("organization_id", organizationId)
        .eq("activity_type", "event")
        .gte("created_at", timeRange.start.toISOString())
        .lte("created_at", timeRange.end.toISOString());

      if (error) throw error;

      // Group by event subtype
      const subtypeCounts: Record<string, { subtype: string; count: number; byStatus: Record<string, number> }> = {};
      
      for (const event of events || []) {
        const subtype = event.event_subtype || "General";
        const status = event.status || "scheduled";
        
        if (!subtypeCounts[subtype]) {
          subtypeCounts[subtype] = {
            subtype,
            count: 0,
            byStatus: {},
          };
        }
        subtypeCounts[subtype].count++;
        subtypeCounts[subtype].byStatus[status] = (subtypeCounts[subtype].byStatus[status] || 0) + 1;
      }

      // Convert to array for chart
      const chartData = Object.values(subtypeCounts)
        .map(data => ({
          name: data.subtype,
          total: data.count,
          scheduled: data.byStatus["scheduled"] || 0,
          completed: data.byStatus["completed"] || 0,
          cancelled: data.byStatus["cancelled"] || 0,
          in_progress: data.byStatus["in_progress"] || 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      // Also get status distribution
      const statusCounts: Record<string, number> = {};
      for (const event of events || []) {
        const status = event.status || "scheduled";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }

      return {
        bySubtype: chartData,
        byStatus: Object.entries(statusCounts).map(([status, count]) => ({
          name: status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
          value: count,
          status,
        })),
        total: events?.length || 0,
      };
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Activity by Type</CardTitle>
          <CardDescription>Events grouped by subtype and status</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.bySubtype || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Activity by Type</CardTitle>
        <CardDescription>
          {data?.total || 0} events total &bull; Grouped by event type
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No events in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs fill-muted-foreground" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={75}
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              />
              <Legend />
              <Bar dataKey="scheduled" stackId="a" fill={STATUS_COLORS.scheduled} name="Scheduled" />
              <Bar dataKey="completed" stackId="a" fill={STATUS_COLORS.completed} name="Completed" />
              <Bar dataKey="in_progress" stackId="a" fill={STATUS_COLORS.in_progress} name="In Progress" />
              <Bar dataKey="cancelled" stackId="a" fill={STATUS_COLORS.cancelled} name="Cancelled" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
