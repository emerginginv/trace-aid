import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  /** The permission key to check */
  permission: string;
  /** Content to render when permission is granted */
  children: ReactNode;
  /** Optional content to render when permission is denied (defaults to null) */
  fallback?: ReactNode;
  /** If true, renders children while permissions are loading */
  showWhileLoading?: boolean;
}

/**
 * A component that conditionally renders children based on user permissions.
 * Centralizes permission-based rendering logic across the application.
 * 
 * @example
 * // Hide element if no permission
 * <PermissionGate permission="add_finances">
 *   <Button>Add Finance</Button>
 * </PermissionGate>
 * 
 * @example
 * // Show alternative content if no permission
 * <PermissionGate 
 *   permission="edit_case" 
 *   fallback={<span className="text-muted-foreground">View Only</span>}
 * >
 *   <Button>Edit Case</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
  showWhileLoading = false,
}: PermissionGateProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return showWhileLoading ? <>{children}</> : null;
  }

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface MultiPermissionGateProps {
  /** Array of permission keys to check */
  permissions: string[];
  /** 'all' requires all permissions, 'any' requires at least one */
  mode?: 'all' | 'any';
  /** Content to render when permission check passes */
  children: ReactNode;
  /** Optional content to render when permission check fails */
  fallback?: ReactNode;
  /** If true, renders children while permissions are loading */
  showWhileLoading?: boolean;
}

/**
 * A component that conditionally renders children based on multiple permissions.
 * 
 * @example
 * // Require ALL permissions
 * <MultiPermissionGate permissions={['edit_case', 'view_finances']} mode="all">
 *   <AdminPanel />
 * </MultiPermissionGate>
 * 
 * @example
 * // Require ANY permission
 * <MultiPermissionGate permissions={['add_finances', 'edit_finances']} mode="any">
 *   <FinanceActions />
 * </MultiPermissionGate>
 */
export function MultiPermissionGate({
  permissions,
  mode = 'all',
  children,
  fallback = null,
  showWhileLoading = false,
}: MultiPermissionGateProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return showWhileLoading ? <>{children}</> : null;
  }

  const hasAccess = mode === 'all'
    ? permissions.every(p => hasPermission(p))
    : permissions.some(p => hasPermission(p));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default PermissionGate;
