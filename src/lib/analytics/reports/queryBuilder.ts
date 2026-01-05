import { supabase } from "@/integrations/supabase/client";
import { ReportDefinition } from "./types";

type SourceTable = "cases" | "case_finances" | "invoices" | "case_activities" | "case_updates" | "case_budget_adjustments";

interface QueryParams {
  organizationId: string;
  filters: Record<string, unknown>;
  sort: { field: string; direction: "asc" | "desc" };
  page: number;
  pageSize: number;
  timeRange?: { start?: Date; end?: Date };
  baseFilters?: { field: string; operator: string; value: unknown }[];
}

/**
 * Get the appropriate select statement for each source table
 */
function getSelectForTable(table: SourceTable): string {
  const selectMap: Record<SourceTable, string> = {
    cases: "*, accounts(*), profiles:case_manager_id(*)",
    case_finances: "*, cases(id, case_number, title)",
    invoices: "*, cases(id, case_number, title)",
    case_activities: "*, cases(id, case_number), profiles:assigned_user_id(*)",
    case_updates: "*, cases(id, case_number), profiles:user_id(*)",
    case_budget_adjustments: "*, cases(id, case_number, title), profiles:user_id(*)",
  };
  return selectMap[table] || "*";
}

/**
 * Get the date field to filter on for each source table
 */
function getDateFieldForTable(table: SourceTable): string {
  const dateFieldMap: Record<SourceTable, string> = {
    cases: "created_at",
    case_finances: "date",
    invoices: "date",
    case_activities: "due_date",
    case_updates: "created_at",
    case_budget_adjustments: "created_at",
  };
  return dateFieldMap[table] || "created_at";
}

/**
 * Execute report query with dynamic select based on source table
 */
export async function executeReportQuery(
  report: ReportDefinition,
  params: QueryParams
): Promise<{ data: Record<string, unknown>[]; count: number }> {
  const table = report.sourceTable as SourceTable;
  const selectStatement = getSelectForTable(table);
  const dateField = getDateFieldForTable(table);

  // For budget-status report, we need special handling
  if (report.id === "budget-status") {
    return executeBudgetStatusQuery(params);
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  // Get the actual sort field (could be different from display key)
  const sortColumn = report.columns.find(c => c.key === params.sort.field);
  const sortField = sortColumn?.sortField || params.sort.field;

  // Build query
  let query = supabase
    .from(table)
    .select(selectStatement, { count: "exact" })
    .eq("organization_id", params.organizationId)
    .order(sortField, { ascending: params.sort.direction === "asc" })
    .range(from, to);

  // Apply base filters (e.g., finance_type for time/expense entries)
  if (report.baseFilters) {
    for (const bf of report.baseFilters) {
      if (bf.operator === "in" && Array.isArray(bf.value)) {
        query = query.in(bf.field as "id", bf.value as string[]);
      } else if (bf.operator === "neq") {
        query = query.neq(bf.field as "id", bf.value as string);
      } else {
        query = query.eq(bf.field as "id", bf.value as string);
      }
    }
  }

  // Apply user filters
  for (const [key, value] of Object.entries(params.filters)) {
    if (value === undefined || value === null || value === "" || key === "date_range") continue;
    
    // Handle boolean filters that come as strings
    if (value === "true") {
      query = query.eq(key as "id", "true" as unknown as string);
    } else if (value === "false") {
      query = query.eq(key as "id", "false" as unknown as string);
    } else if (typeof value === "string") {
      query = query.eq(key as "id", value);
    }
  }

  // Apply time range
  if (params.timeRange?.start) {
    query = query.gte(dateField as "id", params.timeRange.start.toISOString());
  }
  if (params.timeRange?.end) {
    query = query.lte(dateField as "id", params.timeRange.end.toISOString());
  }

  const result = await query;
  if (result.error) throw result.error;

  return {
    data: (result.data || []) as unknown as Record<string, unknown>[],
    count: result.count || 0,
  };
}

/**
 * Special query for budget status report that computes consumed/remaining values
 */
async function executeBudgetStatusQuery(
  params: QueryParams
): Promise<{ data: Record<string, unknown>[]; count: number }> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  // First, get cases with budgets
  let casesQuery = supabase
    .from("cases")
    .select("*, accounts(*)", { count: "exact" })
    .eq("organization_id", params.organizationId)
    .not("budget_dollars", "is", null)
    .order(params.sort.field as "id", { ascending: params.sort.direction === "asc" })
    .range(from, to);

  // Apply filters
  for (const [key, value] of Object.entries(params.filters)) {
    if (value === undefined || value === null || value === "" || key === "date_range") continue;
    if (typeof value === "string") {
      casesQuery = casesQuery.eq(key as "id", value);
    }
  }

  // Apply time range on created_at
  if (params.timeRange?.start) {
    casesQuery = casesQuery.gte("created_at", params.timeRange.start.toISOString());
  }
  if (params.timeRange?.end) {
    casesQuery = casesQuery.lte("created_at", params.timeRange.end.toISOString());
  }

  const { data: cases, count, error: casesError } = await casesQuery;
  if (casesError) throw casesError;
  if (!cases || cases.length === 0) return { data: [], count: 0 };

  // Get finance totals for these cases
  const caseIds = cases.map(c => c.id);
  const { data: finances, error: financesError } = await supabase
    .from("case_finances")
    .select("case_id, amount, finance_type")
    .in("case_id", caseIds);

  if (financesError) throw financesError;

  // Compute consumed amounts per case
  const consumedByCase: Record<string, number> = {};
  (finances || []).forEach((f) => {
    if (f.finance_type === "time" || f.finance_type === "expense") {
      consumedByCase[f.case_id] = (consumedByCase[f.case_id] || 0) + (f.amount || 0);
    }
  });

  // Enrich cases with computed values
  const enrichedData = cases.map((c) => {
    const budgetDollars = c.budget_dollars || 0;
    const consumed = consumedByCase[c.id] || 0;
    const remaining = budgetDollars - consumed;
    const utilization = budgetDollars > 0 ? (consumed / budgetDollars) * 100 : 0;

    return {
      ...c,
      consumed_dollars: consumed,
      remaining_dollars: remaining,
      utilization: utilization,
    };
  });

  return {
    data: enrichedData as Record<string, unknown>[],
    count: count || 0,
  };
}

/**
 * Fetch all data for export (no pagination)
 */
export async function fetchAllReportData(
  report: ReportDefinition,
  params: Omit<QueryParams, "page" | "pageSize">
): Promise<Record<string, unknown>[]> {
  const table = report.sourceTable as SourceTable;
  const selectStatement = getSelectForTable(table);
  const dateField = getDateFieldForTable(table);

  // For budget-status report, we need special handling
  if (report.id === "budget-status") {
    const result = await executeBudgetStatusQuery({
      ...params,
      page: 1,
      pageSize: 10000,
    });
    return result.data;
  }

  // Get the actual sort field
  const sortColumn = report.columns.find(c => c.key === params.sort.field);
  const sortField = sortColumn?.sortField || params.sort.field;

  // Build query without pagination
  let query = supabase
    .from(table)
    .select(selectStatement)
    .eq("organization_id", params.organizationId)
    .order(sortField, { ascending: params.sort.direction === "asc" })
    .limit(10000); // Safety limit

  // Apply base filters
  if (report.baseFilters) {
    for (const bf of report.baseFilters) {
      if (bf.operator === "in" && Array.isArray(bf.value)) {
        query = query.in(bf.field as "id", bf.value as string[]);
      } else if (bf.operator === "neq") {
        query = query.neq(bf.field as "id", bf.value as string);
      } else {
        query = query.eq(bf.field as "id", bf.value as string);
      }
    }
  }

  // Apply user filters
  for (const [key, value] of Object.entries(params.filters)) {
    if (value === undefined || value === null || value === "" || key === "date_range") continue;
    
    if (value === "true") {
      query = query.eq(key as "id", "true" as unknown as string);
    } else if (value === "false") {
      query = query.eq(key as "id", "false" as unknown as string);
    } else if (typeof value === "string") {
      query = query.eq(key as "id", value);
    }
  }

  // Apply time range
  if (params.timeRange?.start) {
    query = query.gte(dateField as "id", params.timeRange.start.toISOString());
  }
  if (params.timeRange?.end) {
    query = query.lte(dateField as "id", params.timeRange.end.toISOString());
  }

  const result = await query;
  if (result.error) throw result.error;

  return (result.data || []) as unknown as Record<string, unknown>[];
}
