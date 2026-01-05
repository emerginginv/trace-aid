import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, eachDayOfInterval, eachWeekOfInterval, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

interface TimeRangeProps {
  startDate: Date;
  endDate: Date;
}

interface ReportGenerationChartProps {
  timeRange: TimeRangeProps;
}

export function ReportGenerationChart({ timeRange }: ReportGenerationChartProps) {
  const { organization } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ["report-generation-chart", organization?.id, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data: reports, error } = await supabase
        .from("report_instances")
        .select("generated_at, exported_at")
        .eq("organization_id", organization.id)
        .gte("generated_at", timeRange.startDate.toISOString())
        .lte("generated_at", timeRange.endDate.toISOString());

      if (error) throw error;

      // Determine granularity based on time range
      const daysDiff = Math.ceil((timeRange.endDate.getTime() - timeRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const useWeekly = daysDiff > 60;

      // Create date buckets
      const intervals = useWeekly
        ? eachWeekOfInterval({ start: timeRange.startDate, end: timeRange.endDate })
        : eachDayOfInterval({ start: timeRange.startDate, end: timeRange.endDate });

      const buckets = new Map<string, { generated: number; exported: number }>();
      
      intervals.forEach(date => {
        const key = format(date, useWeekly ? "yyyy-'W'ww" : "yyyy-MM-dd");
        buckets.set(key, { generated: 0, exported: 0 });
      });

      // Count reports per bucket
      reports?.forEach(report => {
        const date = parseISO(report.generated_at);
        const key = format(date, useWeekly ? "yyyy-'W'ww" : "yyyy-MM-dd");
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.generated++;
          if (report.exported_at) {
            bucket.exported++;
          }
        }
      });

      return Array.from(buckets.entries()).map(([date, counts]) => ({
        date,
        displayDate: useWeekly ? date : format(parseISO(date), "MMM d"),
        generated: counts.generated,
        exported: counts.exported,
      }));
    },
    enabled: !!organization?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reports Generated Over Time
          </CardTitle>
          <CardDescription>Report generation and export trends</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.some(d => d.generated > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Reports Generated Over Time
        </CardTitle>
        <CardDescription>Report generation and export trends</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No reports generated in this time period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Bar 
                dataKey="generated" 
                name="Generated" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="exported" 
                name="Exported" 
                fill="hsl(var(--chart-2))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
