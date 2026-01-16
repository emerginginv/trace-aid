import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { formatBudgetCurrency } from "@/lib/budgetUtils";
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, startOfWeek } from "date-fns";
import type { ResolvedTimeRange } from "@/lib/analytics/time-ranges";

interface ExpenseTrendChartProps {
  organizationId: string;
  timeRange?: ResolvedTimeRange;
}

export function ExpenseTrendChart({ 
  organizationId,
  timeRange 
}: ExpenseTrendChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["expense-trend", organizationId, timeRange],
    queryFn: async () => {
      const now = new Date();
      const start = timeRange?.start || new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = timeRange?.end || now;

      const { data: expenseData, error } = await supabase
        .from("expense_entries")
        .select("total, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: true });

      // Transform to expected format
      const expenses = (expenseData || []).map(e => ({
        amount: e.total,
        date: e.created_at?.split('T')[0] || '',
      }));

      if (error) throw error;

      // Determine granularity based on date range
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const useWeekly = daysDiff > 60;

      if (useWeekly) {
        // Weekly aggregation
        const weeks = eachWeekOfInterval({ start, end });
        const weeklyTotals: Record<string, number> = {};
        
        weeks.forEach(weekStart => {
          const key = format(weekStart, "yyyy-MM-dd");
          weeklyTotals[key] = 0;
        });

        expenses?.forEach((expense) => {
          const expenseDate = parseISO(expense.date);
          const weekStart = startOfWeek(expenseDate);
          const key = format(weekStart, "yyyy-MM-dd");
          if (weeklyTotals[key] !== undefined) {
            weeklyTotals[key] += expense.amount || 0;
          }
        });

        return Object.entries(weeklyTotals).map(([date, amount]) => ({
          date,
          label: format(parseISO(date), "MMM d"),
          amount: Number(amount.toFixed(2)),
        }));
      } else {
        // Daily aggregation
        const days = eachDayOfInterval({ start, end });
        const dailyTotals: Record<string, number> = {};
        
        days.forEach(day => {
          const key = format(day, "yyyy-MM-dd");
          dailyTotals[key] = 0;
        });

        expenses?.forEach((expense) => {
          if (dailyTotals[expense.date] !== undefined) {
            dailyTotals[expense.date] += expense.amount || 0;
          }
        });

        return Object.entries(dailyTotals).map(([date, amount]) => ({
          date,
          label: format(parseISO(date), "MMM d"),
          amount: Number(amount.toFixed(2)),
        }));
      }
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [];
  const totalExpenses = chartData.reduce((sum, item) => sum + item.amount, 0);
  const avgDaily = chartData.length > 0 ? totalExpenses / chartData.length : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Expense Trend Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No expense data found
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tickFormatter={(value) => formatBudgetCurrency(value)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => [formatBudgetCurrency(value), "Expenses"]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#expenseGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-8 mt-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Total Period</p>
                <p className="text-lg font-semibold">{formatBudgetCurrency(totalExpenses)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Avg per Period</p>
                <p className="text-lg font-semibold">{formatBudgetCurrency(avgDaily)}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
