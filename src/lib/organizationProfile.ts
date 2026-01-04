import { supabase } from "@/integrations/supabase/client";

/**
 * Organization Profile interface - single source of truth for report branding
 */
export interface OrganizationProfile {
  companyName: string | null;
  logoUrl: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  fullAddress: string;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  billingEmail: string | null;
}

/**
 * Formats a full address from organization profile components
 */
export function formatFullAddress(
  streetAddress: string | null,
  city: string | null,
  state: string | null,
  zipCode: string | null
): string {
  const parts: string[] = [];
  
  if (streetAddress?.trim()) {
    parts.push(streetAddress.trim());
  }
  
  // Build city, state zip line
  const cityStateZip: string[] = [];
  if (city?.trim()) {
    cityStateZip.push(city.trim());
  }
  if (state?.trim()) {
    cityStateZip.push(state.trim());
  }
  
  let locationLine = cityStateZip.join(", ");
  if (zipCode?.trim()) {
    locationLine = locationLine ? `${locationLine} ${zipCode.trim()}` : zipCode.trim();
  }
  
  if (locationLine) {
    parts.push(locationLine);
  }
  
  return parts.join(", ");
}

/**
 * Fetches the organization profile for report branding
 * @param organizationId - The organization's ID
 * @returns OrganizationProfile or null if not found
 */
export async function getOrganizationProfile(
  organizationId: string
): Promise<OrganizationProfile | null> {
  try {
    const { data, error } = await supabase
      .from("organization_settings")
      .select(`
        company_name,
        logo_url,
        address,
        city,
        state,
        zip_code,
        phone,
        email,
        website_url,
        billing_email
      `)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching organization profile:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    const fullAddress = formatFullAddress(
      data.address,
      data.city,
      data.state,
      data.zip_code
    );

    return {
      companyName: data.company_name,
      logoUrl: data.logo_url,
      streetAddress: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zip_code,
      fullAddress,
      phone: data.phone,
      email: data.email,
      websiteUrl: data.website_url,
      billingEmail: data.billing_email,
    };
  } catch (error) {
    console.error("Error fetching organization profile:", error);
    return null;
  }
}

/**
 * Gets the current user's organization profile
 * @returns OrganizationProfile or null if not found
 */
export async function getCurrentOrganizationProfile(): Promise<OrganizationProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!orgMember?.organization_id) return null;

    return getOrganizationProfile(orgMember.organization_id);
  } catch (error) {
    console.error("Error fetching current organization profile:", error);
    return null;
  }
}
