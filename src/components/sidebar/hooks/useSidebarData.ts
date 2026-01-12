import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { UserProfile, OrgSettings } from "../types";

export function useSidebarData() {
  const { organization, loading: orgLoading } = useOrganization();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);

  // Fetch user profile and role
  useEffect(() => {
    if (orgLoading) return;

    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      let displayRole = "member";
      if (organization?.id) {
        const { data: orgMember } = await supabase
          .from("organization_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("organization_id", organization.id)
          .maybeSingle();

        if (orgMember?.role) {
          displayRole = orgMember.role;
        }
      }

      setUserProfile({
        full_name: profile?.full_name || null,
        email: profile?.email || user.email || "",
        role: displayRole,
        avatar_url: profile?.avatar_url || null,
      });
    };

    fetchUserProfile();
  }, [organization?.id, orgLoading]);

  // Fetch organization settings
  useEffect(() => {
    if (orgLoading || !organization?.id) return;

    const fetchOrgSettings = async () => {
      const { data } = await supabase
        .from("organization_settings")
        .select("logo_url, square_logo_url, company_name")
        .eq("organization_id", organization.id)
        .maybeSingle();

      setOrgSettings(data);
    };

    fetchOrgSettings();
  }, [organization?.id, orgLoading]);

  return { userProfile, orgSettings };
}
