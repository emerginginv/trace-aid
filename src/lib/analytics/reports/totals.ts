import { supabase } from "@/integrations/supabase/client";
import { ReportDefinition, ReportQueryParams } from "./types";
import { analyticsEngine } from "../engine";
import { Filter, TimeRange } from "../types";

/**
 * Get ISO string from Date or undefined
 */
function getDateString(date: Date | undefined): string | undefined {
  return date?.toISOString();
}

/**
 * Convert report filters to analytics engine filter format
 */
function convertToAnalyticsFilters(
  filters: Record<string, unknown>,
  timeRange?: TimeRange
): Filter[] {
  const analyticsFilters: Filter[] = [];

  // Add time range filter if provided
  if (timeRange?.start) {
    analyticsFilters.push({
      field: "created_at",
      operator: "gte",
      value: getDateString(timeRange.start),
    });
  }
  if (timeRange?.end) {
    analyticsFilters.push({
      field: "created_at",
      operator: "lte",
      value: getDateString(timeRange.end),
    });
  }

  // Convert other filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (key === "status" && typeof value === "string") {
      analyticsFilters.push({
        field: "status",
        operator: "eq",
        value,
      });
    }

    if (key === "account_id" && typeof value === "string") {
      analyticsFilters.push({
        field: "account_id",
        operator: "eq",
        value,
      });
    }

    if (key === "case_id" && typeof value === "string") {
      analyticsFilters.push({
        field: "case_id",
        operator: "eq",
        value,
      });
    }

    if (key === "user_id" && typeof value === "string") {
      analyticsFilters.push({
        field: "user_id",
        operator: "eq",
        value,
      });
    }

    if (key === "finance_type" && typeof value === "string") {
      analyticsFilters.push({
        field: "finance_type",
        operator: "eq",
        value,
      });
    }

    if (key === "invoiced" && typeof value === "boolean") {
      analyticsFilters.push({
        field: "invoiced",
        operator: "eq",
        value,
      });
    }
  });

  return analyticsFilters;
}

/**
 * Calculate totals for a report using the analytics engine where possible
 */
export async function calculateReportTotals(
  report: ReportDefinition,
  params: ReportQueryParams
): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};

  for (const totalConfig of report.totals) {
    try {
      // If linked to analytics engine metric, use that for consistency
      if (totalConfig.metricId) {
        const metric = analyticsEngine.getMetric(totalConfig.metricId);
        if (metric) {
          const analyticsFilters = convertToAnalyticsFilters(
            params.filters,
            params.timeRange
          );
          
          const result = await analyticsEngine.query({
            metrics: [totalConfig.metricId],
            organizationId: params.organizationId,
            filters: analyticsFilters,
            timeRange: params.timeRange,
          });
          
          // Analytics engine returns data as an array of rows
          const row = Array.isArray(result.data) && result.data.length > 0 
            ? result.data[0] 
            : result.data;
          totals[totalConfig.key] = (row as Record<string, number>)?.[totalConfig.metricId] ?? 0;
          continue;
        }
      }

      // Direct aggregation query for non-metric totals
      totals[totalConfig.key] = await executeDirectAggregation(
        report.sourceTable,
        totalConfig.aggregation,
        totalConfig.field,
        params,
        report.baseFilters
      );
    } catch (error) {
      console.error(`Error calculating total ${totalConfig.key}:`, error);
      totals[totalConfig.key] = 0;
    }
  }

  return totals;
}

/**
 * Execute direct aggregation query against the database
 */
async function executeDirectAggregation(
  table: string,
  aggregation: "sum" | "count" | "avg",
  field: string,
  params: ReportQueryParams,
  baseFilters?: { field: string; operator: string; value: unknown }[]
): Promise<number> {
  // Use a type-safe approach
  const tableName = table as "cases" | "case_finances" | "case_activities" | "case_updates" | "invoices" | "case_budget_adjustments";
  
  if (aggregation === "count") {
    // For count, use head: true with count
    let query = supabase.from(tableName).select("*", { count: "exact", head: true });

    // Always filter by organization
    query = query.eq("organization_id", params.organizationId);

    // Apply base filters (e.g., closed_at is null for open cases)
    if (baseFilters) {
      for (const bf of baseFilters) {
        if (bf.operator === "in" && Array.isArray(bf.value)) {
          query = query.in(bf.field as "id", bf.value as string[]);
        } else if (bf.operator === "is_null") {
          query = query.is(bf.field as "id", null);
        } else if (bf.operator === "is_not_null") {
          query = query.not(bf.field as "id", "is", null);
        } else if (bf.operator === "neq") {
          query = query.neq(bf.field as "id", bf.value as string);
        } else {
          query = query.eq(bf.field as "id", bf.value as string);
        }
      }
    }

    // Apply time range filter
    if (params.timeRange?.start) {
      query = query.gte("created_at", params.timeRange.start.toISOString());
    }
    if (params.timeRange?.end) {
      query = query.lte("created_at", params.timeRange.end.toISOString());
    }

    // Apply other filters
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (key === "date_range") return; // Skip date range, handled above
      
      if (typeof value === "string") {
        query = query.eq(key as "id", value);
      } else if (typeof value === "boolean" || typeof value === "number") {
        query = query.eq(key as "id", String(value));
      }
    });

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  // For sum/avg, we need to fetch the data and calculate
  let dataQuery = supabase.from(tableName).select("*");
  
  dataQuery = dataQuery.eq("organization_id", params.organizationId);

  // Apply base filters
  if (baseFilters) {
    for (const bf of baseFilters) {
      if (bf.operator === "in" && Array.isArray(bf.value)) {
        dataQuery = dataQuery.in(bf.field as "id", bf.value as string[]);
      } else if (bf.operator === "is_null") {
        dataQuery = dataQuery.is(bf.field as "id", null);
      } else if (bf.operator === "is_not_null") {
        dataQuery = dataQuery.not(bf.field as "id", "is", null);
      } else if (bf.operator === "neq") {
        dataQuery = dataQuery.neq(bf.field as "id", bf.value as string);
      } else {
        dataQuery = dataQuery.eq(bf.field as "id", bf.value as string);
      }
    }
  }

  if (params.timeRange?.start) {
    dataQuery = dataQuery.gte("created_at", params.timeRange.start.toISOString());
  }
  if (params.timeRange?.end) {
    dataQuery = dataQuery.lte("created_at", params.timeRange.end.toISOString());
  }

  Object.entries(params.filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (key === "date_range") return;
    
    if (typeof value === "string") {
      dataQuery = dataQuery.eq(key as "id", value);
    } else if (typeof value === "boolean" || typeof value === "number") {
      dataQuery = dataQuery.eq(key as "id", String(value));
    }
  });

  const { data, error } = await dataQuery;
  if (error) throw error;
  if (!data || data.length === 0) return 0;

  const values = data
    .map((row) => {
      const val = (row as Record<string, unknown>)[field];
      return typeof val === "number" ? val : 0;
    })
    .filter((v) => !isNaN(v));

  if (values.length === 0) return 0;

  if (aggregation === "sum") {
    return values.reduce((acc, v) => acc + v, 0);
  }

  if (aggregation === "avg") {
    return values.reduce((acc, v) => acc + v, 0) / values.length;
  }

  return 0;
}

/**
 * Format a total value for display
 */
export function formatTotalValue(
  value: number,
  format: "currency" | "hours" | "count" | "percentage"
): string {
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(value);
    case "hours":
      return `${value.toFixed(1)}h`;
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "count":
    default:
      return new Intl.NumberFormat("en-US").format(value);
  }
}
