// Unified letter document engine for print-ready rendering
// Ensures preview matches PDF/DOCX export exactly

import { type OrganizationProfile } from "./organizationProfile";
import { type LetterBrandingConfig, renderLetterhead, renderDateBlock, renderSignatureBlock, renderConfidentialityFooter } from "./letterBranding";

export interface PageSettings {
  size: 'letter' | 'a4';
  margins: { top: number; right: number; bottom: number; left: number };
  orientation: 'portrait' | 'landscape';
}

export interface LetterDocument {
  html: string;
  styles: string;
  pageSettings: PageSettings;
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

// Print-ready CSS that ensures consistency between preview and export
export function getLetterStyles(draftMode = false): string {
  return `
    /* Core Letter Document Styles */
    .letter-document {
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 1in;
      box-sizing: border-box;
    }

    /* Page Setup for Print */
    @page {
      size: letter portrait;
      margin: 1in;
    }

    /* Letterhead */
    .letter-letterhead {
      margin-bottom: 0.75in;
      text-align: center;
    }

    .letter-letterhead img {
      max-height: 60px;
      max-width: 200px;
      margin-bottom: 10px;
    }

    .letter-letterhead .org-name {
      font-weight: bold;
      font-size: 16pt;
      margin-bottom: 4px;
    }

    .letter-letterhead .org-info {
      font-size: 10pt;
      color: #333;
      line-height: 1.4;
    }

    .letter-letterhead hr {
      margin-top: 20px;
      border: none;
      border-top: 1px solid #333;
    }

    /* Date Block */
    .letter-date {
      text-align: right;
      margin-bottom: 0.5in;
    }

    /* Recipient Block */
    .letter-recipient {
      margin-bottom: 0.25in;
      line-height: 1.4;
    }

    /* Salutation */
    .letter-salutation {
      margin-bottom: 1em;
    }

    /* Body Content */
    .letter-body {
      text-align: justify;
    }

    .letter-body p {
      margin-bottom: 1em;
      text-indent: 0;
    }

    .letter-body p + p {
      text-indent: 0;
    }

    /* Section Headings */
    .letter-body .section-heading,
    .letter-body h3,
    .letter-body h4 {
      font-weight: bold;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      text-align: left;
    }

    /* Legal Citations - styled but NOT validated visually by default */
    .legal-citation,
    .statute-reference {
      font-style: italic;
    }

    .statute-reference[data-validated="true"] {
      /* Validated citations - no special styling needed */
    }

    .statute-reference[data-validated="false"] {
      background-color: #fff3cd;
      border-bottom: 2px dashed #856404;
    }

    /* Lists */
    .letter-body ul,
    .letter-body ol {
      margin-left: 0.5in;
      margin-bottom: 1em;
    }

    .letter-body li {
      margin-bottom: 0.5em;
    }

    /* NDA-Specific Styles */
    .nda-clause {
      margin-bottom: 1em;
    }

    .nda-clause-number {
      font-weight: bold;
    }

    .nda-parties {
      margin-bottom: 1em;
    }

    /* Signature Block */
    .letter-signature {
      margin-top: 1in;
      page-break-inside: avoid;
    }

    .letter-signature .closing {
      margin-bottom: 0.5in;
    }

    .signature-line {
      border-bottom: 1px solid #000;
      width: 3in;
      height: 0.5in;
      margin-bottom: 0.25em;
    }

    .signature-name {
      font-weight: bold;
    }

    .signature-title {
      font-style: italic;
    }

    /* Footer / Confidentiality */
    .letter-footer {
      margin-top: 1in;
      padding-top: 0.5em;
      border-top: 1px solid #ccc;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }

    /* Draft Watermark */
    ${draftMode ? `
    .letter-document::before {
      content: "DRAFT";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      color: rgba(200, 200, 200, 0.3);
      pointer-events: none;
      z-index: 1000;
    }
    ` : ''}

    /* Print Optimization */
    @media print {
      .letter-document {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        padding: 0;
        max-width: none;
      }

      .no-print {
        display: none !important;
      }

      .page-break-before {
        page-break-before: always;
      }

      .page-break-after {
        page-break-after: always;
      }

      .avoid-break {
        page-break-inside: avoid;
      }

      /* Ensure signature blocks don't break across pages */
      .letter-signature {
        page-break-inside: avoid;
      }

      /* Hide validation styling in print */
      .statute-reference[data-validated="false"] {
        background-color: transparent;
        border-bottom: none;
      }
    }

    /* Screen Preview - Show page boundaries */
    @media screen {
      .letter-document {
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        border: 1px solid #e0e0e0;
      }
    }
  `;
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

// Create a complete letter document with all branding and styles
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

  const styles = getLetterStyles(options?.draftMode);

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

// Export letter as HTML with embedded styles (for PDF generation)
export function getExportableHtml(letterDocument: LetterDocument): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Letter Document</title>
      <style>${letterDocument.styles}</style>
    </head>
    <body>
      ${letterDocument.html}
    </body>
    </html>
  `;
}

// Get PDF export options optimized for letter documents
export function getPdfExportOptions(filename: string) {
  return {
    margin: 0, // Margins are in the document itself
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      logging: false,
    },
    jsPDF: {
      unit: 'in' as const,
      format: 'letter' as const,
      orientation: 'portrait' as const,
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'] as const,
      avoid: ['.avoid-break', '.letter-signature', '.nda-clause'],
    },
  };
}
