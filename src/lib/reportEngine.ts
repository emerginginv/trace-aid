import { supabase } from "@/integrations/supabase/client";
import { getOrganizationProfile, OrganizationProfile } from "@/lib/organizationProfile";
import { getCaseVariables, CaseVariables } from "@/lib/caseVariables";
import { 
  getReportTemplate, 
  ReportTemplate, 
  TemplateSection, 
  SectionType,
  TemplateCustomization,
  applyCustomizations,
  CoverPageConfig,
  SubjectFilterConfig,
  HeaderFooterConfig,
  getDefaultHeaderFooterConfig,
} from "@/lib/reportTemplates";
import {
  renderStaticTextSection,
  renderVariableBlockSection,
  renderUpdateCollectionSection,
  renderEventCollectionSection,
  renderCoverPage,
  renderReportHeader,
  renderReportFooter,
} from "@/lib/reportRenderers";
import { generateReportStyles, generateReportHash, formatReportDate } from "@/lib/reportStyles";

// ============= Types =============

export interface ReportInput {
  caseId: string;
  templateId: string;
  organizationId: string;
  userId: string;
  customization?: TemplateCustomization;  // Optional template customizations
}

export interface RenderedSection {
  id: string;
  title: string;
  sectionType: SectionType;
  displayOrder: number;
  htmlContent: string;
  sourceData: {
    updateIds?: string[];
    eventIds?: string[];
    variables?: string[];
  };
}

export interface ReportInstance {
  id: string;
  caseId: string;
  templateId: string;
  organizationId: string;
  userId: string;
  title: string;
  generatedAt: Date;
  inputHash: string;
  renderedHtml: string;
  renderedSections: RenderedSection[];
  orgProfileSnapshot: OrganizationProfile | null;
  caseVariablesSnapshot: CaseVariables | null;
  templateSnapshot: ReportTemplate;
  exportFormat: string | null;
  exportedAt: Date | null;
}

export interface GenerationResult {
  success: boolean;
  reportInstance?: ReportInstance;
  error?: string;
}

export interface CaseUpdate {
  id: string;
  case_id: string;
  user_id: string;
  title: string;
  description: string | null;
  update_type: string;
  created_at: string;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  user_id: string;
  title: string;
  description: string | null;
  activity_type: string;
  event_subtype: string | null;
  status: string;
  due_date: string | null;
  assigned_user_id: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

// ============= Helper Functions =============

/**
 * Compute a deterministic hash of all input data
 * This ensures same inputs always produce same output
 */
export function computeInputHash(data: {
  orgProfile: OrganizationProfile | null;
  caseVariables: CaseVariables | null;
  template: ReportTemplate;
  updates: CaseUpdate[];
  events: CaseEvent[];
}): string {
  // Create deterministic string representation
  const normalized = JSON.stringify({
    org: data.orgProfile,
    case: data.caseVariables,
    template: {
      id: data.template.id,
      name: data.template.name,
      sections: data.template.sections.map(s => ({
        id: s.id,
        type: s.sectionType,
        title: s.title,
        displayOrder: s.displayOrder,
        content: s.content,
        variableConfig: s.variableConfig,
        collectionConfig: s.collectionConfig,
      })).sort((a, b) => a.displayOrder - b.displayOrder),
    },
    updates: data.updates.map(u => u.id).sort(),
    events: data.events.map(e => e.id).sort(),
  });
  
  // Simple hash using btoa for demonstration
  // In production, consider using crypto.subtle.digest
  return btoa(encodeURIComponent(normalized)).slice(0, 64);
}

/**
 * Assemble full HTML document with professional styling
 */
function assembleReportHtml(
  sections: RenderedSection[],
  title: string,
  orgProfile: OrganizationProfile | null,
  caseVariables: CaseVariables | null,
  generatedAt: Date,
  inputHash: string,
  coverPageConfig?: CoverPageConfig,
  headerFooterConfig?: HeaderFooterConfig
): string {
  const sortedSections = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
  const hfConfig = headerFooterConfig || getDefaultHeaderFooterConfig();
  
  // Generate professional stylesheet
  const styles = generateReportStyles({
    companyName: orgProfile?.companyName,
    caseNumber: caseVariables?.caseNumber,
  });

  // Generate cover page
  const coverPageHtml = renderCoverPage(
    orgProfile,
    caseVariables,
    title,
    generatedAt,
    undefined,
    coverPageConfig
  );

  // Generate section content with page break logic
  const sectionsHtml = sortedSections
    .map((section, index) => {
      // Add page break before major sections (but not the first one)
      const isFirstSection = index === 0;
      const isMajorSection = section.sectionType === 'static_text' && section.displayOrder > 1;
      const pageBreakClass = !isFirstSection && isMajorSection ? 'break-before' : '';
      
      return `
        <div class="report-section ${pageBreakClass}" data-section-id="${section.id}" data-section-type="${section.sectionType}">
          ${section.htmlContent}
        </div>
      `;
    })
    .join('\n');

  // Generate report hash for identification
  const reportHash = generateReportHash(inputHash).substring(0, 8);

  // Configurable running header
  const headerHtml = renderReportHeader(orgProfile, caseVariables, title, generatedAt, hfConfig);

  // Configurable running footer
  const footerHtml = renderReportFooter(orgProfile, generatedAt, reportHash, hfConfig);

  return `
    <div class="report-document">
      <style>${styles}</style>
      
      ${coverPageHtml}
      
      <div class="report-content">
        ${headerHtml}
        ${sectionsHtml}
        ${footerHtml}
      </div>
    </div>
  `;
}

// ============= Main Generation Function =============

export async function generateReport(input: ReportInput): Promise<GenerationResult> {
  try {
    // Step 1: Fetch all source data in parallel
    const [orgProfile, caseVariables, template, updatesResult, eventsResult, profilesResult] = await Promise.all([
      getOrganizationProfile(input.organizationId),
      getCaseVariables(input.caseId),
      getReportTemplate(input.templateId),
      supabase
        .from('case_updates')
        .select('*')
        .eq('case_id', input.caseId)
        .order('created_at', { ascending: true }),
      supabase
        .from('case_activities')
        .select('*')
        .eq('case_id', input.caseId)
        .eq('activity_type', 'event')
        .order('due_date', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, full_name, email'),
    ]);

    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Apply customizations if provided
    let effectiveTemplate = template;
    if (input.customization) {
      effectiveTemplate = applyCustomizations(template, input.customization);
    }

    const updates: CaseUpdate[] = updatesResult.data || [];
    const events: CaseEvent[] = eventsResult.data || [];
    const userProfiles: Record<string, UserProfile> = {};
    
    (profilesResult.data || []).forEach(p => {
      userProfiles[p.id] = p;
    });

    // Step 2: Compute input hash for determinism (use effective template)
    const inputHash = computeInputHash({
      orgProfile,
      caseVariables,
      template: effectiveTemplate,
      updates,
      events,
    });

    // Step 3: Process sections in display order
    const renderedSections: RenderedSection[] = [];
    const renderedUpdateIds = new Set<string>();
    const renderedEventIds = new Set<string>();

    // Sort sections by display order
    const sortedSections = [...effectiveTemplate.sections]
      .filter(s => s.isVisible)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    for (const section of sortedSections) {
      let rendered: RenderedSection;

      switch (section.sectionType) {
        case 'static_text':
          rendered = renderStaticTextSection(section, orgProfile, caseVariables);
          break;

        case 'case_variable_block':
          rendered = renderVariableBlockSection(section, caseVariables, input.customization?.subjectFilterConfig);
          break;

        case 'update_collection':
          rendered = renderUpdateCollectionSection(
            section,
            updates,
            renderedUpdateIds,
            userProfiles
          );
          // Track rendered update IDs for deduplication
          if (rendered.sourceData.updateIds) {
            rendered.sourceData.updateIds.forEach(id => renderedUpdateIds.add(id));
          }
          break;

        case 'event_collection':
          rendered = renderEventCollectionSection(
            section,
            events,
            renderedEventIds,
            userProfiles
          );
          // Track rendered event IDs for deduplication
          if (rendered.sourceData.eventIds) {
            rendered.sourceData.eventIds.forEach(id => renderedEventIds.add(id));
          }
          break;

        default:
          continue;
      }

      renderedSections.push(rendered);
    }

    // Step 4: Assemble final HTML with professional styling
    const generatedAt = new Date();
    const reportTitle = `${caseVariables?.caseNumber || 'Report'} - ${effectiveTemplate.name}`;
    const renderedHtml = assembleReportHtml(
      renderedSections, 
      reportTitle, 
      orgProfile, 
      caseVariables,
      generatedAt,
      inputHash,
      input.customization?.coverPageConfig,
      input.customization?.headerFooterConfig
    );

    // Step 5: Save to database
    // Store the effective template (with customizations applied) as the snapshot
    const { data: savedReport, error: saveError } = await (supabase
      .from('report_instances' as any)
      .insert({
        organization_id: input.organizationId,
        case_id: input.caseId,
        template_id: input.templateId,
        user_id: input.userId,
        title: reportTitle,
        input_hash: inputHash,
        rendered_html: renderedHtml,
        rendered_sections: renderedSections as unknown,
        org_profile_snapshot: orgProfile as unknown,
        case_variables_snapshot: caseVariables as unknown,
        template_snapshot: effectiveTemplate as unknown,  // Store customized template
      })
      .select()
      .single() as any);

    if (saveError) {
      console.error('Error saving report:', saveError);
      return { success: false, error: 'Failed to save report' };
    }

    // Step 6: Return report instance
    const reportInstance: ReportInstance = {
      id: savedReport.id,
      caseId: savedReport.case_id,
      templateId: savedReport.template_id,
      organizationId: savedReport.organization_id,
      userId: savedReport.user_id,
      title: savedReport.title,
      generatedAt: new Date(savedReport.generated_at),
      inputHash: savedReport.input_hash,
      renderedHtml: savedReport.rendered_html,
      renderedSections: savedReport.rendered_sections as unknown as RenderedSection[],
      orgProfileSnapshot: savedReport.org_profile_snapshot as unknown as OrganizationProfile | null,
      caseVariablesSnapshot: savedReport.case_variables_snapshot as unknown as CaseVariables | null,
      templateSnapshot: savedReport.template_snapshot as unknown as ReportTemplate,
      exportFormat: savedReport.export_format,
      exportedAt: savedReport.exported_at ? new Date(savedReport.exported_at) : null,
    };

    return { success: true, reportInstance };
  } catch (error) {
    console.error('Error generating report:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Fetch a previously generated report instance
 */
export async function getReportInstance(reportId: string): Promise<ReportInstance | null> {
  const { data, error } = await (supabase
    .from('report_instances' as any)
    .select('*')
    .eq('id', reportId)
    .single() as any);

  if (error || !data) {
    console.error('Error fetching report instance:', error);
    return null;
  }

  return {
    id: data.id,
    caseId: data.case_id,
    templateId: data.template_id,
    organizationId: data.organization_id,
    userId: data.user_id,
    title: data.title,
    generatedAt: new Date(data.generated_at),
    inputHash: data.input_hash,
    renderedHtml: data.rendered_html,
    renderedSections: data.rendered_sections as unknown as RenderedSection[],
    orgProfileSnapshot: data.org_profile_snapshot as unknown as OrganizationProfile | null,
    caseVariablesSnapshot: data.case_variables_snapshot as unknown as CaseVariables | null,
    templateSnapshot: data.template_snapshot as unknown as ReportTemplate,
    exportFormat: data.export_format,
    exportedAt: data.exported_at ? new Date(data.exported_at) : null,
  };
}

/**
 * Fetch all report instances for a case
 */
export async function getCaseReportInstances(caseId: string): Promise<ReportInstance[]> {
  const { data, error } = await (supabase
    .from('report_instances' as any)
    .select('*')
    .eq('case_id', caseId)
    .order('generated_at', { ascending: false }) as any);

  if (error) {
    console.error('Error fetching case reports:', error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    caseId: r.case_id,
    templateId: r.template_id,
    organizationId: r.organization_id,
    userId: r.user_id,
    title: r.title,
    generatedAt: new Date(r.generated_at),
    inputHash: r.input_hash,
    renderedHtml: r.rendered_html,
    renderedSections: r.rendered_sections as unknown as RenderedSection[],
    orgProfileSnapshot: r.org_profile_snapshot as unknown as OrganizationProfile | null,
    caseVariablesSnapshot: r.case_variables_snapshot as unknown as CaseVariables | null,
    templateSnapshot: r.template_snapshot as unknown as ReportTemplate,
    exportFormat: r.export_format,
    exportedAt: r.exported_at ? new Date(r.exported_at) : null,
  }));
}

/**
 * Update export tracking on a report instance
 */
export async function updateReportExport(
  reportId: string,
  format: string
): Promise<boolean> {
  const { error } = await (supabase
    .from('report_instances' as any)
    .update({
      export_format: format,
      exported_at: new Date().toISOString(),
    })
    .eq('id', reportId) as any);

  return !error;
}
