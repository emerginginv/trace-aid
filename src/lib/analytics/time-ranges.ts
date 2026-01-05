import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachYearOfInterval,
  eachHourOfInterval,
  format,
} from "date-fns";
import type { TimeRange, TimeRangePreset, TimeGranularity } from "./types";

export interface ResolvedTimeRange {
  start: Date;
  end: Date;
}

/**
 * Resolve a time range specification to concrete start/end dates
 */
export function resolveTimeRange(range: TimeRange): ResolvedTimeRange {
  if (range.type === "custom" && range.start && range.end) {
    return {
      start: range.start,
      end: range.end,
    };
  }

  const now = new Date();
  const today = startOfDay(now);

  switch (range.preset) {
    case "today":
      return { start: today, end: endOfDay(now) };

    case "yesterday":
      const yesterday = subDays(today, 1);
      return { start: yesterday, end: endOfDay(yesterday) };

    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };

    case "last_week":
      const lastWeek = subWeeks(now, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 0 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 0 }),
      };

    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };

    case "last_month":
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };

    case "this_quarter":
      return { start: startOfQuarter(now), end: endOfQuarter(now) };

    case "last_quarter":
      const lastQuarter = subQuarters(now, 1);
      return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };

    case "this_year":
      return { start: startOfYear(now), end: endOfYear(now) };

    case "last_year":
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) };

    case "last_7_days":
      return { start: subDays(today, 6), end: endOfDay(now) };

    case "last_30_days":
      return { start: subDays(today, 29), end: endOfDay(now) };

    case "last_90_days":
      return { start: subDays(today, 89), end: endOfDay(now) };

    case "last_365_days":
      return { start: subDays(today, 364), end: endOfDay(now) };

    case "all_time":
    default:
      // Return a very early date for "all time"
      return { start: new Date("2020-01-01"), end: endOfDay(now) };
  }
}

/**
 * Get time series buckets for a given range and granularity
 */
export function getTimeSeriesBuckets(
  range: TimeRange,
  granularity: TimeGranularity
): Date[] {
  const { start, end } = resolveTimeRange(range);
  const interval = { start, end };

  switch (granularity) {
    case "hour":
      return eachHourOfInterval(interval);
    case "day":
      return eachDayOfInterval(interval);
    case "week":
      return eachWeekOfInterval(interval, { weekStartsOn: 0 });
    case "month":
      return eachMonthOfInterval(interval);
    case "quarter":
      return eachQuarterOfInterval(interval);
    case "year":
      return eachYearOfInterval(interval);
    default:
      return eachDayOfInterval(interval);
  }
}

/**
 * Format a date according to granularity for display
 */
export function formatBucketLabel(date: Date, granularity: TimeGranularity): string {
  switch (granularity) {
    case "hour":
      return format(date, "MMM d, ha");
    case "day":
      return format(date, "MMM d");
    case "week":
      return format(date, "'Week of' MMM d");
    case "month":
      return format(date, "MMM yyyy");
    case "quarter":
      return format(date, "QQQ yyyy");
    case "year":
      return format(date, "yyyy");
    default:
      return format(date, "MMM d, yyyy");
  }
}

/**
 * Get a human-readable label for a time range preset
 */
export function getTimeRangeLabel(preset: TimeRangePreset): string {
  const labels: Record<TimeRangePreset, string> = {
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    last_week: "Last Week",
    this_month: "This Month",
    last_month: "Last Month",
    this_quarter: "This Quarter",
    last_quarter: "Last Quarter",
    this_year: "This Year",
    last_year: "Last Year",
    last_7_days: "Last 7 Days",
    last_30_days: "Last 30 Days",
    last_90_days: "Last 90 Days",
    last_365_days: "Last 365 Days",
    all_time: "All Time",
  };

  return labels[preset] || preset;
}

/**
 * Summarize a time range for audit trail
 */
export function summarizeTimeRange(range?: TimeRange): string {
  if (!range) {
    return "All time";
  }

  if (range.type === "preset" && range.preset) {
    return getTimeRangeLabel(range.preset);
  }

  if (range.type === "custom" && range.start && range.end) {
    return `${format(range.start, "MMM d, yyyy")} - ${format(range.end, "MMM d, yyyy")}`;
  }

  return "Unknown range";
}

/**
 * Create a preset time range
 */
export function createPresetTimeRange(
  preset: TimeRangePreset,
  granularity?: TimeGranularity
): TimeRange {
  return {
    type: "preset",
    preset,
    granularity,
  };
}

/**
 * Create a custom time range
 */
export function createCustomTimeRange(
  start: Date,
  end: Date,
  granularity?: TimeGranularity
): TimeRange {
  return {
    type: "custom",
    start,
    end,
    granularity,
  };
}

/**
 * Get the default granularity for a time range
 */
export function getDefaultGranularity(range: TimeRange): TimeGranularity {
  const { start, end } = resolveTimeRange(range);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return "hour";
  if (diffDays <= 14) return "day";
  if (diffDays <= 90) return "week";
  if (diffDays <= 730) return "month";
  if (diffDays <= 1825) return "quarter";
  return "year";
}
