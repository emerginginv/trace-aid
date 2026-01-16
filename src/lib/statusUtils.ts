import React from "react";

export interface PicklistItem {
  value: string;
  color?: string | null;
  status_type?: string | null;
}

/**
 * Generates CSS styles for a status badge based on a color value.
 * Returns a style object with semi-transparent background, solid text color, and border.
 * 
 * @param color - Hex color string (e.g., "#3b82f6")
 * @returns React.CSSProperties object for use in style prop
 */
export function getStatusStyleFromColor(color: string | undefined | null): React.CSSProperties {
  if (!color) return {};
  return {
    backgroundColor: `${color}20`,
    color: color,
    borderColor: `${color}40`,
  };
}

/**
 * Finds a status in a picklist and generates badge styles based on its color.
 * This is the primary utility for styling status badges throughout the application.
 * 
 * @param status - The status value to look up
 * @param picklists - Array of picklist items with value and optional color
 * @returns React.CSSProperties object for use in style prop
 */
export function getStatusStyleFromPicklist(
  status: string,
  picklists: PicklistItem[]
): React.CSSProperties {
  const statusItem = picklists.find((s) => s.value === status);
  return getStatusStyleFromColor(statusItem?.color);
}

/**
 * Checks if a status is considered "closed" based on picklist status_type.
 * 
 * @param status - The status value to check
 * @param picklists - Array of picklist items with value and optional status_type
 * @returns boolean indicating if the status represents a closed state
 */
export function isClosedStatus(
  status: string,
  picklists: PicklistItem[]
): boolean {
  const statusItem = picklists.find((s) => s.value === status);
  return statusItem?.status_type === "closed";
}

// ============================================================
// Entity-specific badge color utilities
// These functions return Tailwind class strings for consistent styling
// ============================================================

export type BadgeColorClasses = string;

/**
 * Get badge classes for update types
 */
export function getUpdateTypeBadgeClasses(type: string): BadgeColorClasses {
  switch (type) {
    case 'Case Update': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Client Contact': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case '3rd-Party Contact': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'Surveillance': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'Accounting': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
    default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
}

/**
 * Get badge classes for expense statuses
 */
export function getExpenseStatusBadgeClasses(status: string): { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string } {
  switch (status) {
    case 'pending':
      return { variant: 'secondary', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' };
    case 'approved':
      return { variant: 'default', className: 'bg-green-100 text-green-700 hover:bg-green-100' };
    case 'rejected':
      return { variant: 'destructive', className: 'bg-red-100 text-red-700 hover:bg-red-100' };
    case 'reimbursed':
      return { variant: 'default', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' };
    default:
      return { variant: 'outline' };
  }
}

/**
 * Get badge classes for activity statuses
 */
export function getActivityStatusBadgeClasses(status: string): BadgeColorClasses {
  switch (status) {
    case 'completed':
    case 'done':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'in_progress':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'scheduled':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'pending':
    case 'to_do':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'cancelled':
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    case 'overdue':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
}

/**
 * Get badge classes for invoice statuses
 */
export function getInvoiceStatusBadgeClasses(status: string): BadgeColorClasses {
  switch (status) {
    case 'paid':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'partial':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'sent':
    case 'sent_overdue':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'draft':
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    case 'void':
    case 'cancelled':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
}

/**
 * Generic status badge styling - use when entity type is known
 */
export function getEntityStatusBadgeClasses(
  entityType: 'update' | 'expense' | 'activity' | 'invoice',
  status: string
): BadgeColorClasses {
  switch (entityType) {
    case 'update':
      return getUpdateTypeBadgeClasses(status);
    case 'activity':
      return getActivityStatusBadgeClasses(status);
    case 'invoice':
      return getInvoiceStatusBadgeClasses(status);
    case 'expense':
      // For expense, we return generic classes - use getExpenseStatusBadgeClasses for full variant info
      return getExpenseStatusBadgeClasses(status).className || 'bg-gray-500/10 text-gray-600';
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
}
