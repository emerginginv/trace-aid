import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface BudgetAdjustment {
  id: string;
  adjustment_type: string;
  previous_value: number | null;
  new_value: number;
  adjustment_amount: number;
  reason: string;
  created_at: string;
  user_id: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface BudgetAdjustmentsHistoryProps {
  caseId: string;
  refreshKey?: number;
}

export function BudgetAdjustmentsHistory({ caseId, refreshKey }: BudgetAdjustmentsHistoryProps) {
  const [adjustments, setAdjustments] = useState<BudgetAdjustment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdjustments();
  }, [caseId, refreshKey]);

  const fetchAdjustments = async () => {
    try {
      const { data, error } = await supabase
        .from("case_budget_adjustments")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAdjustments(data || []);

      // Fetch profile info for all users
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(a => a.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesData) {
          const profileMap: Record<string, Profile> = {};
          profilesData.forEach(p => {
            profileMap[p.id] = p;
          });
          setProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error("Error fetching budget adjustments:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number | null, type: string) => {
    if (value === null) return "—";
    if (type === "hours") return `${value} hrs`;
    return `$${value.toLocaleString()}`;
  };

  const getUserName = (userId: string) => {
    const profile = profiles[userId];
    return profile?.full_name || profile?.email || "Unknown";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adjustment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (adjustments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adjustment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No budget adjustments recorded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Adjustment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {adjustments.map((adj) => (
            <div key={adj.id} className="border rounded-md p-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">
                  {adj.adjustment_type} Adjustment
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(adj.created_at), "MMM d, yyyy h:mm a")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{formatValue(adj.previous_value, adj.adjustment_type)}</span>
                <span>→</span>
                <span className="font-medium text-foreground">
                  {formatValue(adj.new_value, adj.adjustment_type)}
                </span>
                <span className={`ml-2 ${adj.adjustment_amount > 0 ? 'text-green-600' : adj.adjustment_amount < 0 ? 'text-red-600' : ''}`}>
                  ({adj.adjustment_amount > 0 ? '+' : ''}{formatValue(adj.adjustment_amount, adj.adjustment_type)})
                </span>
              </div>
              <p className="text-muted-foreground italic">"{adj.reason}"</p>
              <p className="text-xs text-muted-foreground">by {getUserName(adj.user_id)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
