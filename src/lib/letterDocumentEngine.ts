/**
 * UNIFIED LETTER DOCUMENT ENGINE
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * Ensures preview matches PDF/DOCX export exactly.
 * HTML is the SINGLE SOURCE OF TRUTH.
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * IMPORTANT: All styling comes from paginatedLetterStyles.ts
 * This file handles document structure and composition only.
 * 
 * For styles, use:
 * - getUnifiedLetterStyles() - for ALL letter styling (preview & export)
 * - LETTER_FONT_STACK - for font definitions
 * - PAGE_SPECS - for page dimensions
 */

import { type OrganizationProfile } from "./organizationProfile";
import { type LetterBrandingConfig, renderLetterhead, renderDateBlock, renderSignatureBlock, renderConfidentialityFooter } from "./letterBranding";
import { 
  PAGE_SPECS, 
  type PageSize, 
  getUnifiedLetterStyles,
  LETTER_FONT_STACK 
} from "./paginatedLetterStyles";
import { CANONICAL_SECTION_ORDER, SECTION_METADATA } from "./letterTemplates";

export interface PageSettings {
  size: PageSize;
  margins: { top: number; right: number; bottom: number; left: number };
  orientation: 'portrait' | 'landscape';
}

export interface LetterDocument {
  /** 
   * Letter HTML content (body only, without embedded styles).
   * Styles are applied at render time via getUnifiedLetterStyles().
   */
  html: string;
  /** 
   * @deprecated Use getUnifiedLetterStyles() from paginatedLetterStyles.ts instead.
   * Kept for backwards compatibility only.
   */
  styles: string;
  pageSettings: PageSettings;
  /** 
   * @deprecated Use actual page count from PaginatedDocumentViewer's onPageCountChange callback.
   * This is only an estimate based on character count.
   */
  estimatedPages: number;
}

export interface CreateLetterDocumentOptions {
  pageSettings?: Partial<PageSettings>;
  includeWatermark?: boolean;
  draftMode?: boolean;
}

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'letter',
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  orientation: 'portrait'
};

/**
 * @deprecated Use getUnifiedLetterStyles() from paginatedLetterStyles.ts instead.
 * 
 * This function is kept for backwards compatibility only.
 * All new code should use getUnifiedLetterStyles() directly.
 */
export function getLetterStyles(draftMode = false): string {
  // Delegate to unified styles for consistency
  return getUnifiedLetterStyles('letter', { draftMode, forExport: false });
}

// Estimate page count based on content length
function estimatePageCount(html: string): number {
  // Rough estimation: ~3000 characters per page (12pt, 1.5 line spacing)
  const textContent = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
  const charCount = textContent.length;
  return Math.max(1, Math.ceil(charCount / 3000));
}

/**
 * Validation result for letter structure
 */
export interface LetterStructureValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate letter structure to prevent free-form layouts
 * Ensures letters follow proper professional structure
 */
export function validateLetterStructure(html: string): LetterStructureValidation {
  const result: LetterStructureValidation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  const textContent = html.replace(/<[^>]*>/g, ' ').trim();
  
  // Must have content (not empty)
  if (textContent.length < 50) {
    result.isValid = false;
    result.errors.push("Letter content is too short");
  }
  
  // Check for placeholder text that must be replaced
  const placeholderPatterns = [
    { pattern: /\[insert/i, message: "Contains '[insert...]' placeholder" },
    { pattern: /\[your name/i, message: "Contains '[your name]' placeholder" },
    { pattern: /\[recipient/i, message: "Contains '[recipient...]' placeholder" },
    { pattern: /\[date\]/i, message: "Contains '[date]' placeholder" },
    { pattern: /\bTBD\b/, message: "Contains 'TBD' placeholder" },
    { pattern: /\bTODO\b/i, message: "Contains 'TODO' placeholder" },
    { pattern: /\bPLACEHOLDER\b/i, message: "Contains 'PLACEHOLDER' text" },
    { pattern: /\bXXX\b/, message: "Contains 'XXX' placeholder" },
    { pattern: /\b___+\b/, message: "Contains blank line placeholder" },
  ];
  
  for (const { pattern, message } of placeholderPatterns) {
    if (pattern.test(textContent)) {
      result.isValid = false;
      result.errors.push(message);
    }
  }
  
  // Check for proper structure indicators
  const hasDate = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(textContent) || 
                  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i.test(textContent) ||
                  /\{\{.*date.*\}\}/i.test(html);
  
  const hasSalutation = /\b(?:Dear|To Whom|Attention|Re:)\b/i.test(textContent);
  const hasClosing = /\b(?:Sincerely|Regards|Best|Respectfully|Thank you)\b/i.test(textContent);
  
  if (!hasDate) {
    result.warnings.push("Letter may be missing a date");
  }
  if (!hasSalutation) {
    result.warnings.push("Letter may be missing a proper salutation");
  }
  if (!hasClosing) {
    result.warnings.push("Letter may be missing a closing");
  }
  
  return result;
}

/**
 * Create a complete letter document with all branding.
 * 
 * NOTE: The returned html includes the style tag for backwards compatibility,
 * but new code should apply styles separately using getUnifiedLetterStyles().
 */
export function createLetterDocument(
  letterBody: string,
  brandingConfig: LetterBrandingConfig,
  orgProfile: OrganizationProfile | null,
  options?: CreateLetterDocumentOptions
): LetterDocument {
  const pageSettings: PageSettings = {
    ...DEFAULT_PAGE_SETTINGS,
    ...options?.pageSettings
  };

  // Get unified styles (for backwards compatibility, included in document)
  const styles = getUnifiedLetterStyles(pageSettings.size, { 
    draftMode: options?.draftMode,
    forExport: false 
  });

  // Build the complete letter HTML
  const parts: string[] = [];

  // Add letterhead
  if (brandingConfig.showLogo || brandingConfig.showOrgName || brandingConfig.showOrgAddress || brandingConfig.showContactInfo) {
    parts.push(renderLetterhead(orgProfile, brandingConfig));
  }

  // Add date block
  if (brandingConfig.showDate) {
    parts.push(renderDateBlock(new Date(), brandingConfig));
  }

  // Add letter body (wrapped in letter-body class)
  parts.push(`<div class="letter-body">${letterBody}</div>`);

  // Add signature block
  if (brandingConfig.showSignatureBlock) {
    parts.push(renderSignatureBlock(brandingConfig));
  }

  // Add confidentiality footer
  if (brandingConfig.showConfidentiality) {
    parts.push(renderConfidentialityFooter(brandingConfig));
  }

  const fullHtml = `
    <style>${styles}</style>
    <div class="letter-document">
      ${parts.join('\n')}
    </div>
  `;

  return {
    html: fullHtml,
    styles,
    pageSettings,
    estimatedPages: estimatePageCount(fullHtml)
  };
}

/**
 * Export letter as HTML with embedded styles (for PDF generation)
 * 
 * NOTE: Uses getUnifiedLetterStyles() for consistent rendering.
 */
export function getExportableHtml(
  letterDocument: LetterDocument,
  options?: { draftMode?: boolean }
): string {
  // Always use unified styles for export
  const styles = getUnifiedLetterStyles(letterDocument.pageSettings.size, {
    draftMode: options?.draftMode,
    forExport: true
  });
  
  // Extract body content without existing styles
  const bodyMatch = letterDocument.html.match(/<div class="letter-document">([\s\S]*)<\/div>\s*$/);
  const bodyContent = bodyMatch ? bodyMatch[1] : letterDocument.html.replace(/<style>[\s\S]*?<\/style>/g, '');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Letter Document</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="letter-document">
        ${bodyContent}
      </div>
    </body>
    </html>
  `;
}

// NOTE: Import directly from @/lib/paginatedLetterStyles for:
// - getPdfExportOptions (deprecated)
// - getUnifiedLetterStyles
// - LETTER_FONT_STACK  
// - PAGE_SPECS
// Re-exports removed to prevent circular reference issues with TypeScript compiler.
