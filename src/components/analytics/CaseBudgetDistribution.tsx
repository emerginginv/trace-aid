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
import { getBudgetStatus, formatBudgetCurrency } from "@/lib/budgetUtils";
import { useNavigate } from "react-router-dom";
import type { TimeRange } from "@/lib/analytics/types";

interface CaseBudgetDistributionProps {
  organizationId: string;
  timeRange: TimeRange;
}

interface CaseBudgetData {
  id: string;
  name: string;
  authorized: number;
  consumed: number;
  utilization: number;
  color: string;
}

const STATUS_COLORS = {
  normal: "hsl(var(--primary))",
  warning: "hsl(48 96% 53%)",
  critical: "hsl(25 95% 53%)",
  over: "hsl(var(--destructive))",
};

const chartConfig = {
  consumed: {
    label: "Consumed",
  },
};

export function CaseBudgetDistribution({ organizationId, timeRange }: CaseBudgetDistributionProps) {
  const [data, setData] = useState<CaseBudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      setLoading(true);

      try {
        // Get all cases with budgets (no time filter - budgets are authorized values)
        const { data: cases } = await supabase
          .from("cases")
          .select("id, title, case_number, budget_dollars")
          .eq("organization_id", organizationId)
          .gt("budget_dollars", 0)
          .order("budget_dollars", { ascending: false })
          .limit(15);

        if (!cases || cases.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const caseIds = cases.map((c) => c.id);

        // Get consumed amounts for each case filtered by time range
        const { data: finances } = await supabase
          .from("case_finances")
          .select("case_id, amount, finance_type")
          .in("case_id", caseIds)
          .in("finance_type", ["time", "expense"])
          .gte("date", timeRange.start.toISOString())
          .lte("date", timeRange.end.toISOString());

        // Calculate consumption per case
        const consumptionMap = new Map<string, number>();
        for (const f of finances || []) {
          const current = consumptionMap.get(f.case_id) || 0;
          consumptionMap.set(f.case_id, current + (f.amount || 0));
        }

        // Build chart data
        const chartData: CaseBudgetData[] = cases.map((c) => {
          const consumed = consumptionMap.get(c.id) || 0;
          const authorized = c.budget_dollars || 0;
          const utilization = authorized > 0 ? (consumed / authorized) * 100 : 0;
          const status = getBudgetStatus(utilization);

          return {
            id: c.id,
            name: c.case_number || c.title?.substring(0, 20) || "Unknown",
            authorized,
            consumed,
            utilization,
            color: STATUS_COLORS[status],
          };
        });

        setData(chartData);
      } catch (error) {
        console.error("Error fetching case budget distribution:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organizationId, timeRange]);

  const handleBarClick = (data: CaseBudgetData) => {
    navigate(`/cases/${data.id}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case Budget Distribution (Top 15)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Budget Distribution (Top 15)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No cases with budgets found
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 100, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value) => formatBudgetCurrency(value)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  width={100}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as CaseBudgetData;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-sm">{item.name}</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">Authorized:</span>{" "}
                            {formatBudgetCurrency(item.authorized)}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Consumed:</span>{" "}
                            {formatBudgetCurrency(item.consumed)}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Utilization:</span>{" "}
                            {item.utilization.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="consumed"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data) => handleBarClick(data)}
                >
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
