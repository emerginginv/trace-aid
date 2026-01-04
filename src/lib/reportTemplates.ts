import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Section Types
export type SectionType = 'static_text' | 'case_variable_block' | 'event_collection' | 'update_collection';

export type VariableLayout = 'table' | 'list' | 'inline';

export interface VariableBlockConfig {
  variables: string[];
  layout: VariableLayout;
  showLabels: boolean;
}

export interface CollectionConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  limit: number | null;
  filters?: Record<string, any>;
}

export interface TemplateSection {
  id: string;
  templateId: string;
  title: string;
  sectionType: SectionType;
  displayOrder: number;
  content: string | null;
  variableConfig: VariableBlockConfig | null;
  collectionConfig: CollectionConfig | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplate {
  id: string;
  organizationId: string | null;
  userId: string;
  name: string;
  description: string | null;
  isSystemTemplate: boolean;
  isActive: boolean;
  sections: TemplateSection[];
  createdAt: string;
  updatedAt: string;
}

// Available case variables for the variable block
export const AVAILABLE_CASE_VARIABLES = [
  { key: 'case_title', label: 'Case Title', category: 'Case Info' },
  { key: 'case_number', label: 'Case Number', category: 'Case Info' },
  { key: 'claim_number', label: 'Claim Number', category: 'Case Info' },
  { key: 'assignment_date', label: 'Assignment Date', category: 'Dates' },
  { key: 'due_date', label: 'Due Date', category: 'Dates' },
  { key: 'surveillance_dates', label: 'Surveillance Date Range', category: 'Dates' },
  { key: 'surveillance_start', label: 'Surveillance Start', category: 'Dates' },
  { key: 'surveillance_end', label: 'Surveillance End', category: 'Dates' },
  { key: 'client_list', label: 'All Clients', category: 'People' },
  { key: 'primary_client', label: 'Primary Client', category: 'People' },
  { key: 'subject_list', label: 'All Subjects', category: 'People' },
  { key: 'primary_subject', label: 'Primary Subject', category: 'People' },
  { key: 'investigator_list', label: 'Investigators', category: 'People' },
  { key: 'case_manager', label: 'Case Manager', category: 'People' },
  { key: 'location_list', label: 'Locations', category: 'Locations' },
];

// Section type labels
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  static_text: 'Static Text',
  case_variable_block: 'Case Variables',
  event_collection: 'Activities/Events',
  update_collection: 'Case Updates',
};

// Helper to parse database row to TemplateSection
function parseSection(row: any): TemplateSection {
  return {
    id: row.id,
    templateId: row.template_id,
    title: row.title,
    sectionType: row.section_type as SectionType,
    displayOrder: row.display_order,
    content: row.content,
    variableConfig: row.variable_config as VariableBlockConfig | null,
    collectionConfig: row.collection_config as CollectionConfig | null,
    isVisible: row.is_visible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to parse database row to ReportTemplate
function parseTemplate(row: any, sections: TemplateSection[] = []): ReportTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    isSystemTemplate: row.is_system_template,
    isActive: row.is_active,
    sections,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Fetch a single report template with its sections
export async function getReportTemplate(templateId: string): Promise<ReportTemplate | null> {
  const { data: templateData, error: templateError } = await supabase
    .from('report_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError || !templateData) {
    console.error('Error fetching template:', templateError);
    return null;
  }

  const { data: sectionsData, error: sectionsError } = await supabase
    .from('template_sections')
    .select('*')
    .eq('template_id', templateId)
    .order('display_order', { ascending: true });

  if (sectionsError) {
    console.error('Error fetching sections:', sectionsError);
    return null;
  }

  const sections = (sectionsData || []).map(parseSection);
  return parseTemplate(templateData, sections);
}

// Fetch all templates for an organization (including system templates)
export async function getOrganizationTemplates(orgId: string): Promise<ReportTemplate[]> {
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .or(`organization_id.eq.${orgId},is_system_template.eq.true`)
    .eq('is_active', true)
    .order('is_system_template', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching organization templates:', error);
    return [];
  }

  return (data || []).map(row => parseTemplate(row));
}

// Fetch only system templates
export async function getSystemTemplates(): Promise<ReportTemplate[]> {
  const { data, error } = await supabase
    .from('report_templates')
    .select('*')
    .eq('is_system_template', true)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching system templates:', error);
    return [];
  }

  return (data || []).map(row => parseTemplate(row));
}

// Create a new report template
export async function createReportTemplate(
  template: Omit<ReportTemplate, 'id' | 'sections' | 'createdAt' | 'updatedAt'>
): Promise<ReportTemplate | null> {
  const { data, error } = await supabase
    .from('report_templates')
    .insert({
      organization_id: template.organizationId,
      user_id: template.userId,
      name: template.name,
      description: template.description,
      is_system_template: false,
      is_active: template.isActive,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    return null;
  }

  return parseTemplate(data, []);
}

// Update a report template
export async function updateReportTemplate(
  templateId: string,
  updates: Partial<Pick<ReportTemplate, 'name' | 'description' | 'isActive'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('report_templates')
    .update({
      name: updates.name,
      description: updates.description,
      is_active: updates.isActive,
    })
    .eq('id', templateId);

  if (error) {
    console.error('Error updating template:', error);
    return false;
  }

  return true;
}

// Delete a report template
export async function deleteReportTemplate(templateId: string): Promise<boolean> {
  const { error } = await supabase
    .from('report_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting template:', error);
    return false;
  }

  return true;
}

// Create a new template section
export async function createTemplateSection(
  section: Omit<TemplateSection, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TemplateSection | null> {
  const { data, error } = await supabase
    .from('template_sections')
    .insert({
      template_id: section.templateId,
      title: section.title,
      section_type: section.sectionType,
      display_order: section.displayOrder,
      content: section.content,
      variable_config: section.variableConfig as unknown as Json,
      collection_config: section.collectionConfig as unknown as Json,
      is_visible: section.isVisible,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating section:', error);
    return null;
  }

  return parseSection(data);
}

// Update a template section
export async function updateTemplateSection(
  sectionId: string,
  updates: Partial<Omit<TemplateSection, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.sectionType !== undefined) updateData.section_type = updates.sectionType;
  if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.variableConfig !== undefined) updateData.variable_config = updates.variableConfig;
  if (updates.collectionConfig !== undefined) updateData.collection_config = updates.collectionConfig;
  if (updates.isVisible !== undefined) updateData.is_visible = updates.isVisible;

  const { error } = await supabase
    .from('template_sections')
    .update(updateData)
    .eq('id', sectionId);

  if (error) {
    console.error('Error updating section:', error);
    return false;
  }

  return true;
}

// Delete a template section
export async function deleteTemplateSection(sectionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('template_sections')
    .delete()
    .eq('id', sectionId);

  if (error) {
    console.error('Error deleting section:', error);
    return false;
  }

  return true;
}

// Reorder sections within a template
export async function reorderSections(templateId: string, sectionIds: string[]): Promise<boolean> {
  // Update each section's display_order based on its position in the array
  const updates = sectionIds.map((id, index) => 
    supabase
      .from('template_sections')
      .update({ display_order: index + 1 })
      .eq('id', id)
      .eq('template_id', templateId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(result => result.error);

  if (hasError) {
    console.error('Error reordering sections');
    return false;
  }

  return true;
}

// Duplicate a system template to create an organization-owned copy
export async function duplicateSystemTemplate(
  templateId: string,
  organizationId: string,
  userId: string,
  newName?: string
): Promise<ReportTemplate | null> {
  // Fetch the original template with sections
  const original = await getReportTemplate(templateId);
  if (!original) return null;

  // Create the new template
  const newTemplate = await createReportTemplate({
    organizationId,
    userId,
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    isSystemTemplate: false,
    isActive: true,
  });

  if (!newTemplate) return null;

  // Copy all sections
  if (original.sections.length > 0) {
    const sectionsToInsert = original.sections.map(section => ({
      template_id: newTemplate.id,
      title: section.title,
      section_type: section.sectionType,
      display_order: section.displayOrder,
      content: section.content,
      variable_config: section.variableConfig as unknown as Json,
      collection_config: section.collectionConfig as unknown as Json,
      is_visible: section.isVisible,
    }));

    const { error: sectionsError } = await supabase
      .from('template_sections')
      .insert(sectionsToInsert);

    if (sectionsError) {
      console.error('Error copying sections:', sectionsError);
    }
  }

  // Fetch and return the complete new template
  return getReportTemplate(newTemplate.id);
}
