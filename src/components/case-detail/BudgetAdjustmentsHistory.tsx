import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Clock, DollarSign } from "lucide-react";

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

  const getDirectionIcon = (amount: number) => {
    if (amount > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (amount < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTypeIcon = (type: string) => {
    if (type === "hours") {
      return <Clock className="h-4 w-4" />;
    }
    return <DollarSign className="h-4 w-4" />;
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
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead className="text-right">Previous</TableHead>
                <TableHead className="text-right">New</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.map((adj) => (
                <TableRow key={adj.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(adj.created_at), "MMM d, yyyy")}
                    <br />
                    <span className="text-[10px]">
                      {format(new Date(adj.created_at), "h:mm a")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 capitalize">
                      {getTypeIcon(adj.adjustment_type)}
                      <span className="text-sm">{adj.adjustment_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatValue(adj.previous_value, adj.adjustment_type)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatValue(adj.new_value, adj.adjustment_type)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`flex items-center justify-end gap-1 text-sm font-medium ${
                      adj.adjustment_amount > 0 
                        ? 'text-green-600' 
                        : adj.adjustment_amount < 0 
                          ? 'text-red-600' 
                          : 'text-muted-foreground'
                    }`}>
                      {getDirectionIcon(adj.adjustment_amount)}
                      <span>
                        {adj.adjustment_amount > 0 ? '+' : ''}
                        {formatValue(adj.adjustment_amount, adj.adjustment_type)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm text-muted-foreground truncate" title={adj.reason}>
                      {adj.reason}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {getUserName(adj.user_id)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
