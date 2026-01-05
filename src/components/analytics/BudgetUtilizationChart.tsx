import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { TimeRange } from "@/lib/analytics/types";
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, startOfWeek } from "date-fns";

interface BudgetUtilizationChartProps {
  organizationId: string;
  timeRange: TimeRange;
}

interface UtilizationDataPoint {
  date: string;
  utilization: number;
}

const chartConfig = {
  utilization: {
    label: "Budget Utilization",
    color: "hsl(var(--primary))",
  },
};

export function BudgetUtilizationChart({ organizationId, timeRange }: BudgetUtilizationChartProps) {
  const [data, setData] = useState<UtilizationDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      setLoading(true);

      try {
        // Get all cases with budgets
        const { data: cases } = await supabase
          .from("cases")
          .select("id, budget_dollars, created_at")
          .eq("organization_id", organizationId)
          .gt("budget_dollars", 0)
          .gte("created_at", timeRange.start.toISOString())
          .lte("created_at", timeRange.end.toISOString());

        if (!cases || cases.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const caseIds = cases.map((c) => c.id);

        // Get all finances for these cases
        const { data: finances } = await supabase
          .from("case_finances")
          .select("case_id, amount, date, finance_type")
          .in("case_id", caseIds)
          .in("finance_type", ["time", "expense"])
          .gte("date", timeRange.start.toISOString())
          .lte("date", timeRange.end.toISOString())
          .order("date", { ascending: true });

        // Calculate cumulative utilization per day/week
        const totalBudget = cases.reduce((sum, c) => sum + (c.budget_dollars || 0), 0);
        
        // Determine granularity based on time range
        const daysDiff = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));
        const useWeekly = daysDiff > 60;

        const intervals = useWeekly
          ? eachWeekOfInterval({ start: timeRange.start, end: timeRange.end }, { weekStartsOn: 1 })
          : eachDayOfInterval({ start: timeRange.start, end: timeRange.end });

        let cumulativeSpend = 0;
        const utilizationData: UtilizationDataPoint[] = [];

        for (const intervalDate of intervals) {
          const intervalEnd = useWeekly
            ? new Date(intervalDate.getTime() + 7 * 24 * 60 * 60 * 1000)
            : new Date(intervalDate.getTime() + 24 * 60 * 60 * 1000);

          const periodSpend = (finances || [])
            .filter((f) => {
              const fDate = parseISO(f.date);
              return fDate >= intervalDate && fDate < intervalEnd;
            })
            .reduce((sum, f) => sum + (f.amount || 0), 0);

          cumulativeSpend += periodSpend;
          const utilization = totalBudget > 0 ? (cumulativeSpend / totalBudget) * 100 : 0;

          utilizationData.push({
            date: format(intervalDate, useWeekly ? "MMM d" : "MMM d"),
            utilization: Math.round(utilization * 10) / 10,
          });
        }

        setData(utilizationData);
      } catch (error) {
        console.error("Error fetching budget utilization:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organizationId, timeRange]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Utilization Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Utilization Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No budget data available for this period
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, "auto"]}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <ReferenceLine
                  y={80}
                  stroke="hsl(var(--warning))"
                  strokeDasharray="5 5"
                  label={{ value: "Warning (80%)", fill: "hsl(var(--warning))", fontSize: 10 }}
                />
                <ReferenceLine
                  y={100}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  label={{ value: "Limit (100%)", fill: "hsl(var(--destructive))", fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="utilization"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
