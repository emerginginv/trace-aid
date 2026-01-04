// Budget utility functions for consistent styling and thresholds

export type BudgetStatus = "normal" | "warning" | "critical" | "over";

export interface BudgetStatusStyles {
  status: BudgetStatus;
  bgClass: string;
  textClass: string;
  borderClass: string;
  progressClass: string;
  label: string;
}

export function getBudgetStatus(utilizationPct: number): BudgetStatus {
  if (utilizationPct >= 100) return "over";
  if (utilizationPct >= 90) return "critical";
  if (utilizationPct >= 80) return "warning";
  return "normal";
}

export function getBudgetStatusStyles(utilizationPct: number): BudgetStatusStyles {
  const status = getBudgetStatus(utilizationPct);

  switch (status) {
    case "over":
      return {
        status,
        bgClass: "bg-destructive/10",
        textClass: "text-destructive",
        borderClass: "border-destructive/50",
        progressClass: "bg-destructive",
        label: "Over Budget",
      };
    case "critical":
      return {
        status,
        bgClass: "bg-orange-500/10",
        textClass: "text-orange-600 dark:text-orange-400",
        borderClass: "border-orange-500/50",
        progressClass: "bg-orange-500",
        label: "Critical",
      };
    case "warning":
      return {
        status,
        bgClass: "bg-yellow-500/10",
        textClass: "text-yellow-600 dark:text-yellow-400",
        borderClass: "border-yellow-500/50",
        progressClass: "bg-yellow-500",
        label: "Approaching Limit",
      };
    default:
      return {
        status,
        bgClass: "",
        textClass: "text-foreground",
        borderClass: "border-border",
        progressClass: "bg-primary",
        label: "On Track",
      };
  }
}

export function formatBudgetCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBudgetHours(value: number): string {
  if (value % 1 === 0) return `${value} hrs`;
  return `${value.toFixed(1)} hrs`;
}

export function getOverAmount(consumed: number, authorized: number): number {
  return consumed - authorized;
}
