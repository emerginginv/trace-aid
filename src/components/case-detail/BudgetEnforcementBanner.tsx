import { AlertTriangle, Ban, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBudgetConsumption } from "@/hooks/useBudgetConsumption";
import { formatBudgetCurrency, formatBudgetHours } from "@/lib/budgetUtils";

interface BudgetEnforcementBannerProps {
  caseId: string;
  onRequestIncrease?: () => void;
}

export function BudgetEnforcementBanner({ 
  caseId,
  onRequestIncrease 
}: BudgetEnforcementBannerProps) {
  const { consumption, loading } = useBudgetConsumption(caseId);

  if (loading || !consumption || !consumption.hasBudget) {
    return null;
  }

  // Show blocked banner (highest priority)
  if (consumption.isBlocked) {
    return (
      <Alert variant="destructive" className="mb-4">
        <Ban className="h-4 w-4" />
        <AlertTitle className="font-semibold">Budget Exceeded - Work Blocked</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-2">
            This case has a hard budget cap that has been exceeded. No additional work can be logged until the budget is increased.
          </p>
          <div className="flex flex-wrap gap-4 text-sm mb-3">
            {consumption.budgetType !== "money" && consumption.hoursAuthorized > 0 && (
              <span>
                Hours: {formatBudgetHours(consumption.hoursConsumed)} / {formatBudgetHours(consumption.hoursAuthorized)}
                {consumption.hoursRemaining < 0 && (
                  <span className="font-medium ml-1">
                    ({formatBudgetHours(Math.abs(consumption.hoursRemaining))} over)
                  </span>
                )}
              </span>
            )}
            {consumption.budgetType !== "hours" && consumption.amountAuthorized > 0 && (
              <span>
                Amount: {formatBudgetCurrency(consumption.amountConsumed)} / {formatBudgetCurrency(consumption.amountAuthorized)}
                {consumption.amountRemaining < 0 && (
                  <span className="font-medium ml-1">
                    ({formatBudgetCurrency(Math.abs(consumption.amountRemaining))} over)
                  </span>
                )}
              </span>
            )}
          </div>
          {onRequestIncrease && (
            <Button variant="secondary" size="sm" onClick={onRequestIncrease}>
              Request Budget Increase
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Show exceeded banner (soft cap)
  if (consumption.isExceeded) {
    return (
      <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="font-semibold text-amber-700 dark:text-amber-400">
          Budget Exceeded
        </AlertTitle>
        <AlertDescription className="mt-2 text-amber-700 dark:text-amber-300">
          <p className="mb-2">
            The authorized budget for this case has been exceeded. Work can continue, but you should notify the case manager.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            {consumption.budgetType !== "money" && consumption.hoursAuthorized > 0 && consumption.hoursRemaining < 0 && (
              <span>
                Hours over: {formatBudgetHours(Math.abs(consumption.hoursRemaining))}
              </span>
            )}
            {consumption.budgetType !== "hours" && consumption.amountAuthorized > 0 && consumption.amountRemaining < 0 && (
              <span>
                Amount over: {formatBudgetCurrency(Math.abs(consumption.amountRemaining))}
              </span>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show warning banner
  if (consumption.isWarning) {
    const hoursWarning = consumption.hoursUtilizationPct >= 80 && consumption.budgetType !== "money";
    const amountWarning = consumption.amountUtilizationPct >= 80 && consumption.budgetType !== "hours";

    return (
      <Alert className="mb-4 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
        <Info className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="font-semibold text-yellow-700 dark:text-yellow-400">
          Approaching Budget Limit
        </AlertTitle>
        <AlertDescription className="mt-2 text-yellow-700 dark:text-yellow-300">
          <div className="flex flex-wrap gap-4 text-sm">
            {hoursWarning && (
              <span>
                Hours: {Math.round(consumption.hoursUtilizationPct)}% used 
                ({formatBudgetHours(consumption.hoursRemaining)} remaining)
              </span>
            )}
            {amountWarning && (
              <span>
                Amount: {Math.round(consumption.amountUtilizationPct)}% used 
                ({formatBudgetCurrency(consumption.amountRemaining)} remaining)
              </span>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
