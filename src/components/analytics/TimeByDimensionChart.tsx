import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { formatBudgetHours } from "@/lib/budgetUtils";
import type { ResolvedTimeRange } from "@/lib/analytics/time-ranges";

interface TimeByDimensionChartProps {
  organizationId: string;
  dimension: "investigator" | "case";
  title: string;
  timeRange?: ResolvedTimeRange;
}

export function TimeByDimensionChart({ 
  organizationId, 
  dimension, 
  title,
  timeRange 
}: TimeByDimensionChartProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["time-by-dimension", organizationId, dimension, timeRange],
    queryFn: async () => {
      let query = supabase
        .from("case_finances")
        .select("hours, user_id, case_id, date")
        .eq("organization_id", organizationId)
        .eq("finance_type", "time")
        .gt("hours", 0);

      if (timeRange) {
        query = query
          .gte("date", timeRange.start.toISOString().split("T")[0])
          .lte("date", timeRange.end.toISOString().split("T")[0]);
      }

      const { data: timeEntries, error } = await query;
      if (error) throw error;

      if (dimension === "investigator") {
        // Group by user_id
        const userHours: Record<string, number> = {};
        const userIds = new Set<string>();
        
        timeEntries?.forEach((entry) => {
          if (entry.user_id) {
            userIds.add(entry.user_id);
            userHours[entry.user_id] = (userHours[entry.user_id] || 0) + (entry.hours || 0);
          }
        });

        // Fetch user names
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(userIds));

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.email]) || []);

        return Object.entries(userHours)
          .map(([userId, hours]) => ({
            id: userId,
            name: profileMap.get(userId) || "Unknown",
            hours: Number(hours.toFixed(2)),
          }))
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 10);
      } else {
        // Group by case_id - need to fetch case info separately
        const caseHours: Record<string, number> = {};
        const caseIds = new Set<string>();
        
        timeEntries?.forEach((entry) => {
          if (entry.case_id) {
            caseIds.add(entry.case_id);
            caseHours[entry.case_id] = (caseHours[entry.case_id] || 0) + (entry.hours || 0);
          }
        });

        // Fetch case info
        const { data: cases } = await supabase
          .from("cases")
          .select("id, case_number, title")
          .in("id", Array.from(caseIds));

        const caseMap = new Map(cases?.map(c => [c.id, { case_number: c.case_number, title: c.title }]) || []);

        return Object.entries(caseHours)
          .map(([caseId, hours]) => {
            const caseInfo = caseMap.get(caseId);
            return {
              id: caseId,
              name: caseInfo?.title || caseInfo?.case_number || "Unknown",
              fullName: caseInfo?.case_number || "",
              hours: Number(hours.toFixed(2)),
            };
          })
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 10);
      }
    },
    enabled: !!organizationId,
  });

  const handleBarClick = (entry: { id: string }) => {
    if (dimension === "investigator") {
      navigate(`/users/${entry.id}`);
    } else {
      navigate(`/cases/${entry.id}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [];
  const maxHours = Math.max(...chartData.map(d => d.hours), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No time entries found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                tickFormatter={(value) => formatBudgetHours(value)}
                domain={[0, maxHours * 1.1]}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={90}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [formatBudgetHours(value), "Hours"]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || label;
                }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Bar 
                dataKey="hours" 
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(data) => handleBarClick(data)}
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill="hsl(var(--primary))"
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
