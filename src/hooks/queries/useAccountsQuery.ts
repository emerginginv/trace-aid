import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface Account {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  industry?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface UseAccountsQueryOptions {
  search?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for fetching accounts with caching.
 */
export function useAccountsQuery(options: UseAccountsQueryOptions = {}) {
  const { organization } = useOrganization();
  const { search, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['accounts', organization?.id, search, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name', { ascending: true });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Account[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * React Query hook for fetching a single account by ID.
 */
export function useAccountQuery(accountId: string | undefined) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      if (!accountId || !organization?.id) return null;

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      return data as Account;
    },
    enabled: !!accountId && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

export default useAccountsQuery;
