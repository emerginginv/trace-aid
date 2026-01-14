import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface CaseService {
  id: string;
  name: string;
  code?: string;
  description?: string;
  color?: string;
  is_active: boolean;
  is_billable?: boolean;
  default_rate?: number;
  default_duration_minutes?: number;
  schedule_mode: string;
  requires_scheduling?: boolean;
  display_order: number;
  created_at: string;
  updated_at?: string;
}

export type CaseServiceInput = Omit<CaseService, 'id' | 'created_at' | 'updated_at'>;

interface UseCaseServicesQueryOptions {
  activeOnly?: boolean;
  billableOnly?: boolean;
  enabled?: boolean;
}

/**
 * React Query hook for fetching case services with caching.
 */
export function useCaseServicesQuery(options: UseCaseServicesQueryOptions = {}) {
  const { organization } = useOrganization();
  const { activeOnly = true, billableOnly = false, enabled = true } = options;

  return useQuery({
    queryKey: ['case-services', organization?.id, activeOnly, billableOnly],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('case_services')
        .select('*')
        .eq('organization_id', organization.id)
        .order('display_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      if (billableOnly) {
        query = query.eq('is_billable', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CaseService[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - services don't change often
  });
}

/**
 * Hook for fetching a single service by ID.
 */
export function useCaseServiceQuery(serviceId: string | undefined) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['case-service', serviceId],
    queryFn: async () => {
      if (!serviceId || !organization?.id) return null;

      const { data, error } = await supabase
        .from('case_services')
        .select('*')
        .eq('id', serviceId)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      return data as CaseService;
    },
    enabled: !!serviceId && !!organization?.id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Mutation hook for creating a case service.
 */
export function useCreateCaseService() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: CaseServiceInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organization?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('case_services')
        .insert({
          ...input,
          organization_id: organization.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CaseService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-services'] });
      toast.success('Service created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create service: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for updating a case service.
 */
export function useUpdateCaseService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CaseService> & { id: string }) => {
      const { data, error } = await supabase
        .from('case_services')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CaseService;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-services'] });
      queryClient.invalidateQueries({ queryKey: ['case-service', data.id] });
      toast.success('Service updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update service: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for deleting a case service.
 */
export function useDeleteCaseService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from('case_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      return serviceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-services'] });
      toast.success('Service deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete service: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for reordering services.
 */
export function useReorderCaseServices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        display_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('case_services')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-services'] });
    },
    onError: (error) => {
      toast.error(`Failed to reorder services: ${error.message}`);
    },
  });
}

export default useCaseServicesQuery;
