import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  account_id?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface UseContactsQueryOptions {
  accountId?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for fetching contacts with caching.
 * 
 * @example
 * const { data: contacts, isLoading } = useContactsQuery({ accountId: '123' });
 */
export function useContactsQuery(options: UseContactsQueryOptions = {}) {
  const { organization } = useOrganization();
  const { accountId, search, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['contacts', organization?.id, accountId, search, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', organization.id)
        .order('last_name', { ascending: true });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Contact[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * React Query hook for fetching a single contact by ID.
 */
export function useContactQuery(contactId: string | undefined) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      if (!contactId || !organization?.id) return null;

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      return data as Contact;
    },
    enabled: !!contactId && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Mutation hook for creating a contact.
 */
export function useCreateContactMutation() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          ...contact,
          organization_id: organization.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Success',
        description: 'Contact created successfully',
      });
    },
    onError: (error) => {
      console.error('Error creating contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to create contact',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook for updating a contact.
 */
export function useUpdateContactMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Contact> }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', data.id] });
      toast({
        title: 'Success',
        description: 'Contact updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to update contact',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook for deleting a contact.
 */
export function useDeleteContactMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Success',
        description: 'Contact deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive',
      });
    },
  });
}

export default useContactsQuery;
