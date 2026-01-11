import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BillingEvent {
  id: string;
  organization_id: string;
  stripe_event_id: string;
  event_type: string;
  payload: Record<string, any>;
  processed_at: string | null;
  created_at: string | null;
}

export function useBillingHistory(organizationId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ['billing-history', organizationId, limit],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('billing_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as BillingEvent[];
    },
    enabled: !!organizationId,
  });
}
