import { useCallback } from "react";
import { usePermissions } from "./usePermissions";
import { useCaseStatuses, CaseStatus } from "./use-case-statuses";

/**
 * Hook for role-based status display.
 * 
 * Users with `view_exact_status` permission see the full status name.
 * Users without it only see the category name (New, Open, Complete, Closed).
 */
export function useStatusDisplay() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { 
    getStatusById, 
    getCategoryById,
    getStatusColor: getOriginalStatusColor,
    isLoading: statusesLoading 
  } = useCaseStatuses();

  const canViewExactStatus = hasPermission('view_exact_status');

  /**
   * Get the appropriate display name for a status based on permission.
   * If user has view_exact_status permission: returns full status name
   * If not: returns category name (New, Open, Complete, Closed)
   */
  const getDisplayName = useCallback((statusId: string | null): string => {
    if (!statusId) return "Unknown";
    
    const status = getStatusById(statusId);
    if (!status) return "Unknown";
    
    if (canViewExactStatus) {
      return status.name; // Full status name
    } else {
      return status.category?.name || "Unknown"; // Category name only
    }
  }, [canViewExactStatus, getStatusById]);

  /**
   * Get the appropriate color for a status based on permission.
   * If user has view_exact_status permission: returns status color
   * If not: returns category color
   */
  const getDisplayColor = useCallback((statusId: string | null): string => {
    if (!statusId) return "#6b7280";
    
    const status = getStatusById(statusId);
    if (!status) return "#6b7280";
    
    if (canViewExactStatus) {
      return status.color || "#6b7280";
    } else {
      return status.category?.color || "#6b7280"; // Category color
    }
  }, [canViewExactStatus, getStatusById]);

  /**
   * Get the display style object for a status badge
   */
  const getDisplayStyle = useCallback((statusId: string | null): React.CSSProperties => {
    const color = getDisplayColor(statusId);
    return {
      backgroundColor: `${color}20`,
      color: color,
      borderColor: color,
    };
  }, [getDisplayColor]);

  /**
   * Get status info for display, respecting permissions
   */
  const getStatusDisplayInfo = useCallback((statusId: string | null): {
    name: string;
    color: string;
    style: React.CSSProperties;
  } => {
    const name = getDisplayName(statusId);
    const color = getDisplayColor(statusId);
    return {
      name,
      color,
      style: {
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color,
      },
    };
  }, [getDisplayName, getDisplayColor]);

  return {
    canViewExactStatus,
    getDisplayName,
    getDisplayColor,
    getDisplayStyle,
    getStatusDisplayInfo,
    loading: permissionsLoading || statusesLoading,
  };
}
