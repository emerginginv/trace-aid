import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export type PricingProfileSource = "case" | "account" | "organization" | "not_configured";

interface CasePricingProfileResult {
  profileName: string | null;
  source: PricingProfileSource;
  isLoading: boolean;
}

export const useCasePricingProfile = (caseId: string): CasePricingProfileResult => {
  const { organization } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ["case-pricing-profile", caseId, organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;

      // Fetch case with its pricing profile and account info
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select(`
          pricing_profile_id,
          account_id,
          pricing_profile:pricing_profiles!cases_pricing_profile_id_fkey(name),
          account:accounts!cases_account_id_fkey(
            default_pricing_profile_id,
            default_pricing_profile:pricing_profiles!accounts_default_pricing_profile_id_fkey(name)
          )
        `)
        .eq("id", caseId)
        .eq("organization_id", organization.id)
        .single();

      if (caseError || !caseData) {
        console.error("Error fetching case pricing profile:", caseError);
        return null;
      }

      // Priority 1: Case-level pricing profile
      if (caseData.pricing_profile_id && caseData.pricing_profile) {
        return {
          profileName: (caseData.pricing_profile as any).name,
          source: "case" as PricingProfileSource,
        };
      }

      // Priority 2: Account-level default pricing profile
      if (caseData.account?.default_pricing_profile_id && caseData.account?.default_pricing_profile) {
        return {
          profileName: (caseData.account.default_pricing_profile as any).name,
          source: "account" as PricingProfileSource,
        };
      }

      // Priority 3: Organization default pricing profile
      const { data: orgDefaultProfile, error: orgError } = await supabase
        .from("pricing_profiles")
        .select("name")
        .eq("organization_id", organization.id)
        .eq("is_default", true)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!orgError && orgDefaultProfile) {
        return {
          profileName: orgDefaultProfile.name,
          source: "organization" as PricingProfileSource,
        };
      }

      return null;
    },
    enabled: !!caseId && !!organization?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  if (isLoading) {
    return {
      profileName: null,
      source: "not_configured",
      isLoading: true,
    };
  }

  if (!data) {
    return {
      profileName: null,
      source: "not_configured",
      isLoading: false,
    };
  }

  return {
    profileName: data.profileName,
    source: data.source,
    isLoading: false,
  };
};
