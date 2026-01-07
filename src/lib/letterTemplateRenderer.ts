/**
 * Letter Template Renderer
 * 
 * Composes letter template sections into final HTML with:
 * - Data binding resolution
 * - Statutory language injection
 * - Print-CSS application
 */

import type { 
  LetterTemplate, 
  LetterSection, 
  LetterPrintConfig,
  StatutoryInjection,
  DataBinding,
} from './letterTemplates';
import type { OrganizationProfile } from './organizationProfile';
import type { CaseVariables } from './caseVariables';
import type { JurisdictionInfo } from './foiaStatutes';
import { PAGE_SPECS } from './paginatedLetterStyles';
import { format } from 'date-fns';

// ============================================
// DATA CONTEXT
// ============================================

/**
 * Context data for resolving bindings
 */
export interface LetterDataContext {
  organization?: OrganizationProfile | null;
  caseVariables?: CaseVariables | null;
  user?: {
    fullName?: string;
    title?: string;
    email?: string;
  };
  recipient?: {
    name?: string;
    title?: string;
    organization?: string;
    address?: string;
  };
  custom?: Record<string, string>;
}

// ============================================
// BINDING RESOLUTION
// ============================================

/**
 * Get a nested property from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, obj as unknown);
}

/**
 * Resolve a single binding placeholder
 */
function resolveBinding(
  binding: DataBinding,
  context: LetterDataContext
): string {
  let value: unknown;
  
  switch (binding.source) {
    case 'organization':
      value = context.organization 
        ? getNestedValue(context.organization as unknown as Record<string, unknown>, binding.sourceField)
        : undefined;
      break;
      
    case 'case':
      value = context.caseVariables
        ? getNestedValue(context.caseVariables as unknown as Record<string, unknown>, binding.sourceField)
        : undefined;
      break;
      
    case 'user':
      value = context.user
        ? getNestedValue(context.user as unknown as Record<string, unknown>, binding.sourceField)
        : undefined;
      break;
      
    case 'recipient':
      value = context.recipient
        ? getNestedValue(context.recipient as unknown as Record<string, unknown>, binding.sourceField)
        : undefined;
      break;
      
    case 'computed':
      value = resolveComputedBinding(binding.sourceField);
      break;
      
    case 'statutory':
      // Statutory bindings are resolved during injection
      value = undefined;
      break;
      
    default:
      value = context.custom?.[binding.sourceField];
  }
  
  // Return value or default or empty string
  if (value !== undefined && value !== null) {
    return String(value);
  }
  return binding.defaultValue ?? '';
}

/**
 * Resolve computed bindings
 */
function resolveComputedBinding(field: string): string {
  const now = new Date();
  
  switch (field) {
    case 'currentDate':
      return format(now, 'MMMM d, yyyy');
    case 'currentDateShort':
      return format(now, 'MM/dd/yyyy');
    case 'responseDeadline':
      // Default 30-day response deadline
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 30);
      return format(deadline, 'MMMM d, yyyy');
    default:
      return '';
  }
}

/**
 * Resolve all bindings in HTML content
 */
export function resolveBindings(
  html: string,
  bindings: DataBinding[],
  context: LetterDataContext
): string {
  let result = html;
  
  for (const binding of bindings) {
    const value = resolveBinding(binding, context);
    // Replace all occurrences of the placeholder
    result = result.split(binding.placeholder).join(value);
  }
  
  // Also resolve any standard placeholders that might not be in bindings
  result = result
    .replace(/\{\{current_date\}\}/g, format(new Date(), 'MMMM d, yyyy'))
    .replace(/\{\{current_date_short\}\}/g, format(new Date(), 'MM/dd/yyyy'));
  
  // Clean up unresolved conditional blocks
  result = result.replace(/\{\{#if [^}]+\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  
  // Clean up any remaining unresolved placeholders with empty string
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  
  return result;
}

// ============================================
// STATUTORY INJECTION
// ============================================

/**
 * Inject statutory language into sections
 */
export function injectStatutoryLanguage(
  sections: LetterSection[],
  injection: StatutoryInjection,
  jurisdiction: JurisdictionInfo
): LetterSection[] {
  const result = [...sections];
  
  // Find the body section
  const bodyIndex = result.findIndex(s => s.type === 'body');
  if (bodyIndex === -1) return result;
  
  // Find existing statutory section or create one
  let statutoryIndex = result.findIndex(s => s.type === 'statutory_block');
  
  // Build statutory content
  const statutoryParts: string[] = [];
  
  if (injection.sections.opening && jurisdiction.legalLanguage?.opening) {
    statutoryParts.push(`
      <p class="statutory-opening">${jurisdiction.legalLanguage.opening}</p>
    `);
  }
  
  if (injection.sections.feeWaiver && jurisdiction.legalLanguage?.feeWaiver) {
    statutoryParts.push(`
      <p class="statutory-fee-waiver">
        <strong>Fee Waiver Request:</strong> ${jurisdiction.legalLanguage.feeWaiver}
      </p>
    `);
  }
  
  if (injection.sections.expedited && jurisdiction.legalLanguage?.expedited) {
    statutoryParts.push(`
      <p class="statutory-expedited">
        <strong>Expedited Processing:</strong> ${jurisdiction.legalLanguage.expedited}
      </p>
    `);
  }
  
  if (injection.sections.closing && jurisdiction.legalLanguage?.closing) {
    statutoryParts.push(`
      <p class="statutory-closing">${jurisdiction.legalLanguage.closing}</p>
    `);
  }
  
  if (injection.sections.appeal && jurisdiction.legalLanguage?.appeal) {
    statutoryParts.push(`
      <p class="statutory-appeal">
        <strong>Appeal Rights:</strong> ${jurisdiction.legalLanguage.appeal}
      </p>
    `);
  }
  
  if (statutoryParts.length === 0) return result;
  
  const statutoryHtml = `
    <div class="statutory-language">
      ${statutoryParts.join('\n')}
    </div>
  `.trim();
  
  if (statutoryIndex !== -1) {
    // Update existing statutory section
    result[statutoryIndex] = {
      ...result[statutoryIndex],
      html: statutoryHtml,
    };
  } else {
    // Insert new statutory section after body
    const statutorySection: LetterSection = {
      id: `statutory-${Date.now()}`,
      type: 'statutory_block',
      displayOrder: bodyIndex + 0.5,
      html: statutoryHtml,
      isVisible: true,
      isLocked: true,
      isAiEditable: false,
      dataBindings: [],
      cssClass: 'statutory-block',
    };
    result.push(statutorySection);
  }
  
  return result.sort((a, b) => a.displayOrder - b.displayOrder);
}

// ============================================
// CSS GENERATION
// ============================================

/**
 * Generate print CSS from template configuration
 */
export function generatePrintCss(config: LetterPrintConfig): string {
  const pageSpec = PAGE_SPECS[config.pageSize];
  
  return `
    @page {
      size: ${pageSpec.width} ${pageSpec.height};
      margin: ${config.margins.top} ${config.margins.right} ${config.margins.bottom} ${config.margins.left};
    }
    
    .letter-content {
      font-family: ${config.fontFamily};
      font-size: ${config.fontSize};
      line-height: ${config.lineHeight};
      color: #000;
    }
    
    /* Avoid breaks in these elements */
    ${config.avoidBreakSelectors.map(selector => `
      ${selector} {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    `).join('\n')}
    
    /* Section spacing */
    .letter-letterhead {
      margin-bottom: 1.5em;
      text-align: center;
    }
    
    .letter-date {
      text-align: left;
      margin-bottom: 1.5em;
    }
    
    .letter-recipient {
      margin-bottom: 1.5em;
    }
    
    .letter-recipient p {
      margin: 0;
      line-height: 1.4;
    }
    
    .letter-subject {
      margin-bottom: 1em;
    }
    
    .letter-salutation {
      margin-bottom: 1em;
    }
    
    .letter-body {
      margin-bottom: 1.5em;
      text-align: left !important;
    }
    
    .letter-body p {
      margin-bottom: 1em;
      text-align: left !important;
      text-justify: none !important;
    }
    
    .statutory-language {
      margin: 1.5em 0;
      padding: 1em;
      background-color: #f9f9f9;
      border-left: 3px solid #ccc;
      font-size: 0.95em;
    }
    
    .letter-closing {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    
    .letter-signature {
      margin-top: 0.5em;
    }
    
    .letter-signature .signature-space {
      height: 3em;
    }
    
    .letter-signature .signature-name {
      margin: 0;
      font-weight: bold;
    }
    
    .letter-signature .signature-title {
      margin: 0;
      font-style: italic;
    }
    
    .letter-footer {
      margin-top: 2em;
      padding-top: 1em;
      border-top: 1px solid #ccc;
      font-size: 0.85em;
      color: #666;
    }
    
    /* Print-specific styles */
    @media print {
      .letter-content {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `.trim();
}

// ============================================
// TEMPLATE RENDERING
// ============================================

/**
 * Rendered letter output
 */
export interface RenderedLetter {
  html: string;
  css: string;
  fullHtml: string;  // Complete HTML document
  sections: LetterSection[];
  estimatedPages: number;
}

/**
 * Render a letter template to final HTML
 */
export function renderLetterTemplate(
  template: LetterTemplate,
  context: LetterDataContext,
  jurisdiction?: JurisdictionInfo
): RenderedLetter {
  let sections = [...template.sections].filter(s => s.isVisible);
  
  // Inject statutory language if configured
  if (template.statutoryInjection && jurisdiction) {
    sections = injectStatutoryLanguage(
      sections,
      template.statutoryInjection,
      jurisdiction
    );
  }
  
  // Sort sections by display order
  sections.sort((a, b) => a.displayOrder - b.displayOrder);
  
  // Resolve bindings in each section
  const renderedSections = sections.map(section => ({
    ...section,
    html: resolveBindings(section.html, template.availableBindings, context),
  }));
  
  // Compose final HTML
  const bodyHtml = renderedSections
    .map(section => `
      <div class="letter-section ${section.type} ${section.cssClass || ''}" data-section-id="${section.id}">
        ${section.html}
      </div>
    `)
    .join('\n');
  
  const html = `
    <div class="letter-content">
      ${bodyHtml}
    </div>
  `.trim();
  
  // Generate CSS
  const css = generatePrintCss(template.printConfig);
  
  // Create complete HTML document
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${template.name}</title>
      <style>
        ${css}
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `.trim();
  
  // Estimate page count (rough calculation based on content length)
  const charCount = html.replace(/<[^>]*>/g, '').length;
  const charsPerPage = 3000; // Approximate for letter size
  const estimatedPages = Math.max(1, Math.ceil(charCount / charsPerPage));
  
  return {
    html,
    css,
    fullHtml,
    sections: renderedSections,
    estimatedPages,
  };
}

/**
 * Render letter template for preview (with page boundaries)
 */
export function renderLetterForPreview(
  template: LetterTemplate,
  context: LetterDataContext,
  jurisdiction?: JurisdictionInfo
): string {
  const rendered = renderLetterTemplate(template, context, jurisdiction);
  
  // Add preview-specific styles
  const previewCss = `
    ${rendered.css}
    
    /* Preview container styling */
    .letter-preview-container {
      background: #e5e5e5;
      padding: 2rem;
      min-height: 100%;
    }
    
    .letter-page {
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      margin: 0 auto 2rem;
      padding: ${template.printConfig.margins.top} ${template.printConfig.margins.right} ${template.printConfig.margins.bottom} ${template.printConfig.margins.left};
      width: ${PAGE_SPECS[template.printConfig.pageSize].width};
      min-height: ${PAGE_SPECS[template.printConfig.pageSize].height};
    }
  `.trim();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Preview: ${template.name}</title>
      <style>
        ${previewCss}
      </style>
    </head>
    <body>
      <div class="letter-preview-container">
        <div class="letter-page">
          ${rendered.html}
        </div>
      </div>
    </body>
    </html>
  `.trim();
}

/**
 * Render letter template for export (clean HTML for PDF generation)
 */
export function renderLetterForExport(
  template: LetterTemplate,
  context: LetterDataContext,
  jurisdiction?: JurisdictionInfo
): string {
  const rendered = renderLetterTemplate(template, context, jurisdiction);
  return rendered.fullHtml;
}
