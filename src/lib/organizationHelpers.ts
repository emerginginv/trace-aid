import { supabase } from "@/integrations/supabase/client";

const SELECTED_ORG_KEY = "selected_organization_id";

/**
 * Get the current user's organization_id
 * @returns organization_id or throws an error if user is not in an organization
 */
export async function getCurrentUserOrganizationId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // First check for saved organization selection
  const savedOrgId = localStorage.getItem(SELECTED_ORG_KEY);
  
  if (savedOrgId) {
    // Verify the user is still a member of this organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', savedOrgId)
      .maybeSingle();

    if (!memberError && membership) {
      return savedOrgId;
    }
    // If the saved org is no longer valid, remove it
    localStorage.removeItem(SELECTED_ORG_KEY);
  }

  // Fallback: Get the first organization membership
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

  // Save this as the selected org
  localStorage.setItem(SELECTED_ORG_KEY, orgMembers[0].organization_id);
  return orgMembers[0].organization_id;
}
