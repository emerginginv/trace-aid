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
    referenceNumber: 'REF-2026-001',
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

  // Preview-specific styles for multi-page layout - professional document appearance
  const previewStyles = `
    /* ========================================
       BASE DOCUMENT STYLING
       ======================================== */
    .report-document {
      font-family: Georgia, 'Times New Roman', Times, serif !important;
      font-size: 11pt !important;
      line-height: 1.65 !important;
      color: #1a1a1a !important;
      background: #ffffff !important;
      -webkit-font-smoothing: antialiased !important;
      text-rendering: optimizeLegibility !important;
    }
    
    /* ========================================
       COVER PAGE - PROFESSIONAL LAYOUT
       ======================================== */
    .report-cover-page {
      width: 100% !important;
      height: 100% !important;
      min-height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      padding: 72px !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
    }
    
    .cover-header {
      flex-shrink: 0 !important;
      text-align: center !important;
      margin-bottom: 0 !important;
    }
    
    /* Logo styling */
    .report-document .cover-logo,
    .cover-logo {
      max-width: 160px !important;
      max-height: 80px !important;
      width: auto !important;
      height: auto !important;
      display: block !important;
      margin: 0 auto 12px auto !important;
      object-fit: contain !important;
    }
    
    .cover-logo-placeholder {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 18pt !important;
      font-weight: 700 !important;
      color: #1e3a5f !important;
      letter-spacing: 0.5px !important;
    }
    
    .cover-company-name {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 13pt !important;
      font-weight: 600 !important;
      color: #1e3a5f !important;
      margin-top: 6px !important;
      letter-spacing: 0.3px !important;
    }
    
    .cover-title-block {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
      padding: 48px 0 !important;
      margin: 0 !important;
    }
    
    .cover-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 42pt !important;
      font-weight: 700 !important;
      color: #1e3a5f !important;
      letter-spacing: 3px !important;
      line-height: 1.15 !important;
      margin: 0 !important;
      text-transform: uppercase !important;
    }
    
    .cover-subtitle {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14pt !important;
      font-weight: 500 !important;
      color: #4a5568 !important;
      margin-top: 16px !important;
      letter-spacing: 0.5px !important;
    }
    
    .cover-divider {
      width: 80px !important;
      height: 3px !important;
      background: #1e3a5f !important;
      margin: 24px auto !important;
    }
    
    /* Cover metadata table */
    .cover-meta-block {
      flex-shrink: 0 !important;
      margin: 32px auto !important;
      max-width: 400px !important;
      width: 100% !important;
    }
    
    .cover-meta-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 10.5pt !important;
    }
    
    .cover-meta-table tr {
      border-bottom: 1px solid #e2e8f0 !important;
    }
    
    .cover-meta-table tr:last-child {
      border-bottom: none !important;
    }
    
    .cover-meta-table td {
      padding: 10px 0 !important;
      vertical-align: top !important;
    }
    
    .cover-meta-table .meta-label {
      font-weight: 600 !important;
      color: #64748b !important;
      width: 140px !important;
      text-align: left !important;
      text-transform: uppercase !important;
      font-size: 9pt !important;
      letter-spacing: 0.5px !important;
    }
    
    .cover-meta-table .meta-value {
      color: #1e293b !important;
      font-weight: 500 !important;
      text-align: left !important;
    }
    
    /* Prepared by section */
    .cover-prepared-section {
      flex-shrink: 0 !important;
      margin: 32px 0 !important;
      padding-top: 24px !important;
      border-top: 1px solid #e2e8f0 !important;
      text-align: left !important;
    }
    
    .cover-prepared-label {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 9pt !important;
      color: #64748b !important;
      margin-bottom: 6px !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      font-weight: 600 !important;
    }
    
    .cover-prepared-name {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14pt !important;
      font-weight: 600 !important;
      color: #1e293b !important;
      margin-bottom: 4px !important;
    }
    
    .cover-prepared-contact {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 10pt !important;
      color: #475569 !important;
      margin-bottom: 2px !important;
    }
    
    /* Confidential badge */
    .cover-confidential-badge {
      display: inline-block !important;
      padding: 8px 24px !important;
      border: 2px solid #1e3a5f !important;
      margin-bottom: 16px !important;
    }
    
    .confidential-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 10pt !important;
      font-weight: 700 !important;
      color: #1e3a5f !important;
      letter-spacing: 2.5px !important;
    }
    
    .cover-client-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 10pt !important;
      color: #64748b !important;
      margin-bottom: 16px !important;
    }
    
    .cover-footer {
      flex-shrink: 0 !important;
      text-align: center !important;
      padding-top: 24px !important;
      border-top: 1px solid #e2e8f0 !important;
      margin-top: auto !important;
    }
    
    .cover-company-info {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 9pt !important;
      color: #64748b !important;
      line-height: 1.5 !important;
      margin-top: 10px !important;
    }
    
    .cover-company-footer {
      font-weight: 600 !important;
      font-size: 10pt !important;
      color: #1e3a5f !important;
      margin-bottom: 4px !important;
    }
    
    /* ========================================
       CONTENT PAGES
       ======================================== */
    .report-content {
      padding: 60px 72px 90px 72px !important;
      min-height: 100% !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
      position: relative !important;
    }
    
    /* Running header */
    .report-page-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding-bottom: 10px !important;
      border-bottom: 1px solid #cbd5e1 !important;
      margin-bottom: 28px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 9pt !important;
      color: #64748b !important;
    }
    
    .header-company {
      font-weight: 600 !important;
    }
    
    .header-case {
      font-weight: 500 !important;
    }
    
    /* Running footer */
    .report-page-footer {
      position: absolute !important;
      bottom: 40px !important;
      left: 72px !important;
      right: 72px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding-top: 10px !important;
      border-top: 1px solid #e2e8f0 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 8pt !important;
      color: #94a3b8 !important;
    }
    
    .footer-confidential {
      font-weight: 600 !important;
      letter-spacing: 1px !important;
      color: #64748b !important;
    }
    
    /* ========================================
       SECTION STYLING
       ======================================== */
    .report-section {
      margin-bottom: 28px !important;
    }
    
    .report-section:last-child {
      margin-bottom: 0 !important;
    }
    
    /* Section titles - strong visual hierarchy */
    .section-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14pt !important;
      font-weight: 700 !important;
      color: #1e3a5f !important;
      margin-bottom: 16px !important;
      padding-bottom: 8px !important;
      border-bottom: 2px solid #1e3a5f !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    
    .section-content {
      font-size: 11pt !important;
      line-height: 1.7 !important;
      color: #1e293b !important;
    }

    /* Ensure readable content */
    .section-content,
    .section-content * {
      color: #1e293b !important;
      opacity: 1 !important;
    }

    .section-content a {
      color: #1e3a5f !important;
      text-decoration: underline !important;
    }

    .section-content p {
      margin-bottom: 10px !important;
      text-align: justify !important;
      text-justify: inter-word !important;
      color: #1e293b !important;
    }

    .section-content p:last-child {
      margin-bottom: 0 !important;
    }
    
    /* ========================================
       TABLE STYLING (Variable Blocks)
       ======================================== */
    .section-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 10.5pt !important;
      margin: 12px 0 20px 0 !important;
    }
    
    .section-table th,
    .section-table td {
      padding: 10px 14px !important;
      text-align: left !important;
      vertical-align: top !important;
      color: #1e293b !important;
    }
    
    .section-table tr {
      border-bottom: 1px solid #e2e8f0 !important;
    }
    
    .section-table tr:last-child {
      border-bottom: none !important;
    }
    
    .section-table th {
      background: #f8fafc !important;
      font-weight: 600 !important;
      color: #475569 !important;
      font-size: 9pt !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    
    .table-label {
      font-weight: 600 !important;
      color: #64748b !important;
      width: 170px !important;
      font-size: 10pt !important;
      padding-right: 16px !important;
    }
    
    .table-value {
      color: #1e293b !important;
      font-weight: 500 !important;
    }
    
    /* ========================================
       ENTRY/UPDATE STYLING
       ======================================== */
    .entry-item {
      margin-bottom: 20px !important;
      padding: 16px 18px !important;
      background: #f8fafc !important;
      border-radius: 6px !important;
      border-left: 3px solid #1e3a5f !important;
    }
    
    .entry-item:last-child {
      margin-bottom: 0 !important;
    }
    
    .entry-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: baseline !important;
      margin-bottom: 10px !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
    }
    
    .entry-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 11pt !important;
      font-weight: 600 !important;
      color: #1e293b !important;
    }
    
    .entry-meta {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 9pt !important;
      color: #64748b !important;
    }
    
    .entry-content {
      font-size: 10.5pt !important;
      line-height: 1.65 !important;
      color: #374151 !important;
      margin-top: 8px !important;
    }

    /* Readable rich-text content */
    .entry-content,
    .entry-content * {
      color: #374151 !important;
      opacity: 1 !important;
    }

    .entry-content a {
      color: #1e3a5f !important;
      text-decoration: underline !important;
    }

    .entry-content p {
      margin-bottom: 8px !important;
      color: #374151 !important;
    }

    .entry-content p:last-child {
      margin-bottom: 0 !important;
    }
    
    .entry-attribution {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 9pt !important;
      color: #64748b !important;
      font-style: italic !important;
      margin-top: 10px !important;
      padding-top: 8px !important;
      border-top: 1px solid #e2e8f0 !important;
    }
    
    .text-muted {
      color: #64748b !important;
    }
    
    /* ========================================
       PAGE BREAK & PLACEHOLDERS
       ======================================== */
    .preview-page-break {
      display: none !important;
    }
    
    .section-placeholder {
      background: #f8fafc !important;
      border: 1px dashed #cbd5e1 !important;
      border-radius: 6px !important;
      padding: 20px !important;
      text-align: center !important;
    }
    
    .placeholder-text {
      color: #94a3b8 !important;
      font-style: italic !important;
      font-size: 10pt !important;
      margin: 0 !important;
    }
    
    /* ========================================
       SECTION HIGHLIGHT (for customizer)
       ======================================== */
    [data-section-highlighted="true"] {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 6px !important;
      border-radius: 4px !important;
      background: rgba(59, 130, 246, 0.03) !important;
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
