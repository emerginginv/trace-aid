import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface CaseClient {
  id: string;
  name: string;
  type: "account" | "contact";
  email?: string;
  phone?: string;
  address?: string;
}

export interface CaseSubject {
  id: string;
  name: string;
  type: string; // person, vehicle, location, item
  isPrimary: boolean;
  details: Record<string, unknown>;
}

export interface CaseInvestigator {
  id: string;
  name: string;
  email?: string;
}

export interface CaseLocation {
  id: string;
  name: string;
  address?: string;
  details?: Record<string, unknown>;
}

export interface CaseVariables {
  // Basic identifiers
  caseId: string;
  caseTitle: string;
  caseNumber: string;
  claimNumber: string | null;

  // Collections
  clients: CaseClient[];
  subjects: CaseSubject[];
  investigators: CaseInvestigator[];
  locations: CaseLocation[];

  // Convenience accessors
  primarySubject: CaseSubject | null;
  primaryClient: CaseClient | null;

  // Formatted strings for templates
  clientList: string;
  subjectList: string;
  investigatorList: string;
  locationList: string;

  // Dates
  assignmentDate: string | null;
  surveillanceStartDate: string | null;
  surveillanceEndDate: string | null;
  surveillanceDateRange: string;
  dueDate: string | null;

  // Case Manager
  caseManager: string;
  caseManagerEmail: string | null;
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return "";
  
  const start = startDate ? formatDate(startDate) : null;
  const end = endDate ? formatDate(endDate) : null;

  if (start && end) {
    return `${start} - ${end}`;
  } else if (start) {
    return `Starting ${start}`;
  } else if (end) {
    return `Through ${end}`;
  }
  return "";
}

export async function getCaseVariables(caseId: string): Promise<CaseVariables | null> {
  try {
    // Fetch case data
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      console.error("Error fetching case:", caseError);
      return null;
    }

    // Fetch subjects
    const { data: subjectsData } = await supabase
      .from("case_subjects")
      .select("*")
      .eq("case_id", caseId)
      .order("is_primary", { ascending: false });

    // Separate subjects from locations
    const subjects: CaseSubject[] = [];
    const locations: CaseLocation[] = [];

    (subjectsData || []).forEach((s) => {
      const details = (s.details as Record<string, unknown>) || {};
      if (s.subject_type === "location") {
        locations.push({
          id: s.id,
          name: s.name,
          address: (details.address as string) || undefined,
          details,
        });
      } else {
        subjects.push({
          id: s.id,
          name: s.name,
          type: s.subject_type,
          isPrimary: s.is_primary || false,
          details,
        });
      }
    });

    // Build clients array from account and contact
    const clients: CaseClient[] = [];

    if (caseData.account_id) {
      const { data: account } = await supabase
        .from("accounts")
        .select("id, name, email, phone, address")
        .eq("id", caseData.account_id)
        .single();

      if (account) {
        clients.push({
          id: account.id,
          name: account.name,
          type: "account",
          email: account.email || undefined,
          phone: account.phone || undefined,
          address: account.address || undefined,
        });
      }
    }

    if (caseData.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone, address")
        .eq("id", caseData.contact_id)
        .single();

      if (contact) {
        clients.push({
          id: contact.id,
          name: `${contact.first_name} ${contact.last_name}`.trim(),
          type: "contact",
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          address: contact.address || undefined,
        });
      }
    }

    // Fetch investigators
    const investigators: CaseInvestigator[] = [];
    const investigatorIds = caseData.investigator_ids || [];

    if (investigatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", investigatorIds);

      (profiles || []).forEach((p) => {
        investigators.push({
          id: p.id,
          name: p.full_name || p.email,
          email: p.email || undefined,
        });
      });
    }

    // Fetch case manager
    let caseManager = "Not assigned";
    let caseManagerEmail: string | null = null;

    if (caseData.case_manager_id) {
      const { data: manager } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", caseData.case_manager_id)
        .single();

      if (manager) {
        caseManager = manager.full_name || manager.email;
        caseManagerEmail = manager.email;
      }
    }

    // Build formatted strings
    const primarySubject = subjects.find((s) => s.isPrimary) || subjects[0] || null;
    const primaryClient = clients[0] || null;

    const subjectList = subjects
      .map((s) => s.isPrimary ? `${s.name} (Primary)` : s.name)
      .join(", ");

    const clientList = clients.map((c) => c.name).join(", ");
    const investigatorList = investigators.map((i) => i.name).join(", ");
    const locationList = locations.map((l) => l.address || l.name).join("; ");

    return {
      caseId,
      caseTitle: caseData.title,
      caseNumber: caseData.case_number,
      claimNumber: (caseData as any).claim_number || null,

      clients,
      subjects,
      investigators,
      locations,

      primarySubject,
      primaryClient,

      clientList: clientList || "None",
      subjectList: subjectList || "None",
      investigatorList: investigatorList || "Not assigned",
      locationList: locationList || "None",

      assignmentDate: formatDate(caseData.start_date),
      surveillanceStartDate: formatDate((caseData as any).surveillance_start_date),
      surveillanceEndDate: formatDate((caseData as any).surveillance_end_date),
      surveillanceDateRange: formatDateRange(
        (caseData as any).surveillance_start_date,
        (caseData as any).surveillance_end_date
      ),
      dueDate: formatDate(caseData.due_date),

      caseManager,
      caseManagerEmail,
    };
  } catch (error) {
    console.error("Error fetching case variables:", error);
    return null;
  }
}

/**
 * Convert CaseVariables to a flat record of placeholder strings for template replacement
 */
export function formatCaseVariablesForTemplate(variables: CaseVariables): Record<string, string> {
  return {
    // Basic identifiers
    case_title: variables.caseTitle,
    case_number: variables.caseNumber,
    claim_number: variables.claimNumber || "",

    // Collections as formatted strings
    client_list: variables.clientList,
    subject_list: variables.subjectList,
    investigator_list: variables.investigatorList,
    location_list: variables.locationList,

    // Primary items
    primary_subject: variables.primarySubject?.name || "",
    primary_client: variables.primaryClient?.name || "",

    // Dates
    assignment_date: variables.assignmentDate || "",
    surveillance_dates: variables.surveillanceDateRange,
    surveillance_start: variables.surveillanceStartDate || "",
    surveillance_end: variables.surveillanceEndDate || "",
    due_date: variables.dueDate || "",

    // Team
    case_manager: variables.caseManager,
  };
}
