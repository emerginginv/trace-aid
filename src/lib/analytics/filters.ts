import type { Filter, FilterOperator } from "./types";

/**
 * Fluent filter builder for constructing analytics query filters
 */
export class FilterBuilder {
  private filters: Filter[] = [];

  /**
   * Add a filter condition
   */
  where(field: string, operator: FilterOperator, value: unknown): this {
    this.filters.push({ field, operator, value });
    return this;
  }

  /**
   * Equal to
   */
  eq(field: string, value: unknown): this {
    return this.where(field, "eq", value);
  }

  /**
   * Not equal to
   */
  neq(field: string, value: unknown): this {
    return this.where(field, "neq", value);
  }

  /**
   * Greater than
   */
  gt(field: string, value: unknown): this {
    return this.where(field, "gt", value);
  }

  /**
   * Greater than or equal
   */
  gte(field: string, value: unknown): this {
    return this.where(field, "gte", value);
  }

  /**
   * Less than
   */
  lt(field: string, value: unknown): this {
    return this.where(field, "lt", value);
  }

  /**
   * Less than or equal
   */
  lte(field: string, value: unknown): this {
    return this.where(field, "lte", value);
  }

  /**
   * In array of values
   */
  in(field: string, values: unknown[]): this {
    return this.where(field, "in", values);
  }

  /**
   * Not in array of values
   */
  notIn(field: string, values: unknown[]): this {
    return this.where(field, "nin", values);
  }

  /**
   * Pattern match (LIKE)
   */
  like(field: string, pattern: string): this {
    return this.where(field, "like", pattern);
  }

  /**
   * Field is null
   */
  isNull(field: string): this {
    return this.where(field, "is_null", null);
  }

  /**
   * Field is not null
   */
  isNotNull(field: string): this {
    return this.where(field, "is_not_null", null);
  }

  /**
   * Field value is within date range (inclusive)
   */
  inDateRange(field: string, start: Date, end: Date): this {
    return this.gte(field, start.toISOString()).lte(field, end.toISOString());
  }

  /**
   * Field value is within numeric range (inclusive)
   */
  inRange(field: string, min: number, max: number): this {
    return this.gte(field, min).lte(field, max);
  }

  /**
   * Merge filters from another builder
   */
  merge(other: FilterBuilder): this {
    this.filters.push(...other.build());
    return this;
  }

  /**
   * Build and return the filter array
   */
  build(): Filter[] {
    return [...this.filters];
  }

  /**
   * Check if any filters have been added
   */
  isEmpty(): boolean {
    return this.filters.length === 0;
  }

  /**
   * Get the count of filters
   */
  count(): number {
    return this.filters.length;
  }

  /**
   * Clear all filters
   */
  clear(): this {
    this.filters = [];
    return this;
  }
}

/**
 * Create a new filter builder instance
 */
export function createFilterBuilder(): FilterBuilder {
  return new FilterBuilder();
}

/**
 * Apply filters to a Supabase query builder
 * Note: This is a simplified version - the engine handles filter application directly
 */
export function applyFiltersToQuery<T extends { eq: Function; neq: Function; gt: Function; gte: Function; lt: Function; lte: Function; in: Function; ilike: Function; is: Function; not: { is: Function } }>(
  query: T,
  filters: Filter[]
): T {
  let result = query;

  for (const filter of filters) {
    switch (filter.operator) {
      case "eq":
        result = result.eq(filter.field, filter.value) as T;
        break;
      case "neq":
        result = result.neq(filter.field, filter.value) as T;
        break;
      case "gt":
        result = result.gt(filter.field, filter.value) as T;
        break;
      case "gte":
        result = result.gte(filter.field, filter.value) as T;
        break;
      case "lt":
        result = result.lt(filter.field, filter.value) as T;
        break;
      case "lte":
        result = result.lte(filter.field, filter.value) as T;
        break;
      case "in":
        result = result.in(filter.field, filter.value as unknown[]) as T;
        break;
      case "like":
        result = result.ilike(filter.field, filter.value as string) as T;
        break;
      case "is_null":
        result = result.is(filter.field, null) as T;
        break;
      case "is_not_null":
        result = result.not.is(filter.field, null) as T;
        break;
    }
  }

  return result;
}

/**
 * Summarize filters for audit trail
 */
export function summarizeFilters(filters?: Filter[]): string {
  if (!filters || filters.length === 0) {
    return "No filters applied";
  }

  return filters
    .map((f) => {
      const op = {
        eq: "=",
        neq: "≠",
        gt: ">",
        gte: "≥",
        lt: "<",
        lte: "≤",
        in: "IN",
        nin: "NOT IN",
        like: "LIKE",
        is_null: "IS NULL",
        is_not_null: "IS NOT NULL",
      }[f.operator];

      if (f.operator === "is_null" || f.operator === "is_not_null") {
        return `${f.field} ${op}`;
      }

      const value = Array.isArray(f.value)
        ? `(${f.value.slice(0, 3).join(", ")}${f.value.length > 3 ? "..." : ""})`
        : String(f.value);

      return `${f.field} ${op} ${value}`;
    })
    .join(" AND ");
}
