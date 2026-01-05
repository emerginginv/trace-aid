import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface CaseStatusChartProps {
  organizationId: string;
}

interface StatusData {
  status: string;
  count: number;
  color: string;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "hsl(var(--primary))",
  Pending: "hsl(var(--warning, 45 93% 47%))",
  "On Hold": "hsl(var(--muted-foreground))",
  Closed: "hsl(var(--secondary))",
};

export function CaseStatusChart({ organizationId }: CaseStatusChartProps) {
  const [data, setData] = useState<StatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      
      setIsLoading(true);
      try {
        const { data: cases, error } = await supabase
          .from("cases")
          .select("status")
          .eq("organization_id", organizationId);

        if (error) throw error;

        // Group by status
        const statusCounts: Record<string, number> = {};
        cases?.forEach((c) => {
          const status = c.status || "Unknown";
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const chartData: StatusData[] = Object.entries(statusCounts)
          .map(([status, count]) => ({
            status,
            count,
            color: STATUS_COLORS[status] || "hsl(var(--muted))",
          }))
          .sort((a, b) => b.count - a.count);

        setData(chartData);
      } catch (error) {
        console.error("Failed to fetch case status data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [organizationId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Cases by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Cases by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="status"
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
              <Bar dataKey="count" name="Cases" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
