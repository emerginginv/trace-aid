/**
 * Resource Access Gate
 * 
 * Wrapper component that checks resource access before rendering children.
 * Displays appropriate error pages for 403/404 scenarios.
 */

import { ReactNode } from 'react';
import { useResourceAccess, ResourceType } from '@/hooks/useResourceAccess';
import { AccessDeniedPage } from './AccessDeniedPage';
import { NotFoundPage } from './NotFoundPage';
import { Skeleton } from '@/components/ui/skeleton';

interface ResourceAccessGateProps {
  /** Type of resource to check access for */
  resourceType: ResourceType;
  /** ID of the resource */
  resourceId: string | null | undefined;
  /** Content to render when access is granted */
  children: ReactNode;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom not found component */
  notFoundComponent?: ReactNode;
  /** Custom access denied component */
  accessDeniedComponent?: ReactNode;
  /** URL to go back to */
  backUrl?: string;
  /** URL for searching similar resources */
  searchUrl?: string;
}

/**
 * Gate component that wraps content requiring resource access.
 * 
 * @example
 * ```tsx
 * <ResourceAccessGate resourceType="case" resourceId={caseId}>
 *   <CaseDetail caseId={caseId} />
 * </ResourceAccessGate>
 * ```
 */
export function ResourceAccessGate({
  resourceType,
  resourceId,
  children,
  loadingComponent,
  notFoundComponent,
  accessDeniedComponent,
  backUrl,
  searchUrl,
}: ResourceAccessGateProps) {
  const { canAccess, isLoading, accessDeniedReason } = useResourceAccess(resourceType, resourceId);

  // Loading state
  if (isLoading) {
    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Not found
  if (accessDeniedReason === 'not_found') {
    return notFoundComponent ? (
      <>{notFoundComponent}</>
    ) : (
      <NotFoundPage
        resourceType={resourceType}
        resourceId={resourceId || undefined}
        backUrl={backUrl}
        showSearchSuggestion={!!searchUrl}
        searchUrl={searchUrl}
      />
    );
  }

  // Access denied (unauthorized or different organization)
  if (!canAccess) {
    return accessDeniedComponent ? (
      <>{accessDeniedComponent}</>
    ) : (
      <AccessDeniedPage
        resourceType={resourceType}
        backUrl={backUrl}
        description={
          accessDeniedReason === 'different_organization'
            ? 'This resource belongs to a different organization.'
            : "You don't have permission to view this resource."
        }
      />
    );
  }

  // Access granted
  return <>{children}</>;
}

/**
 * Higher-order component version for class components or when preferred.
 */
export function withResourceAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  getResourceInfo: (props: P) => { type: ResourceType; id: string | null }
) {
  return function WithResourceAccessComponent(props: P) {
    const { type, id } = getResourceInfo(props);
    
    return (
      <ResourceAccessGate resourceType={type} resourceId={id}>
        <WrappedComponent {...props} />
      </ResourceAccessGate>
    );
  };
}
