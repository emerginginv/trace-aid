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
  refreshOrganization: () => Promise<string | null>;
  subscriptionStatus: {
    subscribed: boolean;
    product_id: string | null;
    subscription_end: string | null;
    subscription_id: string | null;
    trial_end: string | null;
    status: string;
  } | null;
  checkSubscription: (orgId?: string) => Promise<void>;
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

  const refreshOrganization = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOrganization(null);
        return null;
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
        return null;
      }

      if (!memberData || memberData.length === 0 || !memberData[0]?.organization_id) {
        console.warn("User not in any organization");
        setOrganization(null);
        return null;
      }

      const orgId = memberData[0].organization_id;

      // Get organization details with explicit filter for this specific org only
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .maybeSingle();

      if (orgError) {
        console.error("Error fetching organization:", orgError);
        setOrganization(null);
        return null;
      }

      if (!orgData) {
        console.warn("Organization not found");
        setOrganization(null);
        return null;
      }

      setOrganization(orgData as Organization);
      return orgId;
    } catch (error) {
      console.error("Error in refreshOrganization:", error);
      setOrganization(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async (orgId?: string) => {
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

      console.log("Subscription data received:", data);
      setSubscriptionStatus(data);

      // Use provided orgId or get from current organization state
      const targetOrgId = orgId || organization?.id;
      
      // Update organization subscription status in database
      if (targetOrgId && data) {
        // Use getPlanLimits to determine the tier and limits based on product ID
        const planInfo = getPlanLimits(data.product_id);
        
        console.log("Plan info for product:", data.product_id, planInfo);
        
        // Determine if user has an active subscription (active or trialing)
        const isSubscribed = data.subscribed && data.product_id;
        
        // Set tier based on subscription - use the actual plan name or "standard"
        const tier = isSubscribed ? planInfo.name.toLowerCase().replace(/\s+/g, '_') : "free";
        
        // Determine status: preserve Stripe status (active, trialing, etc.)
        const status = data.subscribed ? (data.status || "active") : "inactive";
        
        console.log("Updating organization with:", {
          tier,
          status,
          max_users: isSubscribed ? planInfo.max_admin_users : 1,
          product_id: data.product_id
        });
        
        // Update organization with plan limits from Stripe product
        const { error: updateError } = await supabase
          .from("organizations")
          .update({
            subscription_tier: tier,
            subscription_status: status,
            stripe_subscription_id: data.subscription_id,
            trial_ends_at: data.trial_end,
            subscription_product_id: data.product_id,
            // Update max_users based on the plan limits - this is the KEY fix
            max_users: isSubscribed ? planInfo.max_admin_users : 1,
          })
          .eq("id", targetOrgId);

        if (updateError) {
          console.error("Error updating organization:", updateError);
        } else {
          console.log("Organization updated successfully with plan limits");
          await refreshOrganization();
        }
      } else {
        console.log("No organization to update, orgId:", targetOrgId);
      }
    } catch (error) {
      console.error("Error in checkSubscription:", error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const orgId = await refreshOrganization();
      // Always check subscription on initial load to sync plan limits
      if (orgId) {
        setTimeout(() => checkSubscription(orgId), 100);
      }
    };
    
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        const orgId = await refreshOrganization();
        // Defer checkSubscription to avoid potential deadlocks
        if (orgId) {
          setTimeout(() => checkSubscription(orgId), 0);
        }
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
