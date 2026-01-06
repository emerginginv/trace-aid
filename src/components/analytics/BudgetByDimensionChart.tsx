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
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { formatBudgetCurrency } from "@/lib/budgetUtils";
import type { TimeRange } from "@/lib/analytics/types";

interface BudgetByDimensionChartProps {
  organizationId: string;
  dimension: "client" | "investigator";
  title: string;
  timeRange: TimeRange;
}

interface DimensionData {
  name: string;
  authorized: number;
  consumed: number;
}

const chartConfig = {
  authorized: {
    label: "Authorized",
    color: "hsl(var(--primary))",
  },
  consumed: {
    label: "Consumed",
    color: "hsl(var(--chart-2))",
  },
};

export function BudgetByDimensionChart({
  organizationId,
  dimension,
  title,
  timeRange,
}: BudgetByDimensionChartProps) {
  const [data, setData] = useState<DimensionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      setLoading(true);

      try {
        if (dimension === "client") {
          // Get cases with budgets and their accounts
          const { data: cases } = await supabase
            .from("cases")
            .select(`
              id,
              budget_dollars,
              account_id,
              accounts!cases_account_id_fkey (id, name)
            `)
            .eq("organization_id", organizationId)
            .gt("budget_dollars", 0);

          if (!cases || cases.length === 0) {
            setData([]);
            setLoading(false);
            return;
          }

          const caseIds = cases.map((c) => c.id);

          // Get consumed amounts filtered by time range
          const { data: finances } = await supabase
            .from("case_finances")
            .select("case_id, amount, finance_type")
            .in("case_id", caseIds)
            .in("finance_type", ["time", "expense"])
            .gte("date", timeRange.start.toISOString())
            .lte("date", timeRange.end.toISOString());

          // Aggregate by client
          const clientMap = new Map<string, { authorized: number; consumed: number }>();

          for (const c of cases) {
            const clientName = c.accounts?.name || "No Client";
            const current = clientMap.get(clientName) || { authorized: 0, consumed: 0 };
            clientMap.set(clientName, {
              authorized: current.authorized + (c.budget_dollars || 0),
              consumed: current.consumed,
            });
          }

          // Add consumed amounts
          const caseClientMap = new Map(cases.map((c) => [c.id, c.accounts?.name || "No Client"]));
          for (const f of finances || []) {
            const clientName = caseClientMap.get(f.case_id) || "No Client";
            const current = clientMap.get(clientName) || { authorized: 0, consumed: 0 };
            clientMap.set(clientName, {
              ...current,
              consumed: current.consumed + (f.amount || 0),
            });
          }

          // Convert to array and sort by authorized (top 10)
          const chartData = Array.from(clientMap.entries())
            .map(([name, values]) => ({ name, ...values }))
            .sort((a, b) => b.authorized - a.authorized)
            .slice(0, 10);

          setData(chartData);
        } else {
          // Investigator dimension
          const { data: cases } = await supabase
            .from("cases")
            .select("id, budget_dollars, investigator_ids")
            .eq("organization_id", organizationId)
            .gt("budget_dollars", 0);

          if (!cases || cases.length === 0) {
            setData([]);
            setLoading(false);
            return;
          }

          // Get all unique investigator IDs
          const investigatorIds = new Set<string>();
          for (const c of cases) {
            if (c.investigator_ids) {
              for (const id of c.investigator_ids) {
                investigatorIds.add(id);
              }
            }
          }

          // Get investigator names
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", Array.from(investigatorIds));

          const profileMap = new Map(
            (profiles || []).map((p) => [p.id, p.full_name || p.email || "Unknown"])
          );

          const caseIds = cases.map((c) => c.id);

          // Get consumed amounts filtered by time range
          const { data: finances } = await supabase
            .from("case_finances")
            .select("case_id, amount, finance_type")
            .in("case_id", caseIds)
            .in("finance_type", ["time", "expense"])
            .gte("date", timeRange.start.toISOString())
            .lte("date", timeRange.end.toISOString());

          // Calculate consumption per case
          const caseConsumption = new Map<string, number>();
          for (const f of finances || []) {
            const current = caseConsumption.get(f.case_id) || 0;
            caseConsumption.set(f.case_id, current + (f.amount || 0));
          }

          // Aggregate by investigator
          const investigatorMap = new Map<string, { authorized: number; consumed: number }>();

          for (const c of cases) {
            const investigators = c.investigator_ids || [];
            const budgetPerInvestigator = investigators.length > 0 ? (c.budget_dollars || 0) / investigators.length : 0;
            const consumedPerInvestigator = investigators.length > 0 
              ? (caseConsumption.get(c.id) || 0) / investigators.length 
              : 0;

            for (const invId of investigators) {
              const name = profileMap.get(invId) || "Unknown";
              const current = investigatorMap.get(name) || { authorized: 0, consumed: 0 };
              investigatorMap.set(name, {
                authorized: current.authorized + budgetPerInvestigator,
                consumed: current.consumed + consumedPerInvestigator,
              });
            }
          }

          // Convert to array and sort
          const chartData = Array.from(investigatorMap.entries())
            .map(([name, values]) => ({
              name: name.length > 15 ? name.substring(0, 15) + "..." : name,
              ...values,
            }))
            .sort((a, b) => b.authorized - a.authorized)
            .slice(0, 10);

          setData(chartData);
        }
      } catch (error) {
        console.error("Error fetching budget by dimension:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organizationId, dimension, timeRange]);

  if (loading) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 80, bottom: 0 }}
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
                  width={80}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend content={<ChartLegendContent />} />
                <Bar
                  dataKey="authorized"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                  name="Authorized"
                />
                <Bar
                  dataKey="consumed"
                  fill="hsl(var(--chart-2))"
                  radius={[0, 4, 4, 0]}
                  name="Consumed"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
