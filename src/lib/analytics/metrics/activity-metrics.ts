import type { MetricDefinition } from "../types";

/**
 * Activity metric definitions (tasks, events, updates)
 */
export const ACTIVITY_METRICS: MetricDefinition[] = [
  // ============= Task Metrics =============
  {
    id: "activities.total_tasks",
    name: "Total Tasks",
    description: "Total number of tasks",
    category: "activities",
    dataType: "count",
    unit: "count",
    sourceTable: "case_activities",
    calculation: {
      type: "conditional_count",
      table: "case_activities",
      conditions: [
        { field: "activity_type", operator: "eq", value: "task" },
      ],
    },
    drillDownTarget: {
      route: "/calendar",
      params: { view: "tasks" },
    },
    auditInfo: {
      formula: "COUNT(case_activities WHERE activity_type = 'task')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "activities.completed_tasks",
    name: "Completed Tasks",
    description: "Number of tasks marked as complete",
    category: "activities",
    dataType: "count",
    unit: "count",
    sourceTable: "case_activities",
    calculation: {
      type: "conditional_count",
      table: "case_activities",
      conditions: [
        { field: "activity_type", operator: "eq", value: "task" },
        { field: "completed", operator: "eq", value: true },
      ],
    },
    drillDownTarget: {
      route: "/calendar",
      params: { view: "tasks", filter: "completed" },
    },
    auditInfo: {
      formula: "COUNT(case_activities WHERE activity_type = 'task' AND completed = true)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "activities.pending_tasks",
    name: "Pending Tasks",
    description: "Number of incomplete tasks",
    category: "activities",
    dataType: "count",
    unit: "count",
    sourceTable: "case_activities",
    calculation: {
      type: "conditional_count",
      table: "case_activities",
      conditions: [
        { field: "activity_type", operator: "eq", value: "task" },
        { field: "completed", operator: "neq", value: true },
      ],
    },
    drillDownTarget: {
      route: "/calendar",
      params: { view: "tasks", filter: "pending" },
    },
    auditInfo: {
      formula: "COUNT(case_activities WHERE activity_type = 'task' AND completed != true)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "activities.overdue_tasks",
    name: "Overdue Tasks",
    description: "Number of incomplete tasks past due date",
    category: "activities",
    dataType: "count",
    unit: "count",
    sourceTable: "case_activities",
    calculation: {
      type: "conditional_count",
      table: "case_activities",
      conditions: [
        { field: "activity_type", operator: "eq", value: "task" },
        { field: "completed", operator: "neq", value: true },
        { field: "due_date", operator: "lt", value: "NOW()" },
      ],
    },
    drillDownTarget: {
      route: "/calendar",
      params: { view: "tasks", filter: "overdue" },
    },
    auditInfo: {
      formula: "COUNT(case_activities WHERE activity_type = 'task' AND completed != true AND due_date < NOW())",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "activities.task_completion_rate",
    name: "Task Completion Rate",
    description: "Percentage of tasks completed",
    category: "activities",
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
  {
    id: "activities.avg_task_duration",
    name: "Avg Task Duration",
    description: "Average days from task creation to completion",
    category: "activities",
    dataType: "duration",
    unit: "days",
    sourceTable: "case_activities",
    calculation: {
      type: "duration",
      table: "case_activities",
      startField: "created_at",
      endField: "completed_at",
      conditions: [
        { field: "activity_type", operator: "eq", value: "task" },
        { field: "completed_at", operator: "is_not_null", value: null },
      ],
      unit: "days",
    },
    auditInfo: {
      formula: "AVG(completed_at - created_at) WHERE activity_type = 'task' AND completed_at IS NOT NULL",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Event Metrics =============
  {
    id: "activities.total_events",
    name: "Total Events",
    description: "Total number of events",
    category: "activities",
    dataType: "count",
    unit: "count",
    sourceTable: "case_activities",
    calculation: {
      type: "conditional_count",
      table: "case_activities",
      conditions: [
        { field: "activity_type", operator: "eq", value: "event" },
      ],
    },
    drillDownTarget: {
      route: "/calendar",
      params: { view: "events" },
    },
    auditInfo: {
      formula: "COUNT(case_activities WHERE activity_type = 'event')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "activities.upcoming_events",
    name: "Upcoming Events",
    description: "Number of events scheduled in the future",
    category: "activities",
    dataType: "count",
    unit: "count",
    sourceTable: "case_activities",
    calculation: {
      type: "conditional_count",
      table: "case_activities",
      conditions: [
        { field: "activity_type", operator: "eq", value: "event" },
        { field: "due_date", operator: "gte", value: "NOW()" },
      ],
    },
    drillDownTarget: {
      route: "/calendar",
      params: { view: "events", filter: "upcoming" },
    },
    auditInfo: {
      formula: "COUNT(case_activities WHERE activity_type = 'event' AND due_date >= NOW())",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "activities.past_events",
    name: "Past Events",
    description: "Number of events that have occurred",
    category: "activities",
    dataType: "count",
    unit: "count",
    sourceTable: "case_activities",
    calculation: {
      type: "conditional_count",
      table: "case_activities",
      conditions: [
        { field: "activity_type", operator: "eq", value: "event" },
        { field: "due_date", operator: "lt", value: "NOW()" },
      ],
    },
    auditInfo: {
      formula: "COUNT(case_activities WHERE activity_type = 'event' AND due_date < NOW())",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Update Metrics =============
  {
    id: "activities.total_updates",
    name: "Total Updates",
    description: "Total number of case updates",
    category: "activities",
    dataType: "count",
    unit: "count",
    sourceTable: "case_updates",
    calculation: {
      type: "simple_count",
      table: "case_updates",
    },
    auditInfo: {
      formula: "COUNT(case_updates)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "activities.updates_this_period",
    name: "Updates Created",
    description: "Number of updates created in the selected time period",
    category: "activities",
    dataType: "count",
    unit: "count",
    sourceTable: "case_updates",
    calculation: {
      type: "simple_count",
      table: "case_updates",
    },
    auditInfo: {
      formula: "COUNT(case_updates WHERE created_at IN time_range)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Combined Activity Metrics =============
  {
    id: "activities.total_activities",
    name: "Total Activities",
    description: "Total tasks and events combined",
    category: "activities",
    dataType: "count",
    unit: "count",
    sourceTable: "case_activities",
    calculation: {
      type: "simple_count",
      table: "case_activities",
    },
    drillDownTarget: {
      route: "/calendar",
      params: {},
    },
    auditInfo: {
      formula: "COUNT(case_activities)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
];
