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
  { variable: "{{Subject.photo}}", label: "Profile Photo", category: "Subject", description: "Embeds the subject's profile image" },
  { variable: "{{Subject.photo_url}}", label: "Profile Photo URL", category: "Subject", description: "URL to the subject's profile image" },

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
  { variable: "{{Updates.with_timelines}}", label: "Updates with Activity Timelines", category: "Updates", description: "Updates that include activity timelines (must be enabled)" },

  // File Attachments
  { variable: "{{Files.list}}", label: "File List (plain text)", category: "Files", description: "List of all attached file names" },
  { variable: "{{Files.formatted_list}}", label: "File List (formatted)", category: "Files", description: "File names with sizes and dates" },
  { variable: "{{Files.count}}", label: "File Count", category: "Files", description: "Total number of attached files" },
  { variable: "{{Files.total_size}}", label: "Total File Size", category: "Files", description: "Combined size of all attachments" },
  { variable: "{{Files.images_list}}", label: "Image Files List", category: "Files", description: "List of image file names only" },
  { variable: "{{Files.documents_list}}", label: "Document Files List", category: "Files", description: "List of document file names (PDF, DOC, etc.)" },

  // Update-Linked Attachments
  { variable: "{{Updates.attachments_list}}", label: "Update-Linked Files", category: "Updates", description: "Files linked to case updates" },
  { variable: "{{Updates.attachments_formatted}}", label: "Update-Linked Files (formatted)", category: "Updates", description: "Files linked to updates with details" },
  { variable: "{{Updates.attachments_count}}", label: "Update-Linked File Count", category: "Updates", description: "Number of files linked to updates" },
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

// Helper function for file size formatting
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Helper function to format timeline time from "HH:MM" to "H:MM AM/PM"
function formatTimelineTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Options for resolving variables
export interface ResolveVariablesOptions {
  selectedAttachmentIds?: string[];
  includeActivityTimelines?: boolean;
}

// Resolve all variables for a case
export async function resolveVariables(
  caseId: string, 
  organizationId: string,
  options?: ResolveVariablesOptions
): Promise<Record<string, string>> {
  const variables: Record<string, string> = {};
  const { selectedAttachmentIds, includeActivityTimelines } = options || {};
  
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
      
      // Subject photo - store URL for image embedding
      if (primarySubject.profile_image_url) {
        variables["Subject.photo"] = primarySubject.profile_image_url;
        variables["Subject.photo_url"] = primarySubject.profile_image_url;
      } else {
        variables["Subject.photo"] = "";
        variables["Subject.photo_url"] = "";
      }

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

    // Fetch case updates (including activity_timeline if option enabled)
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
      
      // Activity timelines - only include if explicitly enabled
      if (includeActivityTimelines) {
        // First, get update attachment links
        const updateIds = updates.map(u => u.id);
        const { data: updateLinks } = await supabase
          .from("update_attachment_links")
          .select(`
            update_id,
            case_attachments!inner(id, file_name)
          `)
          .in("update_id", updateIds);
        
        // Map links to updates
        const linksMap = new Map<string, string[]>();
        if (updateLinks) {
          updateLinks.forEach((link: any) => {
            const existing = linksMap.get(link.update_id) || [];
            existing.push(link.case_attachments.file_name);
            linksMap.set(link.update_id, existing);
          });
        }
        
        const updatesWithTimelines = updates.filter(u => {
          const timeline = u.activity_timeline as { time: string; description: string }[] | null;
          return timeline && timeline.length > 0;
        });
        
        if (updatesWithTimelines.length > 0) {
          const timelinesFormatted = updatesWithTimelines.map(u => {
            const date = formatDateStandard(u.created_at);
            const timeline = u.activity_timeline as { time: string; description: string }[];
            const timelineText = [...timeline]
              .sort((a, b) => a.time.localeCompare(b.time))
              .map(entry => `  ${formatTimelineTime(entry.time)} — ${entry.description}`)
              .join("\n");
            
            // Add evidence references if available
            const linkedFiles = linksMap.get(u.id) || [];
            const evidenceText = linkedFiles.length > 0 
              ? `\n\nEvidence: ${linkedFiles.join(", ")}` 
              : "";
            
            return `[${date}] ${u.title}\n${u.description || ""}\n\nActivity Timeline:\n${timelineText}${evidenceText}`;
          }).join("\n\n---\n\n");
          
          variables["Updates.with_timelines"] = timelinesFormatted;
        } else {
          variables["Updates.with_timelines"] = "";
        }
      } else {
        variables["Updates.with_timelines"] = "";
      }
    }

    // Fetch file attachments
    const { data: attachments } = await supabase
      .from("case_attachments")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (attachments && attachments.length > 0) {
      // Filter by selected attachment IDs if provided
      const filteredAttachments = selectedAttachmentIds 
        ? attachments.filter(a => selectedAttachmentIds.includes(a.id))
        : attachments;

      // Plain list of file names
      const plainList = filteredAttachments.map(a => a.file_name).join("\n");
      
      // Formatted list with size and date
      const formattedList = filteredAttachments.map(a => {
        const date = formatDateStandard(a.created_at);
        const size = formatFileSize(a.file_size);
        return `${a.file_name} (${size}) - ${date}`;
      }).join("\n");
      
      // Count
      const count = filteredAttachments.length;
      
      // Total size
      const totalSize = filteredAttachments.reduce((sum, a) => sum + (a.file_size || 0), 0);
      
      // Image files only
      const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];
      const imageFiles = filteredAttachments.filter(a => imageTypes.includes(a.file_type?.toLowerCase() || ""));
      const imagesList = imageFiles.map(a => a.file_name).join("\n");
      
      // Document files only
      const documentTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
      const documentFiles = filteredAttachments.filter(a => documentTypes.includes(a.file_type?.toLowerCase() || ""));
      const documentsList = documentFiles.map(a => a.file_name).join("\n");
      
      variables["Files.list"] = plainList;
      variables["Files.formatted_list"] = formattedList;
      variables["Files.count"] = count.toString();
      variables["Files.total_size"] = formatFileSize(totalSize);
      variables["Files.images_list"] = imagesList;
      variables["Files.documents_list"] = documentsList;
    } else {
      variables["Files.list"] = "";
      variables["Files.formatted_list"] = "";
      variables["Files.count"] = "0";
      variables["Files.total_size"] = "0 B";
      variables["Files.images_list"] = "";
      variables["Files.documents_list"] = "";
    }

    // Fetch update-linked attachments
    const { data: updateLinks } = await supabase
      .from("update_attachment_links")
      .select(`
        attachment_id,
        case_updates!inner(title, case_id)
      `)
      .eq("case_updates.case_id", caseId);

    if (updateLinks && updateLinks.length > 0 && attachments) {
      const linkedAttachmentIds = new Set(updateLinks.map((l: any) => l.attachment_id));
      const linkedAttachments = attachments.filter(a => linkedAttachmentIds.has(a.id));
      
      const linkedList = linkedAttachments.map(a => a.file_name).join("\n");
      const linkedFormatted = linkedAttachments.map(a => {
        const date = formatDateStandard(a.created_at);
        const size = formatFileSize(a.file_size);
        const linksForAttachment = updateLinks.filter((l: any) => l.attachment_id === a.id);
        const updateTitles = linksForAttachment.map((l: any) => l.case_updates?.title || "Untitled").join(", ");
        return `${a.file_name} (${size}) - ${date} [Linked to: ${updateTitles}]`;
      }).join("\n");
      
      variables["Updates.attachments_list"] = linkedList;
      variables["Updates.attachments_formatted"] = linkedFormatted;
      variables["Updates.attachments_count"] = linkedAttachments.length.toString();
    } else {
      variables["Updates.attachments_list"] = "";
      variables["Updates.attachments_formatted"] = "";
      variables["Updates.attachments_count"] = "0";
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
