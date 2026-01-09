import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users } from "lucide-react";

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

  const { data, isLoading } = useQuery({
    queryKey: ["reports-by-dimension", organization?.id, dimension, timeRange.startDate, timeRange.endDate],
    queryFn: async () => {
      if (!organization?.id) return [];

      if (dimension === "client") {
        // For client dimension: join through cases to get account info
        const { data: reports, error } = await supabase
          .from("generated_reports")
          .select(`
            id,
            case_id,
            cases!inner(
              account_id,
              accounts!cases_account_id_fkey(id, name)
            )
          `)
          .eq("organization_id", organization.id)
          .gte("generated_at", timeRange.startDate.toISOString())
          .lte("generated_at", timeRange.endDate.toISOString());

        if (error) throw error;

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
          } else {
            // Handle reports without an associated client
            const noClientKey = "_no_client";
            const existing = clientCounts.get(noClientKey);
            if (existing) {
              existing.count++;
            } else {
              clientCounts.set(noClientKey, { id: noClientKey, name: "No Client", count: 1 });
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
        // For investigator dimension: group by user who generated the report
        const { data: reports, error } = await supabase
          .from("generated_reports")
          .select("id, user_id")
          .eq("organization_id", organization.id)
          .gte("generated_at", timeRange.startDate.toISOString())
          .lte("generated_at", timeRange.endDate.toISOString());

        if (error) throw error;

        const userIds = [...new Set(reports?.map(r => r.user_id) || [])];
        
        if (userIds.length === 0) return [];
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
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

  const title = dimension === "client" ? "Reports by Client" : "Reports by User";
  const Icon = dimension === "client" ? Building2 : Users;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
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
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="displayName" tick={{ fontSize: 12 }} width={130} />
              <Tooltip labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label} />
              <Bar dataKey="count" name="Reports" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
