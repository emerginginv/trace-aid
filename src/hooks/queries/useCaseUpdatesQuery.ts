import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface CaseUpdate {
  id: string;
  title: string;
  description?: string;
  update_type: string;
  case_id: string;
  user_id: string;
  linked_activity_id?: string;
  is_ai_summary?: boolean;
  created_at: string;
}

export type CaseUpdateInput = Omit<CaseUpdate, 'id' | 'user_id' | 'created_at'>;

interface UseCaseUpdatesQueryOptions {
  caseId?: string;
  updateType?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for fetching case updates with caching.
 */
export function useCaseUpdatesQuery(options: UseCaseUpdatesQueryOptions = {}) {
  const { organization } = useOrganization();
  const { caseId, updateType, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['case-updates', organization?.id, caseId, updateType, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('case_updates')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      if (updateType) {
        query = query.eq('update_type', updateType);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CaseUpdate[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 1, // 1 minute - updates change frequently
  });
}

/**
 * Hook for fetching updates for a specific case.
 */
export function useCaseUpdatesByCaseId(caseId: string | undefined) {
  return useCaseUpdatesQuery({ caseId, enabled: !!caseId });
}

/**
 * Mutation hook for creating a case update.
 */
export function useCreateCaseUpdate() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: CaseUpdateInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('case_updates')
        .insert({
          ...input,
          organization_id: organization.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CaseUpdate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-updates'] });
      queryClient.invalidateQueries({ queryKey: ['case-updates', undefined, data.case_id] });
      toast.success('Update added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add update: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for updating a case update.
 */
export function useUpdateCaseUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CaseUpdate> & { id: string }) => {
      const { data, error } = await supabase
        .from('case_updates')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CaseUpdate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-updates'] });
      toast.success('Update modified successfully');
    },
    onError: (error) => {
      toast.error(`Failed to modify update: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for deleting a case update.
 */
export function useDeleteCaseUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateId: string) => {
      const { error } = await supabase
        .from('case_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;
      return updateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-updates'] });
      toast.success('Update deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete update: ${error.message}`);
    },
  });
}

export default useCaseUpdatesQuery;
