import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getPlanLimits } from "@/lib/planLimits";

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
  organizations: Organization[];
  loading: boolean;
  refreshOrganization: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  subscriptionStatus: SubscriptionStatus | null;
  checkSubscription: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const SELECTED_ORG_KEY = "selectedOrganizationId";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAllUserOrganizations = async (userId: string): Promise<Organization[]> => {
    // Get all organization memberships for this user
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId);

    if (memberError || !memberData || memberData.length === 0) {
      return [];
    }

    const orgIds = memberData.map(m => m.organization_id);
    
    // Fetch all organizations
    const { data: orgsData, error: orgsError } = await supabase
      .from("organizations")
      .select("*")
      .in("id", orgIds);

    if (orgsError || !orgsData) {
      return [];
    }

    return orgsData as Organization[];
  };

  const refreshOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOrganization(null);
        setOrganizations([]);
        return;
      }

      // Fetch all organizations for this user
      const allOrgs = await fetchAllUserOrganizations(user.id);
      setOrganizations(allOrgs);

      if (allOrgs.length === 0) {
        console.warn("User not in any organization");
        setOrganization(null);
        return;
      }

      // Check localStorage for previously selected org
      const savedOrgId = localStorage.getItem(SELECTED_ORG_KEY);
      let selectedOrg = allOrgs.find(org => org.id === savedOrgId);
      
      // If no saved selection or saved org not in list, use first org
      if (!selectedOrg) {
        selectedOrg = allOrgs[0];
        localStorage.setItem(SELECTED_ORG_KEY, selectedOrg.id);
      }

      setOrganization(selectedOrg);
    } catch (error) {
      console.error("Error in refreshOrganization:", error);
      setOrganization(null);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    const selectedOrg = organizations.find(org => org.id === orgId);
    if (selectedOrg) {
      localStorage.setItem(SELECTED_ORG_KEY, orgId);
      setOrganization(selectedOrg);
      // Refresh subscription status for the new org
      setTimeout(() => checkSubscription(), 0);
      // Force a page reload to refetch all data with new org context
      window.location.reload();
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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <OrganizationContext.Provider value={{ 
      organization, 
      organizations,
      loading, 
      refreshOrganization,
      switchOrganization,
      subscriptionStatus,
      checkSubscription 
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
