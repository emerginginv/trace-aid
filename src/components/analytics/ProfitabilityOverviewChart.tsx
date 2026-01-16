import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { type TimeRange, resolveTimeRange } from "@/lib/analytics";

interface ProfitabilityOverviewChartProps {
  organizationId: string;
  timeRange: TimeRange;
}

interface ProfitabilityData {
  name: string;
  value: number;
  fill: string;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-2))",
  },
  costs: {
    label: "Costs",
    color: "hsl(var(--chart-1))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--primary))",
  },
};

export function ProfitabilityOverviewChart({ organizationId, timeRange }: ProfitabilityOverviewChartProps) {
  const [data, setData] = useState<ProfitabilityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      setLoading(true);

      try {
        const { start, end } = resolveTimeRange(timeRange);

        // Fetch invoices for revenue
        const { data: invoices } = await supabase
          .from("invoices")
          .select("total")
          .eq("organization_id", organizationId)
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        // Fetch costs from canonical tables
        const [{ data: timeData }, { data: expenseData }] = await Promise.all([
          supabase
            .from("time_entries")
            .select("total")
            .eq("organization_id", organizationId)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString()),
          supabase
            .from("expense_entries")
            .select("total")
            .eq("organization_id", organizationId)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString()),
        ]);

        const totalRevenue = (invoices || []).reduce((sum, inv) => sum + (inv.total || 0), 0);
        const totalCosts = (timeData || []).reduce((sum, t) => sum + (t.total || 0), 0) +
                          (expenseData || []).reduce((sum, e) => sum + (e.total || 0), 0);
        const profit = totalRevenue - totalCosts;

        setData([
          { name: "Revenue", value: totalRevenue, fill: "hsl(var(--chart-2))" },
          { name: "Costs", value: totalCosts, fill: "hsl(var(--chart-1))" },
          { name: "Profit", value: profit, fill: profit >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" },
        ]);
      } catch (error) {
        console.error("Error fetching profitability data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organizationId, timeRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profitability Overview</CardTitle>
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
        <CardTitle>Profitability Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 || data.every(d => d.value === 0) ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No financial data available for this period
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
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
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0];
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="font-medium">{item.payload.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(item.value as number)}
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
