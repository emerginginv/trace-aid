import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatBudgetCurrency } from "@/lib/budgetUtils";
import type { ResolvedTimeRange } from "@/lib/analytics/time-ranges";

interface ExpensesByCategoryChartProps {
  organizationId: string;
  timeRange?: ResolvedTimeRange;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(217, 91%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(339, 82%, 51%)",
];

export function ExpensesByCategoryChart({ 
  organizationId,
  timeRange 
}: ExpensesByCategoryChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["expenses-by-category", organizationId, timeRange],
    queryFn: async () => {
      let query = supabase
        .from("expense_entries")
        .select("total, item_type, created_at")
        .eq("organization_id", organizationId);

      if (timeRange) {
        query = query
          .gte("created_at", timeRange.start.toISOString())
          .lte("created_at", timeRange.end.toISOString());
      }

      const { data: expenses, error } = await query;
      if (error) throw error;

      // Group by category (item_type)
      const categoryTotals: Record<string, number> = {};
      
      expenses?.forEach((expense) => {
        const category = expense.item_type || "Uncategorized";
        categoryTotals[category] = (categoryTotals[category] || 0) + (expense.total || 0);
      });

      return Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          name: category,
          value: Number(amount.toFixed(2)),
        }))
        .sort((a, b) => b.value - a.value);
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [];
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Expenses by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No expenses found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => 
                  percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
                }
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatBudgetCurrency(value), "Amount"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend 
                formatter={(value) => {
                  const item = chartData.find(d => d.name === value);
                  return `${value}: ${formatBudgetCurrency(item?.value || 0)}`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        {total > 0 && (
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold">{formatBudgetCurrency(total)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
