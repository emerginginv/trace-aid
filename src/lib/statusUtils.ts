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
