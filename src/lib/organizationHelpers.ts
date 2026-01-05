import { supabase } from "@/integrations/supabase/client";

/**
 * Organization membership info returned by getCurrentUserOrgMembership
 */
export interface OrgMembership {
  organizationId: string;
  role: "admin" | "manager" | "investigator" | "vendor";
}

/**
 * Get the current user's organization_id.
 * Prefer using the useOrganizationId() hook when in React components.
 * 
 * @returns organization_id or throws an error if user is not in an organization
 */
export async function getCurrentUserOrganizationId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

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

/**
 * Get the current user's organization membership including role.
 * Prefer using the useOrganization() hook when in React components.
 * 
 * @returns OrgMembership object with organizationId and role
 * @throws Error if user is not authenticated or not in an organization
 */
export async function getCurrentUserOrgMembership(): Promise<OrgMembership> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: orgMember, error } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching organization membership:", error);
    throw new Error("Failed to fetch organization membership");
  }

  if (!orgMember?.organization_id) {
    throw new Error("User not in organization");
  }

  return {
    organizationId: orgMember.organization_id,
    role: orgMember.role as OrgMembership["role"],
  };
}

/**
 * Get organization ID for a specific user (admin use case).
 * 
 * @param userId - The user ID to look up
 * @returns organization_id or null if user is not in an organization
 */
export async function getOrganizationIdForUser(userId: string): Promise<string | null> {
  const { data: orgMember, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (error || !orgMember?.organization_id) {
    return null;
  }

  return orgMember.organization_id;
}
