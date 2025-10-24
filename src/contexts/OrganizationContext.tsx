import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  subscription_tier: "free" | "standard" | "pro";
  subscription_status: "active" | "inactive" | "past_due" | "canceled";
  max_users: number;
  billing_email: string | null;
}

interface OrganizationContextType {
  organization: Organization | null;
  loading: boolean;
  refreshOrganization: () => Promise<void>;
  subscriptionStatus: {
    subscribed: boolean;
    product_id: string | null;
    subscription_end: string | null;
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
      const { data: memberData, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (memberError || !memberData) {
        console.error("Error fetching organization membership:", memberError);
        setOrganization(null);
        return;
      }

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", memberData.organization_id)
        .single();

      if (orgError) {
        console.error("Error fetching organization:", orgError);
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
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("Error checking subscription:", error);
        return;
      }

      setSubscriptionStatus(data);

      // Update organization subscription status in database
      if (organization && data) {
        const tier = data.product_id === "prod_TIFNfVbkhFmIuB" ? "standard" : 
                     data.product_id === "prod_TIFN9OVHNQ1tlK" ? "pro" : "free";
        
        await supabase
          .from("organizations")
          .update({
            subscription_tier: tier,
            subscription_status: data.subscribed ? "active" : "inactive",
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
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        refreshOrganization();
        checkSubscription();
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
