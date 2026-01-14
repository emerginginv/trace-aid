import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  color?: string;
  phone?: string;
  timezone?: string;
  created_at: string;
  updated_at?: string;
}

export type ProfileInput = Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>;

/**
 * React Query hook for fetching organization members' profiles.
 */
export function useOrganizationProfilesQuery(options: { enabled?: boolean } = {}) {
  const { organization } = useOrganization();
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['profiles', 'organization', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Get organization member IDs first
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organization.id);

      if (membersError) throw membersError;
      if (!members?.length) return [];

      const userIds = members.map(m => m.user_id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Profile[];
    },
    enabled: enabled && !!organization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - profiles don't change often
  });
}

/**
 * React Query hook for fetching current user's profile.
 */
export function useCurrentProfileQuery() {
  return useQuery({
    queryKey: ['profile', 'current'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * React Query hook for fetching a single profile by ID.
 */
export function useProfileQuery(profileId: string | undefined) {
  return useQuery({
    queryKey: ['profile', profileId],
    queryFn: async () => {
      if (!profileId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!profileId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Mutation hook for updating current user's profile.
 */
export function useUpdateCurrentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(input)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
}

export default useOrganizationProfilesQuery;
