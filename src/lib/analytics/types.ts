// ============= Core Analytics Types =============

/** Metric categories for organization */
export type MetricCategory = 
  | "cases"
  | "finances" 
  | "activities"
  | "productivity"
  | "storage"
  | "sales"
  | "expense";

/** Units of measurement */
export type MetricUnit = 
  | "count"
  | "currency"
  | "hours"
  | "percentage"
  | "bytes"
  | "days";

/** Source tables for metrics */
export type SourceTable = 
  | "cases"
  | "case_finances"
  | "case_activities"
  | "case_updates"
  | "case_attachments"
  | "case_subjects"
  | "case_budget_adjustments"
  | "invoices"
  | "invoice_payments"
  | "retainer_funds"
  | "accounts"
  | "contacts"
  | "profiles"
  | "subject_attachments";

/** Filter operators */
export type FilterOperator = 
  | "eq"      // equals
  | "neq"     // not equals
  | "gt"      // greater than
  | "gte"     // greater than or equal
  | "lt"      // less than
  | "lte"     // less than or equal
  | "in"      // in array
  | "nin"     // not in array
  | "like"    // pattern match
  | "is_null"
  | "is_not_null";

/** Aggregation types */
export type AggregationType = 
  | "count"
  | "count_distinct"
  | "sum"
  | "avg"
  | "min"
  | "max";

/** Time range presets */
export type TimeRangePreset = 
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "last_365_days"
  | "all_time";

/** Time granularity for time series */
export type TimeGranularity = 
  | "hour"
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year";

/** Filter condition */
export interface Filter {
  field: string;
  operator: FilterOperator;
  value: unknown;
  sourceTable?: SourceTable;
}

/** Time range specification */
export interface TimeRange {
  type: "preset" | "custom";
  preset?: TimeRangePreset;
  start?: Date;
  end?: Date;
  granularity?: TimeGranularity;
}

/** Aggregation specification */
export interface Aggregation {
  type: AggregationType;
  field?: string;
  alias?: string;
}

/** Drill-down navigation target */
export interface DrillDownTarget {
  route: string;
  params: Record<string, string>;
  filters?: Filter[];
}

/** Dimension for grouping data */
export interface Dimension {
  id: string;
  name: string;
  sourceField: string;
  sourceTable: SourceTable;
  valueType: "string" | "date" | "boolean" | "uuid" | "number";
  labelResolver?: (value: unknown) => string | Promise<string>;
}

// ============= Metric Calculation Types =============

export interface SimpleCountCalculation {
  type: "simple_count";
  table: SourceTable;
}

export interface ConditionalCountCalculation {
  type: "conditional_count";
  table: SourceTable;
  conditions: Filter[];
}

export interface SumCalculation {
  type: "sum";
  table: SourceTable;
  field: string;
  conditions?: Filter[];
}

export interface AverageCalculation {
  type: "average";
  table: SourceTable;
  field: string;
  conditions?: Filter[];
}

export interface RatioCalculation {
  type: "ratio";
  numerator: { metricId: string } | MetricCalculation;
  denominator: { metricId: string } | MetricCalculation;
  percentage?: boolean;
}

export interface DurationCalculation {
  type: "duration";
  table: SourceTable;
  startField: string;
  endField: string;
  conditions?: Filter[];
  unit: "hours" | "days";
}

export interface CompositeCalculation {
  type: "composite";
  expression: string;
  dependencies: string[];
}

export type MetricCalculation = 
  | SimpleCountCalculation
  | ConditionalCountCalculation
  | SumCalculation
  | AverageCalculation
  | RatioCalculation
  | DurationCalculation
  | CompositeCalculation;

// ============= Metric Definition =============

/** Base metric definition - single source of truth */
export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: MetricCategory;
  dataType: "count" | "sum" | "average" | "ratio" | "duration";
  unit: MetricUnit;
  sourceTable: SourceTable;
  calculation: MetricCalculation;
  drillDownTarget?: DrillDownTarget;
  auditInfo: {
    formula: string;
    dependencies: string[];
    dataFreshness: "realtime" | "daily" | "weekly";
  };
}

// ============= Query Types =============

/** Query configuration */
export interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: Filter[];
  timeRange?: TimeRange;
  timeField?: string;
  organizationId: string;
  limit?: number;
  orderBy?: { field: string; direction: "asc" | "desc" }[];
}

/** Audit trail for query results */
export interface QueryAuditTrail {
  metricsUsed: string[];
  sourceTables: SourceTable[];
  filtersSummary: string;
  timeRangeSummary?: string;
}

/** Query result metadata */
export interface QueryMetadata {
  query: AnalyticsQuery;
  executedAt: Date;
  executionTimeMs: number;
  rowCount: number;
  truncated: boolean;
  auditTrail: QueryAuditTrail;
}

/** Query result */
export interface AnalyticsResult<T = Record<string, unknown>> {
  data: T[];
  metadata: QueryMetadata;
}

/** Single metric value result */
export interface MetricValueResult {
  value: number;
  metricId: string;
  computedAt: Date;
  auditInfo: {
    formula: string;
    sourceTables: SourceTable[];
  };
}

/** Time series data point */
export interface TimeSeriesDataPoint {
  date: Date;
  value: number;
  label?: string;
}
