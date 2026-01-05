import type { DrillDownTarget, Filter } from "./types";

/**
 * Drill-down target definitions for metrics
 */
export const DRILL_DOWN_TARGETS: Record<string, DrillDownTarget> = {
  // ============= Case Drill-Downs =============
  "cases.list": {
    route: "/cases",
    params: {},
  },
  "cases.open": {
    route: "/cases",
    params: { status: "open" },
    filters: [{ field: "status", operator: "eq", value: "open" }],
  },
  "cases.closed": {
    route: "/cases",
    params: { status: "closed" },
    filters: [{ field: "status", operator: "eq", value: "closed" }],
  },
  "cases.overdue": {
    route: "/cases",
    params: { overdue: "true" },
  },

  // ============= Finance Drill-Downs =============
  "finances.invoices": {
    route: "/invoices",
    params: {},
  },
  "finances.invoices.outstanding": {
    route: "/invoices",
    params: { status: "outstanding" },
  },
  "finances.invoices.overdue": {
    route: "/invoices",
    params: { status: "overdue" },
  },
  "finances.expenses": {
    route: "/expenses",
    params: {},
  },
  "finances.time_entries": {
    route: "/expenses",
    params: { type: "time" },
  },

  // ============= Activity Drill-Downs =============
  "activities.tasks": {
    route: "/calendar",
    params: { view: "tasks" },
  },
  "activities.tasks.pending": {
    route: "/calendar",
    params: { view: "tasks", filter: "pending" },
  },
  "activities.tasks.overdue": {
    route: "/calendar",
    params: { view: "tasks", filter: "overdue" },
  },
  "activities.events": {
    route: "/calendar",
    params: { view: "events" },
  },

  // ============= Account Drill-Downs =============
  "accounts.list": {
    route: "/accounts",
    params: {},
  },

  // ============= Contact Drill-Downs =============
  "contacts.list": {
    route: "/contacts",
    params: {},
  },
};

/**
 * Get a drill-down target by key
 */
export function getDrillDownTarget(key: string): DrillDownTarget | undefined {
  return DRILL_DOWN_TARGETS[key];
}

/**
 * Build a URL from a drill-down target and context
 */
export function buildDrillDownUrl(
  target: DrillDownTarget,
  context?: Record<string, unknown>
): string {
  let url = target.route;

  // Build query params
  const params = new URLSearchParams();

  // Add static params from target
  for (const [key, value] of Object.entries(target.params)) {
    params.set(key, value);
  }

  // Add dynamic params from context
  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (value != null) {
        params.set(key, String(value));
      }
    }
  }

  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  return url;
}

/**
 * Create a drill-down target for a specific case
 */
export function createCaseDrillDown(caseId: string, tab?: string): DrillDownTarget {
  return {
    route: `/cases/${caseId}`,
    params: tab ? { tab } : {},
  };
}

/**
 * Create a drill-down target for a specific account
 */
export function createAccountDrillDown(accountId: string): DrillDownTarget {
  return {
    route: `/accounts/${accountId}`,
    params: {},
  };
}

/**
 * Create a drill-down target for a specific invoice
 */
export function createInvoiceDrillDown(invoiceId: string): DrillDownTarget {
  return {
    route: `/invoices/${invoiceId}`,
    params: {},
  };
}

/**
 * Get filters implied by drill-down context
 */
export function getDrillDownFilters(
  targetKey: string,
  context?: Record<string, unknown>
): Filter[] {
  const target = DRILL_DOWN_TARGETS[targetKey];
  const filters: Filter[] = [];

  if (target?.filters) {
    filters.push(...target.filters);
  }

  // Add context-based filters
  if (context) {
    if (context.caseId) {
      filters.push({ field: "case_id", operator: "eq", value: context.caseId });
    }
    if (context.accountId) {
      filters.push({ field: "account_id", operator: "eq", value: context.accountId });
    }
    if (context.userId) {
      filters.push({ field: "user_id", operator: "eq", value: context.userId });
    }
  }

  return filters;
}
