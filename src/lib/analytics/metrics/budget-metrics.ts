import type { MetricDefinition } from "../types";

/**
 * Budget-specific metrics
 * These focus on budget authorization and utilization (distinct from invoices/revenue)
 */
export const BUDGET_METRICS: MetricDefinition[] = [
  {
    id: "budgets.total_authorized_dollars",
    name: "Total Authorized Budget",
    description: "Total dollar budget authorized across all cases",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "cases",
    calculation: {
      type: "sum",
      table: "cases",
      field: "budget_dollars",
    },
    drillDownTarget: {
      route: "/cases",
      params: { hasBudget: "true" },
    },
    auditInfo: {
      formula: "SUM(cases.budget_dollars)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "budgets.total_authorized_hours",
    name: "Total Authorized Hours",
    description: "Total hours budget authorized across all cases",
    category: "finances",
    dataType: "sum",
    unit: "hours",
    sourceTable: "cases",
    calculation: {
      type: "sum",
      table: "cases",
      field: "budget_hours",
    },
    drillDownTarget: {
      route: "/cases",
      params: { hasBudget: "true" },
    },
    auditInfo: {
      formula: "SUM(cases.budget_hours)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "budgets.total_consumed_dollars",
    name: "Total Consumed (Dollars)",
    description: "Total dollars consumed from budgeted cases (time + expenses)",
    category: "finances",
    dataType: "sum",
    unit: "currency",
    sourceTable: "case_finances",
    calculation: {
      type: "sum",
      table: "case_finances",
      field: "amount",
      conditions: [
        { field: "finance_type", operator: "in", value: ["time", "expense"] },
      ],
    },
    drillDownTarget: {
      route: "/expenses",
      params: {},
    },
    auditInfo: {
      formula: "SUM(case_finances.amount WHERE finance_type IN ('time', 'expense'))",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "budgets.total_consumed_hours",
    name: "Total Consumed Hours",
    description: "Total hours consumed from budgeted cases",
    category: "finances",
    dataType: "sum",
    unit: "hours",
    sourceTable: "case_finances",
    calculation: {
      type: "sum",
      table: "case_finances",
      field: "hours",
    },
    drillDownTarget: {
      route: "/expenses",
      params: {},
    },
    auditInfo: {
      formula: "SUM(case_finances.hours)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "budgets.cases_with_budget",
    name: "Cases with Budget",
    description: "Number of cases that have a budget set",
    category: "finances",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "conditional_count",
      table: "cases",
      conditions: [
        { field: "budget_dollars", operator: "gt", value: 0 },
      ],
    },
    drillDownTarget: {
      route: "/cases",
      params: { hasBudget: "true" },
    },
    auditInfo: {
      formula: "COUNT(cases WHERE budget_dollars > 0 OR budget_hours > 0)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "budgets.overrun_count",
    name: "Budget Overruns",
    description: "Number of cases where spending exceeds authorized budget",
    category: "finances",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "simple_count",
      table: "cases",
      // Note: Actual calculation requires join with case_finances - handled in component
    },
    drillDownTarget: {
      route: "/cases",
      params: { budgetStatus: "over" },
    },
    auditInfo: {
      formula: "COUNT(cases WHERE consumed > authorized)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "budgets.at_risk_count",
    name: "Budgets At Risk",
    description: "Number of cases at 80% or more of their budget",
    category: "finances",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "simple_count",
      table: "cases",
      // Note: Actual calculation requires join with case_finances - handled in component
    },
    drillDownTarget: {
      route: "/cases",
      params: { budgetStatus: "warning" },
    },
    auditInfo: {
      formula: "COUNT(cases WHERE utilization >= 80%)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
];
