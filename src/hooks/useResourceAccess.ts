/**
 * Resource Access Hook
 * 
 * Provides standardized access control checks for resources (cases, accounts, contacts).
 * Handles 403/404 scenarios with consistent error handling.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export type ResourceType = 'case' | 'account' | 'contact' | 'invoice';

export interface ResourceAccessResult {
  /** Whether the resource exists and user has access */
  canAccess: boolean;
  /** Whether the resource exists (regardless of access) */
  exists: boolean;
  /** Whether access check is in progress */
  isLoading: boolean;
  /** Error message if access denied */
  error: string | null;
  /** Specific access denial reason */
  accessDeniedReason: 'not_found' | 'unauthorized' | 'different_organization' | null;
}

/**
 * Hook to check if user has access to a specific resource.
 * 
 * @param resourceType - Type of resource to check
 * @param resourceId - ID of the resource
 * @returns Access check result with loading/error states
 * 
 * @example
 * ```tsx
 * const { canAccess, isLoading, accessDeniedReason } = useResourceAccess('case', caseId);
 * 
 * if (isLoading) return <Skeleton />;
 * if (!canAccess) {
 *   if (accessDeniedReason === 'not_found') return <NotFoundPage />;
 *   return <AccessDeniedPage />;
 * }
 * return <CaseDetail />;
 * ```
 */
export function useResourceAccess(
  resourceType: ResourceType,
  resourceId: string | null | undefined
): ResourceAccessResult {
  const { organization } = useOrganization();
  const [result, setResult] = useState<ResourceAccessResult>({
    canAccess: false,
    exists: false,
    isLoading: true,
    error: null,
    accessDeniedReason: null,
  });

  useEffect(() => {
    if (!resourceId) {
      setResult({
        canAccess: false,
        exists: false,
        isLoading: false,
        error: 'No resource ID provided',
        accessDeniedReason: 'not_found',
      });
      return;
    }

    if (!organization?.id) {
      setResult({
        canAccess: false,
        exists: false,
        isLoading: true,
        error: null,
        accessDeniedReason: null,
      });
      return;
    }

    const checkAccess = async () => {
      setResult((prev) => ({ ...prev, isLoading: true }));

      try {
        let data: { id: string; organization_id: string } | null = null;
        let error: Error | null = null;

        // Query based on resource type
        switch (resourceType) {
          case 'case': {
            const result = await supabase
              .from('cases')
              .select('id, organization_id')
              .eq('id', resourceId)
              .maybeSingle();
            data = result.data;
            error = result.error;
            break;
          }
          case 'account': {
            const result = await supabase
              .from('accounts')
              .select('id, organization_id')
              .eq('id', resourceId)
              .maybeSingle();
            data = result.data;
            error = result.error;
            break;
          }
          case 'contact': {
            const result = await supabase
              .from('contacts')
              .select('id, organization_id')
              .eq('id', resourceId)
              .maybeSingle();
            data = result.data;
            error = result.error;
            break;
          }
          case 'invoice': {
            const result = await supabase
              .from('invoices')
              .select('id, organization_id')
              .eq('id', resourceId)
              .maybeSingle();
            data = result.data;
            error = result.error;
            break;
          }
        }

        if (error) {
          // RLS may block even the existence check
          setResult({
            canAccess: false,
            exists: false,
            isLoading: false,
            error: 'Access denied',
            accessDeniedReason: 'unauthorized',
          });
          return;
        }

        if (!data) {
          setResult({
            canAccess: false,
            exists: false,
            isLoading: false,
            error: `${resourceType} not found`,
            accessDeniedReason: 'not_found',
          });
          return;
        }

        // Check if resource belongs to user's organization
        if (data.organization_id !== organization.id) {
          setResult({
            canAccess: false,
            exists: true,
            isLoading: false,
            error: 'This resource belongs to a different organization',
            accessDeniedReason: 'different_organization',
          });
          return;
        }

        // Access granted
        setResult({
          canAccess: true,
          exists: true,
          isLoading: false,
          error: null,
          accessDeniedReason: null,
        });
      } catch (error) {
        console.error('Resource access check failed:', error);
        setResult({
          canAccess: false,
          exists: false,
          isLoading: false,
          error: 'Failed to verify access',
          accessDeniedReason: 'unauthorized',
        });
      }
    };

    checkAccess();
  }, [resourceType, resourceId, organization?.id]);

  return result;
}
