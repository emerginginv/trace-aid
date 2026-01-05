/**
 * CaseWyze Analytics Engine
 *
 * A foundational, type-safe analytics framework that provides deterministic,
 * auditable metrics derived from authoritative system data.
 *
 * Key principles:
 * - Single Source of Truth: Each metric defined once in the registry
 * - Deterministic: Same inputs always produce same outputs
 * - Auditable: Every result includes metadata about how it was computed
 * - Organization Isolated: All queries require organizationId
 * - Type-Safe: Full TypeScript types for queries and results
 * - Drill-Down Ready: Metrics know where to navigate for details
 *
 * @example
 * ```typescript
 * import { analytics, FilterBuilder, createPresetTimeRange } from "@/lib/analytics";
 *
 * // Simple metric fetch
 * const result = await analytics.query({
 *   metrics: ["cases.open_count", "finances.total_revenue"],
 *   organizationId: org.id,
 * });
 *
 * // With time range and filters
 * const monthlyData = await analytics.query({
 *   metrics: ["finances.total_revenue"],
 *   timeRange: createPresetTimeRange("last_30_days"),
 *   filters: new FilterBuilder().eq("finance.type", "time").build(),
 *   organizationId: org.id,
 * });
 *
 * // Get drill-down URL
 * const url = analytics.getDrillDownUrl("cases.open_count");
 * ```
 */

// Main engine
export { analyticsEngine as analytics, AnalyticsEngine } from "./engine";

// Types
export type {
  // Core types
  MetricDefinition,
  MetricCategory,
  MetricUnit,
  SourceTable,
  MetricCalculation,

  // Query types
  AnalyticsQuery,
  AnalyticsResult,
  QueryMetadata,
  QueryAuditTrail,
  MetricValueResult,
  TimeSeriesDataPoint,

  // Filter types
  Filter,
  FilterOperator,

  // Aggregation types
  Aggregation,
  AggregationType,

  // Time types
  TimeRange,
  TimeRangePreset,
  TimeGranularity,

  // Dimension types
  Dimension,

  // Drill-down types
  DrillDownTarget,
} from "./types";

// Metrics
export {
  ALL_METRICS,
  METRICS_REGISTRY,
  getMetricDefinition,
  getMetricsByCategory,
  getAllMetricIds,
  hasMetric,
  getMetricsGroupedByCategory,
  getMetricDependencies,
  getDependentMetrics,
  validateMetricDependencies,
  CASE_METRICS,
  FINANCIAL_METRICS,
  ACTIVITY_METRICS,
  USER_METRICS,
  ATTACHMENT_METRICS,
} from "./metrics";

// Dimensions
export {
  DIMENSIONS,
  getDimension,
  getDimensionsByTable,
  getDimensionsByCategory,
} from "./dimensions";

// Filters
export {
  FilterBuilder,
  createFilterBuilder,
  applyFiltersToQuery,
  summarizeFilters,
} from "./filters";

// Time ranges
export {
  resolveTimeRange,
  getTimeSeriesBuckets,
  formatBucketLabel,
  getTimeRangeLabel,
  summarizeTimeRange,
  createPresetTimeRange,
  createCustomTimeRange,
  getDefaultGranularity,
} from "./time-ranges";

// Aggregations
export {
  AGGREGATIONS,
  getAggregation,
  aggregate,
  aggregateGrouped,
  percentageChange,
  safeRatio,
  roundTo,
} from "./aggregations";

// Drill-downs
export {
  DRILL_DOWN_TARGETS,
  getDrillDownTarget,
  buildDrillDownUrl,
  createCaseDrillDown,
  createAccountDrillDown,
  createInvoiceDrillDown,
  getDrillDownFilters,
} from "./drill-down";

// ============= Convenience Functions =============

import { analyticsEngine } from "./engine";
import type { Filter, TimeRange, TimeGranularity, TimeSeriesDataPoint } from "./types";
import { resolveTimeRange, getTimeSeriesBuckets, formatBucketLabel } from "./time-ranges";

/**
 * Get a single metric value
 */
export async function getMetricValue(
  metricId: string,
  organizationId: string,
  filters?: Filter[],
  timeRange?: TimeRange
): Promise<number> {
  const result = await analyticsEngine.query({
    metrics: [metricId],
    organizationId,
    filters,
    timeRange,
  });

  const data = result.data[0] as Record<string, number> | undefined;
  return data?.[metricId] ?? 0;
}

/**
 * Get multiple metric values at once
 */
export async function getMetricValues(
  metricIds: string[],
  organizationId: string,
  filters?: Filter[],
  timeRange?: TimeRange
): Promise<Record<string, number>> {
  const result = await analyticsEngine.query({
    metrics: metricIds,
    organizationId,
    filters,
    timeRange,
  });

  return (result.data[0] as Record<string, number>) ?? {};
}

/**
 * Get time series data for a metric
 */
export async function getMetricTimeSeries(
  metricId: string,
  organizationId: string,
  timeRange: TimeRange,
  granularity: TimeGranularity
): Promise<TimeSeriesDataPoint[]> {
  const buckets = getTimeSeriesBuckets(timeRange, granularity);
  const results: TimeSeriesDataPoint[] = [];

  // For each bucket, query the metric with the bucket's time range
  for (let i = 0; i < buckets.length; i++) {
    const start = buckets[i];
    const end = i < buckets.length - 1 ? buckets[i + 1] : resolveTimeRange(timeRange).end;

    const value = await getMetricValue(metricId, organizationId, undefined, {
      type: "custom",
      start,
      end,
    });

    results.push({
      date: start,
      value,
      label: formatBucketLabel(start, granularity),
    });
  }

  return results;
}

/**
 * Compare a metric between two time periods
 */
export async function compareMetricPeriods(
  metricId: string,
  organizationId: string,
  currentPeriod: TimeRange,
  previousPeriod: TimeRange
): Promise<{
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}> {
  const [current, previous] = await Promise.all([
    getMetricValue(metricId, organizationId, undefined, currentPeriod),
    getMetricValue(metricId, organizationId, undefined, previousPeriod),
  ]);

  const change = current - previous;
  const changePercent = previous === 0 ? (current === 0 ? 0 : 100) : (change / Math.abs(previous)) * 100;

  return {
    current,
    previous,
    change,
    changePercent,
  };
}
