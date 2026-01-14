import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface Case {
  id: string;
  case_number: string;
  title: string;
  status: string;
  description?: string;
  due_date?: string;
  created_at: string;
  updated_at?: string;
  case_type_id?: string;
  case_type_tag?: string;
  account_id?: string;
  contact_id?: string;
  case_manager_id?: string;
  is_draft?: boolean;
}

interface UseCasesQueryOptions {
  status?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for fetching cases with caching and automatic refetching.
 * 
 * @example
 * const { data: cases, isLoading } = useCasesQuery({ status: 'active' });
 */
export function useCasesQuery(options: UseCasesQueryOptions = {}) {
  const { organization } = useOrganization();
  const { status, search, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['cases', organization?.id, status, search, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('cases')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,case_number.ilike.%${search}%,reference_number.ilike.%${search}%,reference_number_2.ilike.%${search}%,reference_number_3.ilike.%${search}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Case[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * React Query hook for fetching a single case by ID.
 * 
 * @example
 * const { data: caseData, isLoading } = useCaseQuery(caseId);
 */
export function useCaseQuery(caseId: string | undefined) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      if (!caseId || !organization?.id) return null;

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      return data as Case;
    },
    enabled: !!caseId && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Mutation hook for updating a case.
 * Automatically invalidates the cases query cache.
 */
export function useUpdateCaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Case> }) => {
      const { data, error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', data.id] });
      toast({
        title: 'Success',
        description: 'Case updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating case:', error);
      toast({
        title: 'Error',
        description: 'Failed to update case',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook for deleting a case.
 * Automatically invalidates the cases query cache.
 */
export function useDeleteCaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast({
        title: 'Success',
        description: 'Case deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Error deleting case:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete case',
        variant: 'destructive',
      });
    },
  });
}

export default useCasesQuery;
