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
  HeaderFooterConfig,
} from "@/lib/reportTemplates";
import { CaseUpdate, CaseEvent, UserProfile, RenderedSection } from "@/lib/reportEngine";
import {
  renderStaticTextSection,
  renderVariableBlockSection,
  renderUpdateCollectionSection,
  renderEventCollectionSection,
  renderCoverPage,
  renderReportHeader,
  renderReportFooter,
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
  hasContent: boolean;  // Whether section rendered actual content (not empty state)
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

    // Determine if section has actual content (not empty state)
    const hasActualContent = rendered 
      ? !rendered.htmlContent.includes('section-empty-state') && 
        !rendered.sourceData?.isEmpty
      : false;

    sectionPreviews.push({
      sectionId: section.id,
      title: section.title,
      sectionType: section.sectionType,
      isVisible: section.isVisible,
      hasContent: section.isVisible && hasActualContent,
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
    caseVariables,
    generatedAt,
    customization?.headerFooterConfig
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
  // Return empty string for hidden sections - no placeholder in output
  return '';
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
  caseVariables: CaseVariables | null,
  generatedAt: Date,
  headerFooterConfig?: HeaderFooterConfig
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

  // Use configurable header/footer renderers for live preview
  const headerHtml = renderReportHeader(orgProfile, caseVariables, title, generatedAt, headerFooterConfig);
  const footerHtml = renderReportFooter(orgProfile, generatedAt, 'PREVIEW', headerFooterConfig);

  // Assemble HTML matching export structure exactly
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

/**
 * Build a TemplateCustomization object from customization map
 */
export function buildCustomization(
  templateId: string,
  customizations: Map<string, SectionCustomization>,
  coverPageConfig?: CoverPageConfig,
  subjectFilterConfig?: SubjectFilterConfig,
  headerFooterConfig?: HeaderFooterConfig
): TemplateCustomization {
  return {
    templateId,
    sectionCustomizations: Array.from(customizations.values()),
    coverPageConfig,
    subjectFilterConfig,
    headerFooterConfig,
  };
}
