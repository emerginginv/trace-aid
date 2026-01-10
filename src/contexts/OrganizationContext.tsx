import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getPlanLimits } from "@/lib/planLimits";
import { useTenant } from "./TenantContext";

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  subdomain: string | null;
  is_active: boolean;
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

export interface SubscriptionStatus {
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
const LOG_PREFIX = "[OrganizationContext]";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get tenant subdomain from TenantContext
  const { tenantSubdomain } = useTenant();

  const fetchAllUserOrganizations = async (userId: string): Promise<Organization[]> => {
    console.log(`${LOG_PREFIX} Fetching all organizations for user:`, userId);
    
    // Get all organization memberships for this user
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId);

    if (memberError || !memberData || memberData.length === 0) {
      console.warn(`${LOG_PREFIX} No organization memberships found for user:`, userId);
      return [];
    }

    console.log(`${LOG_PREFIX} Found ${memberData.length} organization membership(s):`, memberData);

    const orgIds = memberData.map(m => m.organization_id);
    
    // Fetch all organizations
    const { data: orgsData, error: orgsError } = await supabase
      .from("organizations")
      .select("*")
      .in("id", orgIds);

    if (orgsError || !orgsData) {
      console.error(`${LOG_PREFIX} Error fetching organizations:`, orgsError);
      return [];
    }

    console.log(`${LOG_PREFIX} Fetched ${orgsData.length} organization(s):`, orgsData.map(o => ({ id: o.id, name: o.name })));
    return orgsData as Organization[];
  };

  /**
   * Fetch organization by subdomain (for multi-tenant routing)
   */
  const fetchOrganizationBySubdomain = async (subdomain: string): Promise<Organization | null> => {
    console.log(`${LOG_PREFIX} Fetching organization by subdomain:`, subdomain);
    
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("subdomain", subdomain)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`${LOG_PREFIX} Error fetching organization by subdomain:`, error);
      return null;
    }

    if (!data) {
      console.warn(`${LOG_PREFIX} No organization found for subdomain:`, subdomain);
      return null;
    }

    console.log(`${LOG_PREFIX} Organization loaded:`, subdomain);
    return data as Organization;
  };

  const refreshOrganization = async () => {
    const timestamp = new Date().toISOString();
    console.log(`${LOG_PREFIX} [${timestamp}] refreshOrganization called`);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log(`${LOG_PREFIX} No authenticated user, clearing organization`);
        setOrganization(null);
        setOrganizations([]);
        setLoading(false);
        return;
      }

      console.log(`${LOG_PREFIX} Authenticated user:`, user.id);

      // If we have a tenant subdomain, prioritize loading that organization
      if (tenantSubdomain) {
        console.log(`${LOG_PREFIX} Tenant subdomain detected, loading organization by subdomain:`, tenantSubdomain);
        
        const subdomainOrg = await fetchOrganizationBySubdomain(tenantSubdomain);
        
        if (subdomainOrg) {
          // Verify user is a member of this organization
          const { data: membership } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("organization_id", subdomainOrg.id)
            .maybeSingle();

          if (membership) {
            // User is a member of this organization, use it
            setOrganization(subdomainOrg);
            localStorage.setItem(SELECTED_ORG_KEY, subdomainOrg.id);
            
            // Also fetch all orgs for the switcher
            const allOrgs = await fetchAllUserOrganizations(user.id);
            setOrganizations(allOrgs);
            
            console.log(`${LOG_PREFIX} ✅ Organization loaded via subdomain:`, {
              id: subdomainOrg.id,
              name: subdomainOrg.name,
              subdomain: subdomainOrg.subdomain
            });
            setLoading(false);
            return;
          } else {
            console.warn(`${LOG_PREFIX} User is not a member of organization:`, subdomainOrg.id);
            // Fall through to normal organization loading
          }
        } else {
          console.warn(`${LOG_PREFIX} No organization found for subdomain:`, tenantSubdomain);
          // Fall through to normal organization loading
        }
      }

      // Standard organization loading (no subdomain or subdomain org not found)
      const allOrgs = await fetchAllUserOrganizations(user.id);
      setOrganizations(allOrgs);

      if (allOrgs.length === 0) {
        console.warn(`${LOG_PREFIX} ⚠️ User not in any organization`);
        setOrganization(null);
        setLoading(false);
        return;
      }

      // Check localStorage for previously selected org
      const savedOrgId = localStorage.getItem(SELECTED_ORG_KEY);
      console.log(`${LOG_PREFIX} Saved organization ID from localStorage:`, savedOrgId);
      
      let selectedOrg = allOrgs.find(org => org.id === savedOrgId);
      
      // If no saved selection or saved org not in list, use first org
      if (!selectedOrg) {
        console.log(`${LOG_PREFIX} No valid saved org, using first organization`);
        selectedOrg = allOrgs[0];
        localStorage.setItem(SELECTED_ORG_KEY, selectedOrg.id);
      }

      console.log(`${LOG_PREFIX} ✅ Selected organization:`, {
        id: selectedOrg.id,
        name: selectedOrg.name,
        tier: selectedOrg.subscription_tier
      });
      
      setOrganization(selectedOrg);
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Error in refreshOrganization:`, error);
      setOrganization(null);
      setOrganizations([]);
    } finally {
      console.log(`${LOG_PREFIX} Setting loading to false`);
      setLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    console.log(`${LOG_PREFIX} Switching organization to:`, orgId);
    const selectedOrg = organizations.find(org => org.id === orgId);
    if (selectedOrg) {
      localStorage.setItem(SELECTED_ORG_KEY, orgId);
      setOrganization(selectedOrg);
      console.log(`${LOG_PREFIX} ✅ Organization switched to:`, { id: selectedOrg.id, name: selectedOrg.name });
      // Refresh subscription status for the new org
      setTimeout(() => checkSubscription(), 0);
    } else {
      console.warn(`${LOG_PREFIX} ⚠️ Organization not found in list:`, orgId);
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
        console.log(`${LOG_PREFIX} User signed out, clearing organization`);
        setOrganization(null);
        setOrganizations([]);
        setSubscriptionStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [tenantSubdomain]); // Re-run when subdomain changes

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
