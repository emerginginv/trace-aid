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
  CoverPageConfig,
  SubjectFilterConfig,
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
          rendered = renderVariableBlockSection(section, caseVariables, customization?.subjectFilterConfig);
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
    generatedAt,
    undefined,
    customization?.coverPageConfig
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

  // Preview-specific styles for multi-page layout - comprehensive with !important for reliability
  const previewStyles = `
    /* Base document styling */
    .report-document {
      font-family: Georgia, 'Times New Roman', serif !important;
      font-size: 11pt !important;
      line-height: 1.6 !important;
      color: #1a1a1a !important;
      background: #ffffff !important;
    }
    
    /* Cover page - professional layout */
    .report-cover-page {
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      padding: 72px 72px !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
    }
    
    .cover-header {
      text-align: center !important;
      margin-bottom: 24px !important;
    }
    
    /* Logo - constrained with !important */
    .report-document .cover-logo,
    .cover-logo {
      max-width: 150px !important;
      max-height: 80px !important;
      width: auto !important;
      height: auto !important;
      display: block !important;
      margin: 0 auto 16px auto !important;
      object-fit: contain !important;
    }
    
    .cover-logo-placeholder {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 20pt !important;
      font-weight: 700 !important;
      color: #1a1a1a !important;
    }
    
    .cover-company-name {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 14pt !important;
      font-weight: 600 !important;
      color: #1a1a1a !important;
      margin-top: 8px !important;
    }
    
    .cover-title-block {
      text-align: center !important;
      margin: 48px 0 !important;
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
    }
    
    .cover-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 42pt !important;
      font-weight: 700 !important;
      color: #1a1a1a !important;
      letter-spacing: 4px !important;
      line-height: 1.1 !important;
      margin: 0 !important;
    }
    
    .cover-subtitle {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 14pt !important;
      font-weight: 500 !important;
      color: #2d3748 !important;
      margin-top: 16px !important;
    }
    
    .cover-divider {
      width: 80px !important;
      height: 4px !important;
      background: #1a1a1a !important;
      margin: 24px auto !important;
    }
    
    /* Meta table */
    .cover-meta-block {
      margin: 32px auto !important;
      max-width: 400px !important;
    }
    
    .cover-meta-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 11pt !important;
    }
    
    .cover-meta-table tr {
      border-bottom: 1px solid #e2e8f0 !important;
    }
    
    .cover-meta-table td {
      padding: 10px 0 !important;
      vertical-align: top !important;
    }
    
    .cover-meta-table .meta-label {
      font-weight: 600 !important;
      color: #4a5568 !important;
      width: 140px !important;
      text-align: left !important;
    }
    
    .cover-meta-table .meta-value {
      color: #1a1a1a !important;
      font-weight: 500 !important;
      text-align: left !important;
    }
    
    /* Prepared by section */
    .cover-prepared-section {
      margin: 32px 0 !important;
      text-align: left !important;
    }
    
    .cover-prepared-label {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 10pt !important;
      color: #4a5568 !important;
      margin-bottom: 4px !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
    }
    
    .cover-prepared-name {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 14pt !important;
      font-weight: 600 !important;
      color: #1a1a1a !important;
      margin-bottom: 4px !important;
    }
    
    .cover-prepared-contact {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 10pt !important;
      color: #2d3748 !important;
      margin-bottom: 2px !important;
    }
    
    /* Confidential badge */
    .cover-confidential-badge {
      display: inline-block !important;
      padding: 8px 24px !important;
      border: 2px solid #1a1a1a !important;
      margin-bottom: 16px !important;
    }
    
    .confidential-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 11pt !important;
      font-weight: 700 !important;
      color: #1a1a1a !important;
      letter-spacing: 3px !important;
    }
    
    .cover-client-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 10pt !important;
      color: #4a5568 !important;
      margin-bottom: 16px !important;
    }
    
    .cover-footer {
      text-align: center !important;
      padding-top: 24px !important;
      border-top: 1px solid #e2e8f0 !important;
      margin-top: auto !important;
    }
    
    .cover-company-info {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 9pt !important;
      color: #4a5568 !important;
      line-height: 1.6 !important;
      margin-top: 12px !important;
    }
    
    .cover-company-footer {
      font-weight: 600 !important;
      font-size: 10pt !important;
      color: #1a1a1a !important;
      margin-bottom: 4px !important;
    }
    
    /* Content pages */
    .report-content {
      padding: 72px 72px 100px 72px !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      background: #ffffff !important;
      position: relative !important;
    }
    
    .report-page-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding-bottom: 12px !important;
      border-bottom: 1px solid #cbd5e0 !important;
      margin-bottom: 32px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 9pt !important;
      color: #4a5568 !important;
    }
    
    .report-page-footer {
      position: absolute !important;
      bottom: 48px !important;
      left: 72px !important;
      right: 72px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding-top: 12px !important;
      border-top: 1px solid #cbd5e0 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 8pt !important;
      color: #718096 !important;
    }
    
    /* Section styling */
    .report-section {
      margin-bottom: 32px !important;
    }
    
    .report-section:last-child {
      margin-bottom: 0 !important;
    }
    
    .section-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 16pt !important;
      font-weight: 600 !important;
      color: #1a1a1a !important;
      margin-bottom: 20px !important;
      padding-bottom: 10px !important;
      border-bottom: 2px solid #e2e8f0 !important;
    }
    
    .section-content {
      font-size: 11pt !important;
      line-height: 1.7 !important;
      color: #1a1a1a !important;
    }

    /* Force readable content even if template HTML contains muted/opacity classes */
    .section-content,
    .section-content * {
      color: #1a1a1a !important;
      opacity: 1 !important;
    }

    .section-content a {
      color: #1a365d !important;
      text-decoration: underline !important;
    }

    .section-content p {
      margin-bottom: 12px !important;
      text-align: justify !important;
      color: #1a1a1a !important;
    }

    .section-content p:last-child {
      margin-bottom: 0 !important;
    }
    /* Table styling */
    .section-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 10pt !important;
      margin: 16px 0 !important;
    }
    
    .section-table th,
    .section-table td {
      padding: 10px 12px !important;
      text-align: left !important;
      border-bottom: 1px solid #e2e8f0 !important;
      vertical-align: top !important;
      color: #1a1a1a !important;
    }
    
    .section-table th {
      background: #f7fafc !important;
      font-weight: 600 !important;
      color: #4a5568 !important;
    }
    
    .table-label {
      font-weight: 600 !important;
      color: #4a5568 !important;
      width: 180px !important;
    }
    
    .table-value {
      color: #1a1a1a !important;
    }
    
    /* Entry/update styling */
    .entry-item {
      margin-bottom: 24px !important;
      padding-bottom: 20px !important;
      border-bottom: 1px solid #edf2f7 !important;
    }
    
    .entry-item:last-child {
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
      border-bottom: none !important;
    }
    
    .entry-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: baseline !important;
      margin-bottom: 12px !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
    }
    
    .entry-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 12pt !important;
      font-weight: 600 !important;
      color: #1a1a1a !important;
    }
    
    .entry-meta {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 9pt !important;
      color: #4a5568 !important;
    }
    
    .entry-content {
      font-size: 11pt !important;
      line-height: 1.7 !important;
      color: #2d3748 !important;
      margin-top: 8px !important;
    }

    /* Force readable rich-text content (remove accidental low opacity / muted colors) */
    .entry-content,
    .entry-content * {
      color: #2d3748 !important;
      opacity: 1 !important;
    }

    .entry-content a {
      color: #1a365d !important;
      text-decoration: underline !important;
    }

    .entry-content p {
      margin-bottom: 8px !important;
      color: #2d3748 !important;
    }

    .entry-content p:last-child {
      margin-bottom: 0 !important;
    }
    .entry-attribution {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 9pt !important;
      color: #4a5568 !important;
      font-style: italic !important;
      margin-top: 8px !important;
    }
    
    .text-muted {
      color: #4a5568 !important;
    }
    
    .preview-page-break {
      display: none !important;
    }
    
    .section-placeholder {
      background: #f7fafc !important;
      border: 2px dashed #cbd5e0 !important;
      border-radius: 8px !important;
      padding: 24px !important;
      text-align: center !important;
    }
    
    .placeholder-text {
      color: #718096 !important;
      font-style: italic !important;
      font-size: 13px !important;
      margin: 0 !important;
    }
    
    [data-section-highlighted="true"] {
      outline: 3px solid #3182ce !important;
      outline-offset: 4px !important;
      border-radius: 4px !important;
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
  customizations: Map<string, SectionCustomization>,
  coverPageConfig?: CoverPageConfig,
  subjectFilterConfig?: SubjectFilterConfig
): TemplateCustomization {
  return {
    templateId,
    sectionCustomizations: Array.from(customizations.values()),
    coverPageConfig,
    subjectFilterConfig,
  };
}
