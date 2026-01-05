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
 * NOTE: We use "*" for tables that don't have valid foreign key relationships
 * to avoid PGRST200 errors. Enrichment is done separately.
 */
function getSelectForTable(table: SourceTable): string {
  const selectMap: Record<SourceTable, string> = {
    cases: "*, accounts(*), profiles:case_manager_id(*)",
    case_finances: "*", // No valid FK to cases for embedding
    invoices: "*", // No valid FK to cases for embedding
    case_activities: "*", // No valid FK to cases or profiles for embedding
    case_updates: "*", // No valid FK for embedding
    case_budget_adjustments: "*", // No valid FK for embedding
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
 * Enrich report rows with related data (cases, profiles) that we can't embed via FK
 */
async function enrichReportRows(
  table: SourceTable,
  rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0) return rows;

  // Collect IDs we need to fetch
  const caseIds = new Set<string>();
  const userIds = new Set<string>();

  for (const row of rows) {
    if (row.case_id && typeof row.case_id === "string") {
      caseIds.add(row.case_id);
    }
    // Handle different user ID fields
    if (row.assigned_user_id && typeof row.assigned_user_id === "string") {
      userIds.add(row.assigned_user_id);
    }
    if (row.user_id && typeof row.user_id === "string") {
      userIds.add(row.user_id);
    }
  }

  // Fetch cases if needed
  let casesMap: Record<string, { id: string; case_number: string; title: string }> = {};
  if (caseIds.size > 0) {
    const { data: casesData } = await supabase
      .from("cases")
      .select("id, case_number, title")
      .in("id", Array.from(caseIds));
    
    if (casesData) {
      casesMap = Object.fromEntries(casesData.map(c => [c.id, c]));
    }
  }

  // Fetch profiles if needed
  let profilesMap: Record<string, { id: string; full_name: string | null; email: string }> = {};
  if (userIds.size > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", Array.from(userIds));
    
    if (profilesData) {
      profilesMap = Object.fromEntries(profilesData.map(p => [p.id, p]));
    }
  }

  // Enrich rows
  return rows.map(row => {
    const enriched = { ...row };
    
    // Add cases object for accessors that expect row.cases.case_number
    if (row.case_id && typeof row.case_id === "string" && casesMap[row.case_id]) {
      enriched.cases = casesMap[row.case_id];
    }
    
    // Add assigned_user for activities (accessed via row.assigned_user.full_name)
    if (row.assigned_user_id && typeof row.assigned_user_id === "string" && profilesMap[row.assigned_user_id]) {
      enriched.assigned_user = profilesMap[row.assigned_user_id];
    }
    
    // Add profiles for updates/adjustments (accessed via row.profiles.full_name)
    if (row.user_id && typeof row.user_id === "string" && profilesMap[row.user_id]) {
      enriched.profiles = profilesMap[row.user_id];
    }
    
    return enriched;
  });
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
      } else if (bf.operator === "is_null") {
        query = query.is(bf.field as "id", null);
      } else if (bf.operator === "is_not_null") {
        query = query.not(bf.field as "id", "is", null);
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

  // Enrich rows with related data
  const enrichedData = await enrichReportRows(
    table,
    (result.data || []) as unknown as Record<string, unknown>[]
  );

  return {
    data: enrichedData,
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

  // Get finance totals for these cases (including hours)
  const caseIds = cases.map(c => c.id);
  const { data: finances, error: financesError } = await supabase
    .from("case_finances")
    .select("case_id, amount, hours, finance_type, status")
    .in("case_id", caseIds);

  if (financesError) throw financesError;

  // Compute consumed amounts and hours per case
  const consumedByCase: Record<string, { dollars: number; hours: number }> = {};
  (finances || []).forEach((f) => {
    // Skip rejected entries
    if (f.status === "rejected") return;
    
    if (!consumedByCase[f.case_id]) {
      consumedByCase[f.case_id] = { dollars: 0, hours: 0 };
    }
    
    if (f.finance_type === "time" || f.finance_type === "expense") {
      consumedByCase[f.case_id].dollars += f.amount || 0;
    }
    consumedByCase[f.case_id].hours += f.hours || 0;
  });

  // Enrich cases with computed values
  const enrichedData = cases.map((c) => {
    const budgetDollars = (c.budget_dollars as number) || 0;
    const budgetHours = (c.budget_hours as number) || 0;
    const consumed = consumedByCase[c.id] || { dollars: 0, hours: 0 };
    const remainingDollars = budgetDollars - consumed.dollars;
    const remainingHours = budgetHours - consumed.hours;
    const dollarsUtilization = budgetDollars > 0 ? (consumed.dollars / budgetDollars) * 100 : null;
    const hoursUtilization = budgetHours > 0 ? (consumed.hours / budgetHours) * 100 : null;

    return {
      ...c,
      consumed_dollars: consumed.dollars,
      consumed_hours: consumed.hours,
      remaining_dollars: remainingDollars,
      remaining_hours: remainingHours,
      dollars_utilization: dollarsUtilization,
      hours_utilization: hoursUtilization,
      utilization: dollarsUtilization || 0,
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
      } else if (bf.operator === "is_null") {
        query = query.is(bf.field as "id", null);
      } else if (bf.operator === "is_not_null") {
        query = query.not(bf.field as "id", "is", null);
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

  // Enrich rows with related data
  return enrichReportRows(
    table,
    (result.data || []) as unknown as Record<string, unknown>[]
  );
}
