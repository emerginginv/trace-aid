/**
 * Lightweight report preview generator for Template Customizer
 * Generates preview HTML without database queries using placeholder content
 */

import { OrganizationProfile } from "@/lib/organizationProfile";
import { CaseVariables } from "@/lib/caseVariables";
import {
  ReportTemplate,
  TemplateSection,
  TemplateCustomization,
  SectionCustomization,
  applyCustomizations,
} from "@/lib/reportTemplates";
import { CaseUpdate, CaseEvent, UserProfile, RenderedSection } from "@/lib/reportEngine";
import {
  renderStaticTextSection,
  renderVariableBlockSection,
  renderUpdateCollectionSection,
  renderEventCollectionSection,
  renderCoverPage,
} from "@/lib/reportRenderers";
import { generateReportStyles, generateReportHash } from "@/lib/reportStyles";

// ============= Types =============

export interface PreviewInput {
  template: ReportTemplate;
  customization: TemplateCustomization | null;
  orgProfile: OrganizationProfile | null;
  caseVariables: CaseVariables | null;
  sampleUpdates?: CaseUpdate[];
  sampleEvents?: CaseEvent[];
}

export interface SectionPreview {
  sectionId: string;
  title: string;
  sectionType: string;
  isVisible: boolean;
  displayOrder: number;
  previewHtml: string;
}

export interface PreviewResult {
  html: string;
  coverPageHtml: string;
  sectionPreviews: SectionPreview[];
  estimatedPages: number;
}

// ============= Sample Data =============

const SAMPLE_UPDATES: CaseUpdate[] = [
  {
    id: 'preview-update-1',
    case_id: 'preview',
    user_id: 'preview-user',
    title: 'Initial Observation',
    description: 'Subject was observed leaving residence at approximately 08:00 hours. The subject entered a blue sedan and departed the location heading northbound on Main Street.',
    update_type: 'Surveillance',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'preview-update-2',
    case_id: 'preview',
    user_id: 'preview-user',
    title: 'Follow-up Interview',
    description: 'Contacted witness at the provided address. Witness confirmed observing the subject at the location on the date in question.',
    update_type: 'Interview',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'preview-update-3',
    case_id: 'preview',
    user_id: 'preview-user',
    title: 'Documentation Review',
    description: 'Reviewed provided documentation including employment records and medical reports. Findings documented in case file.',
    update_type: 'Research',
    created_at: new Date().toISOString(),
  },
];

const SAMPLE_EVENTS: CaseEvent[] = [
  {
    id: 'preview-event-1',
    case_id: 'preview',
    user_id: 'preview-user',
    title: 'Morning Surveillance Session',
    description: 'Surveillance of subject residence from 06:00 to 14:00 hours.',
    activity_type: 'event',
    event_subtype: 'Surveillance Session',
    status: 'Completed',
    due_date: new Date(Date.now() - 86400000).toISOString(),
    assigned_user_id: 'preview-user',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'preview-event-2',
    case_id: 'preview',
    user_id: 'preview-user',
    title: 'Client Meeting',
    description: 'Progress review meeting with client representative.',
    activity_type: 'event',
    event_subtype: 'Meeting',
    status: 'Scheduled',
    due_date: new Date(Date.now() + 86400000).toISOString(),
    assigned_user_id: 'preview-user',
    created_at: new Date().toISOString(),
  },
];

const SAMPLE_USER_PROFILES: Record<string, UserProfile> = {
  'preview-user': {
    id: 'preview-user',
    full_name: 'John Investigator',
    email: 'investigator@example.com',
  },
};

// ============= Preview Generation =============

/**
 * Generate a live preview of the report without database persistence
 */
export function generatePreview(input: PreviewInput): PreviewResult {
  const {
    template,
    customization,
    orgProfile,
    caseVariables,
    sampleUpdates = SAMPLE_UPDATES,
    sampleEvents = SAMPLE_EVENTS,
  } = input;

  // Apply customizations if provided
  let effectiveTemplate = template;
  if (customization) {
    effectiveTemplate = applyCustomizations(template, customization);
  }

  // Use preview sample data or provided sample data
  const updates = sampleUpdates;
  const events = sampleEvents;
  const userProfiles = SAMPLE_USER_PROFILES;

  // Generate section previews
  const sectionPreviews: SectionPreview[] = [];
  const renderedSections: RenderedSection[] = [];
  const renderedUpdateIds = new Set<string>();
  const renderedEventIds = new Set<string>();

  // Sort sections by display order
  const sortedSections = [...effectiveTemplate.sections].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  for (const section of sortedSections) {
    let rendered: RenderedSection | null = null;

    if (section.isVisible) {
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
          if (rendered.sourceData.eventIds) {
            rendered.sourceData.eventIds.forEach(id => renderedEventIds.add(id));
          }
          break;
      }
    }

    sectionPreviews.push({
      sectionId: section.id,
      title: section.title,
      sectionType: section.sectionType,
      isVisible: section.isVisible,
      displayOrder: section.displayOrder,
      previewHtml: rendered?.htmlContent || generatePlaceholderHtml(section),
    });

    if (rendered) {
      renderedSections.push(rendered);
    }
  }

  // Generate full preview HTML
  const generatedAt = new Date();
  const previewTitle = `${caseVariables?.caseNumber || 'INV-2026-PREVIEW'} - ${effectiveTemplate.name}`;

  const coverPageHtml = renderCoverPage(
    orgProfile,
    caseVariables || createPreviewCaseVariables(),
    previewTitle,
    generatedAt
  );

  const fullHtml = assemblePreviewHtml(
    renderedSections,
    coverPageHtml,
    previewTitle,
    orgProfile,
    caseVariables
  );

  // Estimate pages (rough calculation based on content length)
  const estimatedPages = Math.max(1, Math.ceil(fullHtml.length / 8000));

  return {
    html: fullHtml,
    coverPageHtml,
    sectionPreviews,
    estimatedPages,
  };
}

/**
 * Generate placeholder HTML for hidden or empty sections
 */
function generatePlaceholderHtml(section: TemplateSection): string {
  const placeholderContent = getPlaceholderText(section.sectionType);
  
  return `
    <div class="section-placeholder">
      <p class="placeholder-text">${placeholderContent}</p>
    </div>
  `;
}

function getPlaceholderText(sectionType: string): string {
  switch (sectionType) {
    case 'static_text':
      return 'Static text content will appear here.';
    case 'case_variable_block':
      return 'Case information variables will be displayed here.';
    case 'update_collection':
      return 'Case updates will be rendered here based on mapping.';
    case 'event_collection':
      return 'Scheduled events will appear here based on mapping.';
    default:
      return 'Section content will appear here.';
  }
}

/**
 * Create preview case variables when none provided
 */
function createPreviewCaseVariables(): CaseVariables {
  const primarySubject = {
    id: 'subject-1',
    name: 'John Doe',
    type: 'person',
    isPrimary: true,
    details: {},
  };

  const primaryClient = {
    id: 'client-1',
    name: 'ABC Law Firm',
    type: 'account' as const,
  };

  return {
    caseId: 'preview-case',
    caseNumber: 'INV-2026-PREVIEW',
    caseTitle: 'Sample Investigation Case',
    claimNumber: 'CLM-2026-001',
    subjects: [primarySubject],
    clients: [primaryClient],
    investigators: [
      { id: 'inv-1', name: 'Jane Investigator' },
    ],
    locations: [
      { id: 'loc-1', name: 'Subject Residence', address: '123 Main Street, Los Angeles, CA 90001' },
    ],
    primarySubject,
    primaryClient,
    clientList: 'ABC Law Firm',
    subjectList: 'John Doe (Primary)',
    investigatorList: 'Jane Investigator',
    locationList: '123 Main Street, Los Angeles, CA 90001',
    assignmentDate: 'January 1, 2026',
    surveillanceStartDate: 'January 2, 2026',
    surveillanceEndDate: 'January 4, 2026',
    surveillanceDateRange: 'January 2, 2026 - January 4, 2026',
    dueDate: 'January 15, 2026',
    caseManager: 'Case Manager Name',
    caseManagerEmail: 'manager@example.com',
  };
}

/**
 * Assemble preview HTML with professional styling
 */
function assemblePreviewHtml(
  sections: RenderedSection[],
  coverPageHtml: string,
  title: string,
  orgProfile: OrganizationProfile | null,
  caseVariables: CaseVariables | null
): string {
  const sortedSections = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);

  // Generate styles
  const styles = generateReportStyles({
    companyName: orgProfile?.companyName,
    caseNumber: caseVariables?.caseNumber || 'INV-2026-PREVIEW',
  });

  // Build section HTML
  const sectionsHtml = sortedSections
    .map((section, index) => {
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

  // Preview-specific styles for multi-page layout
  const previewStyles = `
    .report-document {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
    }
    
    .report-cover-page {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 72px 48px;
      box-sizing: border-box;
    }
    
    .report-content {
      padding: 48px;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    
    .report-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #cbd5e0;
      margin-bottom: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9pt;
      color: #4a5568;
    }
    
    .report-page-footer {
      position: absolute;
      bottom: 36px;
      left: 48px;
      right: 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #cbd5e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 8pt;
      color: #718096;
    }
    
    .preview-page-break {
      display: none;
    }
    
    .section-placeholder {
      background: #f7fafc;
      border: 2px dashed #cbd5e0;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
    }
    
    .placeholder-text {
      color: #718096;
      font-style: italic;
      font-size: 13px;
      margin: 0;
    }
    
    [data-section-highlighted="true"] {
      outline: 3px solid #3182ce;
      outline-offset: 4px;
      border-radius: 4px;
    }
  `;

  // Running header (for content pages)
  const headerHtml = `
    <div class="report-page-header">
      <span class="header-company">${orgProfile?.companyName || 'Company Name'}</span>
      <span class="header-case">${caseVariables?.caseNumber ? `Case #: ${caseVariables.caseNumber}` : 'Case #: INV-2026-PREVIEW'}</span>
    </div>
  `;

  // Running footer
  const footerHtml = `
    <div class="report-page-footer">
      <span class="footer-confidential">CONFIDENTIAL</span>
      <span class="footer-page">Preview</span>
      <span class="footer-report-id">Report ID: PREVIEW</span>
    </div>
  `;

  return `
    <style>${styles}</style>
    <style>${previewStyles}</style>
    
    ${coverPageHtml}
    
    <div class="preview-page-break">— Page Break —</div>
    
    <div class="report-content">
      ${headerHtml}
      ${sectionsHtml}
      ${footerHtml}
    </div>
  `;
}

/**
 * Build a TemplateCustomization object from customization map
 */
export function buildCustomization(
  templateId: string,
  customizations: Map<string, SectionCustomization>
): TemplateCustomization {
  return {
    templateId,
    sectionCustomizations: Array.from(customizations.values()),
  };
}
