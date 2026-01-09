import { supabase } from "@/integrations/supabase/client";

export interface SubjectWithImage {
  id: string;
  name: string;
  subject_type: string;
  is_primary: boolean;
  notes: string | null;
  details: Record<string, any> | null;
  profile_image_url: string | null;
  signedImageUrl: string | null;
  created_at: string;
}

export interface CaseSummaryData {
  case: {
    id: string;
    case_number: string;
    title: string;
    status: string;
    description: string | null;
    due_date: string | null;
    created_at: string | null;
    closed_at: string | null;
    budget_hours: number | null;
    budget_dollars: number | null;
    budget_notes: string | null;
    purpose_of_request: string | null;
    reference_number: string | null;
    expedited: boolean | null;
    expedited_justification: string | null;
    fee_waiver: boolean | null;
    fee_waiver_justification: string | null;
  };
  account: { id: string; name: string } | null;
  contact: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  caseManager: { id: string; full_name: string | null; email: string } | null;
  investigators: { id: string; full_name: string | null; email: string }[];
  subjects: SubjectWithImage[];
  budgetSummary: {
    budget_hours_authorized: number;
    budget_dollars_authorized: number;
    hours_consumed: number;
    dollars_consumed: number;
    hours_remaining: number;
    dollars_remaining: number;
    hours_utilization_pct: number;
    dollars_utilization_pct: number;
  } | null;
  timeEntries: any[];
  expenses: any[];
  invoices: any[];
  activities: any[];
  updates: any[];
  attachments: any[];
  relatedCases: any[];
  organizationSettings: {
    company_name: string | null;
    logo_url: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

export async function fetchCaseSummaryData(caseId: string): Promise<CaseSummaryData> {
  // Fetch all data in parallel
  const [
    caseResult,
    subjectsResult,
    budgetResult,
    financesResult,
    activitiesResult,
    updatesResult,
    attachmentsResult,
    relatedResult,
  ] = await Promise.all([
    // Case with account, contact, manager
    supabase
      .from("cases")
      .select(`
        *,
        accounts:account_id(id, name),
        contacts:contact_id(id, first_name, last_name, email, phone),
        case_manager:case_manager_id(id, full_name, email)
      `)
      .eq("id", caseId)
      .single(),
    
    // Subjects
    supabase
      .from("case_subjects")
      .select("*")
      .eq("case_id", caseId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    
    // Budget summary
    supabase.rpc("get_case_budget_summary", { p_case_id: caseId }),
    
    // Finances (time entries and expenses)
    supabase
      .from("case_finances")
      .select("*")
      .eq("case_id", caseId)
      .order("date", { ascending: false }),
    
    // Activities
    supabase
      .from("case_activities")
      .select("*, assigned_user:assigned_user_id(id, full_name)")
      .eq("case_id", caseId)
      .order("due_date", { ascending: false })
      .limit(20),
    
    // Updates
    supabase
      .from("case_updates")
      .select("*, user:user_id(id, full_name)")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
    
    // Attachments
    supabase
      .from("case_attachments")
      .select("id, file_name, file_type, file_size, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
    
    // Related cases
    supabase.rpc("get_related_cases", { case_id: caseId }),
  ]);

  if (caseResult.error) throw caseResult.error;
  
  const caseData = caseResult.data;
  
  // Fetch investigators if any
  let investigators: { id: string; full_name: string | null; email: string }[] = [];
  if (caseData.investigator_ids && caseData.investigator_ids.length > 0) {
    const { data: invData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", caseData.investigator_ids);
    investigators = invData || [];
  }

  // Fetch organization settings
  let organizationSettings = null;
  if (caseData.organization_id) {
    const { data: orgData } = await supabase
      .from("organization_settings")
      .select("company_name, logo_url, address, city, state, zip_code, phone, email")
      .eq("organization_id", caseData.organization_id)
      .single();
    organizationSettings = orgData;
  }

  // Generate signed URLs for subject images
  const subjects: SubjectWithImage[] = [];
  for (const subject of subjectsResult.data || []) {
    let signedImageUrl: string | null = null;
    if (subject.profile_image_url) {
      // Extract path from URL if needed
      let filePath = subject.profile_image_url;
      if (filePath.includes("/subject-profile-images/")) {
        filePath = filePath.split("/subject-profile-images/").pop() || filePath;
      }
      
      const { data: signedData } = await supabase.storage
        .from("subject-profile-images")
        .createSignedUrl(filePath, 3600);
      signedImageUrl = signedData?.signedUrl || null;
    }
    
    subjects.push({
      id: subject.id,
      name: subject.name,
      subject_type: subject.subject_type,
      is_primary: subject.is_primary || false,
      notes: subject.notes,
      details: subject.details as Record<string, any> | null,
      profile_image_url: subject.profile_image_url,
      signedImageUrl,
      created_at: subject.created_at,
    });
  }

  // Separate time entries and expenses
  const finances = financesResult.data || [];
  const timeEntries = finances.filter((f) => f.finance_type === "time");
  const expenses = finances.filter((f) => f.finance_type === "expense");

  // Fetch invoices separately
  const { data: invoicesData } = await supabase
    .from("invoices")
    .select("*")
    .eq("case_id", caseId)
    .order("date", { ascending: false });

  // Fetch update attachment links and map to updates
  const updateIds = (updatesResult.data || []).map((u: any) => u.id);
  let updatesWithAttachments = updatesResult.data || [];
  
  if (updateIds.length > 0) {
    const { data: updateLinks } = await supabase
      .from("update_attachment_links")
      .select(`
        update_id,
        case_attachments!inner(id, file_name, file_type)
      `)
      .in("update_id", updateIds);
    
    if (updateLinks && updateLinks.length > 0) {
      updatesWithAttachments = (updatesResult.data || []).map((update: any) => {
        const links = updateLinks.filter((link: any) => link.update_id === update.id);
        const linkedAttachments = links.map((link: any) => ({
          id: link.case_attachments.id,
          file_name: link.case_attachments.file_name,
          file_type: link.case_attachments.file_type,
        }));
        return {
          ...update,
          linkedAttachments,
        };
      });
    }
  }

  return {
    case: {
      id: caseData.id,
      case_number: caseData.case_number,
      title: caseData.title,
      status: caseData.status,
      description: caseData.description,
      due_date: caseData.due_date,
      created_at: caseData.created_at,
      closed_at: caseData.closed_at,
      budget_hours: caseData.budget_hours,
      budget_dollars: caseData.budget_dollars,
      budget_notes: caseData.budget_notes,
      purpose_of_request: caseData.purpose_of_request,
      reference_number: caseData.reference_number,
      expedited: caseData.expedited,
      expedited_justification: caseData.expedited_justification,
      fee_waiver: caseData.fee_waiver,
      fee_waiver_justification: caseData.fee_waiver_justification,
    },
    account: caseData.accounts as { id: string; name: string } | null,
    contact: caseData.contacts as { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null,
    caseManager: caseData.case_manager as unknown as { id: string; full_name: string | null; email: string } | null,
    investigators,
    subjects,
    budgetSummary: budgetResult.data?.[0] || null,
    timeEntries,
    expenses,
    invoices: invoicesData || [],
    activities: activitiesResult.data || [],
    updates: updatesWithAttachments,
    attachments: attachmentsResult.data || [],
    relatedCases: (relatedResult.data || []).filter((c: any) => c.id !== caseId),
    organizationSettings,
  };
}
