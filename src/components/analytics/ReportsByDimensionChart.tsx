import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TimeRangeProps {
  startDate: Date;
  endDate: Date;
}

interface ReportsByDimensionChartProps {
  timeRange: TimeRangeProps;
  dimension: "client" | "investigator";
}

export function ReportsByDimensionChart({ timeRange, dimension }: ReportsByDimensionChartProps) {
  const { organization } = useOrganization();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["reports-by-dimension", organization?.id, dimension, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return [];

      if (dimension === "client") {
        // Get reports with case -> account relationship
        const { data: reports, error } = await supabase
          .from("report_instances")
          .select(`
            id,
            case_id,
            cases!inner(
              account_id,
              accounts(id, name)
            )
          `)
          .eq("organization_id", organization.id)
          .gte("generated_at", timeRange.startDate.toISOString())
          .lte("generated_at", timeRange.endDate.toISOString());

        if (error) throw error;

        // Group by client
        const clientCounts = new Map<string, { id: string; name: string; count: number }>();
        
        reports?.forEach(report => {
          const caseData = report.cases as { account_id: string | null; accounts: { id: string; name: string } | null } | null;
          const account = caseData?.accounts;
          if (account) {
            const existing = clientCounts.get(account.id);
            if (existing) {
              existing.count++;
            } else {
              clientCounts.set(account.id, { id: account.id, name: account.name, count: 1 });
            }
          }
        });

        return Array.from(clientCounts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map(item => ({
            ...item,
            displayName: item.name.length > 20 ? item.name.substring(0, 17) + "..." : item.name,
          }));
      } else {
        // Get reports and fetch profiles separately
        const { data: reports, error } = await supabase
          .from("report_instances")
          .select("id, user_id")
          .eq("organization_id", organization.id)
          .gte("generated_at", timeRange.startDate.toISOString())
          .lte("generated_at", timeRange.endDate.toISOString());

        if (error) throw error;

        // Get unique user IDs
        const userIds = [...new Set(reports?.map(r => r.user_id) || [])];
        
        // Fetch profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Group by user
        const userCounts = new Map<string, { id: string; name: string; count: number }>();
        
        reports?.forEach(report => {
          const profile = profileMap.get(report.user_id);
          if (profile) {
            const name = profile.full_name || profile.email;
            const existing = userCounts.get(profile.id);
            if (existing) {
              existing.count++;
            } else {
              userCounts.set(profile.id, { id: profile.id, name, count: 1 });
            }
          }
        });

        return Array.from(userCounts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map(item => ({
            ...item,
            displayName: item.name.length > 20 ? item.name.substring(0, 17) + "..." : item.name,
          }));
      }
    },
    enabled: !!organization?.id,
  });

  const handleBarClick = (data: { id: string }) => {
    if (dimension === "client") {
      navigate(`/accounts/${data.id}`);
    } else {
      navigate(`/users/${data.id}`);
    }
  };

  const title = dimension === "client" ? "Reports by Client" : "Reports by Investigator";
  const description = dimension === "client" 
    ? "Top clients by report volume" 
    : "Top investigators by report generation";
  const Icon = dimension === "client" ? Building2 : Users;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
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
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for this time period
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
                dataKey="displayName" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={130}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
              />
              <Bar 
                dataKey="count" 
                name="Reports" 
                fill={dimension === "client" ? "hsl(var(--chart-3))" : "hsl(var(--chart-4))"}
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data) => handleBarClick(data)}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
