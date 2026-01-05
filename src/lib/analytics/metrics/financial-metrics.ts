import type { MetricDefinition } from "../types";

/**
 * Financial metric definitions (revenue, expenses, invoices, budgets)
 */
export const FINANCIAL_METRICS: MetricDefinition[] = [
  // ============= Revenue Metrics =============
  {
    id: "finances.total_revenue",
    name: "Total Revenue",
    description: "Total payments received from all invoices",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "invoice_payments",
    calculation: {
      type: "sum",
      table: "invoice_payments",
      field: "amount",
    },
    drillDownTarget: {
      route: "/invoices",
      params: {},
    },
    auditInfo: {
      formula: "SUM(invoice_payments.amount)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "finances.total_invoiced",
    name: "Total Invoiced",
    description: "Total amount invoiced to clients",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "invoices",
    calculation: {
      type: "sum",
      table: "invoices",
      field: "total",
    },
    drillDownTarget: {
      route: "/invoices",
      params: {},
    },
    auditInfo: {
      formula: "SUM(invoices.total)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Expense Metrics =============
  {
    id: "finances.total_expenses",
    name: "Total Expenses",
    description: "Total expenses recorded across all cases",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "case_finances",
    calculation: {
      type: "sum",
      table: "case_finances",
      field: "amount",
      conditions: [
        { field: "finance_type", operator: "eq", value: "expense" },
      ],
    },
    drillDownTarget: {
      route: "/expenses",
      params: { type: "expense" },
    },
    auditInfo: {
      formula: "SUM(case_finances.amount WHERE finance_type = 'expense')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "finances.uninvoiced_expenses",
    name: "Uninvoiced Expenses",
    description: "Total expenses not yet invoiced",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "case_finances",
    calculation: {
      type: "sum",
      table: "case_finances",
      field: "amount",
      conditions: [
        { field: "finance_type", operator: "eq", value: "expense" },
        { field: "invoiced", operator: "neq", value: true },
      ],
    },
    drillDownTarget: {
      route: "/expenses",
      params: { invoiced: "false" },
    },
    auditInfo: {
      formula: "SUM(case_finances.amount WHERE finance_type = 'expense' AND invoiced != true)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Time Entry Metrics =============
  {
    id: "finances.total_time_value",
    name: "Total Time Value",
    description: "Total dollar value of time entries",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "case_finances",
    calculation: {
      type: "sum",
      table: "case_finances",
      field: "amount",
      conditions: [
        { field: "finance_type", operator: "eq", value: "time" },
      ],
    },
    drillDownTarget: {
      route: "/expenses",
      params: { type: "time" },
    },
    auditInfo: {
      formula: "SUM(case_finances.amount WHERE finance_type = 'time')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "finances.total_hours_logged",
    name: "Total Hours Logged",
    description: "Total hours recorded across all time entries",
    category: "finances",
    dataType: "sum",
    unit: "hours",
    sourceTable: "case_finances",
    calculation: {
      type: "sum",
      table: "case_finances",
      field: "hours",
      conditions: [
        { field: "finance_type", operator: "eq", value: "time" },
      ],
    },
    drillDownTarget: {
      route: "/expenses",
      params: { type: "time" },
    },
    auditInfo: {
      formula: "SUM(case_finances.hours WHERE finance_type = 'time')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "finances.uninvoiced_time",
    name: "Uninvoiced Time Value",
    description: "Total value of time entries not yet invoiced",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "case_finances",
    calculation: {
      type: "sum",
      table: "case_finances",
      field: "amount",
      conditions: [
        { field: "finance_type", operator: "eq", value: "time" },
        { field: "invoiced", operator: "neq", value: true },
      ],
    },
    auditInfo: {
      formula: "SUM(case_finances.amount WHERE finance_type = 'time' AND invoiced != true)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "finances.avg_hourly_rate",
    name: "Avg Hourly Rate",
    description: "Average hourly rate across all time entries",
    category: "finances",
    dataType: "ratio",
    unit: "currency",
    sourceTable: "case_finances",
    calculation: {
      type: "ratio",
      numerator: { metricId: "finances.total_time_value" },
      denominator: { metricId: "finances.total_hours_logged" },
      percentage: false,
    },
    auditInfo: {
      formula: "finances.total_time_value / finances.total_hours_logged",
      dependencies: ["finances.total_time_value", "finances.total_hours_logged"],
      dataFreshness: "realtime",
    },
  },

  // ============= Invoice Metrics =============
  {
    id: "finances.invoice_count",
    name: "Total Invoices",
    description: "Total number of invoices",
    category: "finances",
    dataType: "count",
    unit: "count",
    sourceTable: "invoices",
    calculation: {
      type: "simple_count",
      table: "invoices",
    },
    drillDownTarget: {
      route: "/invoices",
      params: {},
    },
    auditInfo: {
      formula: "COUNT(invoices)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "finances.outstanding_invoices",
    name: "Outstanding AR",
    description: "Total accounts receivable (unpaid invoice balance)",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "invoices",
    calculation: {
      type: "sum",
      table: "invoices",
      field: "balance_due",
      conditions: [
        { field: "balance_due", operator: "gt", value: 0 },
      ],
    },
    drillDownTarget: {
      route: "/invoices",
      params: { status: "outstanding" },
    },
    auditInfo: {
      formula: "SUM(invoices.balance_due WHERE balance_due > 0)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "finances.paid_invoices_amount",
    name: "Paid Invoice Total",
    description: "Total amount from fully paid invoices",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "invoices",
    calculation: {
      type: "sum",
      table: "invoices",
      field: "total",
      conditions: [
        { field: "status", operator: "eq", value: "paid" },
      ],
    },
    auditInfo: {
      formula: "SUM(invoices.total WHERE status = 'paid')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Retainer Metrics =============
  {
    id: "finances.retainer_balance",
    name: "Total Retainer Balance",
    description: "Total retainer funds available across all cases",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "retainer_funds",
    calculation: {
      type: "sum",
      table: "retainer_funds",
      field: "amount",
    },
    auditInfo: {
      formula: "SUM(retainer_funds.amount)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Profit Metrics =============
  {
    id: "finances.gross_revenue",
    name: "Gross Revenue",
    description: "Total time and expense value (before costs)",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "case_finances",
    calculation: {
      type: "sum",
      table: "case_finances",
      field: "amount",
    },
    auditInfo: {
      formula: "SUM(case_finances.amount)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Entry Count Metrics =============
  {
    id: "finances.time_entry_count",
    name: "Time Entries",
    description: "Total number of time entries",
    category: "finances",
    dataType: "count",
    unit: "count",
    sourceTable: "case_finances",
    calculation: {
      type: "conditional_count",
      table: "case_finances",
      conditions: [
        { field: "finance_type", operator: "eq", value: "time" },
      ],
    },
    auditInfo: {
      formula: "COUNT(case_finances WHERE finance_type = 'time')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "finances.expense_entry_count",
    name: "Expense Entries",
    description: "Total number of expense entries",
    category: "finances",
    dataType: "count",
    unit: "count",
    sourceTable: "case_finances",
    calculation: {
      type: "conditional_count",
      table: "case_finances",
      conditions: [
        { field: "finance_type", operator: "eq", value: "expense" },
      ],
    },
    auditInfo: {
      formula: "COUNT(case_finances WHERE finance_type = 'expense')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
];
