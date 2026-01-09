import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { supabase } from "@/integrations/supabase/client";
import { resolveVariables, extractVariables, isRecognizedVariable } from "./docxVariables";

export interface ParseResult {
  variables: string[];
  recognizedVariables: string[];
  unrecognizedVariables: string[];
  isValid: boolean;
  errors: string[];
}

export interface DocxTemplate {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description: string | null;
  filePath: string;
  filenameTemplate: string | null;
  caseTypes: string[] | null;
  roleRestriction: string | null;
  detectedVariables: string[] | null;
  usesMergeFields: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedReport {
  id: string;
  organizationId: string;
  caseId: string;
  templateId: string | null;
  userId: string;
  title: string;
  outputFilePath: string;
  variablesUsed: Record<string, string> | null;
  generatedAt: string;
}

// Parse a DOCX file to extract variables
export async function parseDocxTemplate(file: File): Promise<ParseResult> {
  const errors: string[] = [];
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });

    // Get the full text content to extract variables
    const text = doc.getFullText();
    const variables = extractVariables(text);
    
    const recognizedVariables = variables.filter(v => isRecognizedVariable(v));
    const unrecognizedVariables = variables.filter(v => !isRecognizedVariable(v));

    return {
      variables,
      recognizedVariables,
      unrecognizedVariables,
      isValid: true,
      errors,
    };
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    return {
      variables: [],
      recognizedVariables: [],
      unrecognizedVariables: [],
      isValid: false,
      errors: [error instanceof Error ? error.message : "Failed to parse DOCX file"],
    };
  }
}

// Options for generating DOCX reports
export interface GenerateDocxOptions {
  selectedAttachmentIds?: string[];
  includeActivityTimelines?: boolean;
}

// Generate a DOCX report from a template
export async function generateDocxReport(
  templatePath: string,
  caseId: string,
  organizationId: string,
  options?: GenerateDocxOptions
): Promise<{ blob: Blob; variables: Record<string, string> } | null> {
  try {
    // Download the template from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("docx-templates")
      .download(templatePath);

    if (downloadError || !fileData) {
      console.error("Error downloading template:", downloadError);
      return null;
    }

    // Get variable values for this case
    const variables = await resolveVariables(caseId, organizationId, {
      selectedAttachmentIds: options?.selectedAttachmentIds,
      includeActivityTimelines: options?.includeActivityTimelines,
    });

    // Convert variables to the format docxtemplater expects (without {{ }})
    const templateData: Record<string, string> = {};
    Object.entries(variables).forEach(([key, value]) => {
      // The key is like "Case.case_number", we need it as-is
      templateData[key] = value;
    });

    // Parse and fill the template
    const arrayBuffer = await fileData.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });

    // Set the data
    doc.render(templateData);

    // Generate the output
    const outputBuffer = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    return {
      blob: outputBuffer,
      variables,
    };
  } catch (error) {
    console.error("Error generating DOCX report:", error);
    return null;
  }
}

// Save a generated report to storage and database
export async function saveGeneratedReport(
  blob: Blob,
  caseId: string,
  templateId: string,
  templateName: string,
  organizationId: string,
  userId: string,
  variables: Record<string, string>,
  filenameTemplate?: string | null
): Promise<GeneratedReport | null> {
  try {
    // Generate filename
    let filename = filenameTemplate || `${templateName} - Report`;
    
    // Replace variables in filename
    Object.entries(variables).forEach(([key, value]) => {
      filename = filename.replace(`{{${key}}}`, value);
    });
    
    // Clean filename and add extension
    filename = filename.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim();
    filename = `${filename}_${Date.now()}.docx`;

    // Upload to storage
    const filePath = `${organizationId}/${caseId}/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from("generated-reports")
      .upload(filePath, blob, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    if (uploadError) {
      console.error("Error uploading generated report:", uploadError);
      return null;
    }

    // Save record to database
    const { data, error: insertError } = await supabase
      .from("generated_reports")
      .insert({
        organization_id: organizationId,
        case_id: caseId,
        template_id: templateId,
        user_id: userId,
        title: templateName,
        output_file_path: filePath,
        variables_used: variables,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving report record:", insertError);
      return null;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      caseId: data.case_id,
      templateId: data.template_id,
      userId: data.user_id,
      title: data.title,
      outputFilePath: data.output_file_path,
      variablesUsed: data.variables_used as Record<string, string> | null,
      generatedAt: data.generated_at,
    };
  } catch (error) {
    console.error("Error saving generated report:", error);
    return null;
  }
}

// Download a generated report
export async function downloadGeneratedReport(filePath: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage
      .from("generated-reports")
      .download(filePath);

    if (error) {
      console.error("Error downloading report:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error downloading report:", error);
    return null;
  }
}

// Fetch all DOCX templates for an organization
export async function getDocxTemplates(organizationId: string): Promise<DocxTemplate[]> {
  const { data, error } = await supabase
    .from("docx_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching DOCX templates:", error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    filePath: row.file_path,
    filenameTemplate: row.filename_template,
    caseTypes: row.case_types,
    roleRestriction: row.role_restriction,
    detectedVariables: row.detected_variables,
    usesMergeFields: row.uses_merge_fields,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// Create a new DOCX template
export async function createDocxTemplate(
  file: File,
  name: string,
  description: string | null,
  organizationId: string,
  userId: string,
  options: {
    filenameTemplate?: string;
    caseTypes?: string[];
    roleRestriction?: string;
    usesMergeFields?: boolean;
  } = {}
): Promise<DocxTemplate | null> {
  try {
    // Parse the template to detect variables
    const parseResult = await parseDocxTemplate(file);
    
    if (!parseResult.isValid) {
      console.error("Invalid template:", parseResult.errors);
      return null;
    }

    // Upload file to storage
    const filename = `${Date.now()}_${file.name}`;
    const filePath = `${organizationId}/${filename}`;
    
    const { error: uploadError } = await supabase.storage
      .from("docx-templates")
      .upload(filePath, file, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Error uploading template:", uploadError);
      return null;
    }

    // Create database record
    const { data, error: insertError } = await supabase
      .from("docx_templates")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        name,
        description,
        file_path: filePath,
        filename_template: options.filenameTemplate || null,
        case_types: options.caseTypes || null,
        role_restriction: options.roleRestriction || null,
        detected_variables: parseResult.variables,
        uses_merge_fields: options.usesMergeFields || false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating template record:", insertError);
      return null;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      filePath: data.file_path,
      filenameTemplate: data.filename_template,
      caseTypes: data.case_types,
      roleRestriction: data.role_restriction,
      detectedVariables: data.detected_variables,
      usesMergeFields: data.uses_merge_fields,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error("Error creating template:", error);
    return null;
  }
}

// Update a DOCX template
export async function updateDocxTemplate(
  templateId: string,
  updates: Partial<{
    name: string;
    description: string | null;
    filenameTemplate: string | null;
    caseTypes: string[] | null;
    roleRestriction: string | null;
    usesMergeFields: boolean;
    isActive: boolean;
  }>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.filenameTemplate !== undefined) updateData.filename_template = updates.filenameTemplate;
  if (updates.caseTypes !== undefined) updateData.case_types = updates.caseTypes;
  if (updates.roleRestriction !== undefined) updateData.role_restriction = updates.roleRestriction;
  if (updates.usesMergeFields !== undefined) updateData.uses_merge_fields = updates.usesMergeFields;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { error } = await supabase
    .from("docx_templates")
    .update(updateData)
    .eq("id", templateId);

  if (error) {
    console.error("Error updating template:", error);
    return false;
  }

  return true;
}

// Delete a DOCX template
export async function deleteDocxTemplate(templateId: string, filePath: string): Promise<boolean> {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("docx-templates")
      .remove([filePath]);

    if (storageError) {
      console.error("Error deleting template file:", storageError);
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from("docx_templates")
      .delete()
      .eq("id", templateId);

    if (dbError) {
      console.error("Error deleting template record:", dbError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting template:", error);
    return false;
  }
}

// Get generated reports for a case
export async function getCaseGeneratedReports(caseId: string): Promise<GeneratedReport[]> {
  const { data, error } = await supabase
    .from("generated_reports")
    .select("*")
    .eq("case_id", caseId)
    .order("generated_at", { ascending: false });

  if (error) {
    console.error("Error fetching generated reports:", error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    caseId: row.case_id,
    templateId: row.template_id,
    userId: row.user_id,
    title: row.title,
    outputFilePath: row.output_file_path,
    variablesUsed: row.variables_used as Record<string, string> | null,
    generatedAt: row.generated_at,
  }));
}

// Delete a generated report
export async function deleteGeneratedReport(reportId: string, filePath: string): Promise<boolean> {
  try {
    // Delete from storage
    await supabase.storage
      .from("generated-reports")
      .remove([filePath]);

    // Delete database record
    const { error } = await supabase
      .from("generated_reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      console.error("Error deleting report:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting report:", error);
    return false;
  }
}
