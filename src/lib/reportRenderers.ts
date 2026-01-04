import { format } from "date-fns";
import {
  TemplateSection,
  VariableBlockConfig,
  CollectionConfig,
  getUpdateQueryParams,
  getEventQueryParams,
  AVAILABLE_CASE_VARIABLES,
} from "@/lib/reportTemplates";
import { OrganizationProfile } from "@/lib/organizationProfile";
import { CaseVariables, formatCaseVariablesForTemplate } from "@/lib/caseVariables";
import type { RenderedSection, CaseUpdate, CaseEvent, UserProfile } from "@/lib/reportEngine";

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
  
  // Replace organization placeholders
  if (orgProfile) {
    const logoHtml = orgProfile.logoUrl 
      ? `<img src="${orgProfile.logoUrl}" alt="${orgProfile.companyName || 'Company'} Logo" />`
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

  const htmlContent = `
    <h2>${escapeHtml(section.title)}</h2>
    <div class="static-content">${content}</div>
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
 * Render a case variable block section
 */
export function renderVariableBlockSection(
  section: TemplateSection,
  caseVariables: CaseVariables | null
): RenderedSection {
  const config = section.variableConfig;
  const variableKeys = config?.variables || [];
  const layout = config?.layout || 'table';
  const showLabels = config?.showLabels !== false;

  const vars = caseVariables ? formatCaseVariablesForTemplate(caseVariables) : {};
  const variableMeta = AVAILABLE_CASE_VARIABLES.reduce((acc, v) => {
    acc[v.key] = v.label;
    return acc;
  }, {} as Record<string, string>);

  let contentHtml = '';

  switch (layout) {
    case 'table':
      contentHtml = `
        <table class="variable-table">
          <tbody>
            ${variableKeys.map(key => `
              <tr>
                ${showLabels ? `<td>${escapeHtml(variableMeta[key] || key)}</td>` : ''}
                <td>${escapeHtml(vars[key] || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      break;

    case 'list':
      contentHtml = `
        <ul class="variable-list">
          ${variableKeys.map(key => `
            <li>
              ${showLabels ? `<strong>${escapeHtml(variableMeta[key] || key)}:</strong> ` : ''}
              ${escapeHtml(vars[key] || '')}
            </li>
          `).join('')}
        </ul>
      `;
      break;

    case 'inline':
      contentHtml = `
        <div class="variable-inline">
          ${variableKeys.map(key => `
            <span class="variable-item">
              ${showLabels ? `<span class="variable-label">${escapeHtml(variableMeta[key] || key)}:</span>` : ''}
              <span class="variable-value">${escapeHtml(vars[key] || '')}</span>
            </span>
          `).join('')}
        </div>
      `;
      break;
  }

  const htmlContent = `
    <h2>${escapeHtml(section.title)}</h2>
    ${contentHtml}
  `;

  return {
    id: section.id,
    title: section.title,
    sectionType: section.sectionType,
    displayOrder: section.displayOrder,
    htmlContent,
    sourceData: { variables: variableKeys },
  };
}

// ============= Update Collection Renderer =============

/**
 * Render an update collection section
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
        
        return `
          <div class="update-item">
            <div class="update-header">${escapeHtml(update.title)}</div>
            <div class="update-meta">
              ${escapeHtml(dateStr)} | ${escapeHtml(update.update_type)} | By: ${escapeHtml(author)}
            </div>
            ${update.description ? `<div class="update-content">${escapeHtml(update.description)}</div>` : ''}
          </div>
        `;
      }).join('')
    : '<p class="no-data">No updates available for this section.</p>';

  const htmlContent = `
    <h2>${escapeHtml(section.title)}</h2>
    ${updatesHtml}
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
 * Render an event collection section
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
    eventsHtml = '<p class="no-data">No events available for this section.</p>';
  } else if (groupBy === 'none') {
    // Chronological list
    eventsHtml = filteredEvents.map(event => 
      renderEventItem(event, userProfiles, displayConfig)
    ).join('');
  } else {
    // Grouped rendering
    const groups = groupEvents(filteredEvents, groupBy);
    eventsHtml = Object.entries(groups)
      .map(([groupKey, groupEvents]) => `
        <div class="event-group">
          <div class="event-group-header">${escapeHtml(groupKey)}</div>
          ${groupEvents.map(event => renderEventItem(event, userProfiles, displayConfig)).join('')}
        </div>
      `)
      .join('');
  }

  const htmlContent = `
    <h2>${escapeHtml(section.title)}</h2>
    ${eventsHtml}
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

  const metaParts: string[] = [];
  if (timeStr) metaParts.push(timeStr);
  if (event.event_subtype) metaParts.push(event.event_subtype);
  if (showStatus && event.status) metaParts.push(`Status: ${event.status}`);
  if (assignee) metaParts.push(`Assigned: ${assignee}`);

  return `
    <div class="event-item">
      <div class="event-title">${escapeHtml(event.title)}</div>
      ${metaParts.length > 0 ? `<div class="event-meta">${escapeHtml(metaParts.join(' | '))}</div>` : ''}
      ${showDescription && event.description ? `<div class="event-description">${escapeHtml(event.description)}</div>` : ''}
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
