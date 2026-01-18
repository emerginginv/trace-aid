import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CaseData {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  status_key: string | null;
  current_status_id: string | null;
  current_category_id: string | null;
  status_entered_at: string | null;
  category_entered_at: string | null;
  workflow: string | null;
  account_id: string | null;
  contact_id: string | null;
  due_date: string | null;
  created_at: string;
  case_manager_id: string | null;
  case_manager_2_id: string | null;
  investigator_ids: string[];
  closed_by_user_id: string | null;
  closed_at: string | null;
  parent_case_id: string | null;
  instance_number: number;
  reference_number?: string | null;
  reference_number_2?: string | null;
  reference_number_3?: string | null;
  case_type_id?: string | null;
  source_request_id?: string | null;
  organization_id?: string | null;
  user_id?: string;
}

export interface AccountData {
  id: string;
  name: string;
  status?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ContactData {
  id: string;
  first_name: string;
  last_name: string;
  status?: string | null;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface CaseUpdate {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  update_type: string;
  user_id: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface UseCaseDetailDataOptions {
  caseId: string | undefined;
}

/**
 * Hook for fetching and managing case detail data including
 * case data, account, contact, updates, and user profiles.
 */
export function useCaseDetailData({ caseId }: UseCaseDetailDataOptions) {
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<CaseUpdate[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

  const fetchCaseData = useCallback(async () => {
    if (!caseId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userOrgs } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);
      
      const userOrgIds = userOrgs?.map(o => o.organization_id) || [];

      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", caseId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Not Found",
          description: "The case you're looking for doesn't exist or you don't have access to it.",
          variant: "destructive"
        });
        navigate("/cases");
        return;
      }

      // Check access permissions
      const hasAccess = 
        data.user_id === user.id || 
        data.investigator_ids?.includes(user.id) || 
        (data.organization_id && userOrgIds.includes(data.organization_id));

      if (!hasAccess) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this case.",
          variant: "destructive"
        });
        navigate("/cases");
        return;
      }

      setCaseData(data);

      // Fetch related account
      if (data.account_id) {
        const { data: accountData } = await supabase
          .from("accounts")
          .select("id, name, status, industry, phone, email")
          .eq("id", data.account_id)
          .maybeSingle();
        if (accountData) setAccount(accountData);
      }

      // Fetch related contact
      if (data.contact_id) {
        const { data: contactData } = await supabase
          .from("contacts")
          .select("id, first_name, last_name, status, role, phone, email")
          .eq("id", data.contact_id)
          .maybeSingle();
        if (contactData) setContact(contactData);
      }
    } catch (error) {
      console.error("Error fetching case:", error);
      toast({
        title: "Error",
        description: "Failed to load case details. Please try again.",
        variant: "destructive"
      });
      navigate("/cases");
    } finally {
      setLoading(false);
    }
  }, [caseId, navigate]);

  const fetchUpdatesForReport = useCallback(async () => {
    if (!caseId) return;
    
    const { data } = await supabase
      .from("case_updates")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    
    setUpdates(data || []);
  }, [caseId]);

  const fetchUserProfilesForReport = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email");
    
    const profiles: Record<string, UserProfile> = {};
    (data || []).forEach(p => {
      profiles[p.id] = p;
    });
    setUserProfiles(profiles);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchCaseData();
    fetchUpdatesForReport();
    fetchUserProfilesForReport();
  }, [caseId, fetchCaseData, fetchUpdatesForReport, fetchUserProfilesForReport]);

  return {
    caseData,
    setCaseData,
    account,
    contact,
    loading,
    updates,
    userProfiles,
    refetch: fetchCaseData,
    refetchUpdates: fetchUpdatesForReport,
  };
}
