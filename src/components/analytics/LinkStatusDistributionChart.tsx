import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface LinkStatusDistributionChartProps {
  timeRange: { startDate: Date; endDate: Date };
}

const COLORS = {
  active: "hsl(142, 76%, 36%)", // green
  expired: "hsl(var(--muted-foreground))",
  revoked: "hsl(0, 84%, 60%)", // red
};

export function LinkStatusDistributionChart({ timeRange }: LinkStatusDistributionChartProps) {
  const { organization } = useOrganization();

  const { data: accessData, isLoading } = useQuery({
    queryKey: ["link-status-distribution", organization?.id, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("attachment_access")
        .select("expires_at, revoked_at")
        .eq("organization_id", organization.id)
        .gte("created_at", timeRange.startDate.toISOString())
        .lte("created_at", timeRange.endDate.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  const chartData = useMemo(() => {
    if (!accessData?.length) return [];

    const now = new Date();
    let active = 0;
    let expired = 0;
    let revoked = 0;

    accessData.forEach((item) => {
      if (item.revoked_at) {
        revoked++;
      } else if (item.expires_at && new Date(item.expires_at) < now) {
        expired++;
      } else {
        active++;
      }
    });

    return [
      { name: "Active", value: active, color: COLORS.active },
      { name: "Expired", value: expired, color: COLORS.expired },
      { name: "Revoked", value: revoked, color: COLORS.revoked },
    ].filter(item => item.value > 0);
  }, [accessData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Link Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Link Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No links in this period
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value} links`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{item.value}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({Math.round((item.value / total) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-sm font-semibold">{total}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
