import { supabase } from "@/integrations/supabase/client";
import type {
  AnalyticsQuery,
  AnalyticsResult,
  MetricDefinition,
  Filter,
  SourceTable,
  MetricCalculation,
} from "./types";
import { METRICS_REGISTRY, getMetricDefinition } from "./metrics";
import { summarizeFilters } from "./filters";
import { resolveTimeRange, summarizeTimeRange } from "./time-ranges";
import { safeRatio } from "./aggregations";

/* eslint-disable @typescript-eslint/no-explicit-any */

function applyFiltersToQuery(query: any, filters: Filter[]): any {
  let result = query;
  for (const filter of filters) {
    switch (filter.operator) {
      case "eq": result = result.eq(filter.field, filter.value); break;
      case "neq": result = result.neq(filter.field, filter.value); break;
      case "gt": result = result.gt(filter.field, filter.value); break;
      case "gte": result = result.gte(filter.field, filter.value); break;
      case "lt": result = result.lt(filter.field, filter.value); break;
      case "lte": result = result.lte(filter.field, filter.value); break;
      case "in": result = result.in(filter.field, filter.value); break;
      case "like": result = result.ilike(filter.field, filter.value); break;
      case "is_null": result = result.is(filter.field, null); break;
      case "is_not_null": result = result.not.is(filter.field, null); break;
    }
  }
  return result;
}

export class AnalyticsEngine {
  async query(config: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = performance.now();
    const metrics = config.metrics.map((id) => {
      const def = getMetricDefinition(id);
      if (!def) throw new Error(`Unknown metric: ${id}`);
      return def;
    });
    const results: Record<string, number> = {};
    const sourceTables = new Set<SourceTable>();
    for (const metric of metrics) {
      sourceTables.add(metric.sourceTable);
      results[metric.id] = await this.computeMetric(metric, config);
    }
    return {
      data: [results],
      metadata: {
        query: config, executedAt: new Date(), executionTimeMs: performance.now() - startTime,
        rowCount: 1, truncated: false,
        auditTrail: { metricsUsed: config.metrics, sourceTables: Array.from(sourceTables),
          filtersSummary: summarizeFilters(config.filters), timeRangeSummary: summarizeTimeRange(config.timeRange) },
      },
    };
  }

  async computeMetric(metric: MetricDefinition, config: AnalyticsQuery): Promise<number> {
    const calc = metric.calculation;
    switch (calc.type) {
      case "simple_count": return this.executeCount(calc.table, [], config);
      case "conditional_count": return this.executeCount(calc.table, calc.conditions, config);
      case "sum": return this.executeSum(calc.table, calc.field, calc.conditions || [], config);
      case "average": return this.executeAverage(calc.table, calc.field, calc.conditions || [], config);
      case "ratio": return this.executeRatio(calc, config);
      case "duration": return this.executeDuration(calc, config);
      case "composite": return this.executeComposite(calc, config);
      default: return 0;
    }
  }

  private async executeCount(table: SourceTable, conditions: Filter[], config: AnalyticsQuery): Promise<number> {
    let query: any = (supabase as any).from(table).select("id", { count: "exact", head: true }).eq("organization_id", config.organizationId);
    query = applyFiltersToQuery(query, conditions);
    if (config.timeRange) {
      const { start, end } = resolveTimeRange(config.timeRange);
      query = query.gte(config.timeField || "created_at", start.toISOString()).lte(config.timeField || "created_at", end.toISOString());
    }
    if (config.filters) query = applyFiltersToQuery(query, config.filters);
    const { count, error } = await query;
    if (error) { console.error(`Count error on ${table}:`, error); return 0; }
    return count ?? 0;
  }

  private async executeSum(table: SourceTable, field: string, conditions: Filter[], config: AnalyticsQuery): Promise<number> {
    let query: any = (supabase as any).from(table).select(field).eq("organization_id", config.organizationId);
    query = applyFiltersToQuery(query, conditions);
    if (config.timeRange) {
      const { start, end } = resolveTimeRange(config.timeRange);
      query = query.gte(config.timeField || "created_at", start.toISOString()).lte(config.timeField || "created_at", end.toISOString());
    }
    if (config.filters) query = applyFiltersToQuery(query, config.filters);
    const { data, error } = await query;
    if (error || !data) return 0;
    return (data as any[]).reduce((sum: number, row: any) => sum + (typeof row[field] === "number" ? row[field] : 0), 0);
  }

  private async executeAverage(table: SourceTable, field: string, conditions: Filter[], config: AnalyticsQuery): Promise<number> {
    let query: any = (supabase as any).from(table).select(field).eq("organization_id", config.organizationId);
    query = applyFiltersToQuery(query, conditions);
    if (config.timeRange) {
      const { start, end } = resolveTimeRange(config.timeRange);
      query = query.gte(config.timeField || "created_at", start.toISOString()).lte(config.timeField || "created_at", end.toISOString());
    }
    if (config.filters) query = applyFiltersToQuery(query, config.filters);
    const { data, error } = await query;
    if (error || !data || data.length === 0) return 0;
    const values = (data as any[]).map((r: any) => r[field]).filter((v: any): v is number => typeof v === "number");
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private async executeRatio(calc: Extract<MetricCalculation, { type: "ratio" }>, config: AnalyticsQuery): Promise<number> {
    const getVal = async (ref: { metricId: string } | MetricCalculation) => {
      if ("metricId" in ref) { const m = getMetricDefinition(ref.metricId); return m ? this.computeMetric(m, config) : 0; }
      return 0;
    };
    return safeRatio(await getVal(calc.numerator), await getVal(calc.denominator), calc.percentage);
  }

  private async executeDuration(calc: Extract<MetricCalculation, { type: "duration" }>, config: AnalyticsQuery): Promise<number> {
    let query: any = (supabase as any).from(calc.table).select(`${calc.startField}, ${calc.endField}`).eq("organization_id", config.organizationId);
    if (calc.conditions) query = applyFiltersToQuery(query, calc.conditions);
    if (config.timeRange) {
      const { start, end } = resolveTimeRange(config.timeRange);
      query = query.gte(config.timeField || "created_at", start.toISOString()).lte(config.timeField || "created_at", end.toISOString());
    }
    if (config.filters) query = applyFiltersToQuery(query, config.filters);
    const { data, error } = await query;
    if (error || !data || data.length === 0) return 0;
    const durations = (data as any[]).filter((r: any) => r[calc.startField] && r[calc.endField])
      .map((r: any) => { const diff = new Date(r[calc.endField]).getTime() - new Date(r[calc.startField]).getTime(); return calc.unit === "hours" ? diff / 3600000 : diff / 86400000; });
    return durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  private async executeComposite(calc: Extract<MetricCalculation, { type: "composite" }>, config: AnalyticsQuery): Promise<number> {
    const values: Record<string, number> = {};
    for (const depId of calc.dependencies) { const m = getMetricDefinition(depId); if (m) values[depId] = await this.computeMetric(m, config); }
    const parts = calc.expression.split(/\s*([+-])\s*/);
    let result = 0, op = "+";
    for (const part of parts) { if (part === "+" || part === "-") op = part; else result = op === "+" ? result + (values[part.trim()] ?? 0) : result - (values[part.trim()] ?? 0); }
    return result;
  }

  getMetric(id: string): MetricDefinition | undefined { return METRICS_REGISTRY.get(id); }
  getMetricsByCategory(category: MetricDefinition["category"]): MetricDefinition[] { return Array.from(METRICS_REGISTRY.values()).filter(m => m.category === category); }
  getDrillDownUrl(metricId: string, context?: Record<string, unknown>): string | null {
    const metric = METRICS_REGISTRY.get(metricId); if (!metric?.drillDownTarget) return null;
    const { route, params } = metric.drillDownTarget; const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => urlParams.set(k, v));
    if (context) Object.entries(context).forEach(([k, v]) => v != null && urlParams.set(k, String(v)));
    const qs = urlParams.toString(); return qs ? `${route}?${qs}` : route;
  }
}

export const analyticsEngine = new AnalyticsEngine();
