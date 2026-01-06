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
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { getBudgetStatus, type BudgetStatus } from "@/lib/budgetUtils";
import { type TimeRange, resolveTimeRange } from "@/lib/analytics";

interface BudgetStatusDistributionProps {
  organizationId: string;
  timeRange: TimeRange;
}

interface StatusData {
  status: string;
  count: number;
  color: string;
}

const STATUS_COLORS: Record<BudgetStatus, string> = {
  normal: "hsl(var(--primary))",
  warning: "hsl(48 96% 53%)", // Yellow
  critical: "hsl(25 95% 53%)", // Orange
  over: "hsl(var(--destructive))",
};

const STATUS_LABELS: Record<BudgetStatus, string> = {
  normal: "On Track",
  warning: "Warning",
  critical: "Critical",
  over: "Over Budget",
};

const chartConfig = {
  count: {
    label: "Cases",
  },
};

export function BudgetStatusDistribution({ organizationId, timeRange }: BudgetStatusDistributionProps) {
  const [data, setData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      setLoading(true);

      try {
        const { start, end } = resolveTimeRange(timeRange);
        
        // Get all cases with budgets (no time filter - budgets are authorized values)
        const { data: cases } = await supabase
          .from("cases")
          .select("id, budget_dollars, budget_hours")
          .eq("organization_id", organizationId)
          .or("budget_dollars.gt.0,budget_hours.gt.0");

        if (!cases || cases.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const caseIds = cases.map((c) => c.id);

        // Get consumed amounts for each case filtered by time range
        const { data: finances } = await supabase
          .from("case_finances")
          .select("case_id, amount, hours, finance_type")
          .in("case_id", caseIds)
          .in("finance_type", ["time", "expense"])
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        // Calculate consumption per case
        const consumptionMap = new Map<string, { dollars: number; hours: number }>();
        for (const f of finances || []) {
          const current = consumptionMap.get(f.case_id) || { dollars: 0, hours: 0 };
          consumptionMap.set(f.case_id, {
            dollars: current.dollars + (f.amount || 0),
            hours: current.hours + (f.hours || 0),
          });
        }

        // Categorize by status
        const statusCounts: Record<BudgetStatus, number> = {
          normal: 0,
          warning: 0,
          critical: 0,
          over: 0,
        };

        for (const c of cases) {
          const consumed = consumptionMap.get(c.id) || { dollars: 0, hours: 0 };
          
          // Use dollar utilization primarily, fall back to hours
          let utilization = 0;
          if (c.budget_dollars && c.budget_dollars > 0) {
            utilization = (consumed.dollars / c.budget_dollars) * 100;
          } else if (c.budget_hours && c.budget_hours > 0) {
            utilization = (consumed.hours / c.budget_hours) * 100;
          }

          const status = getBudgetStatus(utilization);
          statusCounts[status]++;
        }

        // Convert to chart data
        const chartData: StatusData[] = (["normal", "warning", "critical", "over"] as BudgetStatus[]).map(
          (status) => ({
            status: STATUS_LABELS[status],
            count: statusCounts[status],
            color: STATUS_COLORS[status],
          })
        );

        setData(chartData);
      } catch (error) {
        console.error("Error fetching budget status distribution:", error);
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
          <CardTitle>Budget Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalCases = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {totalCases === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No cases with budgets found
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="status"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
