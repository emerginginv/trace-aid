import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, eachDayOfInterval, startOfDay } from "date-fns";
import { Activity } from "lucide-react";

interface LoginActivityChartProps {
  timeRange: { startDate: Date; endDate: Date };
}

export function LoginActivityChart({ timeRange }: LoginActivityChartProps) {
  const { organization } = useOrganization();

  const { data: activityData, isLoading } = useQuery({
    queryKey: ["login-activity-chart", organization?.id, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Get daily active users from case_updates, case_activities, case_finances
      const [updates, activities, finances] = await Promise.all([
        supabase
          .from("case_updates")
          .select("user_id, created_at")
          .eq("organization_id", organization.id)
          .gte("created_at", timeRange.startDate.toISOString())
          .lte("created_at", timeRange.endDate.toISOString()),
        supabase
          .from("case_activities")
          .select("user_id, created_at")
          .eq("organization_id", organization.id)
          .gte("created_at", timeRange.startDate.toISOString())
          .lte("created_at", timeRange.endDate.toISOString()),
        supabase
          .from("case_finances")
          .select("user_id, created_at")
          .eq("organization_id", organization.id)
          .gte("created_at", timeRange.startDate.toISOString())
          .lte("created_at", timeRange.endDate.toISOString()),
      ]);

      // Combine all activity
      const allActivity = [
        ...(updates.data || []).map((u) => ({ userId: u.user_id, date: u.created_at })),
        ...(activities.data || []).map((a) => ({ userId: a.user_id, date: a.created_at })),
        ...(finances.data || []).map((f) => ({ userId: f.user_id, date: f.created_at })),
      ];

      return allActivity;
    },
    enabled: !!organization?.id,
  });

  const chartData = useMemo(() => {
    if (!activityData?.length) return [];

    // Generate all days in the range
    const days = eachDayOfInterval({
      start: timeRange.startDate,
      end: timeRange.endDate,
    });

    // Group by day and count unique users
    const dailyActiveUsers = new Map<string, Set<string>>();

    activityData.forEach((item) => {
      if (item.date) {
        const dayKey = format(startOfDay(parseISO(item.date)), "yyyy-MM-dd");
        if (!dailyActiveUsers.has(dayKey)) {
          dailyActiveUsers.set(dayKey, new Set());
        }
        dailyActiveUsers.get(dayKey)!.add(item.userId);
      }
    });

    return days.map((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const uniqueUsers = dailyActiveUsers.get(dayKey)?.size || 0;
      return {
        date: format(day, "MMM d"),
        activeUsers: uniqueUsers,
      };
    });
  }, [activityData, timeRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Daily Active Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Daily Active Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No activity in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              />
              <Bar
                dataKey="activeUsers"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                name="Active Users"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
