import { Receipt, Clock, Wallet, FileText } from "lucide-react";
import { formatBudgetCurrency, formatBudgetHours } from "@/lib/budgetUtils";

interface CaseCardFinancialSummaryProps {
  totalExpenses: number;
  totalHours: number;
  totalRetainer: number;
  totalInvoiced: number;
}

export function CaseCardFinancialSummary({
  totalExpenses,
  totalHours,
  totalRetainer,
  totalInvoiced,
}: CaseCardFinancialSummaryProps) {
  return (
    <div className="pt-3 mt-3 border-t border-border/50">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Expenses Card - Red */}
        <div className="bg-destructive/10 rounded-lg px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Receipt className="h-3 w-3 text-destructive" />
            <span className="text-xs text-destructive/80">Expenses</span>
          </div>
          <p className="text-sm font-semibold text-destructive">
            {formatBudgetCurrency(totalExpenses)}
          </p>
        </div>

        {/* Hours Card - Blue (Primary) */}
        <div className="bg-primary/10 rounded-lg px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary/80">Hours</span>
          </div>
          <p className="text-sm font-semibold text-primary">
            {formatBudgetHours(totalHours)}
          </p>
        </div>

        {/* Retainer Card - Green */}
        <div className="bg-green-500/10 rounded-lg px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Wallet className="h-3 w-3 text-green-600 dark:text-green-400" />
            <span className="text-xs text-green-600/80 dark:text-green-400/80">Retainer</span>
          </div>
          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
            {formatBudgetCurrency(totalRetainer)}
          </p>
        </div>

        {/* Invoiced Card - Purple/Violet */}
        <div className="bg-violet-500/10 rounded-lg px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <FileText className="h-3 w-3 text-violet-600 dark:text-violet-400" />
            <span className="text-xs text-violet-600/80 dark:text-violet-400/80">Invoiced</span>
          </div>
          <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">
            {formatBudgetCurrency(totalInvoiced)}
          </p>
        </div>
      </div>
    </div>
  );
}
