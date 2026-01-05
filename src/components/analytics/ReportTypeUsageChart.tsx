import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
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
        .from("report_instances")
        .select("template_snapshot")
        .eq("organization_id", organization.id)
        .gte("generated_at", timeRange.startDate.toISOString())
        .lte("generated_at", timeRange.endDate.toISOString());

      if (error) throw error;

      // Group by template name
      const templateCounts = new Map<string, { count: number; isSystem: boolean }>();
      
      reports?.forEach(report => {
        const snapshot = report.template_snapshot as { name?: string; is_system_template?: boolean } | null;
        const name = snapshot?.name || "Unknown Template";
        const isSystem = snapshot?.is_system_template ?? false;
        
        const existing = templateCounts.get(name);
        if (existing) {
          existing.count++;
        } else {
          templateCounts.set(name, { count: 1, isSystem });
        }
      });

      return Array.from(templateCounts.entries())
        .map(([name, { count, isSystem }]) => ({
          name: name.length > 25 ? name.substring(0, 22) + "..." : name,
          fullName: name,
          count,
          isSystem,
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
          <CardDescription>Template usage distribution</CardDescription>
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
        <CardDescription>Template usage distribution</CardDescription>
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
              <XAxis 
                type="number" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={150}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value, name, props) => [
                  value,
                  props.payload.isSystem ? "System Template" : "Custom Template"
                ]}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              />
              <Bar 
                dataKey="count" 
                name="Reports" 
                radius={[0, 4, 4, 0]}
              >
                {data?.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isSystem ? "hsl(var(--chart-1))" : "hsl(var(--primary))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {hasData && (
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--primary))" }} />
              <span className="text-muted-foreground">Custom Template</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
              <span className="text-muted-foreground">System Template</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
