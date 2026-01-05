import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, eachDayOfInterval, startOfDay } from "date-fns";

interface SharingActivityChartProps {
  timeRange: { startDate: Date; endDate: Date };
}

export function SharingActivityChart({ timeRange }: SharingActivityChartProps) {
  const { organization } = useOrganization();

  const { data: sharingData, isLoading } = useQuery({
    queryKey: ["sharing-activity-chart", organization?.id, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("attachment_access")
        .select("created_at")
        .eq("organization_id", organization.id)
        .gte("created_at", timeRange.startDate.toISOString())
        .lte("created_at", timeRange.endDate.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  const chartData = useMemo(() => {
    if (!sharingData?.length) return [];

    // Generate all days in the range
    const days = eachDayOfInterval({
      start: timeRange.startDate,
      end: timeRange.endDate,
    });

    // Count links per day
    const countsByDay = new Map<string, number>();
    
    sharingData.forEach((item) => {
      const dayKey = format(startOfDay(parseISO(item.created_at)), "yyyy-MM-dd");
      countsByDay.set(dayKey, (countsByDay.get(dayKey) || 0) + 1);
    });

    return days.map((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      return {
        date: format(day, "MMM d"),
        links: countsByDay.get(dayKey) || 0,
      };
    });
  }, [sharingData, timeRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Attachment Sharing Activity</CardTitle>
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
        <CardTitle className="text-base font-medium">Attachment Sharing Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No sharing activity in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="sharingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="links"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#sharingGradient)"
                name="Links Created"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
