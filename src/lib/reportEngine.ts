import { supabase } from "@/integrations/supabase/client";
import { getOrganizationProfile, OrganizationProfile } from "@/lib/organizationProfile";
import { getCaseVariables, CaseVariables } from "@/lib/caseVariables";
import { getReportTemplate, ReportTemplate, TemplateSection, SectionType } from "@/lib/reportTemplates";
import {
  renderStaticTextSection,
  renderVariableBlockSection,
  renderUpdateCollectionSection,
  renderEventCollectionSection,
} from "@/lib/reportRenderers";

// ============= Types =============

export interface ReportInput {
  caseId: string;
  templateId: string;
  organizationId: string;
  userId: string;
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
 * Assemble full HTML document from rendered sections
 */
function assembleReportHtml(
  sections: RenderedSection[],
  title: string,
  orgProfile: OrganizationProfile | null
): string {
  const sortedSections = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
  
  const sectionsHtml = sortedSections
    .map(section => `
      <div class="report-section" data-section-id="${section.id}" data-section-type="${section.sectionType}">
        ${section.htmlContent}
      </div>
    `)
    .join('\n');

  return `
    <div class="report-document">
      <style>
        .report-document {
          font-family: 'Times New Roman', Times, serif;
          line-height: 1.6;
          color: #1a1a1a;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        .report-section {
          margin-bottom: 24px;
          page-break-inside: avoid;
        }
        .report-section h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #1a1a1a;
          border-bottom: 1px solid #e5e5e5;
          padding-bottom: 4px;
        }
        .report-section h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 16px 0 8px 0;
          color: #333;
        }
        .variable-table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
        }
        .variable-table td {
          padding: 4px 8px;
          border: 1px solid #e5e5e5;
          vertical-align: top;
        }
        .variable-table td:first-child {
          font-weight: 500;
          width: 40%;
          background: #f9f9f9;
        }
        .variable-list {
          margin: 8px 0;
          padding-left: 0;
          list-style: none;
        }
        .variable-list li {
          padding: 4px 0;
          border-bottom: 1px dotted #e5e5e5;
        }
        .variable-inline {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin: 8px 0;
        }
        .variable-inline .variable-item {
          display: flex;
          gap: 4px;
        }
        .variable-inline .variable-label {
          font-weight: 500;
        }
        .update-item {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
        }
        .update-item:last-child {
          border-bottom: none;
        }
        .update-header {
          font-weight: 600;
          margin-bottom: 4px;
        }
        .update-meta {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        .update-content {
          white-space: pre-wrap;
        }
        .event-group {
          margin-bottom: 20px;
        }
        .event-group-header {
          font-weight: 600;
          background: #f5f5f5;
          padding: 6px 10px;
          margin-bottom: 8px;
          border-left: 3px solid #666;
        }
        .event-item {
          padding: 8px 10px;
          margin-bottom: 8px;
          background: #fafafa;
          border-radius: 4px;
        }
        .event-title {
          font-weight: 500;
        }
        .event-meta {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        .event-description {
          margin-top: 6px;
          font-size: 13px;
        }
        .company-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .company-header img {
          max-height: 60px;
          max-width: 200px;
          margin-bottom: 8px;
        }
        .company-header h1 {
          font-size: 20px;
          margin: 8px 0 4px 0;
        }
        .company-header p {
          font-size: 12px;
          color: #666;
          margin: 2px 0;
        }
      </style>
      ${sectionsHtml}
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

    const updates: CaseUpdate[] = updatesResult.data || [];
    const events: CaseEvent[] = eventsResult.data || [];
    const userProfiles: Record<string, UserProfile> = {};
    
    (profilesResult.data || []).forEach(p => {
      userProfiles[p.id] = p;
    });

    // Step 2: Compute input hash for determinism
    const inputHash = computeInputHash({
      orgProfile,
      caseVariables,
      template,
      updates,
      events,
    });

    // Step 3: Process sections in display order
    const renderedSections: RenderedSection[] = [];
    const renderedUpdateIds = new Set<string>();
    const renderedEventIds = new Set<string>();

    // Sort sections by display order
    const sortedSections = [...template.sections]
      .filter(s => s.isVisible)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    for (const section of sortedSections) {
      let rendered: RenderedSection;

      switch (section.sectionType) {
        case 'static_text':
          rendered = renderStaticTextSection(section, orgProfile, caseVariables);
          break;

        case 'case_variable_block':
          rendered = renderVariableBlockSection(section, caseVariables);
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

    // Step 4: Assemble final HTML
    const reportTitle = `${caseVariables?.caseNumber || 'Report'} - ${template.name}`;
    const renderedHtml = assembleReportHtml(renderedSections, reportTitle, orgProfile);

    // Step 5: Save to database
    // Use type assertion to work around generated types not being synced yet
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
        template_snapshot: template as unknown,
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
