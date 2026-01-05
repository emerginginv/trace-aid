import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ResolvedTimeRange } from "@/lib/analytics/time-ranges";

interface UpdateFrequencyChartProps {
  organizationId: string;
  timeRange: ResolvedTimeRange;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function UpdateFrequencyChart({ organizationId, timeRange }: UpdateFrequencyChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["update-frequency-by-case", organizationId, timeRange],
    queryFn: async () => {
      const { data: updates, error } = await supabase
        .from("case_updates")
        .select(`
          id,
          case_id,
          created_at,
          cases!inner(case_number, title)
        `)
        .eq("organization_id", organizationId)
        .gte("created_at", timeRange.start.toISOString())
        .lte("created_at", timeRange.end.toISOString());

      if (error) throw error;

      // Group by case
      const caseCounts: Record<string, { caseNumber: string; title: string; count: number }> = {};
      
      for (const update of updates || []) {
        const caseId = update.case_id;
        const caseInfo = update.cases as { case_number: string; title: string };
        
        if (!caseCounts[caseId]) {
          caseCounts[caseId] = {
            caseNumber: caseInfo.case_number,
            title: caseInfo.title,
            count: 0,
          };
        }
        caseCounts[caseId].count++;
      }

      // Convert to array and sort by count
      return Object.entries(caseCounts)
        .map(([caseId, data]) => ({
          caseId,
          name: data.caseNumber,
          title: data.title,
          updates: data.count,
        }))
        .sort((a, b) => b.updates - a.updates)
        .slice(0, 10);
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Update Frequency by Case</CardTitle>
          <CardDescription>Number of updates per case</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Frequency by Case</CardTitle>
        <CardDescription>Top 10 cases with most updates</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No updates in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs fill-muted-foreground" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={55}
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                formatter={(value: number, _name: string, props: any) => [
                  `${value} updates`,
                  props.payload.title,
                ]}
              />
              <Bar dataKey="updates" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
