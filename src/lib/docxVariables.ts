import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Variable definition structure
export interface VariableDefinition {
  variable: string;
  label: string;
  category: string;
  description?: string;
}

// All available template variables organized by category
export const TEMPLATE_VARIABLES: VariableDefinition[] = [
  // Case Variables
  { variable: "{{Case.case_number}}", label: "Case Number", category: "Case" },
  { variable: "{{Case.case_status}}", label: "Case Status", category: "Case" },
  { variable: "{{Case.notes}}", label: "Notes & Instructions", category: "Case" },
  { variable: "{{Case.due_on}}", label: "Due Date", category: "Case" },
  { variable: "{{Case.due_on_long}}", label: "Due Date (Long)", category: "Case", description: "e.g., January 15, 2025" },
  { variable: "{{Case.due_on_short}}", label: "Due Date (Short)", category: "Case", description: "e.g., 1/15/25" },
  { variable: "{{Case.created_on}}", label: "Date Created", category: "Case" },
  { variable: "{{Case.created_on_long}}", label: "Date Created (Long)", category: "Case" },
  { variable: "{{Case.created_on_short}}", label: "Date Created (Short)", category: "Case" },
  { variable: "{{Case.budget_hours}}", label: "Case Budget (Hours)", category: "Case" },
  { variable: "{{Case.budget_money}}", label: "Case Budget (Money)", category: "Case" },
  { variable: "{{Case.reference_value_1}}", label: "Reference Number", category: "Case" },
  { variable: "{{Case.primary_subject}}", label: "Primary Subject", category: "Case" },
  { variable: "{{Case.expense_total}}", label: "Expense Total (Money)", category: "Case" },
  { variable: "{{Case.expense_hour_total}}", label: "Expense Total (Hours)", category: "Case" },
  { variable: "{{Case.invoice_total}}", label: "Invoice Total", category: "Case" },

  // Client Variables
  { variable: "{{Client.name}}", label: "Client Name", category: "Client" },
  { variable: "{{Client.address}}", label: "Client Address", category: "Client" },
  { variable: "{{Client.email}}", label: "Client Email", category: "Client" },
  { variable: "{{Client.phone}}", label: "Client Phone", category: "Client" },

  // Contact Variables
  { variable: "{{Contact.name}}", label: "Full Name", category: "Primary Contact" },
  { variable: "{{Contact.first_name}}", label: "First Name", category: "Primary Contact" },
  { variable: "{{Contact.last_name}}", label: "Last Name", category: "Primary Contact" },
  { variable: "{{Contact.email}}", label: "Email Address", category: "Primary Contact" },
  { variable: "{{Contact.mobile_phone}}", label: "Mobile Phone", category: "Primary Contact" },

  // Subject Variables
  { variable: "{{Subject.name}}", label: "Name", category: "Subject" },
  { variable: "{{Subject.full_name}}", label: "Full Name", category: "Subject" },
  { variable: "{{Subject.date_of_birth}}", label: "Date of Birth", category: "Subject" },
  { variable: "{{Subject.date_of_birth_long}}", label: "Date of Birth (Long)", category: "Subject" },
  { variable: "{{Subject.street_address}}", label: "Street Address", category: "Subject" },
  { variable: "{{Subject.street_address_city}}", label: "Street Address (City)", category: "Subject" },
  { variable: "{{Subject.street_address_state}}", label: "Street Address (State)", category: "Subject" },
  { variable: "{{Subject.street_address_zip}}", label: "Street Address (Zip)", category: "Subject" },
  { variable: "{{Subject.email}}", label: "Email", category: "Subject" },
  { variable: "{{Subject.cell_phone}}", label: "Cell Phone", category: "Subject" },
  { variable: "{{Subject.description}}", label: "Description", category: "Subject" },

  // Manager Variables
  { variable: "{{Manager.name}}", label: "Full Name", category: "Primary Manager" },
  { variable: "{{Manager.first_name}}", label: "First Name", category: "Primary Manager" },
  { variable: "{{Manager.last_name}}", label: "Last Name", category: "Primary Manager" },
  { variable: "{{Manager.email}}", label: "Email Address", category: "Primary Manager" },

  // Investigator Variables
  { variable: "{{Investigator.name}}", label: "Full Name", category: "Primary Investigator" },
  { variable: "{{Investigator.first_name}}", label: "First Name", category: "Primary Investigator" },
  { variable: "{{Investigator.last_name}}", label: "Last Name", category: "Primary Investigator" },
  { variable: "{{Investigator.email}}", label: "Email Address", category: "Primary Investigator" },

  // Organization Variables
  { variable: "{{Customer.name}}", label: "Company Name", category: "Your Company" },
  { variable: "{{Customer.address}}", label: "Full Address", category: "Your Company" },
  { variable: "{{Customer.address_line_1}}", label: "Address Line 1", category: "Your Company" },
  { variable: "{{Customer.city}}", label: "City", category: "Your Company" },
  { variable: "{{Customer.state}}", label: "State", category: "Your Company" },
  { variable: "{{Customer.zip}}", label: "Zip/Postal Code", category: "Your Company" },
  { variable: "{{Customer.primary_phone}}", label: "Primary Phone", category: "Your Company" },
  { variable: "{{Customer.email_signature}}", label: "Email Signature", category: "Your Company" },

  // General Variables
  { variable: "{{General.date}}", label: "Today's Date", category: "General" },
  { variable: "{{General.date_long}}", label: "Today's Date (Long)", category: "General", description: "e.g., January 15, 2025" },
  { variable: "{{General.date_short}}", label: "Today's Date (Short)", category: "General", description: "e.g., 1/15/25" },
  { variable: "{{General.datetime}}", label: "Today's Date & Time", category: "General" },

  // Updates Collection
  { variable: "{{Updates.list}}", label: "Case Updates (plain text)", category: "Updates" },
  { variable: "{{Updates.list_with_author}}", label: "Case Updates (with author)", category: "Updates" },
  { variable: "{{Updates.formatted_list}}", label: "Case Updates (formatted)", category: "Updates" },
];

// Get all variable categories
export function getVariableCategories(): string[] {
  const categories = new Set<string>();
  TEMPLATE_VARIABLES.forEach(v => categories.add(v.category));
  return Array.from(categories);
}

// Get variables by category
export function getVariablesByCategory(category: string): VariableDefinition[] {
  return TEMPLATE_VARIABLES.filter(v => v.category === category);
}

// Helper functions for date formatting
function formatDateLong(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "M/d/yy");
  } catch {
    return dateStr;
  }
}

function formatDateStandard(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "MM/dd/yyyy");
  } catch {
    return dateStr;
  }
}

// Resolve all variables for a case
export async function resolveVariables(caseId: string, organizationId: string): Promise<Record<string, string>> {
  const variables: Record<string, string> = {};
  
  // General variables (always available)
  const now = new Date();
  variables["General.date"] = format(now, "MM/dd/yyyy");
  variables["General.date_long"] = format(now, "MMMM d, yyyy");
  variables["General.date_short"] = format(now, "M/d/yy");
  variables["General.datetime"] = format(now, "MM/dd/yyyy h:mm a");

  try {
    // Fetch case data
    const { data: caseData } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseData) {
      variables["Case.case_number"] = caseData.case_number || "";
      variables["Case.case_status"] = caseData.status || "";
      variables["Case.notes"] = caseData.description || "";
      variables["Case.due_on"] = formatDateStandard(caseData.due_date);
      variables["Case.due_on_long"] = formatDateLong(caseData.due_date);
      variables["Case.due_on_short"] = formatDateShort(caseData.due_date);
      variables["Case.created_on"] = formatDateStandard(caseData.created_at);
      variables["Case.created_on_long"] = formatDateLong(caseData.created_at);
      variables["Case.created_on_short"] = formatDateShort(caseData.created_at);
      variables["Case.budget_hours"] = caseData.budget_hours?.toString() || "";
      variables["Case.budget_money"] = caseData.budget_dollars ? `$${caseData.budget_dollars.toFixed(2)}` : "";
      variables["Case.reference_value_1"] = caseData.reference_number || "";

      // Fetch account (client)
      if (caseData.account_id) {
        const { data: account } = await supabase
          .from("accounts")
          .select("*")
          .eq("id", caseData.account_id)
          .single();

        if (account) {
          variables["Client.name"] = account.name || "";
          variables["Client.address"] = account.address || "";
          variables["Client.email"] = account.email || "";
          variables["Client.phone"] = account.phone || "";
        }
      }

      // Fetch contact
      if (caseData.contact_id) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", caseData.contact_id)
          .single();

        if (contact) {
          variables["Contact.name"] = `${contact.first_name} ${contact.last_name}`.trim();
          variables["Contact.first_name"] = contact.first_name || "";
          variables["Contact.last_name"] = contact.last_name || "";
          variables["Contact.email"] = contact.email || "";
          variables["Contact.mobile_phone"] = contact.phone || "";
        }
      }

      // Fetch case manager
      if (caseData.case_manager_id) {
        const { data: manager } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", caseData.case_manager_id)
          .single();

        if (manager) {
          const nameParts = (manager.full_name || "").split(" ");
          variables["Manager.name"] = manager.full_name || "";
          variables["Manager.first_name"] = nameParts[0] || "";
          variables["Manager.last_name"] = nameParts.slice(1).join(" ") || "";
          variables["Manager.email"] = manager.email || "";
        }
      }

      // Fetch primary investigator
      if (caseData.investigator_ids && caseData.investigator_ids.length > 0) {
        const { data: investigator } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", caseData.investigator_ids[0])
          .single();

        if (investigator) {
          const nameParts = (investigator.full_name || "").split(" ");
          variables["Investigator.name"] = investigator.full_name || "";
          variables["Investigator.first_name"] = nameParts[0] || "";
          variables["Investigator.last_name"] = nameParts.slice(1).join(" ") || "";
          variables["Investigator.email"] = investigator.email || "";
        }
      }
    }

    // Fetch primary subject
    const { data: subjects } = await supabase
      .from("case_subjects")
      .select("*")
      .eq("case_id", caseId)
      .order("is_primary", { ascending: false });

    const primarySubject = subjects?.[0];
    if (primarySubject) {
      const details = (primarySubject.details as Record<string, unknown>) || {};
      variables["Subject.name"] = primarySubject.name || "";
      variables["Subject.full_name"] = primarySubject.name || "";
      variables["Subject.date_of_birth"] = formatDateStandard(details.date_of_birth as string);
      variables["Subject.date_of_birth_long"] = formatDateLong(details.date_of_birth as string);
      variables["Subject.street_address"] = (details.address as string) || "";
      variables["Subject.street_address_city"] = (details.city as string) || "";
      variables["Subject.street_address_state"] = (details.state as string) || "";
      variables["Subject.street_address_zip"] = (details.zip as string) || "";
      variables["Subject.email"] = (details.email as string) || "";
      variables["Subject.cell_phone"] = (details.phone as string) || "";
      variables["Subject.description"] = primarySubject.notes || "";

      variables["Case.primary_subject"] = primarySubject.name || "";
    }

    // Fetch organization settings
    const { data: orgSettings } = await supabase
      .from("organization_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    if (orgSettings) {
      variables["Customer.name"] = orgSettings.company_name || "";
      variables["Customer.address"] = [
        orgSettings.address,
        orgSettings.city,
        orgSettings.state,
        orgSettings.zip_code
      ].filter(Boolean).join(", ");
      variables["Customer.address_line_1"] = orgSettings.address || "";
      variables["Customer.city"] = orgSettings.city || "";
      variables["Customer.state"] = orgSettings.state || "";
      variables["Customer.zip"] = orgSettings.zip_code || "";
      variables["Customer.primary_phone"] = orgSettings.phone || "";
      variables["Customer.email_signature"] = orgSettings.email_signature || "";
    }

    // Fetch expense totals
    const { data: expenses } = await supabase
      .from("case_finances")
      .select("amount, hours, finance_type")
      .eq("case_id", caseId);

    if (expenses) {
      let expenseTotal = 0;
      let hourTotal = 0;
      expenses.forEach(e => {
        if (e.finance_type === "expense") {
          expenseTotal += e.amount || 0;
        }
        hourTotal += e.hours || 0;
      });
      variables["Case.expense_total"] = `$${expenseTotal.toFixed(2)}`;
      variables["Case.expense_hour_total"] = hourTotal.toString();
    }

    // Fetch invoice totals
    const { data: invoices } = await supabase
      .from("invoices")
      .select("total")
      .eq("case_id", caseId);

    if (invoices) {
      const invoiceTotal = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
      variables["Case.invoice_total"] = `$${invoiceTotal.toFixed(2)}`;
    }

    // Fetch case updates
    const { data: updates } = await supabase
      .from("case_updates")
      .select("*, profiles:user_id(full_name)")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (updates && updates.length > 0) {
      const plainList = updates.map(u => `${u.title}: ${u.description || ""}`).join("\n");
      const listWithAuthor = updates.map(u => {
        const profile = u.profiles as { full_name: string } | null;
        const author = profile?.full_name || "Unknown";
        return `${u.title} (by ${author}): ${u.description || ""}`;
      }).join("\n");
      const formattedList = updates.map(u => {
        const date = formatDateStandard(u.created_at);
        return `[${date}] ${u.title}\n${u.description || ""}`;
      }).join("\n\n");

      variables["Updates.list"] = plainList;
      variables["Updates.list_with_author"] = listWithAuthor;
      variables["Updates.formatted_list"] = formattedList;
    }

  } catch (error) {
    console.error("Error resolving variables:", error);
  }

  return variables;
}

// Extract variable names from text (for validation)
export function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(`{{${match[1]}}}`);
  }
  return [...new Set(matches)];
}

// Check if a variable is recognized
export function isRecognizedVariable(variable: string): boolean {
  return TEMPLATE_VARIABLES.some(v => v.variable === variable);
}

// Get unrecognized variables from a list
export function getUnrecognizedVariables(variables: string[]): string[] {
  return variables.filter(v => !isRecognizedVariable(v));
}
