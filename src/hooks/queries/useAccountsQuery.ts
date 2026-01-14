import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

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

export type AccountInput = Omit<Account, 'id' | 'created_at' | 'updated_at'>;

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

/**
 * Mutation hook for creating an account.
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: AccountInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('accounts')
        .insert({
          ...input,
          organization_id: organization.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for updating an account.
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Account> & { id: string }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Account;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account', data.id] });
      toast.success('Account updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for deleting an account.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      return accountId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });
}

export default useAccountsQuery;
