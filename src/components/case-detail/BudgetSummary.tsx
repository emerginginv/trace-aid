import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { BudgetAdjustmentForm } from "./BudgetAdjustmentForm";
import { DollarSign, Info } from "lucide-react";

interface BudgetSummaryData {
  budget_hours_authorized: number;
  budget_dollars_authorized: number;
  hours_consumed: number;
  dollars_consumed: number;
  hours_remaining: number;
  dollars_remaining: number;
  hours_utilization_pct: number;
  dollars_utilization_pct: number;
}

interface BudgetSummaryProps {
  caseId: string;
  refreshKey?: number;
  onAdjustmentSuccess?: () => void;
}

export function BudgetSummary({ caseId, refreshKey, onAdjustmentSuccess }: BudgetSummaryProps) {
  const [summary, setSummary] = useState<BudgetSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { hasPermission, loading: permLoading } = usePermissions();

  useEffect(() => {
    fetchBudgetSummary();
  }, [caseId, refreshKey]);

  const fetchBudgetSummary = async () => {
    try {
      const { data, error } = await supabase
        .rpc("get_case_budget_summary", { p_case_id: caseId });

      if (error) throw error;

      if (data && data.length > 0) {
        setSummary(data[0]);
      }
    } catch (error) {
      console.error("Error fetching budget summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)} hrs`;
  };

  const canModifyBudget = hasPermission("modify_case_budget");
  const hasBudget = summary && (summary.budget_hours_authorized > 0 || summary.budget_dollars_authorized > 0);

  if (loading || permLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Budget Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // No budget set - show option to set one
  if (!hasBudget) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Budget Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {canModifyBudget ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">No budget set for this case.</p>
              <BudgetAdjustmentForm 
                caseId={caseId} 
                onSuccess={onAdjustmentSuccess || fetchBudgetSummary}
                triggerButton={
                  <Button variant="outline" size="sm">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Set Budget
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-muted-foreground py-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>No budget set for this case. Contact an admin or manager to set a budget.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Budget Summary</CardTitle>
        {canModifyBudget && (
          <BudgetAdjustmentForm 
            caseId={caseId} 
            onSuccess={onAdjustmentSuccess || fetchBudgetSummary}
          />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.budget_hours_authorized > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Hours</span>
              <span className="text-muted-foreground">
                {summary.hours_utilization_pct}% used
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Authorized</p>
                <p className="font-medium">{formatHours(summary.budget_hours_authorized)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Consumed</p>
                <p className="font-medium">{formatHours(summary.hours_consumed)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Remaining</p>
                <p className={`font-medium ${summary.hours_remaining < 0 ? 'text-destructive' : ''}`}>
                  {formatHours(summary.hours_remaining)}
                </p>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  summary.hours_utilization_pct > 100 
                    ? 'bg-destructive' 
                    : summary.hours_utilization_pct > 80 
                      ? 'bg-yellow-500' 
                      : 'bg-primary'
                }`}
                style={{ width: `${Math.min(summary.hours_utilization_pct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {summary.budget_dollars_authorized > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Dollars</span>
              <span className="text-muted-foreground">
                {summary.dollars_utilization_pct}% used
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Authorized</p>
                <p className="font-medium">{formatCurrency(summary.budget_dollars_authorized)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Consumed</p>
                <p className="font-medium">{formatCurrency(summary.dollars_consumed)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Remaining</p>
                <p className={`font-medium ${summary.dollars_remaining < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(summary.dollars_remaining)}
                </p>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  summary.dollars_utilization_pct > 100 
                    ? 'bg-destructive' 
                    : summary.dollars_utilization_pct > 80 
                      ? 'bg-yellow-500' 
                      : 'bg-primary'
                }`}
                style={{ width: `${Math.min(summary.dollars_utilization_pct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Permission message for non-permitted users */}
        {!canModifyBudget && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <p>Contact an admin or manager to adjust the budget.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
