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
  referenceNumber: string | null;

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
  dueDate: string | null;

  // Case Manager
  caseManager: string;
  caseManagerEmail: string | null;

  // Document generation conditionals
  feeWaiver: boolean;
  expedited: boolean;
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatAsHtmlList(items: string[]): string {
  if (items.length === 0) return "None";
  if (items.length === 1) return items[0];
  return `<ul style="margin: 0.5em 0; padding-left: 1.5em;">${items.map(item => `<li>${item}</li>`).join("")}</ul>`;
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

    const subjectNames = subjects.map((s) => s.isPrimary ? `${s.name} (Primary)` : s.name);
    const subjectList = formatAsHtmlList(subjectNames);

    const clientNames = clients.map((c) => c.name);
    const clientList = formatAsHtmlList(clientNames);

    const investigatorNames = investigators.map((i) => i.name);
    const investigatorList = formatAsHtmlList(investigatorNames);

    const locationNames = locations.map((l) => l.address || l.name);
    const locationList = formatAsHtmlList(locationNames);

    return {
      caseId,
      caseTitle: caseData.title,
      caseNumber: caseData.case_number,
      referenceNumber: (caseData as any).reference_number || null,

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

      assignmentDate: formatDate(caseData.created_at),
      dueDate: formatDate(caseData.due_date),

      caseManager,
      caseManagerEmail,

      // Document generation conditionals
      feeWaiver: (caseData as any).fee_waiver || false,
      expedited: (caseData as any).expedited || false,
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
    reference_number: variables.referenceNumber || "",

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
    due_date: variables.dueDate || "",

    // Team
    case_manager: variables.caseManager,
  };
}

/**
 * Subject filter configuration for controlling which subject types appear in reports
 */
export interface SubjectFilterConfig {
  includeVehicles: boolean;
  includeLocations: boolean;
  includeItems: boolean;
}

/**
 * Convert CaseVariables to a flat record with filtered subjects based on config
 */
export function formatCaseVariablesForTemplateWithFilters(
  variables: CaseVariables,
  subjectFilter?: SubjectFilterConfig
): Record<string, string> {
  // If no filter provided, use default (all included)
  if (!subjectFilter) {
    return formatCaseVariablesForTemplate(variables);
  }

  // Filter subjects based on configuration
  const filteredSubjects = variables.subjects.filter(s => {
    if (s.type === 'person') return true; // Always include persons
    if (s.type === 'vehicle') return subjectFilter.includeVehicles;
    if (s.type === 'item') return subjectFilter.includeItems;
    return true; // Include any other types by default
  });

  // Filter locations based on configuration
  const filteredLocations = subjectFilter.includeLocations ? variables.locations : [];

  // Rebuild the lists
  const subjectNames = filteredSubjects.map(s => 
    s.isPrimary ? `${s.name} (Primary)` : s.name
  );
  const subjectList = formatAsHtmlList(subjectNames);
  const locationList = formatAsHtmlList(
    filteredLocations.map(l => l.address || l.name)
  );

  // Return base format with overridden lists
  return {
    ...formatCaseVariablesForTemplate(variables),
    subject_list: subjectList || "None",
    location_list: locationList || "None",
  };
}
