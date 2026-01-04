import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, TrendingUp, History, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { BudgetAdjustmentForm } from "./BudgetAdjustmentForm";

interface BudgetSummaryData {
  budget_hours_authorized: number;
  budget_dollars_authorized: number;
  hours_consumed: number;
  hours_remaining: number;
  hours_utilization_pct: number;
  dollars_consumed: number;
  dollars_remaining: number;
  dollars_utilization_pct: number;
}

interface CaseBudgetWidgetProps {
  caseId: string;
  refreshKey?: number;
  onAdjustmentSuccess?: () => void;
}

export function CaseBudgetWidget({ caseId, refreshKey, onAdjustmentSuccess }: CaseBudgetWidgetProps) {
  const [summary, setSummary] = useState<BudgetSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();

  const canModifyBudget = hasPermission("modify_case_budget");

  useEffect(() => {
    const fetchBudgetSummary = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_case_budget_summary", {
          p_case_id: caseId,
        });

        if (error) {
          console.error("Error fetching budget summary:", error);
          setSummary(null);
        } else if (data && data.length > 0) {
          setSummary(data[0]);
        } else {
          setSummary(null);
        }
      } catch (error) {
        console.error("Error in fetchBudgetSummary:", error);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetSummary();
  }, [caseId, refreshKey]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatHours = (value: number) => {
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };

  const getUtilizationColor = (pct: number) => {
    if (pct >= 100) return "hsl(var(--destructive))";
    if (pct >= 80) return "hsl(45 93% 47%)"; // yellow/warning
    return "hsl(var(--primary))";
  };

  const hasBudget = summary && (summary.budget_hours_authorized > 0 || summary.budget_dollars_authorized > 0);

  const scrollToBudgetTab = () => {
    const budgetTab = document.querySelector('[value="budget"]') as HTMLElement;
    if (budgetTab) {
      budgetTab.click();
      budgetTab.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Empty state - no budget configured
  if (!hasBudget) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">No budget configured</p>
          {canModifyBudget && (
            <BudgetAdjustmentForm
              caseId={caseId}
              onSuccess={onAdjustmentSuccess || (() => {})}
              triggerButton={
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Set Budget
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    );
  }

  // Prepare donut chart data for hours
  const hoursDonutData = summary.budget_hours_authorized > 0
    ? [
        { name: "consumed", value: Math.max(0, summary.hours_consumed) },
        { name: "remaining", value: Math.max(0, summary.hours_remaining) },
      ]
    : [];

  const utilizationColor = getUtilizationColor(summary.hours_utilization_pct);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Budget Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Donut Chart for Hours */}
        {summary.budget_hours_authorized > 0 && (
          <div className="flex items-center justify-center gap-4">
            <div className="relative w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hoursDonutData}
                    dataKey="value"
                    innerRadius={30}
                    outerRadius={45}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={0}
                  >
                    <Cell fill={utilizationColor} />
                    <Cell fill="hsl(var(--muted))" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {Math.round(summary.hours_utilization_pct)}%
                </span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-2xl font-semibold">{formatHours(summary.hours_remaining)}</p>
              <p className="text-xs text-muted-foreground">hrs remaining</p>
            </div>
          </div>
        )}

        {/* Summary Lines */}
        <div className="space-y-2 text-sm">
          {summary.budget_hours_authorized > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Hours</span>
              <span className="font-medium">
                {formatHours(summary.hours_consumed)} / {formatHours(summary.budget_hours_authorized)}
                <span className="text-muted-foreground ml-1">
                  ({Math.round(summary.hours_utilization_pct)}%)
                </span>
              </span>
            </div>
          )}
          {summary.budget_dollars_authorized > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium">
                {formatCurrency(summary.dollars_consumed)} / {formatCurrency(summary.budget_dollars_authorized)}
                <span className="text-muted-foreground ml-1">
                  ({Math.round(summary.dollars_utilization_pct)}%)
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {canModifyBudget && (
            <BudgetAdjustmentForm
              caseId={caseId}
              onSuccess={onAdjustmentSuccess || (() => {})}
              triggerButton={
                <Button variant="outline" size="sm" className="flex-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Adjust
                </Button>
              }
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={scrollToBudgetTab}
          >
            <History className="h-3 w-3 mr-1" />
            History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
