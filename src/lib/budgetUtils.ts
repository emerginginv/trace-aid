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
  if (utilizationPct >= 75) return "warning";
  return "normal";
}

export function getBudgetStatusStyles(utilizationPct: number): BudgetStatusStyles {
  const status = getBudgetStatus(utilizationPct);

  switch (status) {
    case "over":
      return {
        status,
        bgClass: "bg-red-500/10",
        textClass: "text-red-600 dark:text-red-400",
        borderClass: "border-red-500/50",
        progressClass: "bg-gradient-to-r from-red-600 to-red-500",
        label: "Over Budget",
      };
    case "critical":
      return {
        status,
        bgClass: "bg-red-500/10",
        textClass: "text-red-600 dark:text-red-400",
        borderClass: "border-red-500/50",
        progressClass: "bg-gradient-to-r from-red-600 to-red-500",
        label: "Critical",
      };
    case "warning":
      return {
        status,
        bgClass: "bg-amber-500/10",
        textClass: "text-amber-600 dark:text-amber-400",
        borderClass: "border-amber-500/50",
        progressClass: "bg-gradient-to-r from-amber-500 to-amber-400",
        label: "Approaching Limit",
      };
    default:
      return {
        status,
        bgClass: "",
        textClass: "text-emerald-600 dark:text-emerald-400",
        borderClass: "border-border",
        progressClass: "bg-gradient-to-r from-emerald-500 to-emerald-400",
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
