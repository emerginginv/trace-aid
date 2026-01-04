import { AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getBudgetStatus, formatBudgetCurrency, formatBudgetHours } from "@/lib/budgetUtils";

interface BudgetWarningBannerProps {
  utilizationPct: number;
  remaining: number;
  type: "hours" | "dollars";
  authorized?: number;
}

export function BudgetWarningBanner({ 
  utilizationPct, 
  remaining, 
  type,
  authorized = 0 
}: BudgetWarningBannerProps) {
  const status = getBudgetStatus(utilizationPct);
  
  // Don't show banner for normal status
  if (status === "normal") return null;

  const formatValue = (val: number) => 
    type === "hours" ? formatBudgetHours(Math.abs(val)) : formatBudgetCurrency(Math.abs(val));

  const getIcon = () => {
    switch (status) {
      case "over":
        return <AlertTriangle className="h-4 w-4" />;
      case "critical":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getMessage = () => {
    const typeLabel = type === "hours" ? "hours" : "budget";
    
    if (status === "over") {
      const overBy = Math.abs(remaining);
      return `Over ${typeLabel} by ${formatValue(overBy)}`;
    }
    
    if (status === "critical") {
      return `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} at ${Math.round(utilizationPct)}% — Only ${formatValue(remaining)} left`;
    }
    
    return `Approaching ${typeLabel} limit — ${Math.round(utilizationPct)}% used`;
  };

  const getVariant = (): "destructive" | "default" => {
    return status === "over" ? "destructive" : "default";
  };

  const getClasses = () => {
    switch (status) {
      case "over":
        return "border-destructive/50 bg-destructive/10 text-destructive";
      case "critical":
        return "border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "warning":
        return "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      default:
        return "";
    }
  };

  return (
    <Alert variant={getVariant()} className={`py-2 ${getClasses()}`}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <AlertDescription className="text-sm font-medium">
          {getMessage()}
        </AlertDescription>
      </div>
    </Alert>
  );
}
