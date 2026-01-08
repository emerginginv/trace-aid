import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, eachDayOfInterval, eachWeekOfInterval, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
        .from("generated_reports")
        .select("generated_at")
        .eq("organization_id", organization.id)
        .gte("generated_at", timeRange.startDate.toISOString())
        .lte("generated_at", timeRange.endDate.toISOString());

      if (error) throw error;

      const daysDiff = Math.ceil((timeRange.endDate.getTime() - timeRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const useWeekly = daysDiff > 60;

      const intervals = useWeekly
        ? eachWeekOfInterval({ start: timeRange.startDate, end: timeRange.endDate })
        : eachDayOfInterval({ start: timeRange.startDate, end: timeRange.endDate });

      const buckets = new Map<string, number>();
      
      intervals.forEach(date => {
        const key = format(date, useWeekly ? "yyyy-'W'ww" : "yyyy-MM-dd");
        buckets.set(key, 0);
      });

      reports?.forEach(report => {
        const date = parseISO(report.generated_at);
        const key = format(date, useWeekly ? "yyyy-'W'ww" : "yyyy-MM-dd");
        const count = buckets.get(key) || 0;
        buckets.set(key, count + 1);
      });

      return Array.from(buckets.entries()).map(([date, count]) => ({
        date,
        displayDate: useWeekly ? date : format(parseISO(date), "MMM d"),
        generated: count,
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
              <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="generated" name="Generated" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}