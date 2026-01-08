import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutTemplate } from "lucide-react";

interface TimeRangeProps {
  startDate: Date;
  endDate: Date;
}

interface ReportTypeUsageChartProps {
  timeRange: TimeRangeProps;
}

export function ReportTypeUsageChart({ timeRange }: ReportTypeUsageChartProps) {
  const { organization } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ["report-type-usage", organization?.id, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data: reports, error } = await supabase
        .from("generated_reports")
        .select("title, template_id")
        .eq("organization_id", organization.id)
        .gte("generated_at", timeRange.startDate.toISOString())
        .lte("generated_at", timeRange.endDate.toISOString());

      if (error) throw error;

      const templateCounts = new Map<string, number>();
      
      reports?.forEach(report => {
        const name = report.title || "Unknown Template";
        templateCounts.set(name, (templateCounts.get(name) || 0) + 1);
      });

      return Array.from(templateCounts.entries())
        .map(([name, count]) => ({
          name: name.length > 25 ? name.substring(0, 22) + "..." : name,
          fullName: name,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    enabled: !!organization?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Report Types Used
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5" />
          Report Types Used
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No reports generated in this time period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={150} />
              <Tooltip labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label} />
              <Bar dataKey="count" name="Reports" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}