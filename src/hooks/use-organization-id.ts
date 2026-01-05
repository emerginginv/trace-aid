import { useOrganization } from "@/contexts/OrganizationContext";

/**
 * A simple hook to get the current organization ID from context.
 * Use this instead of manually querying organization_members table.
 * 
 * @returns The current organization ID or null if not available
 */
export function useOrganizationId(): string | null {
  const { organization } = useOrganization();
  return organization?.id ?? null;
}

/**
 * Hook that throws if organization is not available.
 * Use this when you know the user must be in an organization.
 * 
 * @returns The current organization ID
 * @throws Error if organization is not available
 */
export function useRequiredOrganizationId(): string {
  const { organization, loading } = useOrganization();
  
  if (loading) {
    throw new Error("Organization is still loading");
  }
  
  if (!organization?.id) {
    throw new Error("User is not in an organization");
  }
  
  return organization.id;
}
