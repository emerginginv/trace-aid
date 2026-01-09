import { DollarSign, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BudgetSummary {
  budget_hours_authorized: number;
  budget_dollars_authorized: number;
  hours_consumed: number;
  dollars_consumed: number;
  hours_remaining: number;
  dollars_remaining: number;
  hours_utilization_pct: number;
  dollars_utilization_pct: number;
}

interface PdfBudgetSummaryProps {
  budgetSummary: BudgetSummary | null;
  budgetNotes: string | null;
}

export function PdfBudgetSummary({ budgetSummary, budgetNotes }: PdfBudgetSummaryProps) {
  if (!budgetSummary || (budgetSummary.budget_hours_authorized === 0 && budgetSummary.budget_dollars_authorized === 0)) {
    return null;
  }

  const getUtilizationColor = (pct: number) => {
    if (pct >= 90) return "text-destructive";
    if (pct >= 75) return "text-amber-600";
    return "text-emerald-600";
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 90) return "bg-destructive";
    if (pct >= 75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="pdf-section mb-6">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        Budget Summary
      </h2>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Hours Budget */}
        {budgetSummary.budget_hours_authorized > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Hours</span>
              </div>
              <span className={`font-semibold ${getUtilizationColor(budgetSummary.hours_utilization_pct)}`}>
                {budgetSummary.hours_utilization_pct.toFixed(0)}%
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={Math.min(budgetSummary.hours_utilization_pct, 100)} 
                className="h-3"
              />
              <div 
                className={`absolute top-0 left-0 h-3 rounded-full ${getProgressColor(budgetSummary.hours_utilization_pct)}`}
                style={{ width: `${Math.min(budgetSummary.hours_utilization_pct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{budgetSummary.hours_consumed.toFixed(1)} used</span>
              <span>{budgetSummary.hours_remaining.toFixed(1)} remaining</span>
            </div>
            <div className="text-center text-sm font-medium">
              {budgetSummary.hours_consumed.toFixed(1)} / {budgetSummary.budget_hours_authorized.toFixed(1)} hrs
            </div>
          </div>
        )}
        
        {/* Dollars Budget */}
        {budgetSummary.budget_dollars_authorized > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Dollars</span>
              </div>
              <span className={`font-semibold ${getUtilizationColor(budgetSummary.dollars_utilization_pct)}`}>
                {budgetSummary.dollars_utilization_pct.toFixed(0)}%
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={Math.min(budgetSummary.dollars_utilization_pct, 100)} 
                className="h-3"
              />
              <div 
                className={`absolute top-0 left-0 h-3 rounded-full ${getProgressColor(budgetSummary.dollars_utilization_pct)}`}
                style={{ width: `${Math.min(budgetSummary.dollars_utilization_pct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatCurrency(budgetSummary.dollars_consumed)} used</span>
              <span>{formatCurrency(budgetSummary.dollars_remaining)} remaining</span>
            </div>
            <div className="text-center text-sm font-medium">
              {formatCurrency(budgetSummary.dollars_consumed)} / {formatCurrency(budgetSummary.budget_dollars_authorized)}
            </div>
          </div>
        )}
      </div>
      
      {budgetNotes && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground font-medium mb-1">Budget Notes:</p>
          <p className="text-sm">{budgetNotes}</p>
        </div>
      )}
    </div>
  );
}
