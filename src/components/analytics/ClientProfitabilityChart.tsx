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
import { ChartContainer } from "@/components/ui/chart";
import { type TimeRange, resolveTimeRange } from "@/lib/analytics";

interface ClientProfitabilityChartProps {
  organizationId: string;
  timeRange: TimeRange;
}

interface ClientProfitability {
  name: string;
  profit: number;
  margin: number;
  revenue: number;
  costs: number;
}

const chartConfig = {
  profit: {
    label: "Profit",
    color: "hsl(var(--primary))",
  },
};

export function ClientProfitabilityChart({ organizationId, timeRange }: ClientProfitabilityChartProps) {
  const [data, setData] = useState<ClientProfitability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      setLoading(true);

      try {
        const { start, end } = resolveTimeRange(timeRange);

        // Fetch accounts (clients)
        const { data: accounts } = await supabase
          .from("accounts")
          .select("id, name")
          .eq("organization_id", organizationId);

        if (!accounts || accounts.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const accountIds = accounts.map((a) => a.id);

        // Fetch cases linked to accounts
        const { data: cases } = await supabase
          .from("cases")
          .select("id, account_id")
          .eq("organization_id", organizationId)
          .in("account_id", accountIds);

        if (!cases || cases.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const caseIds = cases.map((c) => c.id);

        // Fetch invoices
        const { data: invoices } = await supabase
          .from("invoices")
          .select("case_id, total")
          .in("case_id", caseIds)
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        // Fetch costs
        const { data: finances } = await supabase
          .from("case_finances")
          .select("case_id, amount, finance_type")
          .in("case_id", caseIds)
          .in("finance_type", ["time", "expense"])
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        // Map case to account
        const caseToAccount = new Map<string, string>();
        cases.forEach((c) => {
          if (c.account_id) caseToAccount.set(c.id, c.account_id);
        });

        // Calculate revenue and costs per account
        const accountRevenue = new Map<string, number>();
        const accountCosts = new Map<string, number>();

        (invoices || []).forEach((inv) => {
          const accountId = caseToAccount.get(inv.case_id);
          if (accountId) {
            accountRevenue.set(accountId, (accountRevenue.get(accountId) || 0) + (inv.total || 0));
          }
        });

        (finances || []).forEach((f) => {
          const accountId = caseToAccount.get(f.case_id);
          if (accountId) {
            accountCosts.set(accountId, (accountCosts.get(accountId) || 0) + (f.amount || 0));
          }
        });

        // Build profitability data
        const profitabilityData: ClientProfitability[] = accounts
          .map((a) => {
            const revenue = accountRevenue.get(a.id) || 0;
            const costs = accountCosts.get(a.id) || 0;
            const profit = revenue - costs;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

            return {
              name: a.name.length > 20 ? a.name.substring(0, 17) + "..." : a.name,
              profit,
              margin,
              revenue,
              costs,
            };
          })
          .filter((a) => a.revenue > 0 || a.costs > 0)
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 10);

        setData(profitabilityData);
      } catch (error) {
        console.error("Error fetching client profitability:", error);
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
          <CardTitle>Client Profitability (Top 10)</CardTitle>
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
        <CardTitle>Client Profitability (Top 10)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No client profitability data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={formatCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  width={80}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as ClientProfitability;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="font-medium mb-2">{item.name}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Revenue:</span>
                            <span className="font-medium">${item.revenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Costs:</span>
                            <span className="font-medium">${item.costs.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-t pt-1">
                            <span className="text-muted-foreground">Profit:</span>
                            <span className={`font-bold ${item.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                              ${item.profit.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Margin:</span>
                            <span className={`font-medium ${item.margin >= 0 ? "text-primary" : "text-destructive"}`}>
                              {item.margin.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.profit >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                    />
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
