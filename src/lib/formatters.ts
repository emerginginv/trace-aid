/**
 * Premium Data Formatting Utilities
 * Consistent formatting across the application for numbers, dates, and currencies
 */

// Currency formatting
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

// Compact currency for large numbers (e.g., $1.2M)
export function formatCurrencyCompact(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  if (Math.abs(amount) >= 1000000) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatCurrency(amount, currency, locale);
}

// Number formatting with proper separators
export function formatNumber(
  value: number,
  options?: {
    decimals?: number;
    compact?: boolean;
    locale?: string;
  }
): string {
  const { decimals = 0, compact = false, locale = "en-US" } = options || {};

  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Percentage formatting
export function formatPercentage(
  value: number,
  options?: {
    decimals?: number;
    showSign?: boolean;
    locale?: string;
  }
): string {
  const { decimals = 1, showSign = false, locale = "en-US" } = options || {};

  const formatted = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: showSign ? "exceptZero" : "auto",
  }).format(value / 100);

  return formatted;
}

// Date formatting presets
export type DateFormatPreset =
  | "short" // Jan 15
  | "medium" // Jan 15, 2024
  | "long" // January 15, 2024
  | "full" // Monday, January 15, 2024
  | "relative" // 2 days ago
  | "time" // 2:30 PM
  | "datetime"; // Jan 15, 2024, 2:30 PM

export function formatDate(
  date: Date | string,
  preset: DateFormatPreset = "medium",
  locale: string = "en-US"
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return "Invalid date";
  }

  switch (preset) {
    case "short":
      return d.toLocaleDateString(locale, { month: "short", day: "numeric" });

    case "medium":
      return d.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    case "long":
      return d.toLocaleDateString(locale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

    case "full":
      return d.toLocaleDateString(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

    case "relative":
      return formatRelativeTime(d);

    case "time":
      return d.toLocaleTimeString(locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

    case "datetime":
      return d.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

    default:
      return d.toLocaleDateString(locale);
  }
}

// Relative time formatting (e.g., "2 hours ago", "in 3 days")
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return rtf.format(-diffMins, "minute");
  } else if (diffHours < 24) {
    return rtf.format(-diffHours, "hour");
  } else if (diffDays < 7) {
    return rtf.format(-diffDays, "day");
  } else if (diffWeeks < 4) {
    return rtf.format(-diffWeeks, "week");
  } else if (diffMonths < 12) {
    return rtf.format(-diffMonths, "month");
  } else {
    return rtf.format(-diffYears, "year");
  }
}

// Duration formatting (e.g., "2h 30m", "1d 5h")
export function formatDuration(
  minutes: number,
  options?: {
    format?: "short" | "long";
    showZero?: boolean;
  }
): string {
  const { format = "short", showZero = false } = options || {};

  if (minutes === 0 && !showZero) {
    return format === "short" ? "0m" : "0 minutes";
  }

  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];

  if (format === "short") {
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  } else {
    if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
    if (mins > 0 || parts.length === 0)
      parts.push(`${mins} minute${mins !== 1 ? "s" : ""}`);
  }

  return parts.join(" ");
}

// File size formatting
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

// Phone number formatting (US)
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

// Truncate text with ellipsis
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = "..."
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length).trim() + ellipsis;
}

// Pluralize words
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  const word = count === 1 ? singular : plural || singular + "s";
  return `${formatNumber(count)} ${word}`;
}

// Calculate percentage change
export function calculatePercentageChange(
  current: number,
  previous: number
): {
  value: number;
  formatted: string;
  direction: "up" | "down" | "neutral";
} {
  if (previous === 0) {
    return {
      value: current > 0 ? 100 : 0,
      formatted: current > 0 ? "+100%" : "0%",
      direction: current > 0 ? "up" : "neutral",
    };
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "neutral";
  const sign = change > 0 ? "+" : "";

  return {
    value: change,
    formatted: `${sign}${change.toFixed(1)}%`,
    direction,
  };
}
