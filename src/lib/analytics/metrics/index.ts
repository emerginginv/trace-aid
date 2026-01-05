import type { MetricDefinition, MetricCategory } from "../types";
import { CASE_METRICS } from "./case-metrics";
import { FINANCIAL_METRICS } from "./financial-metrics";
import { ACTIVITY_METRICS } from "./activity-metrics";
import { USER_METRICS } from "./user-metrics";
import { ATTACHMENT_METRICS } from "./attachment-metrics";

/**
 * All metric definitions combined
 */
export const ALL_METRICS: MetricDefinition[] = [
  ...CASE_METRICS,
  ...FINANCIAL_METRICS,
  ...ACTIVITY_METRICS,
  ...USER_METRICS,
  ...ATTACHMENT_METRICS,
];

/**
 * Metric registry - map of metric ID to definition
 */
export const METRICS_REGISTRY: Map<string, MetricDefinition> = new Map(
  ALL_METRICS.map((m) => [m.id, m])
);

/**
 * Get a metric definition by ID
 */
export function getMetricDefinition(id: string): MetricDefinition | undefined {
  return METRICS_REGISTRY.get(id);
}

/**
 * Get all metrics in a category
 */
export function getMetricsByCategory(category: MetricCategory): MetricDefinition[] {
  return ALL_METRICS.filter((m) => m.category === category);
}

/**
 * Get all metric IDs
 */
export function getAllMetricIds(): string[] {
  return ALL_METRICS.map((m) => m.id);
}

/**
 * Check if a metric exists
 */
export function hasMetric(id: string): boolean {
  return METRICS_REGISTRY.has(id);
}

/**
 * Get metrics grouped by category
 */
export function getMetricsGroupedByCategory(): Record<MetricCategory, MetricDefinition[]> {
  return {
    cases: getMetricsByCategory("cases"),
    finances: getMetricsByCategory("finances"),
    activities: getMetricsByCategory("activities"),
    productivity: getMetricsByCategory("productivity"),
    storage: getMetricsByCategory("storage"),
  };
}

/**
 * Get metric dependencies (for composite/ratio metrics)
 */
export function getMetricDependencies(id: string): string[] {
  const metric = METRICS_REGISTRY.get(id);
  if (!metric) return [];
  return metric.auditInfo.dependencies;
}

/**
 * Get all metrics that depend on a given metric
 */
export function getDependentMetrics(id: string): MetricDefinition[] {
  return ALL_METRICS.filter((m) => m.auditInfo.dependencies.includes(id));
}

/**
 * Validate that all metric dependencies exist
 */
export function validateMetricDependencies(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const metric of ALL_METRICS) {
    for (const dep of metric.auditInfo.dependencies) {
      if (!METRICS_REGISTRY.has(dep)) {
        errors.push(`Metric "${metric.id}" depends on unknown metric "${dep}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Re-export individual metric sets
export { CASE_METRICS } from "./case-metrics";
export { FINANCIAL_METRICS } from "./financial-metrics";
export { ACTIVITY_METRICS } from "./activity-metrics";
export { USER_METRICS } from "./user-metrics";
export { ATTACHMENT_METRICS } from "./attachment-metrics";
