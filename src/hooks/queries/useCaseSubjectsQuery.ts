import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface CaseSubject {
  id: string;
  name: string;
  display_name?: string;
  subject_type: string;
  role?: string;
  status: string;
  is_primary?: boolean;
  details?: Json;
  notes?: string;
  profile_image_url?: string;
  cover_image_url?: string;
  case_id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

export type CaseSubjectInput = Omit<CaseSubject, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

interface UseCaseSubjectsQueryOptions {
  caseId?: string;
  subjectType?: string;
  status?: string;
  isPrimary?: boolean;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for fetching case subjects with caching.
 */
export function useCaseSubjectsQuery(options: UseCaseSubjectsQueryOptions = {}) {
  const { organization } = useOrganization();
  const { caseId, subjectType, status, isPrimary, limit = 100, enabled = true } = options;

  return useQuery({
    queryKey: ['case-subjects', organization?.id, caseId, subjectType, status, isPrimary, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('case_subjects')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      if (subjectType) {
        query = query.eq('subject_type', subjectType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (isPrimary !== undefined) {
        query = query.eq('is_primary', isPrimary);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CaseSubject[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook for fetching a single subject by ID.
 */
export function useCaseSubjectQuery(subjectId: string | undefined) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['case-subject', subjectId],
    queryFn: async () => {
      if (!subjectId || !organization?.id) return null;

      const { data, error } = await supabase
        .from('case_subjects')
        .select('*')
        .eq('id', subjectId)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      return data as CaseSubject;
    },
    enabled: !!subjectId && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook for fetching primary subject of a case.
 */
export function usePrimarySubjectQuery(caseId: string | undefined) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['case-subject', 'primary', caseId],
    queryFn: async () => {
      if (!caseId || !organization?.id) return null;

      const { data, error } = await supabase
        .from('case_subjects')
        .select('*')
        .eq('case_id', caseId)
        .eq('organization_id', organization.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) throw error;
      return data as CaseSubject | null;
    },
    enabled: !!caseId && !!organization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Mutation hook for creating a case subject.
 */
export function useCreateCaseSubject() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: CaseSubjectInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('case_subjects')
        .insert({
          ...input,
          organization_id: organization.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CaseSubject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['case-subject', 'primary', data.case_id] });
      toast.success('Subject added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add subject: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for updating a case subject.
 */
export function useUpdateCaseSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CaseSubject> & { id: string }) => {
      const { data, error } = await supabase
        .from('case_subjects')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CaseSubject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['case-subject', data.id] });
      queryClient.invalidateQueries({ queryKey: ['case-subject', 'primary', data.case_id] });
      toast.success('Subject updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update subject: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for deleting a case subject.
 */
export function useDeleteCaseSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subjectId: string) => {
      const { error } = await supabase
        .from('case_subjects')
        .delete()
        .eq('id', subjectId);

      if (error) throw error;
      return subjectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-subjects'] });
      toast.success('Subject removed successfully');
    },
    onError: (error) => {
      toast.error(`Failed to remove subject: ${error.message}`);
    },
  });
}

export default useCaseSubjectsQuery;
