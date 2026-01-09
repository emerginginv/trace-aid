import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { type TimeRange, resolveTimeRange } from "@/lib/analytics";
import { format, parseISO, eachWeekOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

interface ProfitTrendChartProps {
  organizationId: string;
  timeRange: TimeRange;
}

interface TrendDataPoint {
  period: string;
  revenue: number;
  costs: number;
  profit: number;
}

const chartConfig = {
  profit: {
    label: "Profit",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-2))",
  },
  costs: {
    label: "Costs",
    color: "hsl(var(--chart-1))",
  },
};

export function ProfitTrendChart({ organizationId, timeRange }: ProfitTrendChartProps) {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      setLoading(true);

      try {
        const { start, end } = resolveTimeRange(timeRange);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const useMonthly = daysDiff > 90;

        // Fetch invoices
        const { data: invoices } = await supabase
          .from("invoices")
          .select("total, date")
          .eq("organization_id", organizationId)
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        // Fetch costs
        const { data: finances } = await supabase
          .from("case_finances")
          .select("amount, date, finance_type")
          .eq("organization_id", organizationId)
          .in("finance_type", ["time", "expense"])
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        // Generate intervals
        const intervals = useMonthly
          ? eachMonthOfInterval({ start, end })
          : eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

        const trendData: TrendDataPoint[] = intervals.map((intervalStart) => {
          const intervalEnd = useMonthly
            ? endOfMonth(intervalStart)
            : endOfWeek(intervalStart, { weekStartsOn: 1 });

          const periodRevenue = (invoices || [])
            .filter((inv) => {
              const invDate = parseISO(inv.date);
              return invDate >= intervalStart && invDate <= intervalEnd;
            })
            .reduce((sum, inv) => sum + (inv.total || 0), 0);

          const periodCosts = (finances || [])
            .filter((f) => {
              const fDate = parseISO(f.date);
              return fDate >= intervalStart && fDate <= intervalEnd;
            })
            .reduce((sum, f) => sum + (f.amount || 0), 0);

          return {
            period: format(intervalStart, useMonthly ? "MMM yyyy" : "MMM d"),
            revenue: periodRevenue,
            costs: periodCosts,
            profit: periodRevenue - periodCosts,
          };
        });

        setData(trendData);
      } catch (error) {
        console.error("Error fetching profit trend:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organizationId, timeRange]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit Trend</CardTitle>
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
        <CardTitle>Profit Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for this period
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as TrendDataPoint;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="font-medium mb-2">{label}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Revenue:</span>
                            <span className="font-medium text-chart-2">${item.revenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Costs:</span>
                            <span className="font-medium text-chart-1">${item.costs.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-t pt-1">
                            <span className="text-muted-foreground">Profit:</span>
                            <span className={`font-bold ${item.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                              ${item.profit.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#profitGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
