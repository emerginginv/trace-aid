import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EnforcementAction {
  id: string;
  case_id: string | null;
  organization_id: string;
  user_id: string;
  action_type: string;
  enforcement_type: string;
  was_blocked: boolean;
  block_reason: string | null;
  context: Record<string, unknown>;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export interface EnforcementStatus {
  case_id: string;
  organization_id: string;
  budget: {
    has_budget: boolean;
    budget_type: string | null;
    hard_cap: boolean;
    hours_limit: number | null;
    amount_limit: number | null;
  };
  locked_services: number;
  locked_activities: number;
  blocked_actions_last_7_days: number;
  has_active_enforcement: boolean;
}

export function useEnforcementActions(caseId: string | undefined, limit: number = 20) {
  return useQuery({
    queryKey: ['enforcement-actions', caseId, limit],
    queryFn: async () => {
      if (!caseId) return [];
      
      const { data, error } = await supabase
        .from('enforcement_actions')
        .select(`
          *,
          user:profiles!enforcement_actions_user_id_fkey(full_name, email)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching enforcement actions:', error);
        throw error;
      }
      
      return (data || []) as EnforcementAction[];
    },
    enabled: !!caseId,
  });
}

export function useEnforcementStatus(caseId: string | undefined) {
  return useQuery({
    queryKey: ['enforcement-status', caseId],
    queryFn: async () => {
      if (!caseId) return null;
      
      const { data, error } = await supabase
        .rpc('get_case_enforcement_status', { p_case_id: caseId });
      
      if (error) {
        console.error('Error fetching enforcement status:', error);
        throw error;
      }
      
      return data as unknown as EnforcementStatus;
    },
    enabled: !!caseId,
  });
}

export function useOrganizationEnforcementSummary(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org-enforcement-summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from('enforcement_actions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('was_blocked', true)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching org enforcement summary:', error);
        throw error;
      }
      
      // Group by enforcement type
      const byType: Record<string, number> = {};
      (data || []).forEach((action) => {
        byType[action.enforcement_type] = (byType[action.enforcement_type] || 0) + 1;
      });
      
      return {
        totalBlocked: data?.length || 0,
        byType,
        recentActions: (data?.slice(0, 10) || []) as EnforcementAction[]
      };
    },
    enabled: !!organizationId,
  });
}
