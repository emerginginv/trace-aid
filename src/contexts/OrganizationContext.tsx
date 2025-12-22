import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getPlanLimits } from "@/lib/planLimits";

const SELECTED_ORG_KEY = "selected_organization_id";

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  subscription_tier: "free" | "standard" | "pro";
  subscription_status: "active" | "inactive" | "past_due" | "canceled";
  max_users: number;
  billing_email: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  subscription_product_id: string | null;
  current_users_count: number;
  storage_used_gb: number;
}

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  subscription_id: string | null;
  trial_end: string | null;
  status: string;
  storage_addon_gb: number;
  storage_addon_ids: string[];
}

interface OrganizationContextType {
  organization: Organization | null;
  loading: boolean;
  refreshOrganization: () => Promise<void>;
  subscriptionStatus: SubscriptionStatus | null;
  checkSubscription: () => Promise<void>;
  userOrganizations: { id: string; name: string; role: string }[];
  hasMultipleOrgs: boolean;
  showOrgSwitcher: boolean;
  setShowOrgSwitcher: (show: boolean) => void;
  selectOrganization: (orgId: string) => Promise<void>;
  pendingOrgSelection: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [userOrganizations, setUserOrganizations] = useState<{ id: string; name: string; role: string }[]>([]);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [pendingOrgSelection, setPendingOrgSelection] = useState(false);

  const hasMultipleOrgs = userOrganizations.length > 1;

  const fetchUserOrganizations = async (userId: string) => {
    try {
      const { data: memberships, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", userId);

      if (memberError || !memberships || memberships.length === 0) {
        return [];
      }

      const orgIds = memberships.map(m => m.organization_id);
      const { data: orgs, error: orgError } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);

      if (orgError || !orgs) {
        return [];
      }

      return orgs.map(org => {
        const membership = memberships.find(m => m.organization_id === org.id);
        return {
          id: org.id,
          name: org.name,
          role: membership?.role || "member"
        };
      });
    } catch (error) {
      console.error("Error fetching user organizations:", error);
      return [];
    }
  };

  const selectOrganization = async (orgId: string) => {
    localStorage.setItem(SELECTED_ORG_KEY, orgId);
    setPendingOrgSelection(false);
    await loadOrganization(orgId);
  };

  const loadOrganization = async (orgId: string) => {
    try {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .maybeSingle();

      if (orgError) {
        console.error("Error fetching organization:", orgError);
        setOrganization(null);
        return;
      }

      if (!orgData) {
        console.warn("Organization not found");
        setOrganization(null);
        return;
      }

      setOrganization(orgData as Organization);
    } catch (error) {
      console.error("Error in loadOrganization:", error);
      setOrganization(null);
    }
  };

  const refreshOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOrganization(null);
        setUserOrganizations([]);
        return;
      }

      // Fetch all user organizations
      const orgs = await fetchUserOrganizations(user.id);
      setUserOrganizations(orgs);

      if (orgs.length === 0) {
        console.warn("User not in any organization");
        setOrganization(null);
        return;
      }

      // Check for saved org selection
      const savedOrgId = localStorage.getItem(SELECTED_ORG_KEY);
      const savedOrgValid = savedOrgId && orgs.some(o => o.id === savedOrgId);

      if (orgs.length === 1) {
        // Single org - auto select
        await loadOrganization(orgs[0].id);
        localStorage.setItem(SELECTED_ORG_KEY, orgs[0].id);
      } else if (savedOrgValid) {
        // Multiple orgs but has valid saved selection
        await loadOrganization(savedOrgId);
      } else {
        // Multiple orgs, no valid saved selection - need to prompt
        setPendingOrgSelection(true);
        setShowOrgSwitcher(true);
      }
    } catch (error) {
      console.error("Error in refreshOrganization:", error);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    try {
      // Only check subscription if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("Skipping subscription check - no active session");
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("Error checking subscription:", error);
        return;
      }

      setSubscriptionStatus(data);

      // Update organization subscription status in database
      if (organization && data) {
        // Use getPlanLimits to determine the tier based on product ID
        const planInfo = getPlanLimits(data.product_id);
        const tier = data.product_id ? "standard" : "free"; // Just use "standard" for any paid plan
        
        await supabase
          .from("organizations")
          .update({
            subscription_tier: tier,
            subscription_status: data.status || (data.subscribed ? "active" : "inactive"),
            stripe_subscription_id: data.subscription_id,
            trial_ends_at: data.trial_end,
            subscription_product_id: data.product_id,
          })
          .eq("id", organization.id);

        await refreshOrganization();
      }
    } catch (error) {
      console.error("Error in checkSubscription:", error);
    }
  };

  useEffect(() => {
    refreshOrganization();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        refreshOrganization();
        // Defer checkSubscription to avoid potential deadlocks
        setTimeout(() => checkSubscription(), 0);
      } else if (event === "SIGNED_OUT") {
        setOrganization(null);
        setSubscriptionStatus(null);
        setUserOrganizations([]);
        localStorage.removeItem(SELECTED_ORG_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <OrganizationContext.Provider value={{ 
      organization, 
      loading, 
      refreshOrganization,
      subscriptionStatus,
      checkSubscription,
      userOrganizations,
      hasMultipleOrgs,
      showOrgSwitcher,
      setShowOrgSwitcher,
      selectOrganization,
      pendingOrgSelection
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
