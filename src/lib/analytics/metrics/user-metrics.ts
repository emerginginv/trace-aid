import type { MetricDefinition } from "../types";

/**
 * User/productivity metric definitions
 */
export const USER_METRICS: MetricDefinition[] = [
  // ============= User Count Metrics =============
  {
    id: "users.total_active",
    name: "Active Users",
    description: "Number of users with assigned tasks or logged time",
    category: "productivity",
    dataType: "count",
    unit: "count",
    sourceTable: "profiles",
    calculation: {
      type: "simple_count",
      table: "profiles",
    },
    drillDownTarget: {
      route: "/users",
      params: {},
    },
    auditInfo: {
      formula: "COUNT(DISTINCT user_id FROM case_activities UNION case_finances)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Productivity Ratio Metrics =============
  {
    id: "users.tasks_per_user",
    name: "Tasks per User",
    description: "Average number of tasks assigned per active user",
    category: "productivity",
    dataType: "ratio",
    unit: "count",
    sourceTable: "case_activities",
    calculation: {
      type: "ratio",
      numerator: { metricId: "activities.total_tasks" },
      denominator: { metricId: "users.total_active" },
      percentage: false,
    },
    auditInfo: {
      formula: "activities.total_tasks / users.total_active",
      dependencies: ["activities.total_tasks", "users.total_active"],
      dataFreshness: "realtime",
    },
  },
  {
    id: "users.hours_per_user",
    name: "Hours per User",
    description: "Average hours logged per active user",
    category: "productivity",
    dataType: "ratio",
    unit: "hours",
    sourceTable: "case_finances",
    calculation: {
      type: "ratio",
      numerator: { metricId: "finances.total_hours_logged" },
      denominator: { metricId: "users.total_active" },
      percentage: false,
    },
    auditInfo: {
      formula: "finances.total_hours_logged / users.total_active",
      dependencies: ["finances.total_hours_logged", "users.total_active"],
      dataFreshness: "realtime",
    },
  },
  {
    id: "users.cases_per_user",
    name: "Cases per User",
    description: "Average number of cases managed per user",
    category: "productivity",
    dataType: "ratio",
    unit: "count",
    sourceTable: "cases",
    calculation: {
      type: "ratio",
      numerator: { metricId: "cases.total_count" },
      denominator: { metricId: "users.total_active" },
      percentage: false,
    },
    auditInfo: {
      formula: "cases.total_count / users.total_active",
      dependencies: ["cases.total_count", "users.total_active"],
      dataFreshness: "realtime",
    },
  },
  {
    id: "users.revenue_per_user",
    name: "Revenue per User",
    description: "Average revenue generated per active user",
    category: "productivity",
    dataType: "ratio",
    unit: "currency",
    sourceTable: "invoice_payments",
    calculation: {
      type: "ratio",
      numerator: { metricId: "finances.total_revenue" },
      denominator: { metricId: "users.total_active" },
      percentage: false,
    },
    auditInfo: {
      formula: "finances.total_revenue / users.total_active",
      dependencies: ["finances.total_revenue", "users.total_active"],
      dataFreshness: "realtime",
    },
  },

  // ============= Workload Metrics =============
  {
    id: "users.pending_tasks_per_user",
    name: "Pending Tasks per User",
    description: "Average number of pending tasks per user",
    category: "productivity",
    dataType: "ratio",
    unit: "count",
    sourceTable: "case_activities",
    calculation: {
      type: "ratio",
      numerator: { metricId: "activities.pending_tasks" },
      denominator: { metricId: "users.total_active" },
      percentage: false,
    },
    auditInfo: {
      formula: "activities.pending_tasks / users.total_active",
      dependencies: ["activities.pending_tasks", "users.total_active"],
      dataFreshness: "realtime",
    },
  },
  {
    id: "users.task_completion_avg",
    name: "Avg Completion Rate",
    description: "Average task completion rate across all users",
    category: "productivity",
    dataType: "ratio",
    unit: "percentage",
    sourceTable: "case_activities",
    calculation: {
      type: "ratio",
      numerator: { metricId: "activities.completed_tasks" },
      denominator: { metricId: "activities.total_tasks" },
      percentage: true,
    },
    auditInfo: {
      formula: "(activities.completed_tasks / activities.total_tasks) * 100",
      dependencies: ["activities.completed_tasks", "activities.total_tasks"],
      dataFreshness: "realtime",
    },
  },
];
