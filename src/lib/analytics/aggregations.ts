import type { AggregationType } from "./types";

/**
 * Aggregation function definitions
 */
export interface AggregationFunction {
  type: AggregationType;
  name: string;
  description: string;
  supportsField: boolean;
  compute: (values: number[]) => number;
}

/**
 * Registry of aggregation functions
 */
export const AGGREGATIONS: Record<AggregationType, AggregationFunction> = {
  count: {
    type: "count",
    name: "Count",
    description: "Count of records",
    supportsField: false,
    compute: (values: number[]) => values.length,
  },

  count_distinct: {
    type: "count_distinct",
    name: "Count Distinct",
    description: "Count of unique values",
    supportsField: true,
    compute: (values: number[]) => new Set(values).size,
  },

  sum: {
    type: "sum",
    name: "Sum",
    description: "Sum of values",
    supportsField: true,
    compute: (values: number[]) => values.reduce((acc, val) => acc + (val || 0), 0),
  },

  avg: {
    type: "avg",
    name: "Average",
    description: "Average of values",
    supportsField: true,
    compute: (values: number[]) => {
      if (values.length === 0) return 0;
      const sum = values.reduce((acc, val) => acc + (val || 0), 0);
      return sum / values.length;
    },
  },

  min: {
    type: "min",
    name: "Minimum",
    description: "Minimum value",
    supportsField: true,
    compute: (values: number[]) => {
      if (values.length === 0) return 0;
      return Math.min(...values.filter((v) => v != null));
    },
  },

  max: {
    type: "max",
    name: "Maximum",
    description: "Maximum value",
    supportsField: true,
    compute: (values: number[]) => {
      if (values.length === 0) return 0;
      return Math.max(...values.filter((v) => v != null));
    },
  },
};

/**
 * Get an aggregation function by type
 */
export function getAggregation(type: AggregationType): AggregationFunction {
  return AGGREGATIONS[type];
}

/**
 * Apply an aggregation to a set of values
 */
export function aggregate(type: AggregationType, values: number[]): number {
  const agg = AGGREGATIONS[type];
  return agg.compute(values);
}

/**
 * Apply multiple aggregations to a dataset grouped by a key
 */
export function aggregateGrouped<T extends Record<string, unknown>>(
  data: T[],
  groupByField: string,
  aggregations: { field: string; type: AggregationType; alias: string }[]
): Record<string, Record<string, number>> {
  // Group the data
  const groups = new Map<string, T[]>();
  for (const row of data) {
    const key = String(row[groupByField] ?? "null");
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  // Apply aggregations to each group
  const result: Record<string, Record<string, number>> = {};
  for (const [key, rows] of groups) {
    result[key] = {};
    for (const agg of aggregations) {
      const values = rows.map((r) => Number(r[agg.field]) || 0);
      result[key][agg.alias] = aggregate(agg.type, values);
    }
  }

  return result;
}

/**
 * Calculate percentage change between two values
 */
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Calculate ratio with safe division
 */
export function safeRatio(
  numerator: number,
  denominator: number,
  asPercentage = false
): number {
  if (denominator === 0) return 0;
  const ratio = numerator / denominator;
  return asPercentage ? ratio * 100 : ratio;
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
