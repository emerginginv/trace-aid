import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface PlanEntitlements {
  plan_name: string;
  max_seats: number;
  max_cases: number;
  max_storage_bytes: number;
  custom_domains: boolean;
  exports_pdf: boolean;
  api_access: boolean;
  advanced_analytics: boolean;
  priority_support: boolean;
}

export interface UsageStats {
  seats_used: number;
  cases_count: number;
  storage_bytes: number;
  updated_at: string;
}

export interface OrganizationEntitlements {
  organization_id: string;
  subscription_product_id: string | null;
  subscription_status: string;
  subscription_tier: string;
  subscription_active: boolean;
  entitlements: PlanEntitlements;
  usage: UsageStats;
}

export interface EnforcementResult {
  allowed: boolean;
  error_code?: string;
  message?: string;
  current?: number;
  limit?: number;
  required_plan?: string;
  entitlements?: PlanEntitlements;
  usage?: UsageStats;
}

export type EntitlementAction = 
  | 'ADD_SEAT'
  | 'INVITE_USER'
  | 'CREATE_CASE'
  | 'UPLOAD_ATTACHMENT'
  | 'REQUEST_CUSTOM_DOMAIN'
  | 'ACCESS_API'
  | 'ACCESS_ADVANCED_ANALYTICS';

export function useEntitlements() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  // Fetch current entitlements and usage
  const { data: entitlements, isLoading, error, refetch } = useQuery({
    queryKey: ['entitlements', organization?.id],
    queryFn: async (): Promise<OrganizationEntitlements | null> => {
      if (!organization?.id) return null;

      const { data, error } = await supabase.rpc('get_organization_entitlements', {
        p_organization_id: organization.id
      });

      if (error) {
        console.error('[Entitlements] Error fetching:', error);
        throw error;
      }

      // The RPC returns jsonb, so we need to handle the conversion properly
      if (!data || typeof data !== 'object') {
        return null;
      }

      return data as unknown as OrganizationEntitlements;
    },
    enabled: !!organization?.id,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true,
  });

  // Mutation for checking entitlement before an action
  const checkEntitlement = useMutation({
    mutationFn: async ({ 
      action, 
      payload = {} 
    }: { 
      action: EntitlementAction; 
      payload?: Record<string, unknown>; 
    }): Promise<EnforcementResult> => {
      if (!organization?.id) {
        return { allowed: false, error_code: 'NO_ORG', message: 'No organization selected' };
      }

      const { data, error } = await supabase.functions.invoke('enforce-entitlement', {
        body: {
          organization_id: organization.id,
          action,
          payload
        }
      });

      if (error) {
        console.error('[Entitlements] Enforcement error:', error);
        throw error;
      }

      return data as EnforcementResult;
    },
    onSuccess: () => {
      // Refresh entitlements after a check
      queryClient.invalidateQueries({ queryKey: ['entitlements', organization?.id] });
    }
  });

  // Helper function to check if an action is allowed
  const canPerformAction = async (
    action: EntitlementAction, 
    payload?: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const result = await checkEntitlement.mutateAsync({ action, payload });
      
      if (!result.allowed) {
        toast.error(result.message || 'Action not allowed by your plan');
      }
      
      return result.allowed;
    } catch {
      toast.error('Failed to verify plan limits');
      return false;
    }
  };

  // Helper to check limits without blocking
  const checkLimits = (action: EntitlementAction): { 
    allowed: boolean; 
    usage?: number; 
    limit?: number;
    message?: string;
  } => {
    if (!entitlements) {
      return { allowed: true }; // Allow if data not loaded yet
    }

    const { entitlements: limits, usage } = entitlements;

    switch (action) {
      case 'ADD_SEAT':
      case 'INVITE_USER':
        if (limits.max_seats > 0 && usage.seats_used >= limits.max_seats) {
          return {
            allowed: false,
            usage: usage.seats_used,
            limit: limits.max_seats,
            message: `You've reached your ${limits.max_seats} seat limit. Upgrade to add more users.`
          };
        }
        break;

      case 'CREATE_CASE':
        if (limits.max_cases > 0 && usage.cases_count >= limits.max_cases) {
          return {
            allowed: false,
            usage: usage.cases_count,
            limit: limits.max_cases,
            message: `You've reached your ${limits.max_cases} case limit. Upgrade for unlimited cases.`
          };
        }
        break;

      case 'REQUEST_CUSTOM_DOMAIN':
        if (!entitlements.subscription_active) {
          return {
            allowed: false,
            message: 'An active subscription is required for custom domains.'
          };
        }
        if (!limits.custom_domains) {
          return {
            allowed: false,
            message: 'Custom domains require The Enterprise plan.'
          };
        }
        break;

      case 'ACCESS_API':
        if (!limits.api_access) {
          return {
            allowed: false,
            message: 'API access requires The Agency plan or higher.'
          };
        }
        break;

      case 'ACCESS_ADVANCED_ANALYTICS':
        if (!limits.advanced_analytics) {
          return {
            allowed: false,
            message: 'Advanced analytics require The Agency plan or higher.'
          };
        }
        break;
    }

    return { allowed: true };
  };

  // Calculate usage percentages
  const getUsagePercentage = (type: 'seats' | 'cases' | 'storage'): number => {
    if (!entitlements) return 0;

    const { entitlements: limits, usage } = entitlements;

    switch (type) {
      case 'seats':
        if (limits.max_seats <= 0) return 0; // Unlimited
        return Math.min(100, (usage.seats_used / limits.max_seats) * 100);
      case 'cases':
        if (limits.max_cases <= 0) return 0; // Unlimited
        return Math.min(100, (usage.cases_count / limits.max_cases) * 100);
      case 'storage':
        if (limits.max_storage_bytes <= 0) return 0; // Unlimited
        return Math.min(100, (usage.storage_bytes / limits.max_storage_bytes) * 100);
      default:
        return 0;
    }
  };

  // Format storage for display
  const formatStorage = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check if approaching limit (>80%)
  const isApproachingLimit = (type: 'seats' | 'cases' | 'storage'): boolean => {
    return getUsagePercentage(type) >= 80;
  };

  // Check if at limit (100%)
  const isAtLimit = (type: 'seats' | 'cases' | 'storage'): boolean => {
    return getUsagePercentage(type) >= 100;
  };

  return {
    entitlements,
    isLoading,
    error,
    refetch,
    checkEntitlement: checkEntitlement.mutateAsync,
    canPerformAction,
    checkLimits,
    getUsagePercentage,
    formatStorage,
    isApproachingLimit,
    isAtLimit,
    isPending: checkEntitlement.isPending
  };
}

export default useEntitlements;
