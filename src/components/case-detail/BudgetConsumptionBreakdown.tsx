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
  TrendingUp
} from "lucide-react";
import { useBudgetConsumption } from "@/hooks/useBudgetConsumption";
import { getBudgetStatusStyles, formatBudgetCurrency, formatBudgetHours } from "@/lib/budgetUtils";

interface BudgetConsumptionBreakdownProps {
  caseId: string;
  compact?: boolean;
}

export function BudgetConsumptionBreakdown({ 
  caseId, 
  compact = false 
}: BudgetConsumptionBreakdownProps) {
  const { consumption, loading, error } = useBudgetConsumption(caseId);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error || !consumption || !consumption.hasBudget) {
    return null;
  }

  const hoursStyles = getBudgetStatusStyles(consumption.hoursUtilizationPct);
  const amountStyles = getBudgetStatusStyles(consumption.amountUtilizationPct);

  if (compact) {
    return (
      <div className="space-y-2 text-sm">
        {consumption.budgetType !== "money" && consumption.hoursAuthorized > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Hours
            </span>
            <span className={hoursStyles.textClass}>
              {formatBudgetHours(consumption.hoursConsumed).replace(" hrs", "")} / 
              {formatBudgetHours(consumption.hoursAuthorized).replace(" hrs", "")}
              <span className="ml-1 opacity-70">({Math.round(consumption.hoursUtilizationPct)}%)</span>
            </span>
          </div>
        )}
        {consumption.budgetType !== "hours" && consumption.amountAuthorized > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Amount
            </span>
            <span className={amountStyles.textClass}>
              {formatBudgetCurrency(consumption.amountConsumed)} / 
              {formatBudgetCurrency(consumption.amountAuthorized)}
              <span className="ml-1 opacity-70">({Math.round(consumption.amountUtilizationPct)}%)</span>
            </span>
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
          {consumption.isBlocked && (
            <Badge variant="destructive" className="text-xs">
              <Ban className="h-3 w-3 mr-1" />
              Blocked
            </Badge>
          )}
          {consumption.isExceeded && !consumption.isBlocked && (
            <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Over Budget
            </Badge>
          )}
          {consumption.isWarning && !consumption.isExceeded && (
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Warning
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hours breakdown */}
        {consumption.budgetType !== "money" && consumption.hoursAuthorized > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Hours
              </span>
              <span className={hoursStyles.textClass}>
                {formatBudgetHours(consumption.hoursConsumed)} / {formatBudgetHours(consumption.hoursAuthorized)}
              </span>
            </div>
            <Progress 
              value={Math.min(consumption.hoursUtilizationPct, 100)} 
              className="h-2"
            />
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Activities: {formatBudgetHours(consumption.hoursFromActivities)}
              </div>
              <div className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                Services: {formatBudgetHours(consumption.hoursFromServices)}
              </div>
            </div>
          </div>
        )}

        {/* Amount breakdown */}
        {consumption.budgetType !== "hours" && consumption.amountAuthorized > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Amount
              </span>
              <span className={amountStyles.textClass}>
                {formatBudgetCurrency(consumption.amountConsumed)} / {formatBudgetCurrency(consumption.amountAuthorized)}
              </span>
            </div>
            <Progress 
              value={Math.min(consumption.amountUtilizationPct, 100)} 
              className="h-2"
            />
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Activities: {formatBudgetCurrency(consumption.amountFromActivities)}
              </div>
              <div className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                Services: {formatBudgetCurrency(consumption.amountFromServices)}
              </div>
            </div>
          </div>
        )}

        {/* Hard cap indicator */}
        {consumption.hardCap && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <span className="text-destructive font-medium">Hard Cap:</span> Work will be blocked when budget is exceeded
          </div>
        )}
      </CardContent>
    </Card>
  );
}
