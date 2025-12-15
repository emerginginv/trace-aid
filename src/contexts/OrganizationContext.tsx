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
  subscription_status: "active" | "inactive" | "past_due" | "canceled" | "trialing";
  max_users: number;
  billing_email: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  subscription_product_id: string | null;
  current_users_count: number;
  storage_used_gb: number;
}

interface OrganizationContextType {
  organization: Organization | null;
  loading: boolean;
  refreshOrganization: () => Promise<void>;
  subscriptionStatus: {
    subscribed: boolean;
    product_id: string | null;
    subscription_end: string | null;
    subscription_id: string | null;
    trial_end: string | null;
    status: string;
  } | null;
  checkSubscription: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscribed: boolean;
    product_id: string | null;
    subscription_end: string | null;
    subscription_id: string | null;
    trial_end: string | null;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOrganization(null);
        return;
      }

      // Get user's organization through organization_members
      // Use limit(1) to handle users in multiple organizations
      const { data: memberData, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1);

      if (memberError) {
        console.error("Error fetching organization membership:", memberError);
        setOrganization(null);
        return;
      }

      if (!memberData || memberData.length === 0 || !memberData[0]?.organization_id) {
        console.warn("User not in any organization");
        setOrganization(null);
        return;
      }

      // Get organization details with explicit filter for this specific org only
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", memberData[0].organization_id)
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
        // Use getPlanLimits to determine the tier and limits based on product ID
        const planInfo = getPlanLimits(data.product_id);
        
        // Determine tier: if subscribed (active or trialing) with a product, use "standard"
        const isSubscribed = data.subscribed && data.product_id;
        const tier = isSubscribed ? "standard" : "free";
        
        // Determine status: preserve Stripe status (active, trialing, etc.)
        // If subscribed is true, status should be from Stripe; otherwise inactive
        const status = data.subscribed ? (data.status || "active") : "inactive";
        
        // Update organization with plan limits from Stripe product
        await supabase
          .from("organizations")
          .update({
            subscription_tier: tier,
            subscription_status: status,
            stripe_subscription_id: data.subscription_id,
            trial_ends_at: data.trial_end,
            subscription_product_id: data.product_id,
            // Update max_users based on the plan limits
            max_users: isSubscribed ? planInfo.max_admin_users : 1,
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
      loading, 
      refreshOrganization,
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
