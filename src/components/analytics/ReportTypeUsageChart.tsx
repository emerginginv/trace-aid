import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      // Fetch reports with template_id
      const { data: reports, error } = await supabase
        .from("generated_reports")
        .select("template_id, title")
        .eq("organization_id", organization.id)
        .gte("generated_at", timeRange.startDate.toISOString())
        .lte("generated_at", timeRange.endDate.toISOString());

      if (error) throw error;

      // Get unique template IDs (excluding nulls)
      const templateIds = [...new Set(reports?.map(r => r.template_id).filter(Boolean) as string[])];
      
      // Fetch template names
      let templateMap = new Map<string, string>();
      if (templateIds.length > 0) {
        const { data: templates } = await supabase
          .from("docx_templates")
          .select("id, name")
          .in("id", templateIds);
        
        templateMap = new Map(templates?.map(t => [t.id, t.name]) || []);
      }

      // Group by template_id, falling back to title for null template_id
      const templateCounts = new Map<string, { name: string; count: number }>();
      
      reports?.forEach(report => {
        let key: string;
        let name: string;
        
        if (report.template_id) {
          key = report.template_id;
          name = templateMap.get(report.template_id) || "Unknown Template";
        } else {
          // For reports without a template_id, group by title
          key = `_custom_${report.title || "Untitled"}`;
          name = report.title || "Untitled Report";
        }
        
        const existing = templateCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          templateCounts.set(key, { name, count: 1 });
        }
      });

      return Array.from(templateCounts.entries())
        .map(([key, value]) => ({
          key,
          name: value.name.length > 25 ? value.name.substring(0, 22) + "..." : value.name,
          fullName: value.name,
          count: value.count,
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
            Templates Used
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
          Templates Used
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
