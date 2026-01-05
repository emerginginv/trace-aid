import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import type { ResolvedTimeRange } from "@/lib/analytics/time-ranges";

interface ActivityTimelineChartProps {
  organizationId: string;
  timeRange: ResolvedTimeRange;
}

export function ActivityTimelineChart({ organizationId, timeRange }: ActivityTimelineChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["activity-timeline", organizationId, timeRange],
    queryFn: async () => {
      // Fetch updates
      const { data: updates, error: updatesError } = await supabase
        .from("case_updates")
        .select("id, created_at, update_type")
        .eq("organization_id", organizationId)
        .gte("created_at", timeRange.start.toISOString())
        .lte("created_at", timeRange.end.toISOString());

      if (updatesError) throw updatesError;

      // Fetch events
      const { data: events, error: eventsError } = await supabase
        .from("case_activities")
        .select("id, created_at, activity_type, status")
        .eq("organization_id", organizationId)
        .eq("activity_type", "event")
        .gte("created_at", timeRange.start.toISOString())
        .lte("created_at", timeRange.end.toISOString());

      if (eventsError) throw eventsError;

      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from("case_activities")
        .select("id, created_at, activity_type, status, completed_at")
        .eq("organization_id", organizationId)
        .eq("activity_type", "task")
        .gte("created_at", timeRange.start.toISOString())
        .lte("created_at", timeRange.end.toISOString());

      if (tasksError) throw tasksError;

      // Determine granularity based on range
      const daysDiff = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const useWeekly = daysDiff > 30;

      let chartData: Array<{
        date: string;
        label: string;
        updates: number;
        events: number;
        tasks: number;
      }>;

      if (useWeekly) {
        // Weekly aggregation
        const weeks = eachWeekOfInterval({ start: timeRange.start, end: timeRange.end });
        chartData = weeks.map(weekStart => {
          const weekEnd = endOfWeek(weekStart);
          const interval = { start: weekStart, end: weekEnd };

          return {
            date: weekStart.toISOString(),
            label: format(weekStart, "MMM d"),
            updates: (updates || []).filter(u => {
              const d = parseISO(u.created_at);
              return isWithinInterval(d, interval);
            }).length,
            events: (events || []).filter(e => {
              const d = parseISO(e.created_at);
              return isWithinInterval(d, interval);
            }).length,
            tasks: (tasks || []).filter(t => {
              const d = parseISO(t.created_at);
              return isWithinInterval(d, interval);
            }).length,
          };
        });
      } else {
        // Daily aggregation
        const days = eachDayOfInterval({ start: timeRange.start, end: timeRange.end });
        chartData = days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          
          return {
            date: dayStr,
            label: format(day, "MMM d"),
            updates: (updates || []).filter(u => 
              format(parseISO(u.created_at), "yyyy-MM-dd") === dayStr
            ).length,
            events: (events || []).filter(e => 
              format(parseISO(e.created_at), "yyyy-MM-dd") === dayStr
            ).length,
            tasks: (tasks || []).filter(t => 
              format(parseISO(t.created_at), "yyyy-MM-dd") === dayStr
            ).length,
          };
        });
      }

      return {
        chartData,
        totals: {
          updates: updates?.length || 0,
          events: events?.length || 0,
          tasks: tasks?.length || 0,
        },
        granularity: useWeekly ? "weekly" : "daily",
      };
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case Activity Timeline</CardTitle>
          <CardDescription>Activity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.chartData || [];
  const totals = data?.totals || { updates: 0, events: 0, tasks: 0 };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Activity Timeline</CardTitle>
        <CardDescription>
          {totals.updates} updates &bull; {totals.events} events &bull; {totals.tasks} tasks
          {data?.granularity === "weekly" ? " (weekly view)" : " (daily view)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No activity in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUpdates" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis className="text-xs fill-muted-foreground" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="updates" 
                stackId="1"
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorUpdates)" 
                name="Updates"
              />
              <Area 
                type="monotone" 
                dataKey="events" 
                stackId="1"
                stroke="hsl(var(--chart-2))" 
                fillOpacity={1} 
                fill="url(#colorEvents)" 
                name="Events"
              />
              <Area 
                type="monotone" 
                dataKey="tasks" 
                stackId="1"
                stroke="hsl(var(--chart-3))" 
                fillOpacity={1} 
                fill="url(#colorTasks)" 
                name="Tasks"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
