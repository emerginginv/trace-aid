import type { MetricDefinition } from "../types";

/**
 * Case-related metric definitions
 */
export const CASE_METRICS: MetricDefinition[] = [
  // ============= Count Metrics =============
  {
    id: "cases.total_count",
    name: "Total Cases",
    description: "Total number of cases in the system",
    category: "cases",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "simple_count",
      table: "cases",
    },
    drillDownTarget: {
      route: "/cases",
      params: {},
    },
    auditInfo: {
      formula: "COUNT(cases)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "cases.open_count",
    name: "Open Cases",
    description: "Number of cases currently open",
    category: "cases",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "conditional_count",
      table: "cases",
      conditions: [
        { field: "closed_at", operator: "is_null", value: null },
      ],
    },
    drillDownTarget: {
      route: "/cases",
      params: { status: "open" },
    },
    auditInfo: {
      formula: "COUNT(cases WHERE closed_at IS NULL)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "cases.closed_count",
    name: "Closed Cases",
    description: "Number of cases that have been closed",
    category: "cases",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "conditional_count",
      table: "cases",
      conditions: [
        { field: "closed_at", operator: "is_not_null", value: null },
      ],
    },
    drillDownTarget: {
      route: "/cases",
      params: { status: "closed" },
    },
    auditInfo: {
      formula: "COUNT(cases WHERE closed_at IS NOT NULL)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "cases.active_count",
    name: "Active Cases",
    description: "Number of cases with 'Active' status",
    category: "cases",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "conditional_count",
      table: "cases",
      conditions: [
        { field: "status", operator: "eq", value: "Active" },
      ],
    },
    drillDownTarget: {
      route: "/cases",
      params: { status: "Active" },
    },
    auditInfo: {
      formula: "COUNT(cases WHERE status = 'Active')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "cases.pending_count",
    name: "Pending Cases",
    description: "Number of cases with 'Pending' status",
    category: "cases",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "conditional_count",
      table: "cases",
      conditions: [
        { field: "status", operator: "eq", value: "Pending" },
      ],
    },
    drillDownTarget: {
      route: "/cases",
      params: { status: "Pending" },
    },
    auditInfo: {
      formula: "COUNT(cases WHERE status = 'Pending')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Period-Based Metrics =============
  {
    id: "cases.created_this_period",
    name: "Cases Created",
    description: "Number of cases created in the selected time period",
    category: "cases",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "simple_count",
      table: "cases",
    },
    drillDownTarget: {
      route: "/cases",
      params: {},
    },
    auditInfo: {
      formula: "COUNT(cases WHERE created_at IN time_range)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "cases.closed_this_period",
    name: "Cases Closed",
    description: "Number of cases closed in the selected time period",
    category: "cases",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "conditional_count",
      table: "cases",
      conditions: [
        { field: "closed_at", operator: "is_not_null", value: null },
      ],
    },
    drillDownTarget: {
      route: "/cases",
      params: { status: "closed" },
    },
    auditInfo: {
      formula: "COUNT(cases WHERE closed_at IN time_range)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Duration Metrics =============
  {
    id: "cases.avg_days_to_close",
    name: "Avg Days to Close",
    description: "Average number of days from case creation to closure",
    category: "cases",
    dataType: "duration",
    unit: "days",
    sourceTable: "cases",
    calculation: {
      type: "duration",
      table: "cases",
      startField: "created_at",
      endField: "closed_at",
      conditions: [
        { field: "closed_at", operator: "is_not_null", value: null },
      ],
      unit: "days",
    },
    auditInfo: {
      formula: "AVG(closed_at - created_at) WHERE closed_at IS NOT NULL",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Ratio Metrics =============
  {
    id: "cases.close_rate",
    name: "Close Rate",
    description: "Percentage of cases closed in the period",
    category: "cases",
    dataType: "ratio",
    unit: "percentage",
    sourceTable: "cases",
    calculation: {
      type: "ratio",
      numerator: { metricId: "cases.closed_this_period" },
      denominator: { metricId: "cases.total_count" },
      percentage: true,
    },
    auditInfo: {
      formula: "(cases.closed_this_period / cases.total_count) * 100",
      dependencies: ["cases.closed_this_period", "cases.total_count"],
      dataFreshness: "realtime",
    },
  },

  // ============= Budget-Related Case Metrics =============
  {
    id: "cases.with_budget_count",
    name: "Cases with Budget",
    description: "Number of cases that have a budget assigned",
    category: "cases",
    dataType: "count",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "conditional_count",
      table: "cases",
      conditions: [
        { field: "budget_dollars", operator: "is_not_null", value: null },
      ],
    },
    auditInfo: {
      formula: "COUNT(cases WHERE budget_dollars IS NOT NULL)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "cases.budget_authorized_dollars",
    name: "Total Budget (Dollars)",
    description: "Total dollar budget authorized across all cases",
    category: "cases",
    dataType: "sum",
    unit: "currency",
    sourceTable: "cases",
    calculation: {
      type: "sum",
      table: "cases",
      field: "budget_dollars",
    },
    auditInfo: {
      formula: "SUM(cases.budget_dollars)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "cases.budget_authorized_hours",
    name: "Total Budget (Hours)",
    description: "Total hours budget authorized across all cases",
    category: "cases",
    dataType: "sum",
    unit: "hours",
    sourceTable: "cases",
    calculation: {
      type: "sum",
      table: "cases",
      field: "budget_hours",
    },
    auditInfo: {
      formula: "SUM(cases.budget_hours)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
];
