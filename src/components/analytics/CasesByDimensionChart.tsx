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
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface CasesByDimensionChartProps {
  organizationId: string;
  dimension: "client" | "investigator";
  title: string;
}

interface DimensionData {
  name: string;
  count: number;
  id?: string;
}

export function CasesByDimensionChart({
  organizationId,
  dimension,
  title,
}: CasesByDimensionChartProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<DimensionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!organizationId) return;
      
      setIsLoading(true);
      try {
        if (dimension === "client") {
          // Fetch cases with account info
          const { data: cases, error } = await supabase
            .from("cases")
            .select(`
              id,
              account_id,
              accounts!cases_account_id_fkey (
                id,
                name
              )
            `)
            .eq("organization_id", organizationId)
            .not("account_id", "is", null);

          if (error) throw error;

          // Group by account
          const accountCounts: Record<string, { name: string; count: number; id: string }> = {};
          cases?.forEach((c) => {
            const account = c.accounts as { id: string; name: string } | null;
            if (account) {
              if (!accountCounts[account.id]) {
                accountCounts[account.id] = { name: account.name, count: 0, id: account.id };
              }
              accountCounts[account.id].count++;
            }
          });

          const chartData = Object.values(accountCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map((item) => ({
              name: item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name,
              count: item.count,
              id: item.id,
            }));

          setData(chartData);
        } else {
          // Fetch cases with investigator info
          const { data: cases, error: casesError } = await supabase
            .from("cases")
            .select("id, investigator_ids")
            .eq("organization_id", organizationId);

          if (casesError) throw casesError;

          // Collect all investigator IDs
          const investigatorIds = new Set<string>();
          cases?.forEach((c) => {
            c.investigator_ids?.forEach((id: string) => investigatorIds.add(id));
          });

          // Fetch investigator profiles
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", Array.from(investigatorIds));

          if (profilesError) throw profilesError;

          const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name || "Unknown"]));

          // Count cases per investigator
          const investigatorCounts: Record<string, { name: string; count: number; id: string }> = {};
          cases?.forEach((c) => {
            c.investigator_ids?.forEach((id: string) => {
              if (!investigatorCounts[id]) {
                investigatorCounts[id] = {
                  name: profileMap.get(id) || "Unknown",
                  count: 0,
                  id,
                };
              }
              investigatorCounts[id].count++;
            });
          });

          const chartData = Object.values(investigatorCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map((item) => ({
              name: item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name,
              count: item.count,
              id: item.id,
            }));

          setData(chartData);
        }
      } catch (error) {
        console.error(`Failed to fetch cases by ${dimension}:`, error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [organizationId, dimension]);

  const handleBarClick = (data: DimensionData) => {
    if (dimension === "client" && data.id) {
      navigate(`/accounts/${data.id}`);
    } else if (dimension === "investigator" && data.id) {
      navigate(`/users/${data.id}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
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
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar
                dataKey="count"
                name="Cases"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data) => handleBarClick(data)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
