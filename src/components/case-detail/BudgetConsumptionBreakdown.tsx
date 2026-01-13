import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  DollarSign, 
  FileText, 
  Briefcase,
  AlertTriangle,
  Ban,
  TrendingUp,
  Timer
} from "lucide-react";
import { useBudgetForecast } from "@/hooks/useBudgetForecast";
import { 
  getBudgetStatusStyles, 
  formatBudgetCurrency, 
  formatBudgetHours,
  getForecastStatusStyles
} from "@/lib/budgetUtils";

interface BudgetConsumptionBreakdownProps {
  caseId: string;
  compact?: boolean;
}

export function BudgetConsumptionBreakdown({ 
  caseId, 
  compact = false 
}: BudgetConsumptionBreakdownProps) {
  const { forecast, loading, error } = useBudgetForecast(caseId);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error || !forecast || !forecast.hasBudget) {
    return null;
  }

  const hoursStyles = getBudgetStatusStyles(forecast.hoursUtilizationPct);
  const amountStyles = getBudgetStatusStyles(forecast.amountUtilizationPct);
  const hoursForecastStyles = getForecastStatusStyles(forecast.hoursForecastUtilizationPct);
  const amountForecastStyles = getForecastStatusStyles(forecast.amountForecastUtilizationPct);

  if (compact) {
    return (
      <div className="space-y-2 text-sm">
        {forecast.hoursAuthorized > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Hours
              </span>
              <span className={hoursStyles.textClass}>
                {formatBudgetHours(forecast.hoursConsumed).replace(" hrs", "")} / 
                {formatBudgetHours(forecast.hoursAuthorized).replace(" hrs", "")}
                <span className="ml-1 opacity-70">({Math.round(forecast.hoursUtilizationPct)}%)</span>
              </span>
            </div>
            {/* Show pending hours if any */}
            {forecast.pendingCount > 0 && forecast.pendingHours > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Pending ({forecast.pendingCount})
                </span>
                <span className={hoursForecastStyles.textClass}>
                  +{formatBudgetHours(forecast.pendingHours)}
                </span>
              </div>
            )}
          </div>
        )}
        {forecast.amountAuthorized > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Amount
              </span>
              <span className={amountStyles.textClass}>
                {formatBudgetCurrency(forecast.amountConsumed)} / 
                {formatBudgetCurrency(forecast.amountAuthorized)}
                <span className="ml-1 opacity-70">({Math.round(forecast.amountUtilizationPct)}%)</span>
              </span>
            </div>
            {/* Show pending amount if any */}
            {forecast.pendingCount > 0 && forecast.pendingAmount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Pending ({forecast.pendingCount})
                </span>
                <span className={amountForecastStyles.textClass}>
                  +{formatBudgetCurrency(forecast.pendingAmount)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Consumption Breakdown
          </CardTitle>
          {/* Forecast-based status badges per SYSTEM PROMPT 9 */}
          {forecast.isForecastExceeded && forecast.hardCap && (
            <Badge variant="destructive" className="text-xs">
              <Ban className="h-3 w-3 mr-1" />
              Hard Cap Risk
            </Badge>
          )}
          {forecast.isForecastExceeded && !forecast.hardCap && (
            <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Forecast Over Budget
            </Badge>
          )}
          {forecast.isForecastWarning && !forecast.isForecastExceeded && (
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Forecast Warning
            </Badge>
          )}
          {!forecast.isForecastWarning && forecast.isExceeded && (
            <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Over Budget
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hours breakdown with forecast */}
        {forecast.hoursAuthorized > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Hours
              </span>
              <span className={hoursStyles.textClass}>
                {formatBudgetHours(forecast.hoursConsumed)} / {formatBudgetHours(forecast.hoursAuthorized)}
              </span>
            </div>
            
            {/* Stacked progress bar showing actual + pending */}
            <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
              {/* Actual consumption */}
              <div 
                className="absolute h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                style={{ width: `${Math.min(forecast.hoursUtilizationPct, 100)}%` }}
              />
              {/* Pending (forecast) shown as striped overlay */}
              {forecast.pendingCount > 0 && forecast.pendingHours > 0 && (
                <div 
                  className="absolute h-full bg-amber-400/60 transition-all"
                  style={{ 
                    left: `${Math.min(forecast.hoursUtilizationPct, 100)}%`,
                    width: `${Math.min(forecast.hoursForecastUtilizationPct - forecast.hoursUtilizationPct, 100 - forecast.hoursUtilizationPct)}%` 
                  }}
                />
              )}
            </div>
            
            {/* Actual vs Pending breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Actual: {formatBudgetHours(forecast.hoursConsumed)}
              </div>
              {forecast.pendingCount > 0 && forecast.pendingHours > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  Pending: +{formatBudgetHours(forecast.pendingHours)}
                </div>
              )}
            </div>
            
            {/* Forecast total if pending items exist */}
            {forecast.pendingCount > 0 && forecast.pendingHours > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed">
                <span className="font-medium">Forecast Total</span>
                <span className={hoursForecastStyles.textClass}>
                  {formatBudgetHours(forecast.hoursForecast)} ({Math.round(forecast.hoursForecastUtilizationPct)}%)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Amount breakdown with forecast */}
        {forecast.amountAuthorized > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Amount
              </span>
              <span className={amountStyles.textClass}>
                {formatBudgetCurrency(forecast.amountConsumed)} / {formatBudgetCurrency(forecast.amountAuthorized)}
              </span>
            </div>
            
            {/* Stacked progress bar showing actual + pending */}
            <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
              {/* Actual consumption */}
              <div 
                className="absolute h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                style={{ width: `${Math.min(forecast.amountUtilizationPct, 100)}%` }}
              />
              {/* Pending (forecast) shown as different color */}
              {forecast.pendingCount > 0 && forecast.pendingAmount > 0 && (
                <div 
                  className="absolute h-full bg-amber-400/60 transition-all"
                  style={{ 
                    left: `${Math.min(forecast.amountUtilizationPct, 100)}%`,
                    width: `${Math.min(forecast.amountForecastUtilizationPct - forecast.amountUtilizationPct, 100 - forecast.amountUtilizationPct)}%` 
                  }}
                />
              )}
            </div>
            
            {/* Actual vs Pending breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Actual: {formatBudgetCurrency(forecast.amountConsumed)}
              </div>
              {forecast.pendingCount > 0 && forecast.pendingAmount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  Pending: +{formatBudgetCurrency(forecast.pendingAmount)}
                </div>
              )}
            </div>
            
            {/* Forecast total if pending items exist */}
            {forecast.pendingCount > 0 && forecast.pendingAmount > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed">
                <span className="font-medium">Forecast Total</span>
                <span className={amountForecastStyles.textClass}>
                  {formatBudgetCurrency(forecast.amountForecast)} ({Math.round(forecast.amountForecastUtilizationPct)}%)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Pending billing items summary */}
        {forecast.pendingCount > 0 && (
          <div className="text-xs text-amber-600 dark:text-amber-400 pt-2 border-t flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {forecast.pendingCount} pending billing item{forecast.pendingCount !== 1 ? 's' : ''} awaiting approval
          </div>
        )}

        {/* Hard cap indicator */}
        {forecast.hardCap && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <span className="text-destructive font-medium">Hard Cap:</span> Work will be blocked when budget is exceeded
          </div>
        )}
      </CardContent>
    </Card>
  );
}
