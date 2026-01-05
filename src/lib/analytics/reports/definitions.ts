import { ReportDefinition, ReportCategoryInfo } from "./types";
import {
  caseColumns,
  financeColumns,
  activityColumns,
  updateColumns,
  invoiceColumns,
  budgetColumns,
  budgetAdjustmentColumns,
} from "./columns";

// ============================================
// CASE REPORTS
// ============================================

export const allCasesReport: ReportDefinition = {
  id: "all-cases",
  name: "All Cases",
  description: "Complete listing of all cases with status and budget information",
  category: "cases",
  sourceTable: "cases",
  columns: [
    caseColumns.case_number,
    caseColumns.title,
    caseColumns.status,
    caseColumns.account_name,
    caseColumns.investigator_name,
    caseColumns.budget_dollars,
    caseColumns.created_at,
  ],
  filters: [
    { key: "date_range", label: "Date Range", type: "date_range" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "pending", label: "Pending" },
        { value: "closed", label: "Closed" },
        { value: "on_hold", label: "On Hold" },
      ],
    },
    { key: "account_id", label: "Client", type: "client" },
    { key: "case_manager_id", label: "Case Manager", type: "investigator" },
  ],
  defaultSort: { field: "created_at", direction: "desc" },
  totals: [
    { key: "totalCount", label: "Total Cases", aggregation: "count", field: "id", format: "count", metricId: "cases.total_count" },
    { key: "openCount", label: "Open", aggregation: "count", field: "id", format: "count" },
    { key: "closedCount", label: "Closed", aggregation: "count", field: "id", format: "count" },
  ],
  relatedMetrics: ["cases.total_count", "cases.open_count", "cases.closed_count"],
};

export const openCasesReport: ReportDefinition = {
  id: "open-cases",
  name: "Open Cases",
  description: "Active cases currently in progress",
  category: "cases",
  sourceTable: "cases",
  baseFilters: [{ field: "status", operator: "in", value: ["active", "pending", "on_hold"] }],
  columns: [
    caseColumns.case_number,
    caseColumns.title,
    caseColumns.account_name,
    caseColumns.investigator_name,
    caseColumns.budget_dollars,
    caseColumns.budget_hours,
    caseColumns.created_at,
  ],
  filters: [
    { key: "date_range", label: "Created Date", type: "date_range" },
    { key: "account_id", label: "Client", type: "client" },
    { key: "case_manager_id", label: "Case Manager", type: "investigator" },
  ],
  defaultSort: { field: "created_at", direction: "desc" },
  totals: [
    { key: "totalCount", label: "Open Cases", aggregation: "count", field: "id", format: "count" },
    { key: "totalBudget", label: "Total Budget", aggregation: "sum", field: "budget_dollars", format: "currency" },
  ],
  relatedMetrics: ["cases.open_count"],
};

export const closedCasesReport: ReportDefinition = {
  id: "closed-cases",
  name: "Closed Cases",
  description: "Completed cases with closure information",
  category: "cases",
  sourceTable: "cases",
  baseFilters: [{ field: "status", operator: "eq", value: "closed" }],
  columns: [
    caseColumns.case_number,
    caseColumns.title,
    caseColumns.account_name,
    caseColumns.investigator_name,
    caseColumns.budget_dollars,
    caseColumns.created_at,
    caseColumns.closed_at,
  ],
  filters: [
    { key: "date_range", label: "Closed Date", type: "date_range" },
    { key: "account_id", label: "Client", type: "client" },
    { key: "case_manager_id", label: "Case Manager", type: "investigator" },
  ],
  defaultSort: { field: "closed_at", direction: "desc" },
  totals: [
    { key: "totalCount", label: "Closed Cases", aggregation: "count", field: "id", format: "count" },
    { key: "totalBudget", label: "Total Budget", aggregation: "sum", field: "budget_dollars", format: "currency" },
  ],
  relatedMetrics: ["cases.closed_count"],
};

// ============================================
// FINANCIAL REPORTS
// ============================================

export const timeEntriesReport: ReportDefinition = {
  id: "time-entries",
  name: "Time Entries",
  description: "All time logged against cases",
  category: "finances",
  sourceTable: "case_finances",
  baseFilters: [{ field: "finance_type", operator: "eq", value: "time" }],
  columns: [
    financeColumns.date,
    financeColumns.case_number_finance,
    financeColumns.description,
    financeColumns.hours,
    financeColumns.hourly_rate,
    financeColumns.amount,
    financeColumns.invoiced,
  ],
  filters: [
    { key: "date_range", label: "Date Range", type: "date_range" },
    { key: "case_id", label: "Case", type: "case" },
    { key: "user_id", label: "Investigator", type: "investigator" },
    {
      key: "invoiced",
      label: "Invoiced",
      type: "select",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
  ],
  defaultSort: { field: "date", direction: "desc" },
  totals: [
    { key: "totalHours", label: "Total Hours", aggregation: "sum", field: "hours", format: "hours" },
    { key: "totalAmount", label: "Total Amount", aggregation: "sum", field: "amount", format: "currency" },
    { key: "entryCount", label: "Entries", aggregation: "count", field: "id", format: "count" },
  ],
  relatedMetrics: ["financial.total_hours", "financial.billable_amount"],
};

export const expenseEntriesReport: ReportDefinition = {
  id: "expense-entries",
  name: "Expense Entries",
  description: "All expenses logged against cases",
  category: "finances",
  sourceTable: "case_finances",
  baseFilters: [{ field: "finance_type", operator: "eq", value: "expense" }],
  columns: [
    financeColumns.date,
    financeColumns.case_number_finance,
    financeColumns.description,
    financeColumns.category,
    financeColumns.amount,
    financeColumns.invoiced,
  ],
  filters: [
    { key: "date_range", label: "Date Range", type: "date_range" },
    { key: "case_id", label: "Case", type: "case" },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [
        { value: "travel", label: "Travel" },
        { value: "mileage", label: "Mileage" },
        { value: "equipment", label: "Equipment" },
        { value: "materials", label: "Materials" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "invoiced",
      label: "Invoiced",
      type: "select",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
  ],
  defaultSort: { field: "date", direction: "desc" },
  totals: [
    { key: "totalAmount", label: "Total Amount", aggregation: "sum", field: "amount", format: "currency" },
    { key: "expenseCount", label: "Expenses", aggregation: "count", field: "id", format: "count" },
  ],
  relatedMetrics: ["financial.total_expenses"],
};

export const invoicesReport: ReportDefinition = {
  id: "invoices",
  name: "Invoice Report",
  description: "All invoices with payment status",
  category: "finances",
  sourceTable: "invoices",
  columns: [
    invoiceColumns.invoice_number,
    invoiceColumns.invoice_case_number,
    invoiceColumns.invoice_date,
    invoiceColumns.invoice_due_date,
    invoiceColumns.invoice_total,
    invoiceColumns.invoice_paid,
    invoiceColumns.invoice_balance,
    invoiceColumns.invoice_status,
  ],
  filters: [
    { key: "date_range", label: "Date Range", type: "date_range" },
    { key: "case_id", label: "Case", type: "case" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "sent", label: "Sent" },
        { value: "paid", label: "Paid" },
        { value: "partial", label: "Partial" },
        { value: "overdue", label: "Overdue" },
      ],
    },
  ],
  defaultSort: { field: "date", direction: "desc" },
  totals: [
    { key: "totalInvoiced", label: "Total Invoiced", aggregation: "sum", field: "total", format: "currency" },
    { key: "totalPaid", label: "Total Paid", aggregation: "sum", field: "total_paid", format: "currency" },
    { key: "totalBalance", label: "Balance Due", aggregation: "sum", field: "balance_due", format: "currency" },
    { key: "invoiceCount", label: "Invoices", aggregation: "count", field: "id", format: "count" },
  ],
  relatedMetrics: ["financial.total_invoiced", "financial.total_collected"],
};

// ============================================
// ACTIVITY REPORTS
// ============================================

export const caseUpdatesReport: ReportDefinition = {
  id: "case-updates",
  name: "Case Updates",
  description: "All case updates and progress notes",
  category: "activities",
  sourceTable: "case_updates",
  columns: [
    updateColumns.update_created_at,
    updateColumns.update_case_number,
    updateColumns.update_title,
    updateColumns.update_type,
    updateColumns.update_author,
  ],
  filters: [
    { key: "date_range", label: "Date Range", type: "date_range" },
    { key: "case_id", label: "Case", type: "case" },
    { key: "user_id", label: "Author", type: "investigator" },
    {
      key: "update_type",
      label: "Type",
      type: "select",
      options: [
        { value: "progress", label: "Progress" },
        { value: "note", label: "Note" },
        { value: "status_change", label: "Status Change" },
        { value: "other", label: "Other" },
      ],
    },
  ],
  defaultSort: { field: "created_at", direction: "desc" },
  totals: [
    { key: "totalUpdates", label: "Total Updates", aggregation: "count", field: "id", format: "count" },
  ],
  relatedMetrics: ["activity.updates_count"],
};

export const tasksReport: ReportDefinition = {
  id: "tasks",
  name: "Tasks Report",
  description: "All tasks and their completion status",
  category: "activities",
  sourceTable: "case_activities",
  columns: [
    activityColumns.case_number_activity,
    activityColumns.activity_title,
    activityColumns.activity_type,
    activityColumns.assigned_to,
    activityColumns.due_date,
    activityColumns.activity_status,
    activityColumns.completed,
  ],
  filters: [
    { key: "date_range", label: "Date Range", type: "date_range" },
    { key: "case_id", label: "Case", type: "case" },
    { key: "assigned_user_id", label: "Assigned To", type: "investigator" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "in_progress", label: "In Progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
  ],
  defaultSort: { field: "due_date", direction: "asc" },
  totals: [
    { key: "totalTasks", label: "Total Tasks", aggregation: "count", field: "id", format: "count" },
    { key: "completedTasks", label: "Completed", aggregation: "count", field: "id", format: "count" },
  ],
  relatedMetrics: ["activity.tasks_count", "activity.tasks_completed"],
};

export const eventsReport: ReportDefinition = {
  id: "events",
  name: "Events Report",
  description: "All scheduled events and surveillance",
  category: "activities",
  sourceTable: "case_activities",
  columns: [
    activityColumns.case_number_activity,
    activityColumns.activity_title,
    activityColumns.activity_type,
    activityColumns.assigned_to,
    activityColumns.due_date,
    activityColumns.activity_status,
  ],
  filters: [
    { key: "date_range", label: "Date Range", type: "date_range" },
    { key: "case_id", label: "Case", type: "case" },
    { key: "assigned_user_id", label: "Assigned To", type: "investigator" },
    {
      key: "activity_type",
      label: "Event Type",
      type: "select",
      options: [
        { value: "event", label: "Event" },
        { value: "surveillance", label: "Surveillance" },
        { value: "meeting", label: "Meeting" },
        { value: "deadline", label: "Deadline" },
      ],
    },
  ],
  defaultSort: { field: "due_date", direction: "desc" },
  totals: [
    { key: "totalEvents", label: "Total Events", aggregation: "count", field: "id", format: "count" },
  ],
  relatedMetrics: ["activity.events_count"],
};

// ============================================
// BUDGET REPORTS
// ============================================

export const budgetStatusReport: ReportDefinition = {
  id: "budget-status",
  name: "Budget Status",
  description: "Budget utilization across all budgeted cases",
  category: "finances",
  sourceTable: "cases",
  columns: [
    budgetColumns.budget_case_number,
    budgetColumns.budget_case_title,
    budgetColumns.budget_authorized_dollars,
    budgetColumns.budget_consumed_dollars,
    budgetColumns.budget_remaining_dollars,
    budgetColumns.budget_utilization,
  ],
  filters: [
    { key: "date_range", label: "Date Range", type: "date_range" },
    { key: "account_id", label: "Client", type: "client" },
    {
      key: "status",
      label: "Case Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "closed", label: "Closed" },
      ],
    },
  ],
  defaultSort: { field: "budget_dollars", direction: "desc" },
  totals: [
    { key: "totalAuthorized", label: "Total Authorized", aggregation: "sum", field: "budget_dollars", format: "currency" },
    { key: "totalConsumed", label: "Total Consumed", aggregation: "sum", field: "consumed_dollars", format: "currency" },
    { key: "caseCount", label: "Cases", aggregation: "count", field: "id", format: "count" },
  ],
  relatedMetrics: ["budget.total_authorized", "budget.total_consumed"],
};

export const budgetAdjustmentsReport: ReportDefinition = {
  id: "budget-adjustments",
  name: "Budget Adjustments",
  description: "History of all budget modifications",
  category: "finances",
  sourceTable: "case_budget_adjustments",
  columns: [
    budgetAdjustmentColumns.adjustment_date,
    budgetAdjustmentColumns.adjustment_case_number,
    budgetAdjustmentColumns.adjustment_type,
    budgetAdjustmentColumns.adjustment_previous,
    budgetAdjustmentColumns.adjustment_new,
    budgetAdjustmentColumns.adjustment_amount,
    budgetAdjustmentColumns.adjustment_reason,
    budgetAdjustmentColumns.adjustment_user,
  ],
  filters: [
    { key: "date_range", label: "Date Range", type: "date_range" },
    { key: "case_id", label: "Case", type: "case" },
    {
      key: "adjustment_type",
      label: "Type",
      type: "select",
      options: [
        { value: "hours", label: "Hours" },
        { value: "dollars", label: "Dollars" },
      ],
    },
  ],
  defaultSort: { field: "created_at", direction: "desc" },
  totals: [
    { key: "netChange", label: "Net Change", aggregation: "sum", field: "adjustment_amount", format: "currency" },
    { key: "adjustmentCount", label: "Adjustments", aggregation: "count", field: "id", format: "count" },
  ],
  relatedMetrics: ["budget.adjustment_count"],
};

// ============================================
// REPORT REGISTRY
// ============================================

export const reportRegistry: Record<string, ReportDefinition> = {
  "all-cases": allCasesReport,
  "open-cases": openCasesReport,
  "closed-cases": closedCasesReport,
  "time-entries": timeEntriesReport,
  "expense-entries": expenseEntriesReport,
  "invoices": invoicesReport,
  "case-updates": caseUpdatesReport,
  "tasks": tasksReport,
  "events": eventsReport,
  "budget-status": budgetStatusReport,
  "budget-adjustments": budgetAdjustmentsReport,
};

export const reportCategories: ReportCategoryInfo[] = [
  {
    id: "cases",
    name: "Case Reports",
    description: "Case listings, status tracking, and case analytics",
    icon: "Briefcase",
    reports: ["all-cases", "open-cases", "closed-cases"],
  },
  {
    id: "finances",
    name: "Financial Reports",
    description: "Time entries, expenses, and invoice tracking",
    icon: "DollarSign",
    reports: ["time-entries", "expense-entries", "invoices"],
  },
  {
    id: "activities",
    name: "Activity Reports",
    description: "Updates, tasks, and event tracking",
    icon: "Activity",
    reports: ["case-updates", "tasks", "events"],
  },
  {
    id: "budgets",
    name: "Budget Reports",
    description: "Budget status and adjustment history",
    icon: "PieChart",
    reports: ["budget-status", "budget-adjustments"],
  },
];

export function getReport(reportId: string): ReportDefinition | undefined {
  return reportRegistry[reportId];
}

export function getReportsByCategory(categoryId: string): ReportDefinition[] {
  const category = reportCategories.find((c) => c.id === categoryId);
  if (!category) return [];
  return category.reports.map((id) => reportRegistry[id]).filter(Boolean);
}
