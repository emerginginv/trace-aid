import { useState, useEffect, useMemo } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { MetricKpiCard } from "@/components/analytics/MetricKpiCard";
import { BudgetUtilizationChart } from "@/components/analytics/BudgetUtilizationChart";
import { BudgetStatusDistribution } from "@/components/analytics/BudgetStatusDistribution";
import { BudgetByDimensionChart } from "@/components/analytics/BudgetByDimensionChart";
import { CaseBudgetDistribution } from "@/components/analytics/CaseBudgetDistribution";
import { ProfitabilityOverviewChart } from "@/components/analytics/ProfitabilityOverviewChart";
import { ProfitTrendChart } from "@/components/analytics/ProfitTrendChart";
import { CaseProfitabilityTable } from "@/components/analytics/CaseProfitabilityTable";
import { ClientProfitabilityChart } from "@/components/analytics/ClientProfitabilityChart";
import { createPresetTimeRange, resolveTimeRange, type TimeRangePreset } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, AlertTriangle, Clock, Banknote, Target, Percent, TrendingDown } from "lucide-react";
import { formatBudgetCurrency, formatBudgetHours, getBudgetStatus, getBudgetStatusStyles } from "@/lib/budgetUtils";

const COMPARISON_MAP: Record<TimeRangePreset, TimeRangePreset> = {
  last_7_days: "last_7_days",
  last_30_days: "last_30_days",
  this_month: "last_month",
  last_month: "last_month",
  this_quarter: "last_quarter",
  last_quarter: "last_quarter",
  this_year: "last_year",
  last_year: "last_year",
  all_time: "all_time",
  today: "yesterday",
  yesterday: "yesterday",
  this_week: "last_week",
  last_week: "last_week",
  last_90_days: "last_90_days",
  last_365_days: "last_365_days",
};

interface BudgetSummary {
  totalAuthorizedDollars: number;
  totalConsumedDollars: number;
  totalAuthorizedHours: number;
  totalConsumedHours: number;
  utilizationPercent: number;
  hoursUtilizationPercent: number;
  overrunCount: number;
  atRiskCount: number;
}

interface ProfitabilitySummary {
  totalRevenue: number;
  collectedRevenue: number;
  totalCosts: number;
  timeCosts: number;
  expenseCosts: number;
  grossProfit: number;
  profitMargin: number;
  billableValue: number;
  realizationRate: number;
}

export default function BudgetAnalytics() {
  const { organization } = useOrganization();
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>("last_30_days");
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [profitability, setProfitability] = useState<ProfitabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [profitLoading, setProfitLoading] = useState(true);

  useSetBreadcrumbs([
    { label: "Analytics", href: "/analytics" },
    { label: "Financial Analytics" },
  ]);

  const timeRange = useMemo(() => createPresetTimeRange(timeRangePreset), [timeRangePreset]);
  const organizationId = organization?.id || "";

  // Fetch budget summary
  useEffect(() => {
    async function fetchBudgetSummary() {
      if (!organizationId) return;
      setLoading(true);

      try {
        const { start, end } = resolveTimeRange(timeRange);
        
        // Get all cases with budgets (no time filter - budgets are always authorized)
        const { data: cases } = await supabase
          .from("cases")
          .select("id, budget_dollars, budget_hours")
          .eq("organization_id", organizationId)
          .or("budget_dollars.gt.0,budget_hours.gt.0");

        if (!cases || cases.length === 0) {
          setSummary({
            totalAuthorizedDollars: 0,
            totalConsumedDollars: 0,
            totalAuthorizedHours: 0,
            totalConsumedHours: 0,
            utilizationPercent: 0,
            hoursUtilizationPercent: 0,
            overrunCount: 0,
            atRiskCount: 0,
          });
          setLoading(false);
          return;
        }

        const caseIds = cases.map((c) => c.id);

        // Get consumed amounts filtered by time range
        const { data: finances } = await supabase
          .from("case_finances")
          .select("case_id, amount, hours, finance_type")
          .in("case_id", caseIds)
          .in("finance_type", ["time", "expense"])
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        // Calculate totals
        const totalAuthorizedDollars = cases.reduce((sum, c) => sum + (c.budget_dollars || 0), 0);
        const totalAuthorizedHours = cases.reduce((sum, c) => sum + (c.budget_hours || 0), 0);

        // Calculate consumption per case
        const consumptionMap = new Map<string, { dollars: number; hours: number }>();
        for (const f of finances || []) {
          const current = consumptionMap.get(f.case_id) || { dollars: 0, hours: 0 };
          consumptionMap.set(f.case_id, {
            dollars: current.dollars + (f.amount || 0),
            hours: current.hours + (f.finance_type === "time" ? (f.hours || 0) : 0),
          });
        }

        let totalConsumedDollars = 0;
        let totalConsumedHours = 0;
        let overrunCount = 0;
        let atRiskCount = 0;

        for (const c of cases) {
          const consumed = consumptionMap.get(c.id) || { dollars: 0, hours: 0 };
          totalConsumedDollars += consumed.dollars;
          totalConsumedHours += consumed.hours;

          // Check status
          let utilization = 0;
          if (c.budget_dollars && c.budget_dollars > 0) {
            utilization = (consumed.dollars / c.budget_dollars) * 100;
          } else if (c.budget_hours && c.budget_hours > 0) {
            utilization = (consumed.hours / c.budget_hours) * 100;
          }

          const status = getBudgetStatus(utilization);
          if (status === "over") overrunCount++;
          if (status === "warning" || status === "critical") atRiskCount++;
        }

        const utilizationPercent =
          totalAuthorizedDollars > 0
            ? (totalConsumedDollars / totalAuthorizedDollars) * 100
            : 0;
        const hoursUtilizationPercent =
          totalAuthorizedHours > 0
            ? (totalConsumedHours / totalAuthorizedHours) * 100
            : 0;

        setSummary({
          totalAuthorizedDollars,
          totalConsumedDollars,
          totalAuthorizedHours,
          totalConsumedHours,
          utilizationPercent,
          hoursUtilizationPercent,
          overrunCount,
          atRiskCount,
        });
      } catch (error) {
        console.error("Error fetching budget summary:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBudgetSummary();
  }, [organizationId, timeRange]);

  // Fetch profitability summary
  useEffect(() => {
    async function fetchProfitabilitySummary() {
      if (!organizationId) return;
      setProfitLoading(true);

      try {
        const { start, end } = resolveTimeRange(timeRange);

        // Fetch invoices for revenue
        const { data: invoices } = await supabase
          .from("invoices")
          .select("total, total_paid")
          .eq("organization_id", organizationId)
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        // Fetch case finances for costs and billable value
        const { data: finances } = await supabase
          .from("case_finances")
          .select("amount, hours, hourly_rate, finance_type")
          .eq("organization_id", organizationId)
          .in("finance_type", ["time", "expense"])
          .gte("date", start.toISOString())
          .lte("date", end.toISOString());

        const totalRevenue = (invoices || []).reduce((sum, inv) => sum + (inv.total || 0), 0);
        const collectedRevenue = (invoices || []).reduce((sum, inv) => sum + (inv.total_paid || 0), 0);

        let timeCosts = 0;
        let expenseCosts = 0;
        let billableValue = 0;

        for (const f of finances || []) {
          if (f.finance_type === "time") {
            timeCosts += f.amount || 0;
            // Calculate billable value from hours * hourly_rate if available
            if (f.hours && f.hourly_rate) {
              billableValue += f.hours * f.hourly_rate;
            } else {
              billableValue += f.amount || 0;
            }
          } else if (f.finance_type === "expense") {
            expenseCosts += f.amount || 0;
          }
        }

        const totalCosts = timeCosts + expenseCosts;
        const grossProfit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const realizationRate = billableValue > 0 ? (totalRevenue / billableValue) * 100 : 0;

        setProfitability({
          totalRevenue,
          collectedRevenue,
          totalCosts,
          timeCosts,
          expenseCosts,
          grossProfit,
          profitMargin,
          billableValue,
          realizationRate,
        });
      } catch (error) {
        console.error("Error fetching profitability summary:", error);
      } finally {
        setProfitLoading(false);
      }
    }

    fetchProfitabilitySummary();
  }, [organizationId, timeRange]);

  const utilizationStyles = summary
    ? getBudgetStatusStyles(summary.utilizationPercent)
    : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProfitMarginStyles = (margin: number) => {
    if (margin >= 20) return { bgClass: "bg-emerald-500/10", textClass: "text-emerald-600 dark:text-emerald-400" };
    if (margin >= 0) return { bgClass: "bg-amber-500/10", textClass: "text-amber-600 dark:text-amber-400" };
    return { bgClass: "bg-destructive/10", textClass: "text-destructive" };
  };

  const profitStyles = profitability ? getProfitMarginStyles(profitability.profitMargin) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Financial & Budget Analytics</h1>
              <p className="text-muted-foreground">
                Track profitability, budget utilization, and financial performance
              </p>
            </div>
          </div>
          <TimeRangeSelector value={timeRangePreset} onChange={setTimeRangePreset} />
        </div>
      </div>

      {/* Profitability Metrics Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Profitability Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Total Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(profitability?.totalRevenue || 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Invoiced amount</p>
            </CardContent>
          </Card>

          {/* Collected Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(profitability?.collectedRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profitability && profitability.totalRevenue > 0
                      ? `${((profitability.collectedRevenue / profitability.totalRevenue) * 100).toFixed(0)}% collected`
                      : "0% collected"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total Costs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(profitability?.totalCosts || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Time + Expenses</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Gross Profit */}
          <Card className={profitStyles?.bgClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <TrendingUp className={`h-4 w-4 ${profitStyles?.textClass || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className={`text-2xl font-bold ${profitStyles?.textClass}`}>
                  {formatCurrency(profitability?.grossProfit || 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Revenue - Costs</p>
            </CardContent>
          </Card>

          {/* Profit Margin */}
          <Card className={profitStyles?.bgClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <Percent className={`h-4 w-4 ${profitStyles?.textClass || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className={`text-2xl font-bold ${profitStyles?.textClass}`}>
                  {profitability?.profitMargin.toFixed(1)}%
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {(profitability?.profitMargin || 0) >= 20 ? "Healthy" : (profitability?.profitMargin || 0) >= 0 ? "Low" : "Loss"}
              </p>
            </CardContent>
          </Card>

          {/* Realization Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Realization Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {profitability?.realizationRate.toFixed(0)}%
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Billed vs Billable</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profitability Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfitabilityOverviewChart organizationId={organizationId} timeRange={timeRange} />
        <ProfitTrendChart organizationId={organizationId} timeRange={timeRange} />
      </div>

      {/* Budget Metrics Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Budget Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Authorized Budget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Authorized Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatBudgetCurrency(summary?.totalAuthorizedDollars || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Consumed */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Consumed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatBudgetCurrency(summary?.totalConsumedDollars || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Utilization % */}
          <Card className={utilizationStyles?.bgClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
              <TrendingUp className={`h-4 w-4 ${utilizationStyles?.textClass || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className={`text-2xl font-bold ${utilizationStyles?.textClass}`}>
                  {summary?.utilizationPercent.toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hours Authorized */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Authorized</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatBudgetHours(summary?.totalAuthorizedHours || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hours Consumed */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Consumed</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatBudgetHours(summary?.totalConsumedHours || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Overruns */}
          <Card className={summary && summary.overrunCount > 0 ? "bg-destructive/10" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Overruns</CardTitle>
              <AlertTriangle
                className={`h-4 w-4 ${
                  summary && summary.overrunCount > 0 ? "text-destructive" : "text-muted-foreground"
                }`}
              />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div
                  className={`text-2xl font-bold ${
                    summary && summary.overrunCount > 0 ? "text-destructive" : ""
                  }`}
                >
                  {summary?.overrunCount || 0}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    cases over budget
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Budget Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetUtilizationChart organizationId={organizationId} timeRange={timeRange} />
        <BudgetStatusDistribution organizationId={organizationId} timeRange={timeRange} />
      </div>

      {/* Budget Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetByDimensionChart
          organizationId={organizationId}
          dimension="client"
          title="Budget by Client (Top 10)"
          timeRange={timeRange}
        />
        <BudgetByDimensionChart
          organizationId={organizationId}
          dimension="investigator"
          title="Budget by Investigator"
          timeRange={timeRange}
        />
      </div>

      {/* Case Profitability Analysis Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Profitability Analysis
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CaseProfitabilityTable organizationId={organizationId} timeRange={timeRange} />
          <ClientProfitabilityChart organizationId={organizationId} timeRange={timeRange} />
        </div>
      </div>

      {/* Case Budget Distribution */}
      <CaseBudgetDistribution organizationId={organizationId} timeRange={timeRange} />
    </div>
  );
}
