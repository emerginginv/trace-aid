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
    <div className="pt-3 mt-3 border-t border-border/50 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Budget</p>
          <p className="text-sm font-semibold">{formatBudgetCurrency(budgetDollars)}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Spent</p>
          <p className="text-sm font-semibold">{formatBudgetCurrency(dollarsConsumed)}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Remaining</p>
          <p className={`text-sm font-semibold ${dollarsRemaining < 0 ? textClass : ""}`}>
            {dollarsRemaining < 0 ? "-" : ""}
            {formatBudgetCurrency(Math.abs(dollarsRemaining))}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-muted/50 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${progressClass}`}
            style={{ width: `${clampedUtilization}%` }}
          />
        </div>
        <span className={`text-xs font-semibold tabular-nums min-w-[36px] text-right ${textClass}`}>
          {Math.round(utilizationPct)}%
        </span>
      </div>
    </div>
  );
}
