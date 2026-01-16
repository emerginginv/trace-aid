import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import { formatBudgetHours } from "@/lib/budgetUtils";
import type { ResolvedTimeRange } from "@/lib/analytics/time-ranges";

interface TimeVsBudgetChartProps {
  organizationId: string;
  timeRange?: ResolvedTimeRange;
}

export function TimeVsBudgetChart({ 
  organizationId,
  timeRange 
}: TimeVsBudgetChartProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["time-vs-budget", organizationId, timeRange],
    queryFn: async () => {
      // Get cases with budget hours
      const { data: cases, error: casesError } = await supabase
        .from("cases")
        .select("id, case_number, title, budget_hours")
        .eq("organization_id", organizationId)
        .gt("budget_hours", 0);

      if (casesError) throw casesError;

      const caseIds = cases?.map(c => c.id) || [];
      if (caseIds.length === 0) return [];

      // Get time entries for these cases from canonical table
      let timeQuery = supabase
        .from("time_entries")
        .select("case_id, hours")
        .eq("organization_id", organizationId)
        .in("case_id", caseIds);

      if (timeRange) {
        timeQuery = timeQuery
          .gte("created_at", timeRange.start.toISOString())
          .lte("created_at", timeRange.end.toISOString());
      }

      const { data: timeEntries, error: timeError } = await timeQuery;
      if (timeError) throw timeError;

      // Aggregate hours by case
      const hoursMap: Record<string, number> = {};
      timeEntries?.forEach((entry) => {
        hoursMap[entry.case_id] = (hoursMap[entry.case_id] || 0) + (entry.hours || 0);
      });

      // Build chart data
      return cases
        ?.map((c) => {
          const logged = hoursMap[c.id] || 0;
          const budget = c.budget_hours || 0;
          const efficiency = budget > 0 ? (logged / budget) * 100 : 0;
          
          return {
            id: c.id,
            name: c.case_number,
            fullName: c.title,
            logged: Number(logged.toFixed(2)),
            budget: Number(budget.toFixed(2)),
            efficiency: Number(efficiency.toFixed(1)),
            status: efficiency < 80 ? "on-track" : efficiency < 100 ? "warning" : "over",
          };
        })
        .sort((a, b) => b.budget - a.budget)
        .slice(0, 12) || [];
    },
    enabled: !!organizationId,
  });

  const handleBarClick = (entry: { id: string }) => {
    navigate(`/cases/${entry.id}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time vs Budget Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-track":
        return "hsl(var(--chart-2))";
      case "warning":
        return "hsl(var(--chart-4))";
      case "over":
        return "hsl(var(--destructive))";
      default:
        return "hsl(var(--primary))";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Time vs Budget Efficiency</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            No cases with budget hours found
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatBudgetHours(value)}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatBudgetHours(value),
                    name === "logged" ? "Logged" : "Budget"
                  ]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    if (item) {
                      return `${item.fullName} (${item.efficiency}% utilized)`;
                    }
                    return label;
                  }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="budget" 
                  name="Budget Hours"
                  fill="hsl(var(--muted-foreground))"
                  opacity={0.3}
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="logged" 
                  name="Logged Hours"
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer"
                  onClick={(data) => handleBarClick(data)}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getStatusColor(entry.status)}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
                <span className="text-muted-foreground">On Track (&lt;80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-4))" }} />
                <span className="text-muted-foreground">Warning (80-100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--destructive))" }} />
                <span className="text-muted-foreground">Over Budget (&gt;100%)</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
