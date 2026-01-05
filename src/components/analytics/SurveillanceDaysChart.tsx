import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { differenceInDays, parseISO } from "date-fns";
import type { ResolvedTimeRange } from "@/lib/analytics/time-ranges";

interface SurveillanceDaysChartProps {
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

export function SurveillanceDaysChart({ organizationId, timeRange }: SurveillanceDaysChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["surveillance-days", organizationId, timeRange],
    queryFn: async () => {
      // Get cases with surveillance dates
      const { data: cases, error } = await supabase
        .from("cases")
        .select("id, case_number, title, surveillance_start_date, surveillance_end_date")
        .eq("organization_id", organizationId)
        .not("surveillance_start_date", "is", null);

      if (error) throw error;

      // Calculate surveillance days for each case
      const caseData = (cases || [])
        .map(c => {
          const startDate = c.surveillance_start_date ? parseISO(c.surveillance_start_date) : null;
          const endDate = c.surveillance_end_date ? parseISO(c.surveillance_end_date) : new Date();
          
          if (!startDate) return null;
          
          const days = differenceInDays(endDate, startDate) + 1;
          
          return {
            caseId: c.id,
            name: c.case_number,
            title: c.title,
            days: Math.max(days, 0),
            startDate: c.surveillance_start_date,
            endDate: c.surveillance_end_date,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .sort((a, b) => b.days - a.days)
        .slice(0, 10);

      // Calculate totals
      const totalDays = caseData.reduce((sum, c) => sum + c.days, 0);
      const activeCases = (cases || []).filter(c => 
        c.surveillance_start_date && !c.surveillance_end_date
      ).length;

      return {
        chartData: caseData,
        totalDays,
        totalCases: cases?.length || 0,
        activeCases,
      };
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Surveillance Days Logged</CardTitle>
          <CardDescription>Days of surveillance per case</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.chartData || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Surveillance Days Logged</CardTitle>
        <CardDescription>
          {data?.totalDays || 0} total days &bull; {data?.totalCases || 0} cases &bull; {data?.activeCases || 0} active
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No surveillance data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number" 
                className="text-xs fill-muted-foreground"
                label={{ value: "Days", position: "insideBottom", offset: -5 }}
              />
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
                  `${value} days`,
                  props.payload.title,
                ]}
              />
              <Bar dataKey="days" radius={[0, 4, 4, 0]}>
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
