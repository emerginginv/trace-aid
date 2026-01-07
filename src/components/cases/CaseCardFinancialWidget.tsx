import { Progress } from "@/components/ui/progress";
import { getBudgetStatusStyles, formatBudgetCurrency } from "@/lib/budgetUtils";

interface CaseCardFinancialWidgetProps {
  budgetDollars: number | null;
  dollarsConsumed: number;
  dollarsRemaining: number;
  utilizationPct: number;
}

export function CaseCardFinancialWidget({
  budgetDollars,
  dollarsConsumed,
  dollarsRemaining,
  utilizationPct,
}: CaseCardFinancialWidgetProps) {
  // Don't render if no budget is set
  if (!budgetDollars || budgetDollars <= 0) {
    return null;
  }

  const { progressClass, textClass } = getBudgetStatusStyles(utilizationPct);
  const clampedUtilization = Math.min(utilizationPct, 100);

  return (
    <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Budget</p>
          <p className="text-sm font-medium">{formatBudgetCurrency(budgetDollars)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="text-sm font-medium">{formatBudgetCurrency(dollarsConsumed)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className={`text-sm font-medium ${dollarsRemaining < 0 ? textClass : ""}`}>
            {dollarsRemaining < 0 ? "-" : ""}
            {formatBudgetCurrency(Math.abs(dollarsRemaining))}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressClass}`}
            style={{ width: `${clampedUtilization}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${utilizationPct >= 80 ? textClass : "text-muted-foreground"}`}>
          {Math.round(utilizationPct)}%
        </span>
      </div>
    </div>
  );
}
