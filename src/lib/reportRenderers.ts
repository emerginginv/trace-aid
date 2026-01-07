import { format } from "date-fns";
import {
  TemplateSection,
  VariableBlockConfig,
  CollectionConfig,
  getUpdateQueryParams,
  getEventQueryParams,
  AVAILABLE_CASE_VARIABLES,
  CoverPageConfig,
  getDefaultCoverPageConfig,
  SubjectFilterConfig,
  HeaderFooterConfig,
  getDefaultHeaderFooterConfig,
} from "@/lib/reportTemplates";
import { OrganizationProfile } from "@/lib/organizationProfile";
import { CaseVariables, formatCaseVariablesForTemplate, formatCaseVariablesForTemplateWithFilters } from "@/lib/caseVariables";
import type { RenderedSection, CaseUpdate, CaseEvent, UserProfile } from "@/lib/reportEngine";
import { formatReportDate } from "@/lib/reportStyles";

// ============= Cover Page Generator =============

/**
 * Generate a professional branded cover page
 */
export function renderCoverPage(
  orgProfile: OrganizationProfile | null,
  caseVariables: CaseVariables | null,
  reportTitle: string,
  generatedAt: Date,
  clientName?: string,
  coverPageConfig?: CoverPageConfig
): string {
  const config = coverPageConfig || getDefaultCoverPageConfig();
  const companyName = orgProfile?.companyName || 'Investigation Services';
  
  // Logo with inline styles to guarantee sizing
  const logoHtml = orgProfile?.logoUrl 
    ? `<img src="${orgProfile.logoUrl}" alt="${companyName}" class="cover-logo" 
        style="max-width: 150px; max-height: 80px; width: auto; height: auto; display: block; margin: 0 auto; object-fit: contain;" />`
    : `<div class="cover-logo-placeholder">${escapeHtml(companyName)}</div>`;
  
  // Address formatting
  const addressParts: string[] = [];
  if (orgProfile?.streetAddress) addressParts.push(orgProfile.streetAddress);
  const cityStateZip = [
    orgProfile?.city,
    orgProfile?.state,
    orgProfile?.zipCode
  ].filter(Boolean).join(', ');
  if (cityStateZip) addressParts.push(cityStateZip);
  
  // Contact information
  const contactParts: string[] = [];
  if (orgProfile?.phone) contactParts.push(orgProfile.phone);
  if (orgProfile?.email) contactParts.push(orgProfile.email);
  if (orgProfile?.websiteUrl) contactParts.push(orgProfile.websiteUrl);

  const caseInfo = caseVariables ? formatCaseVariablesForTemplate(caseVariables) : {};
  const investigatorName = caseVariables?.investigatorList || null;
  
  // Determine if company name should be shown
  // Only show company name if: no logo exists OR showCompanyNameWithLogo is true
  const hasLogo = !!orgProfile?.logoUrl;
  const showCompanyName = !hasLogo || config.showCompanyNameWithLogo;

  // CRITICAL: Include inline styles as fallback for html2canvas capture
  return `
    <div class="report-cover-page" style="background: #ffffff; min-height: 11in; padding: 72px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
      <div class="cover-header" style="text-align: center; margin-bottom: 24px;">
        ${logoHtml}
        ${showCompanyName ? `<p class="cover-company-name" style="font-size: 14pt; font-weight: 600; color: #1a1a1a; margin-top: 8px; letter-spacing: 0.5px;">${escapeHtml(companyName)}</p>` : ''}
      </div>
      
      <div class="cover-title-block" style="text-align: center; margin: 48px 0; flex: 1; display: flex; flex-direction: column; justify-content: center;">
        <h1 class="cover-title" style="font-size: 42pt; font-weight: 700; color: #1a1a1a; letter-spacing: 4px; line-height: 1.1; margin: 0;">INVESTIGATION</h1>
        <h1 class="cover-title" style="font-size: 42pt; font-weight: 700; color: #1a1a1a; letter-spacing: 4px; line-height: 1.1; margin: 0;">REPORT</h1>
        <div class="cover-divider" style="width: 80px; height: 4px; background: #1a1a1a; margin: 24px auto;"></div>
        <p class="cover-subtitle" style="font-size: 14pt; font-weight: 500; color: #2d3748; margin-top: 16px;">${escapeHtml(reportTitle)}</p>
      </div>
      
      <div class="cover-meta-block" style="margin: 32px auto; max-width: 400px;">
        <table class="cover-meta-table" style="width: 100%; border-collapse: collapse; font-size: 11pt;">
          ${caseInfo.case_number ? `<tr style="border-bottom: 1px solid #e2e8f0;"><td class="meta-label" style="font-weight: 600; color: #4a5568; width: 140px; text-align: left; padding: 10px 0;">Case Reference:</td><td class="meta-value" style="color: #1a1a1a; font-weight: 500; text-align: left; padding: 10px 0;">${escapeHtml(caseInfo.case_number)}</td></tr>` : ''}
          <tr style="border-bottom: 1px solid #e2e8f0;"><td class="meta-label" style="font-weight: 600; color: #4a5568; width: 140px; text-align: left; padding: 10px 0;">Date:</td><td class="meta-value" style="color: #1a1a1a; font-weight: 500; text-align: left; padding: 10px 0;">${formatReportDate(generatedAt)}</td></tr>
          ${investigatorName ? `<tr style="border-bottom: 1px solid #e2e8f0;"><td class="meta-label" style="font-weight: 600; color: #4a5568; width: 140px; text-align: left; padding: 10px 0;">Investigator:</td><td class="meta-value" style="color: #1a1a1a; font-weight: 500; text-align: left; padding: 10px 0;">${escapeHtml(investigatorName)}</td></tr>` : ''}
        </table>
      </div>
      
      ${config.showPreparedBy ? `
      <div class="cover-prepared-section" style="margin: 32px 0; text-align: left;">
        <p class="cover-prepared-label" style="font-size: 10pt; color: #4a5568; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Prepared by:</p>
        ${investigatorName ? `<p class="cover-prepared-name" style="font-size: 14pt; font-weight: 600; color: #1a1a1a; margin-bottom: 4px;">${escapeHtml(investigatorName)}</p>` : `<p class="cover-prepared-name" style="font-size: 14pt; font-weight: 600; color: #1a1a1a; margin-bottom: 4px;">${escapeHtml(companyName)}</p>`}
        ${orgProfile?.email ? `<p class="cover-prepared-contact" style="font-size: 10pt; color: #2d3748; margin-bottom: 2px;">${escapeHtml(orgProfile.email)}</p>` : ''}
        ${contactParts.length > 0 ? `<p class="cover-prepared-contact" style="font-size: 10pt; color: #2d3748; margin-bottom: 2px;">${escapeHtml(contactParts.join(' | '))}</p>` : ''}
      </div>
      ` : ''}
      
      <div class="cover-footer" style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0; margin-top: auto;">
        <div class="cover-confidential-badge" style="display: inline-block; padding: 8px 24px; border: 2px solid #1a1a1a; margin-bottom: 16px;">
          <span class="confidential-text" style="font-size: 11pt; font-weight: 700; color: #1a1a1a; letter-spacing: 3px;">CONFIDENTIAL</span>
        </div>
        ${clientName ? `<p class="cover-client-text" style="font-size: 10pt; color: #4a5568; margin-bottom: 16px;">Prepared for: ${escapeHtml(clientName)}</p>` : ''}
        <div class="cover-company-info" style="font-size: 9pt; color: #4a5568; line-height: 1.6; margin-top: 12px;">
          <p class="cover-company-footer" style="font-weight: 600; font-size: 10pt; color: #1a1a1a; margin-bottom: 4px;">${escapeHtml(companyName)}</p>
          ${addressParts.map(line => `<p style="margin: 0;">${escapeHtml(line)}</p>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ============= Static Text Renderer =============

/**
 * Render a static text section with placeholder replacements
 */
export function renderStaticTextSection(
  section: TemplateSection,
  orgProfile: OrganizationProfile | null,
  caseVariables: CaseVariables | null
): RenderedSection {
  let content = section.content || '';
  
  // Check if section has no content defined
  if (!content.trim()) {
    const htmlContent = `
      <h2 class="section-title">${escapeHtml(section.title)}</h2>
      <div class="section-content">
        <div class="section-empty-state">
          <p class="empty-state-message">No content defined for this section.</p>
        </div>
      </div>
    `;
    return {
      id: section.id,
      title: section.title,
      sectionType: section.sectionType,
      displayOrder: section.displayOrder,
      htmlContent,
      sourceData: { isEmpty: true },
    };
  }
  
  // Replace organization placeholders
  if (orgProfile) {
    const logoHtml = orgProfile.logoUrl 
      ? `<img src="${orgProfile.logoUrl}" alt="${orgProfile.companyName || 'Company'} Logo" class="section-logo" />`
      : '';
    
    content = content
      .replace(/\{\{company_name\}\}/g, orgProfile.companyName || '')
      .replace(/\{\{company_logo\}\}/g, logoHtml)
      .replace(/\{\{company_address\}\}/g, orgProfile.fullAddress || '')
      .replace(/\{\{company_street\}\}/g, orgProfile.streetAddress || '')
      .replace(/\{\{company_city\}\}/g, orgProfile.city || '')
      .replace(/\{\{company_state\}\}/g, orgProfile.state || '')
      .replace(/\{\{company_zip\}\}/g, orgProfile.zipCode || '')
      .replace(/\{\{company_phone\}\}/g, orgProfile.phone || '')
      .replace(/\{\{company_email\}\}/g, orgProfile.email || '')
      .replace(/\{\{company_website\}\}/g, orgProfile.websiteUrl || '');
  }

  // Replace case variable placeholders
  if (caseVariables) {
    const vars = formatCaseVariablesForTemplate(caseVariables);
    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value || '');
    });
  }

  // Replace current date
  content = content.replace(/\{\{current_date\}\}/g, format(new Date(), 'MMMM d, yyyy'));

  // Wrap paragraphs properly
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  const wrappedContent = paragraphs.length > 1 
    ? paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n')
    : content;

  const htmlContent = `
    <h2 class="section-title">${escapeHtml(section.title)}</h2>
    <div class="section-content">${wrappedContent}</div>
  `;

  return {
    id: section.id,
    title: section.title,
    sectionType: section.sectionType,
    displayOrder: section.displayOrder,
    htmlContent,
    sourceData: {},
  };
}

// ============= Variable Block Renderer =============

/**
 * Render a case variable block section with professional styling
 */
export function renderVariableBlockSection(
  section: TemplateSection,
  caseVariables: CaseVariables | null,
  subjectFilterConfig?: SubjectFilterConfig
): RenderedSection {
  const config = section.variableConfig;
  const variableKeys = config?.variables || [];
  const layout = config?.layout || 'table';
  const showLabels = config?.showLabels !== false;

  // Use filtered variables if subject filter config is provided
  const vars = caseVariables 
    ? formatCaseVariablesForTemplateWithFilters(caseVariables, subjectFilterConfig) 
    : {};
  const variableMeta = AVAILABLE_CASE_VARIABLES.reduce((acc, v) => {
    acc[v.key] = v.label;
    return acc;
  }, {} as Record<string, string>);

  // Variables that contain pre-formatted HTML (lists generated by formatAsHtmlList)
  const htmlVariables = ['subject_list', 'client_list', 'investigator_list', 'location_list'];
  
  // Helper to check if a value is empty/placeholder
  const isEmptyValue = (value: string | undefined | null): boolean => {
    if (!value) return true;
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '—' || trimmed === '-') return true;
    if (trimmed === 'None' || trimmed === 'Not assigned' || trimmed === 'N/A') return true;
    return false;
  };

  // Filter to only variables that have actual values
  const variablesWithValues = variableKeys.filter(key => !isEmptyValue(vars[key]));
  
  // Helper to render variable value - skip escaping for HTML variables
  const renderValue = (key: string): string => {
    const value = vars[key] || '—';
    return htmlVariables.includes(key) ? value : escapeHtml(value);
  };

  let contentHtml = '';

  // If no variables have values, show empty state message
  if (variablesWithValues.length === 0) {
    contentHtml = `
      <div class="section-empty-state">
        <p class="empty-state-message">No case variable data available for this section.</p>
      </div>
    `;
  } else {
    switch (layout) {
      case 'table':
        contentHtml = `
          <table class="section-table section-table-striped">
            <tbody>
              ${variablesWithValues.map(key => `
                <tr>
                  ${showLabels ? `<td class="table-label">${escapeHtml(variableMeta[key] || key)}</td>` : ''}
                  <td class="table-value">${renderValue(key)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        break;

      case 'list':
        contentHtml = `
          <ul class="variable-list">
            ${variablesWithValues.map(key => `
              <li>
                ${showLabels ? `<span class="text-emphasis">${escapeHtml(variableMeta[key] || key)}:</span> ` : ''}
                ${renderValue(key)}
              </li>
            `).join('')}
          </ul>
        `;
        break;

      case 'inline':
        contentHtml = `
          <div class="variable-inline">
            ${variablesWithValues.map(key => `
              <span class="variable-item">
                ${showLabels ? `<span class="variable-label">${escapeHtml(variableMeta[key] || key)}:</span>` : ''}
                <span class="variable-value">${renderValue(key)}</span>
              </span>
            `).join('')}
          </div>
        `;
        break;
    }
  }

  const htmlContent = `
    <h2 class="section-title">${escapeHtml(section.title)}</h2>
    <div class="section-content no-break">${contentHtml}</div>
  `;

  return {
    id: section.id,
    title: section.title,
    sectionType: section.sectionType,
    displayOrder: section.displayOrder,
    htmlContent,
    sourceData: { variables: variableKeys, isEmpty: variablesWithValues.length === 0 },
  };
}

// ============= Update Collection Renderer =============

/**
 * Render an update collection section with professional narrative styling
 */
export function renderUpdateCollectionSection(
  section: TemplateSection,
  updates: CaseUpdate[],
  renderedUpdateIds: Set<string>,
  userProfiles: Record<string, UserProfile>
): RenderedSection {
  const queryParams = getUpdateQueryParams(section);
  
  // Filter updates by type if specified
  let filteredUpdates = [...updates];
  
  if (queryParams?.updateTypes && queryParams.updateTypes.length > 0) {
    filteredUpdates = filteredUpdates.filter(u => 
      queryParams.updateTypes!.includes(u.update_type)
    );
  }

  // Filter out already-rendered updates if deduplication is enabled
  if (!queryParams?.allowDuplicates) {
    filteredUpdates = filteredUpdates.filter(u => !renderedUpdateIds.has(u.id));
  }

  // Sort by created_at
  filteredUpdates.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return queryParams?.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Apply limit if specified
  if (queryParams?.limit && queryParams.limit > 0) {
    filteredUpdates = filteredUpdates.slice(0, queryParams.limit);
  }

  const usedUpdateIds = filteredUpdates.map(u => u.id);

  const updatesHtml = filteredUpdates.length > 0
    ? filteredUpdates.map(update => {
        const author = userProfiles[update.user_id]?.full_name || 
                      userProfiles[update.user_id]?.email || 
                      'Unknown';
        const dateStr = formatDate(update.created_at);
        
        // Check if author should be shown (default to true for backwards compatibility)
        const showAuthor = section.collectionConfig?.showAuthor !== false;
        
        return `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-title">${escapeHtml(update.title)}</span>
              <span class="entry-meta">${escapeHtml(dateStr)}</span>
            </div>
            ${update.description ? `<div class="entry-content">${update.description}</div>` : ''}
            ${showAuthor ? `<div class="entry-attribution">— ${escapeHtml(author)}</div>` : ''}
          </div>
        `;
      }).join('')
    : '<p class="text-muted">No updates available for this section.</p>';

  const htmlContent = `
    <h2 class="section-title">${escapeHtml(section.title)}</h2>
    <div class="section-content">${updatesHtml}</div>
  `;

  return {
    id: section.id,
    title: section.title,
    sectionType: section.sectionType,
    displayOrder: section.displayOrder,
    htmlContent,
    sourceData: { updateIds: usedUpdateIds },
  };
}

// ============= Event Collection Renderer =============

/**
 * Render an event collection section with professional styling
 */
export function renderEventCollectionSection(
  section: TemplateSection,
  events: CaseEvent[],
  renderedEventIds: Set<string>,
  userProfiles: Record<string, UserProfile>
): RenderedSection {
  const queryParams = getEventQueryParams(section);
  const displayConfig = section.collectionConfig?.eventDisplayConfig;
  
  // Filter events by type if specified
  let filteredEvents = [...events];
  
  if (queryParams?.eventTypes && queryParams.eventTypes.length > 0) {
    filteredEvents = filteredEvents.filter(e => 
      e.event_subtype && queryParams.eventTypes!.includes(e.event_subtype)
    );
  }

  // Filter out already-rendered events if deduplication is enabled
  if (!queryParams?.allowDuplicates) {
    filteredEvents = filteredEvents.filter(e => !renderedEventIds.has(e.id));
  }

  // Sort by due_date
  filteredEvents.sort((a, b) => {
    const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
    const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
    return queryParams?.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Apply limit if specified
  if (queryParams?.limit && queryParams.limit > 0) {
    filteredEvents = filteredEvents.slice(0, queryParams.limit);
  }

  const usedEventIds = filteredEvents.map(e => e.id);
  const groupBy = queryParams?.groupBy || 'none';

  let eventsHtml = '';

  if (filteredEvents.length === 0) {
    eventsHtml = '<p class="text-muted">No events available for this section.</p>';
  } else if (groupBy === 'none') {
    // Chronological list
    eventsHtml = filteredEvents.map(event => 
      renderEventItem(event, userProfiles, displayConfig)
    ).join('');
  } else {
    // Grouped rendering with professional group headers
    const groups = groupEvents(filteredEvents, groupBy);
    eventsHtml = Object.entries(groups)
      .map(([groupKey, groupEvents]) => `
        <div class="entry-group">
          <h3 class="entry-group-header">${escapeHtml(groupKey)}</h3>
          ${groupEvents.map(event => renderEventItem(event, userProfiles, displayConfig)).join('')}
        </div>
      `)
      .join('');
  }

  const htmlContent = `
    <h2 class="section-title">${escapeHtml(section.title)}</h2>
    <div class="section-content">${eventsHtml}</div>
  `;

  return {
    id: section.id,
    title: section.title,
    sectionType: section.sectionType,
    displayOrder: section.displayOrder,
    htmlContent,
    sourceData: { eventIds: usedEventIds },
  };
}

// ============= Helper Functions =============

function renderEventItem(
  event: CaseEvent,
  userProfiles: Record<string, UserProfile>,
  displayConfig?: {
    showTime?: boolean;
    showAssignee?: boolean;
    showStatus?: boolean;
    showDescription?: boolean;
  }
): string {
  const showTime = displayConfig?.showTime !== false;
  const showAssignee = displayConfig?.showAssignee !== false;
  const showStatus = displayConfig?.showStatus !== false;
  const showDescription = displayConfig?.showDescription !== false;

  const timeStr = event.due_date && showTime ? formatDateTime(event.due_date) : '';
  const assignee = event.assigned_user_id && showAssignee
    ? userProfiles[event.assigned_user_id]?.full_name || 
      userProfiles[event.assigned_user_id]?.email || 
      'Unassigned'
    : '';

  return `
    <div class="entry-item">
      <div class="entry-header">
        <span class="entry-title">${escapeHtml(event.title)}</span>
        ${timeStr ? `<span class="entry-meta">${escapeHtml(timeStr)}</span>` : ''}
      </div>
      <div class="entry-meta">
        ${event.event_subtype ? `<span class="entry-type-badge">${escapeHtml(event.event_subtype)}</span>` : ''}
        ${showStatus && event.status ? `<span>Status: ${escapeHtml(event.status)}</span>` : ''}
      </div>
      ${showDescription && event.description ? `<div class="entry-content"><p>${escapeHtml(event.description)}</p></div>` : ''}
      ${assignee ? `<div class="entry-attribution">Assigned to: ${escapeHtml(assignee)}</div>` : ''}
    </div>
  `;
}

function groupEvents(
  events: CaseEvent[],
  groupBy: 'date' | 'type' | 'status'
): Record<string, CaseEvent[]> {
  const groups: Record<string, CaseEvent[]> = {};

  events.forEach(event => {
    let key: string;
    
    switch (groupBy) {
      case 'date':
        key = event.due_date ? format(new Date(event.due_date), 'MMMM d, yyyy') : 'No Date';
        break;
      case 'type':
        key = event.event_subtype || 'Other';
        break;
      case 'status':
        key = event.status || 'Unknown';
        break;
      default:
        key = 'All';
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(event);
  });

  return groups;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============= Running Header/Footer Renderers =============

/**
 * Render configurable running header for report pages
 */
export function renderReportHeader(
  orgProfile: OrganizationProfile | null,
  caseVariables: CaseVariables | null,
  reportTitle: string,
  generatedAt: Date,
  config?: HeaderFooterConfig
): string {
  const cfg = config || getDefaultHeaderFooterConfig();
  
  // Build header elements based on config
  const leftElements: string[] = [];
  const rightElements: string[] = [];
  
  // Left side: Organization info
  if (cfg.headerShowLogo && orgProfile?.logoUrl) {
    leftElements.push(`<img src="${orgProfile.logoUrl}" alt="Logo" class="running-header-logo" />`);
  }
  if (cfg.headerShowOrgName && orgProfile?.companyName) {
    leftElements.push(`<span class="running-header-org">${escapeHtml(orgProfile.companyName)}</span>`);
  }
  
  // Contact details (if any enabled)
  const contactParts: string[] = [];
  if (cfg.headerShowOrgPhone && orgProfile?.phone) {
    contactParts.push(escapeHtml(orgProfile.phone));
  }
  if (cfg.headerShowOrgEmail && orgProfile?.email) {
    contactParts.push(escapeHtml(orgProfile.email));
  }
  if (contactParts.length > 0) {
    leftElements.push(`<span class="running-header-contact">${contactParts.join(' | ')}</span>`);
  }
  
  if (cfg.headerShowOrgAddress && orgProfile?.fullAddress) {
    leftElements.push(`<span class="running-header-address">${escapeHtml(orgProfile.fullAddress)}</span>`);
  }
  
  // Right side: Report info
  if (cfg.headerShowReportTitle) {
    rightElements.push(`<span class="running-header-title">${escapeHtml(reportTitle)}</span>`);
  }
  if (cfg.headerShowCaseNumber && caseVariables?.caseNumber) {
    rightElements.push(`<span class="running-header-case">Case #: ${escapeHtml(caseVariables.caseNumber)}</span>`);
  }
  if (cfg.headerShowReportDate) {
    rightElements.push(`<span class="running-header-date">${formatReportDate(generatedAt)}</span>`);
  }
  
  // If nothing to show, return empty
  if (leftElements.length === 0 && rightElements.length === 0) {
    return '';
  }
  
  return `
    <div class="report-running-header">
      <div class="running-header-left">
        ${leftElements.join('\n        ')}
      </div>
      <div class="running-header-right">
        ${rightElements.join('\n        ')}
      </div>
    </div>
  `;
}

/**
 * Render configurable running footer for report pages
 */
export function renderReportFooter(
  orgProfile: OrganizationProfile | null,
  generatedAt: Date,
  reportHash: string,
  config?: HeaderFooterConfig
): string {
  const cfg = config || getDefaultHeaderFooterConfig();
  
  const leftElements: string[] = [];
  const centerElements: string[] = [];
  const rightElements: string[] = [];
  
  // Left: Org info
  if (cfg.footerShowOrgName && orgProfile?.companyName) {
    leftElements.push(`<span class="running-footer-org">${escapeHtml(orgProfile.companyName)}</span>`);
  }
  if (cfg.footerShowWebsite && orgProfile?.websiteUrl) {
    leftElements.push(`<span class="running-footer-website">${escapeHtml(orgProfile.websiteUrl)}</span>`);
  }
  if (cfg.footerShowPhone && orgProfile?.phone) {
    leftElements.push(`<span class="running-footer-phone">${escapeHtml(orgProfile.phone)}</span>`);
  }
  
  // Center: Confidentiality notice
  if (cfg.footerShowConfidentiality && cfg.footerConfidentialityText) {
    // Truncate for footer display
    const notice = cfg.footerConfidentialityText.length > 60 
      ? 'CONFIDENTIAL' 
      : cfg.footerConfidentialityText;
    centerElements.push(`<span class="running-footer-confidential">${escapeHtml(notice)}</span>`);
  }
  
  // Right: Page/date info
  if (cfg.footerShowPageNumber) {
    rightElements.push(`<span class="running-footer-page">Page</span>`);
  }
  if (cfg.footerShowGeneratedDate) {
    rightElements.push(`<span class="running-footer-date">Generated: ${formatReportDate(generatedAt)}</span>`);
  }
  rightElements.push(`<span class="running-footer-id">Report ID: ${reportHash}</span>`);
  
  // If nothing to show except ID, return minimal footer
  if (leftElements.length === 0 && centerElements.length === 0 && rightElements.length <= 1) {
    return `
      <div class="report-running-footer">
        <span class="running-footer-id">Report ID: ${reportHash}</span>
      </div>
    `;
  }
  
  return `
    <div class="report-running-footer">
      <div class="running-footer-left">
        ${leftElements.join('\n        ')}
      </div>
      <div class="running-footer-center">
        ${centerElements.join('\n        ')}
      </div>
      <div class="running-footer-right">
        ${rightElements.join('\n        ')}
      </div>
    </div>
  `;
}
