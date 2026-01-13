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

// Calculate projected consumption based on current rate
export function projectConsumption(
  consumed: number,
  daysElapsed: number,
  totalDays: number
): number {
  if (daysElapsed <= 0 || totalDays <= 0) return consumed;
  const dailyRate = consumed / daysElapsed;
  return dailyRate * totalDays;
}

// Check if consumption rate is sustainable
export function isConsumptionSustainable(
  consumed: number,
  authorized: number,
  daysElapsed: number,
  totalDays: number
): boolean {
  const projected = projectConsumption(consumed, daysElapsed, totalDays);
  return projected <= authorized;
}

// Format consumption as percentage with color indication
export function getConsumptionColor(utilizationPct: number): string {
  if (utilizationPct >= 100) return "text-destructive";
  if (utilizationPct >= 90) return "text-red-500";
  if (utilizationPct >= 75) return "text-amber-500";
  return "text-emerald-500";
}

/**
 * SYSTEM PROMPT 9: Get forecast status styles
 * Separate styling for forecast consumption vs actual consumption
 */
export type ForecastStatus = "normal" | "warning" | "exceeded";

export interface ForecastStatusStyles {
  status: ForecastStatus;
  bgClass: string;
  textClass: string;
  borderClass: string;
  label: string;
}

export function getForecastStatus(forecastUtilizationPct: number): ForecastStatus {
  if (forecastUtilizationPct >= 100) return "exceeded";
  if (forecastUtilizationPct >= 80) return "warning";
  return "normal";
}

export function getForecastStatusStyles(forecastUtilizationPct: number): ForecastStatusStyles {
  const status = getForecastStatus(forecastUtilizationPct);

  switch (status) {
    case "exceeded":
      return {
        status,
        bgClass: "bg-red-500/10",
        textClass: "text-red-600 dark:text-red-400",
        borderClass: "border-red-500/50",
        label: "Forecast Exceeds Budget",
      };
    case "warning":
      return {
        status,
        bgClass: "bg-amber-500/10",
        textClass: "text-amber-600 dark:text-amber-400",
        borderClass: "border-amber-500/50",
        label: "Forecast Warning",
      };
    default:
      return {
        status,
        bgClass: "",
        textClass: "text-muted-foreground",
        borderClass: "border-border",
        label: "On Track",
      };
  }
}

/**
 * Get a human-readable message for budget forecast warning
 */
export function getBudgetForecastWarningMessage(
  isForecastExceeded: boolean,
  hardCap: boolean
): string {
  if (isForecastExceeded && hardCap) {
    return "This pending billing item would exceed the budget. Approval may be blocked due to hard cap.";
  }
  if (isForecastExceeded) {
    return "This pending billing item would put the case over budget.";
  }
  return "This pending billing item brings the case close to the budget limit.";
}
