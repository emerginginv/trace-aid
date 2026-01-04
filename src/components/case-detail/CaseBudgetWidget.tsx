import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, TrendingUp, History, Plus, Infinity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { BudgetAdjustmentForm } from "./BudgetAdjustmentForm";
import { BudgetWarningBanner } from "./BudgetWarningBanner";
import { getBudgetStatusStyles, formatBudgetCurrency, formatBudgetHours } from "@/lib/budgetUtils";

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
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3">
            <Infinity className="h-5 w-5" />
            <p className="text-sm">No budget configured</p>
          </div>
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

  // Get styles based on utilization
  const hoursStyles = getBudgetStatusStyles(summary.hours_utilization_pct);
  const dollarsStyles = getBudgetStatusStyles(summary.dollars_utilization_pct);
  
  // Determine primary warning (show the more critical one)
  const primaryUtilization = Math.max(summary.hours_utilization_pct, summary.dollars_utilization_pct);
  const showHoursWarning = summary.budget_hours_authorized > 0 && summary.hours_utilization_pct >= 80;
  const showDollarsWarning = summary.budget_dollars_authorized > 0 && summary.dollars_utilization_pct >= 80 && !showHoursWarning;

  // Prepare donut chart data for hours - handle over-budget
  const hoursDonutData = summary.budget_hours_authorized > 0
    ? summary.hours_utilization_pct >= 100
      ? [{ name: "consumed", value: 100 }, { name: "remaining", value: 0 }]
      : [
          { name: "consumed", value: Math.max(0, summary.hours_consumed) },
          { name: "remaining", value: Math.max(0, summary.hours_remaining) },
        ]
    : [];

  // Format remaining display - show "Over by X" when negative
  const formatRemaining = (remaining: number, type: "hours" | "dollars") => {
    if (remaining < 0) {
      const overBy = Math.abs(remaining);
      return {
        value: type === "hours" ? formatBudgetHours(overBy).replace(" hrs", "") : formatBudgetCurrency(overBy),
        label: "over budget",
        isOver: true,
      };
    }
    return {
      value: type === "hours" ? formatBudgetHours(remaining).replace(" hrs", "") : formatBudgetCurrency(remaining),
      label: type === "hours" ? "hrs remaining" : "remaining",
      isOver: false,
    };
  };

  const hoursDisplay = formatRemaining(summary.hours_remaining, "hours");

  return (
    <Card className={primaryUtilization >= 100 ? "border-destructive/50" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Budget Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Banner */}
        {showHoursWarning && (
          <BudgetWarningBanner
            utilizationPct={summary.hours_utilization_pct}
            remaining={summary.hours_remaining}
            type="hours"
            authorized={summary.budget_hours_authorized}
          />
        )}
        {showDollarsWarning && (
          <BudgetWarningBanner
            utilizationPct={summary.dollars_utilization_pct}
            remaining={summary.dollars_remaining}
            type="dollars"
            authorized={summary.budget_dollars_authorized}
          />
        )}

        {/* Donut Chart for Hours */}
        {summary.budget_hours_authorized > 0 && (
          <div className="flex items-center justify-center gap-4">
            <div className={`relative w-24 h-24 ${summary.hours_utilization_pct >= 100 ? "animate-pulse" : ""}`}>
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
                    <Cell fill={`hsl(var(--${hoursStyles.status === "over" ? "destructive" : hoursStyles.status === "critical" ? "primary" : hoursStyles.status === "warning" ? "primary" : "primary"}))`} className={hoursStyles.progressClass} style={{ fill: hoursStyles.status === "over" ? "hsl(var(--destructive))" : hoursStyles.status === "critical" ? "#f97316" : hoursStyles.status === "warning" ? "#eab308" : "hsl(var(--primary))" }} />
                    <Cell fill="hsl(var(--muted))" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-medium ${hoursStyles.textClass}`}>
                  {Math.round(summary.hours_utilization_pct)}%
                </span>
              </div>
            </div>
            <div className="text-left">
              <p className={`text-2xl font-semibold ${hoursDisplay.isOver ? "text-destructive" : ""}`}>
                {hoursDisplay.isOver ? "-" : ""}{hoursDisplay.value}
              </p>
              <p className={`text-xs ${hoursDisplay.isOver ? "text-destructive" : "text-muted-foreground"}`}>
                {hoursDisplay.label}
              </p>
            </div>
          </div>
        )}

        {/* Summary Lines */}
        <div className="space-y-2 text-sm">
          {summary.budget_hours_authorized > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Hours</span>
              <span className={`font-medium ${hoursStyles.textClass}`}>
                {formatBudgetHours(summary.hours_consumed).replace(" hrs", "")} / {formatBudgetHours(summary.budget_hours_authorized).replace(" hrs", "")}
                <span className={`ml-1 ${hoursStyles.textClass}`}>
                  ({Math.round(summary.hours_utilization_pct)}%)
                </span>
              </span>
            </div>
          )}
          {summary.budget_dollars_authorized > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Budget</span>
              <span className={`font-medium ${dollarsStyles.textClass}`}>
                {formatBudgetCurrency(summary.dollars_consumed)} / {formatBudgetCurrency(summary.budget_dollars_authorized)}
                <span className={`ml-1 ${dollarsStyles.textClass}`}>
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
