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

// Update type mapping configuration for update_collection sections
export interface UpdateTypeMapping {
  updateTypes: string[];           // Array of update type values (e.g., ['Surveillance', 'Interview'])
  allowDuplicates: boolean;        // If true, same update can appear in multiple sections
  includeAll: boolean;             // If true, ignores updateTypes and includes all
}

// Event type mapping configuration for event_collection sections
export interface EventTypeMapping {
  eventTypes: string[];            // e.g., ['Surveillance Session', 'Canvass Attempt']
  allowDuplicates: boolean;        // If true, same event can appear in multiple sections
  includeAll: boolean;             // If true, ignores eventTypes and includes all
}

// Display configuration for event_collection sections
export interface EventDisplayConfig {
  groupBy: 'none' | 'date' | 'type' | 'status';  // How to group events
  showTime: boolean;               // Whether to show event time
  showAssignee: boolean;           // Whether to show assigned investigator
  showStatus: boolean;             // Whether to show event status
  showDescription: boolean;        // Whether to show description
}

export interface CollectionConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  limit: number | null;
  filters?: Record<string, any>;
  // Update type mapping for update_collection sections
  updateTypeMapping?: UpdateTypeMapping;
  // Event type mapping for event_collection sections
  eventTypeMapping?: EventTypeMapping;
  eventDisplayConfig?: EventDisplayConfig;
  // Display options for update_collection sections
  showAuthor?: boolean;  // Whether to show author attribution in updates (default: true)
}

// Default update types for reference
export const DEFAULT_UPDATE_TYPES = [
  'Surveillance',
  'Case Update',
  'Interview',
  'Accounting',
  'Client Contact',
  '3rd Party Contact',
  'Review',
  'Other'
];

// Default event types for reference
export const DEFAULT_EVENT_TYPES = [
  'Surveillance Session',
  'Canvass Attempt',
  'Records Search',
  'Field Activity',
  'Interview Session',
  'Site Visit',
  'Background Check',
  'Database Search',
  'Court Attendance',
  'Other'
];

// Grouping options for events
export const EVENT_GROUP_OPTIONS = [
  { value: 'none', label: 'No Grouping (Chronological List)' },
  { value: 'date', label: 'Group by Date' },
  { value: 'type', label: 'Group by Event Type' },
  { value: 'status', label: 'Group by Status' },
] as const;

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

// ============= Update Type Mapping Helper Functions =============

// Get update types configured for a section
export function getSectionUpdateTypes(section: TemplateSection): string[] | null {
  if (section.sectionType !== 'update_collection') return null;
  if (!section.collectionConfig?.updateTypeMapping) return null;
  
  const mapping = section.collectionConfig.updateTypeMapping;
  if (mapping.includeAll) return null; // null means "all types"
  return mapping.updateTypes;
}

// Check if duplication is allowed for a section
export function isSectionDuplicationAllowed(section: TemplateSection): boolean {
  return section.collectionConfig?.updateTypeMapping?.allowDuplicates ?? false;
}

// Build update query params for a section (for report generation)
export interface UpdateQueryParams {
  updateTypes: string[] | null;  // null = all types
  sortOrder: 'asc' | 'desc';
  limit: number | null;
  allowDuplicates: boolean;
}

export function getUpdateQueryParams(section: TemplateSection): UpdateQueryParams | null {
  if (section.sectionType !== 'update_collection') return null;
  
  const config = section.collectionConfig;
  const mapping = config?.updateTypeMapping;
  
  return {
    updateTypes: mapping?.includeAll ? null : (mapping?.updateTypes ?? null),
    sortOrder: config?.sortOrder ?? 'asc',
    limit: config?.limit ?? null,
    allowDuplicates: mapping?.allowDuplicates ?? false,
  };
}

// Get default collection config for update_collection sections
export function getDefaultUpdateCollectionConfig(): CollectionConfig {
  return {
    sortBy: 'created_at',
    sortOrder: 'asc',
    limit: null,
    updateTypeMapping: {
      updateTypes: [],
      includeAll: true,
      allowDuplicates: false,
    },
  };
}

// ============= Event Type Mapping Helper Functions =============

// Get event types configured for a section
export function getSectionEventTypes(section: TemplateSection): string[] | null {
  if (section.sectionType !== 'event_collection') return null;
  if (!section.collectionConfig?.eventTypeMapping) return null;
  
  const mapping = section.collectionConfig.eventTypeMapping;
  if (mapping.includeAll) return null; // null means "all types"
  return mapping.eventTypes;
}

// Check if duplication is allowed for events in a section
export function isEventDuplicationAllowed(section: TemplateSection): boolean {
  return section.collectionConfig?.eventTypeMapping?.allowDuplicates ?? false;
}

// Build event query params for a section (for report generation)
export interface EventQueryParams {
  eventTypes: string[] | null;  // null = all types
  sortOrder: 'asc' | 'desc';
  limit: number | null;
  allowDuplicates: boolean;
  groupBy: 'none' | 'date' | 'type' | 'status';
}

export function getEventQueryParams(section: TemplateSection): EventQueryParams | null {
  if (section.sectionType !== 'event_collection') return null;
  
  const config = section.collectionConfig;
  const mapping = config?.eventTypeMapping;
  const displayConfig = config?.eventDisplayConfig;
  
  return {
    eventTypes: mapping?.includeAll ? null : (mapping?.eventTypes ?? null),
    sortOrder: config?.sortOrder ?? 'asc',
    limit: config?.limit ?? null,
    allowDuplicates: mapping?.allowDuplicates ?? false,
    groupBy: displayConfig?.groupBy ?? 'none',
  };
}

// Get default collection config for event_collection sections
export function getDefaultEventCollectionConfig(): CollectionConfig {
  return {
    sortBy: 'due_date',
    sortOrder: 'asc',
    limit: null,
    eventTypeMapping: {
      eventTypes: [],
      includeAll: true,
      allowDuplicates: false,
    },
    eventDisplayConfig: {
      groupBy: 'none',
      showTime: true,
      showAssignee: true,
      showStatus: true,
      showDescription: true,
    },
  };
}

// ============= Template Customization Types =============

// Cover page configuration options
export interface CoverPageConfig {
  showCompanyNameWithLogo: boolean;  // If false, hide company name when logo exists (default: false)
  showPreparedBy: boolean;           // Toggle "Prepared by" section visibility (default: true)
}

// Get default cover page configuration
export function getDefaultCoverPageConfig(): CoverPageConfig {
  return {
    showCompanyNameWithLogo: false,
    showPreparedBy: true,
  };
}

// Subject filter configuration for controlling which subject types appear in reports
export interface SubjectFilterConfig {
  includeVehicles: boolean;   // Toggle for vehicle subjects (default: true)
  includeLocations: boolean;  // Toggle for location subjects (default: true)
  includeItems: boolean;      // Toggle for item subjects (default: true)
}

// Get default subject filter configuration
export function getDefaultSubjectFilterConfig(): SubjectFilterConfig {
  return {
    includeVehicles: true,
    includeLocations: true,
    includeItems: true,
  };
}

// Represents per-section customizations applied before report generation
export interface SectionCustomization {
  sectionId: string;
  customTitle?: string;           // Override section title
  isVisible?: boolean;            // Override visibility
  displayOrderOverride?: number;  // Override display order
  collectionConfigOverride?: Partial<CollectionConfig>;  // Override mappings
}

// Represents full template customization for a report generation
export interface TemplateCustomization {
  templateId: string;
  sectionCustomizations: SectionCustomization[];
  coverPageConfig?: CoverPageConfig;  // Cover page display options
  subjectFilterConfig?: SubjectFilterConfig;  // Subject type filter options
}

// Reordering constraints for sections
export interface SectionOrderConstraint {
  minPosition?: number;  // Cannot move above this position
  maxPosition?: number;  // Cannot move below this position
  locked?: boolean;      // Cannot be moved at all
}

/**
 * Apply customizations to a template, returning a modified copy
 * Original template is not mutated
 */
export function applyCustomizations(
  template: ReportTemplate,
  customization: TemplateCustomization
): ReportTemplate {
  if (customization.templateId !== template.id) {
    console.warn('Customization templateId does not match template id');
    return template;
  }

  // Create a deep copy of sections
  const customizedSections = template.sections.map(section => {
    const sectionCustomization = customization.sectionCustomizations.find(
      sc => sc.sectionId === section.id
    );

    if (!sectionCustomization) {
      return { ...section };
    }

    // Apply customizations
    const customizedSection: TemplateSection = {
      ...section,
      title: sectionCustomization.customTitle ?? section.title,
      isVisible: sectionCustomization.isVisible ?? section.isVisible,
      displayOrder: sectionCustomization.displayOrderOverride ?? section.displayOrder,
    };

    // Apply collection config overrides for update_collection and event_collection
    if (sectionCustomization.collectionConfigOverride && section.collectionConfig) {
      customizedSection.collectionConfig = {
        ...section.collectionConfig,
        ...sectionCustomization.collectionConfigOverride,
        // Deep merge update type mapping if present
        updateTypeMapping: sectionCustomization.collectionConfigOverride.updateTypeMapping
          ? {
              ...section.collectionConfig.updateTypeMapping,
              ...sectionCustomization.collectionConfigOverride.updateTypeMapping,
            }
          : section.collectionConfig.updateTypeMapping,
        // Deep merge event type mapping if present
        eventTypeMapping: sectionCustomization.collectionConfigOverride.eventTypeMapping
          ? {
              ...section.collectionConfig.eventTypeMapping,
              ...sectionCustomization.collectionConfigOverride.eventTypeMapping,
            }
          : section.collectionConfig.eventTypeMapping,
        // Deep merge event display config if present
        eventDisplayConfig: sectionCustomization.collectionConfigOverride.eventDisplayConfig
          ? {
              ...section.collectionConfig.eventDisplayConfig,
              ...sectionCustomization.collectionConfigOverride.eventDisplayConfig,
            }
          : section.collectionConfig.eventDisplayConfig,
      };
    }

    return customizedSection;
  });

  // Sort by customized display order
  customizedSections.sort((a, b) => a.displayOrder - b.displayOrder);

  return {
    ...template,
    sections: customizedSections,
  };
}

/**
 * Get reordering constraints for a section based on its type and position
 */
export function getSectionOrderConstraints(
  section: TemplateSection,
  allSections: TemplateSection[]
): SectionOrderConstraint {
  const sortedSections = [...allSections].sort((a, b) => a.displayOrder - b.displayOrder);
  const sectionIndex = sortedSections.findIndex(s => s.id === section.id);
  
  // Default: no constraints for most sections
  return {
    minPosition: 1,
    maxPosition: allSections.length,
    locked: false,
  };
}

/**
 * Validate that at least one section is visible
 */
export function validateCustomization(
  template: ReportTemplate,
  customization: TemplateCustomization
): { valid: boolean; error?: string } {
  const effectiveTemplate = applyCustomizations(template, customization);
  const visibleSections = effectiveTemplate.sections.filter(s => s.isVisible);
  
  if (visibleSections.length === 0) {
    return { valid: false, error: 'At least one section must be visible' };
  }
  
  return { valid: true };
}
