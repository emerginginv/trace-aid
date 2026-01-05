import { useState, useEffect } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { MetricKpiCard } from "@/components/analytics/MetricKpiCard";
import { BudgetUtilizationChart } from "@/components/analytics/BudgetUtilizationChart";
import { BudgetStatusDistribution } from "@/components/analytics/BudgetStatusDistribution";
import { BudgetByDimensionChart } from "@/components/analytics/BudgetByDimensionChart";
import { CaseBudgetDistribution } from "@/components/analytics/CaseBudgetDistribution";
import { createPresetTimeRange, type TimeRangePreset } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, AlertTriangle, Clock } from "lucide-react";
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

export default function BudgetAnalytics() {
  const { organization } = useOrganization();
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>("last_30_days");
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const timeRange = createPresetTimeRange(timeRangePreset);
  const organizationId = organization?.id || "";

  const breadcrumbItems = [
    { label: "Analytics", href: "/analytics" },
    { label: "Budget Analytics" },
  ];

  useEffect(() => {
    async function fetchBudgetSummary() {
      if (!organizationId) return;
      setLoading(true);

      try {
        // Get all cases with budgets
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

        // Get consumed amounts
        const { data: finances } = await supabase
          .from("case_finances")
          .select("case_id, amount, hours, finance_type")
          .in("case_id", caseIds)
          .in("finance_type", ["time", "expense"]);

        // Calculate totals
        const totalAuthorizedDollars = cases.reduce((sum, c) => sum + (c.budget_dollars || 0), 0);
        const totalAuthorizedHours = cases.reduce((sum, c) => sum + (c.budget_hours || 0), 0);

        // Calculate consumption per case
        const consumptionMap = new Map<string, { dollars: number; hours: number }>();
        for (const f of finances || []) {
          const current = consumptionMap.get(f.case_id) || { dollars: 0, hours: 0 };
          consumptionMap.set(f.case_id, {
            dollars: current.dollars + (f.amount || 0),
            hours: current.hours + (f.hours || 0),
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
  }, [organizationId]);

  const utilizationStyles = summary
    ? getBudgetStatusStyles(summary.utilizationPercent)
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <BreadcrumbNav items={breadcrumbItems} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Budget Analytics</h1>
              <p className="text-muted-foreground">
                Track budget authorization and utilization across cases
              </p>
            </div>
          </div>
          <TimeRangeSelector value={timeRangePreset} onChange={setTimeRangePreset} />
        </div>
      </div>

      {/* Custom KPI Cards for Budget Metrics */}
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetUtilizationChart organizationId={organizationId} timeRange={timeRange} />
        <BudgetStatusDistribution organizationId={organizationId} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetByDimensionChart
          organizationId={organizationId}
          dimension="client"
          title="Budget by Client (Top 10)"
        />
        <BudgetByDimensionChart
          organizationId={organizationId}
          dimension="investigator"
          title="Budget by Investigator"
        />
      </div>

      {/* Case Budget Distribution */}
      <CaseBudgetDistribution organizationId={organizationId} />
    </div>
  );
}
