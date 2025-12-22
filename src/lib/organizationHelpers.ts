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

  // Get the first organization membership (user may be in multiple orgs)
  const { data: orgMembers, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1);

  if (error) {
    console.error("Error fetching organization membership:", error);
    throw new Error("Failed to fetch organization membership");
  }

  if (!orgMembers || orgMembers.length === 0 || !orgMembers[0]?.organization_id) {
    throw new Error("User not in organization");
  }

  return orgMembers[0].organization_id;
}
