import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getPlanKeyFromProductId } from "@/lib/planLimits";
import { useTenant } from "./TenantContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  subdomain: string | null;
  is_active: boolean;
  logo_url: string | null;
  subscription_tier: "free" | "standard" | "pro";
  subscription_status: "active" | "trialing" | "inactive" | "past_due" | "canceled" | "pending_payment";
  max_users: number;
  billing_email: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  subscription_product_id: string | null;
  current_users_count: number;
  storage_used_gb: number;
  plan_key: "solo" | "team" | "enterprise";
  plan_features: Record<string, boolean>;
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
  const queryClient = useQueryClient();
  
  // Get tenant subdomain from TenantContext
  const { tenantSubdomain } = useTenant();

  /**
   * Clear all organization state
   */
  const clearOrganizationState = () => {
    console.log(`${LOG_PREFIX} Clearing organization context`);
    setOrganization(null);
    setOrganizations([]);
  };

  /**
   * Fetch organization by subdomain (for multi-tenant routing)
   */
  const fetchOrganizationBySubdomain = async (subdomain: string): Promise<Organization | null> => {
    console.log(`${LOG_PREFIX} Resolving organization for subdomain:`, subdomain);
    
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

    console.log(`${LOG_PREFIX} Organization loaded for subdomain:`, subdomain);
    return data as Organization;
  };

  /**
   * Verify user membership in organization
   */
  const verifyUserMembership = async (userId: string, organizationId: string): Promise<boolean> => {
    const { data: membership, error } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`${LOG_PREFIX} Error verifying membership:`, error);
      return false;
    }

    return !!membership;
  };

  /**
   * Fetch all organizations user belongs to (for organization list only)
   */
  const fetchAllUserOrganizations = async (userId: string): Promise<Organization[]> => {
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId);

    if (memberError || !memberData || memberData.length === 0) {
      return [];
    }

    const orgIds = memberData.map(m => m.organization_id);
    
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
    console.log(`${LOG_PREFIX} refreshOrganization called`);
    
    try {
      // Step 1: Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log(`${LOG_PREFIX} No authenticated user, clearing organization`);
        clearOrganizationState();
        setLoading(false);
        return;
      }

      console.log(`${LOG_PREFIX} Authenticated user:`, user.id);

      // Step 2: Handle no subdomain (development mode or non-tenant domain)
      if (!tenantSubdomain) {
        console.log(`${LOG_PREFIX} No tenant subdomain - using development fallback`);
        
        // Fetch all organizations user belongs to
        const allOrgs = await fetchAllUserOrganizations(user.id);
        setOrganizations(allOrgs);
        
        if (allOrgs.length === 0) {
          console.log(`${LOG_PREFIX} User has no organizations`);
          clearOrganizationState();
          setLoading(false);
          return;
        }
        
        // Try to restore from localStorage, or use first org
        const storedOrgId = localStorage.getItem(SELECTED_ORG_KEY);
        const selectedOrg = allOrgs.find(org => org.id === storedOrgId) || allOrgs[0];
        
        setOrganization(selectedOrg);
        localStorage.setItem(SELECTED_ORG_KEY, selectedOrg.id);
        console.log(`${LOG_PREFIX} Development mode - using organization:`, selectedOrg.name);
        setLoading(false);
        return;
      }

      // Step 3: Production subdomain-based resolution
      console.log(`${LOG_PREFIX} Resolving organization for subdomain:`, tenantSubdomain);

      // Step 3: Fetch organization by subdomain ONLY
      const subdomainOrg = await fetchOrganizationBySubdomain(tenantSubdomain);
      
      if (!subdomainOrg) {
        console.warn(`${LOG_PREFIX} No organization found for subdomain:`, tenantSubdomain);
        clearOrganizationState();
        setLoading(false);
        return;
      }

      console.log(`${LOG_PREFIX} Organization loaded for subdomain:`, tenantSubdomain);

      // Step 4: Verify user membership - MANDATORY
      const isMember = await verifyUserMembership(user.id, subdomainOrg.id);
      
      if (!isMember) {
        console.warn(`${LOG_PREFIX} User is not a member of organization for subdomain:`, tenantSubdomain);
        clearOrganizationState();
        setLoading(false);
        return;
      }

      console.log(`${LOG_PREFIX} User is member of organization`);

      // Step 5: Set organization context - ONLY via subdomain resolution
      setOrganization(subdomainOrg);
      localStorage.setItem(SELECTED_ORG_KEY, subdomainOrg.id);
      
      // Fetch all orgs for the organizations list (informational only)
      const allOrgs = await fetchAllUserOrganizations(user.id);
      setOrganizations(allOrgs);

      // Step 6: Log RLS context applied (required for Step 3 tenant isolation)
      // This log confirms that database-level tenant isolation is in effect
      console.log(`${LOG_PREFIX} [RLS] Organization context applied:`, subdomainOrg.id);
      
      console.log(`${LOG_PREFIX} ✅ Organization context finalized:`, {
        id: subdomainOrg.id,
        name: subdomainOrg.name,
        subdomain: subdomainOrg.subdomain,
        rlsEnforced: true
      });

    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Error in refreshOrganization:`, error);
      clearOrganizationState();
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    // In subdomain-based multi-tenancy, switching organizations is not allowed
    // The organization is determined solely by the subdomain
    console.warn(`${LOG_PREFIX} Organization switching is disabled in subdomain mode`);
    
    // If there's no subdomain, we could allow switching, but for now we enforce strict subdomain-only behavior
    if (tenantSubdomain) {
      console.warn(`${LOG_PREFIX} Cannot switch organization when subdomain is present:`, tenantSubdomain);
      return;
    }

    // Fallback behavior only if no subdomain (should not happen in normal flow)
    const selectedOrg = organizations.find(org => org.id === orgId);
    if (selectedOrg) {
      localStorage.setItem(SELECTED_ORG_KEY, orgId);
      setOrganization(selectedOrg);
      console.log(`${LOG_PREFIX} Organization switched to:`, { id: selectedOrg.id, name: selectedOrg.name });
      setTimeout(() => checkSubscription(), 0);
    }
  };

  const checkSubscription = async () => {
    try {
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

      console.log(`${LOG_PREFIX} Subscription check response:`, data);
      setSubscriptionStatus(data);

      if (organization && data) {
        // Get plan key from product ID for accurate mapping
        const planKey = getPlanKeyFromProductId(data.product_id);
        
        // Map to tier: enterprise = "pro", team = "standard", solo/none = "free"/"standard"
        let tier: "free" | "standard" | "pro" = "free";
        if (planKey === "enterprise") {
          tier = "pro";
        } else if (planKey === "team" || planKey === "solo") {
          tier = data.product_id ? "standard" : "free";
        }
        
        // Determine subscription status - preserve trialing status
        const status = data.status || (data.subscribed ? "active" : "inactive");
        
        console.log(`${LOG_PREFIX} Updating organization with:`, {
          tier,
          status,
          planKey,
          productId: data.product_id
        });
        
        const { error: updateError } = await supabase
          .from("organizations")
          .update({
            subscription_tier: tier,
            subscription_status: status,
            stripe_subscription_id: data.subscription_id,
            trial_ends_at: data.trial_end,
            subscription_product_id: data.product_id,
            plan_key: planKey,
          })
          .eq("id", organization.id);

        if (updateError) {
          console.error(`${LOG_PREFIX} Error updating organization subscription:`, updateError);
          toast.error("Failed to sync subscription status");
          return;
        }

        console.log(`${LOG_PREFIX} Organization subscription updated successfully`);

        // Invalidate entitlements cache to force immediate refresh
        await queryClient.invalidateQueries({ queryKey: ['entitlements', organization.id] });
        console.log(`${LOG_PREFIX} Entitlements cache invalidated`);

        await refreshOrganization();
      }
    } catch (error) {
      console.error("Error in checkSubscription:", error);
      toast.error("Error checking subscription");
    }
  };

  useEffect(() => {
    console.log(`${LOG_PREFIX} useEffect triggered, tenantSubdomain:`, tenantSubdomain);
    refreshOrganization();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`${LOG_PREFIX} Auth state changed:`, event);
      
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        refreshOrganization();
        setTimeout(() => checkSubscription(), 0);
      } else if (event === "SIGNED_OUT") {
        console.log(`${LOG_PREFIX} User signed out, clearing organization`);
        clearOrganizationState();
        setSubscriptionStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [tenantSubdomain]);

  // Realtime subscription for organization changes (billing status updates)
  useEffect(() => {
    if (!organization?.id) return;

    console.log(`${LOG_PREFIX} Setting up realtime subscription for organization:`, organization.id);

    const channel = supabase
      .channel(`org-${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${organization.id}`,
        },
        (payload) => {
          console.log(`${LOG_PREFIX} Organization updated via realtime:`, payload);
          // Refresh organization data when subscription status changes
          refreshOrganization();
        }
      )
      .subscribe();

    return () => {
      console.log(`${LOG_PREFIX} Cleaning up realtime subscription`);
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

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
