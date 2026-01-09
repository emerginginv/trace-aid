import { MetricCategory, SourceTable, TimeRange } from "../types";

export interface ReportColumn {
  key: string;
  header: string;
  accessor: string | ((row: Record<string, unknown>) => unknown);
  format?: "date" | "datetime" | "currency" | "hours" | "percentage" | "text" | "status";
  sortable: boolean;
  sortField?: string; // Actual DB column to sort by when different from key
  width?: string;
  align?: "left" | "right" | "center";
}

export interface ReportFilterConfig {
  key: string;
  label: string;
  type: "date_range" | "select" | "multi_select" | "search" | "case" | "client" | "investigator";
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

export interface ReportTotalConfig {
  key: string;
  label: string;
  aggregation: "sum" | "count" | "avg";
  field: string;
  format: "currency" | "hours" | "count" | "percentage";
  metricId?: string; // Optional: reference analytics engine metric for audit
}

export interface BaseFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: MetricCategory;
  sourceTable: SourceTable;
  columns: ReportColumn[];
  filters: ReportFilterConfig[];
  defaultSort: { field: string; direction: "asc" | "desc" };
  totals: ReportTotalConfig[];
  relatedMetrics: string[]; // Links to analytics engine metrics
  baseFilters?: BaseFilter[]; // Pre-applied filters (e.g., finance_type)
  optionalExportColumns?: ReportColumn[]; // Columns that can be toggled for export only
}

export interface ReportQueryParams {
  filters: Record<string, unknown>;
  sort: { field: string; direction: "asc" | "desc" };
  page: number;
  pageSize: number;
  organizationId: string;
  timeRange?: TimeRange;
}

export interface ReportPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ReportMetadata {
  executedAt: Date;
  filters: Record<string, unknown>;
  auditFormula: string;
}

export interface ReportResult<T> {
  data: T[];
  totals: Record<string, number>;
  pagination: ReportPagination;
  metadata: ReportMetadata;
}

export type ReportCategory = "cases" | "finances" | "activities" | "budgets";

export interface ReportCategoryInfo {
  id: ReportCategory;
  name: string;
  description: string;
  icon: string;
  reports: string[];
}
