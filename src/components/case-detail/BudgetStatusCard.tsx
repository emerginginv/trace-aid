import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  DollarSign, 
  Infinity, 
  Shield, 
  ShieldAlert, 
  History, 
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useCaseBudget, CaseBudget } from "@/hooks/useCaseBudget";
import { BudgetSetupForm } from "./BudgetSetupForm";
import { BudgetAdjustmentForm } from "./BudgetAdjustmentForm";
import { BudgetWarningBanner } from "./BudgetWarningBanner";
import { getBudgetStatusStyles, formatBudgetCurrency, formatBudgetHours } from "@/lib/budgetUtils";
import { ContextualHelp } from "@/components/help-center";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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

interface BudgetStatusCardProps {
  caseId: string;
  organizationId: string;
  refreshKey?: number;
  onViewHistory?: () => void;
}

export function BudgetStatusCard({ 
  caseId, 
  organizationId, 
  refreshKey,
  onViewHistory 
}: BudgetStatusCardProps) {
  const { budget, loading: budgetLoading, refetch } = useCaseBudget(caseId);
  const { hasPermission } = usePermissions();
  const [summary, setSummary] = useState<BudgetSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const canModifyBudget = hasPermission("modify_case_budget");

  useEffect(() => {
    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_case_budget_summary", {
          p_case_id: caseId,
        });

        if (error) throw error;
        if (data && data.length > 0) {
          setSummary(data[0]);
        }
      } catch (err) {
        console.error("Error fetching budget summary:", err);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [caseId, refreshKey]);

  const handleBudgetSuccess = () => {
    refetch();
  };

  const loading = budgetLoading || summaryLoading;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Budget Status
            <ContextualHelp feature="case_budgets" />
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

  // No budget configured
  if (!budget) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Budget Status
            <ContextualHelp feature="case_budgets" />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3">
            <Infinity className="h-5 w-5" />
            <p className="text-sm">No budget configured</p>
          </div>
          {canModifyBudget && (
            <BudgetSetupForm
              caseId={caseId}
              organizationId={organizationId}
              onSuccess={handleBudgetSuccess}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  // Get utilization info
  const hoursUtilization = summary?.hours_utilization_pct || 0;
  const dollarsUtilization = summary?.dollars_utilization_pct || 0;
  const primaryUtilization = Math.max(hoursUtilization, dollarsUtilization);
  
  const hoursStyles = getBudgetStatusStyles(hoursUtilization);
  const dollarsStyles = getBudgetStatusStyles(dollarsUtilization);

  const showHoursWarning = budget.total_budget_hours && hoursUtilization >= 80;
  const showDollarsWarning = budget.total_budget_amount && dollarsUtilization >= 80 && !showHoursWarning;

  // Prepare donut chart data
  const createDonutData = (consumed: number, remaining: number, utilization: number) => {
    if (utilization >= 100) {
      return [
        { name: "consumed", value: 100 },
        { name: "remaining", value: 0 },
      ];
    }
    return [
      { name: "consumed", value: Math.max(0, consumed) },
      { name: "remaining", value: Math.max(0, remaining) },
    ];
  };

  const hoursDonutData = budget.total_budget_hours
    ? createDonutData(
        summary?.hours_consumed || 0,
        summary?.hours_remaining || 0,
        hoursUtilization
      )
    : [];

  const getDonutColor = (status: string) => {
    switch (status) {
      case "over":
        return "hsl(var(--destructive))";
      case "critical":
        return "#f97316";
      case "warning":
        return "#eab308";
      default:
        return "hsl(var(--primary))";
    }
  };

  return (
    <Card className={primaryUtilization >= 100 ? "border-destructive/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Budget Status
            <ContextualHelp feature="case_budgets" />
          </CardTitle>
          <Badge 
            variant={budget.hard_cap ? "destructive" : "secondary"} 
            className="text-xs flex items-center gap-1"
          >
            {budget.hard_cap ? (
              <>
                <ShieldAlert className="h-3 w-3" />
                Hard Cap
              </>
            ) : (
              <>
                <Shield className="h-3 w-3" />
                Soft Cap
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Banners */}
        {showHoursWarning && summary && (
          <BudgetWarningBanner
            utilizationPct={hoursUtilization}
            remaining={summary.hours_remaining}
            type="hours"
            authorized={summary.budget_hours_authorized}
          />
        )}
        {showDollarsWarning && summary && (
          <BudgetWarningBanner
            utilizationPct={dollarsUtilization}
            remaining={summary.dollars_remaining}
            type="dollars"
            authorized={summary.budget_dollars_authorized}
          />
        )}

        {/* Hard cap blocking warning */}
        {budget.hard_cap && primaryUtilization >= 100 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Budget exceeded. Hard cap is blocking additional work.</span>
          </div>
        )}

        {/* Donut Chart for Hours */}
        {budget.total_budget_hours && summary && (
          <div className="flex items-center justify-center gap-4">
            <div className={`relative w-24 h-24 ${hoursUtilization >= 100 ? "animate-pulse" : ""}`}>
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
                    <Cell fill={getDonutColor(hoursStyles.status)} />
                    <Cell fill="hsl(var(--muted))" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-medium ${hoursStyles.textClass}`}>
                  {Math.round(hoursUtilization)}%
                </span>
              </div>
            </div>
            <div className="text-left">
              <p className={`text-2xl font-semibold ${summary.hours_remaining < 0 ? "text-destructive" : ""}`}>
                {summary.hours_remaining < 0 ? "-" : ""}
                {formatBudgetHours(Math.abs(summary.hours_remaining)).replace(" hrs", "")}
              </p>
              <p className={`text-xs ${summary.hours_remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {summary.hours_remaining < 0 ? "hrs over budget" : "hrs remaining"}
              </p>
            </div>
          </div>
        )}

        {/* Summary Lines */}
        <div className="space-y-2 text-sm">
          {budget.total_budget_hours && summary && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Hours
              </span>
              <span className={`font-medium ${hoursStyles.textClass}`}>
                {formatBudgetHours(summary.hours_consumed).replace(" hrs", "")} / {formatBudgetHours(budget.total_budget_hours).replace(" hrs", "")}
                <span className={`ml-1 text-xs ${hoursStyles.textClass}`}>
                  ({Math.round(hoursUtilization)}%)
                </span>
              </span>
            </div>
          )}
          {budget.total_budget_amount && summary && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Dollars
              </span>
              <span className={`font-medium ${dollarsStyles.textClass}`}>
                {formatBudgetCurrency(summary.dollars_consumed)} / {formatBudgetCurrency(budget.total_budget_amount)}
                <span className={`ml-1 text-xs ${dollarsStyles.textClass}`}>
                  ({Math.round(dollarsUtilization)}%)
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Budget type indicator */}
        <div className="text-xs text-muted-foreground pt-1 border-t">
          Budget Type: {budget.budget_type === "both" ? "Hours & Dollars" : budget.budget_type === "hours" ? "Hours Only" : "Dollars Only"}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {canModifyBudget && (
            <>
              <BudgetSetupForm
                caseId={caseId}
                organizationId={organizationId}
                onSuccess={handleBudgetSuccess}
                existingBudget={budget}
                triggerButton={
                  <Button variant="outline" size="sm" className="flex-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Adjust
                  </Button>
                }
              />
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={onViewHistory}
            disabled={!onViewHistory}
          >
            <History className="h-3 w-3 mr-1" />
            History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
