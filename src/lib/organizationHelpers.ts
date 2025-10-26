import { supabase } from "@/integrations/supabase/client";

/**
 * Get the current user's organization_id
 * @returns organization_id or throws an error if user is not in an organization
 */
export async function getCurrentUserOrganizationId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: orgMember, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (error || !orgMember?.organization_id) {
    throw new Error("User not in organization");
  }

  return orgMember.organization_id;
}
