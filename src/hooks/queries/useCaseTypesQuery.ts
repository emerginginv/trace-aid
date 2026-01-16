import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface CaseType {
  id: string;
  name: string;
  tag: string;
  description?: string;
  color?: string;
  is_active: boolean;
  budget_strategy?: string;
  budget_required?: boolean;
  due_date_required?: boolean;
  default_due_days?: number;
  default_subject_type?: string;
  allowed_service_ids?: string[];
  allowed_subject_types?: string[];
  allowed_case_flags?: string[];
  display_order?: number;
  created_at: string;
  reference_label_1?: string | null;
  reference_label_2?: string | null;
  reference_label_3?: string | null;
}

interface UseCaseTypesQueryOptions {
  activeOnly?: boolean;
  enabled?: boolean;
}

/**
 * React Query hook for fetching case types with caching.
 */
export function useCaseTypesQuery(options: UseCaseTypesQueryOptions = {}) {
  const { organization } = useOrganization();
  const { activeOnly = true, enabled = true } = options;

  return useQuery({
    queryKey: ['case-types', organization?.id, activeOnly],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('case_types')
        .select('*')
        .eq('organization_id', organization.id)
        .order('display_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CaseType[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - case types don't change often
  });
}

/**
 * Hook for fetching a single case type by ID.
 */
export function useCaseTypeQuery(caseTypeId: string | undefined | null) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['case-type', caseTypeId],
    queryFn: async () => {
      if (!caseTypeId || !organization?.id) return null;

      const { data, error } = await supabase
        .from('case_types')
        .select('*')
        .eq('id', caseTypeId)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      return data as CaseType;
    },
    enabled: !!caseTypeId && !!organization?.id,
    staleTime: 0, // Always refetch to ensure fresh case type config (especially allowed_service_ids)
    refetchOnMount: true,
  });
}
