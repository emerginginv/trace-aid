/**
 * PRINT-ACCURATE PAGINATION STYLES
 * 
 * SINGLE SOURCE OF TRUTH for page dimensions and rendering.
 * These constants and styles are used by:
 * - PaginatedDocumentViewer (preview)
 * - PDF export (html2pdf.js)
 * - DOCX export
 * - Print
 * 
 * NON-NEGOTIABLE: Preview and export MUST use identical dimensions.
 */

// ============================================================================
// PAGE DIMENSION SPECIFICATIONS (96 DPI)
// ============================================================================

export type PageSize = 'letter' | 'a4';

export interface PageSpec {
  name: string;
  width: string;
  height: string;
  widthPx: number;
  heightPx: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  usableWidthPx: number;
  usableHeightPx: number;
}

/**
 * Exact page specifications at 96 DPI
 * These values are used for both preview rendering and PDF export
 */
export const PAGE_SPECS: Record<PageSize, PageSpec> = {
  letter: {
    name: 'US Letter',
    width: '8.5in',
    height: '11in',
    widthPx: 816,       // 8.5 * 96
    heightPx: 1056,     // 11 * 96
    margins: {
      top: 96,          // 1in = 96px
      right: 96,
      bottom: 96,
      left: 96,
    },
    usableWidthPx: 624,  // 6.5in = 624px
    usableHeightPx: 864, // 9in = 864px
  },
  a4: {
    name: 'A4',
    width: '210mm',
    height: '297mm',
    widthPx: 794,       // 210mm at 96 DPI
    heightPx: 1123,     // 297mm at 96 DPI
    margins: {
      top: 95,          // ~25mm
      right: 95,
      bottom: 95,
      left: 95,
    },
    usableWidthPx: 604,
    usableHeightPx: 933,
  },
};

// ============================================================================
// PAGED MEDIA STYLES (for Paged.js rendering)
// ============================================================================

export function getPagedMediaStyles(pageSize: PageSize = 'letter'): string {
  const spec = PAGE_SPECS[pageSize];
  
  return `
    /* === PAGE SETUP === */
    @page {
      size: ${spec.width} ${spec.height};
      margin: ${spec.margins.top / 96}in ${spec.margins.right / 96}in ${spec.margins.bottom / 96}in ${spec.margins.left / 96}in;
    }

    @page:first {
      /* First page can have different margins if needed */
    }

    /* === ROOT DOCUMENT STYLES === */
    html, body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000 !important;
      background: transparent;
      margin: 0;
      padding: 0;
    }

    /* === LETTER DOCUMENT CONTAINER === */
    .letter-document {
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000 !important;
      background: transparent;
    }

    /* === LETTERHEAD === */
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
      color: #000 !important;
    }

    .letter-letterhead .org-info {
      font-size: 10pt;
      color: #333 !important;
      line-height: 1.4;
    }

    .letter-letterhead hr {
      margin-top: 20px;
      border: none;
      border-top: 1px solid #333;
    }

    /* === DATE BLOCK === */
    .letter-date {
      text-align: right;
      margin-bottom: 0.5in;
      color: #000 !important;
    }

    /* === RECIPIENT BLOCK === */
    .letter-recipient {
      margin-bottom: 0.25in;
      line-height: 1.4;
      color: #000 !important;
    }

    /* === SALUTATION === */
    .letter-salutation {
      margin-bottom: 1em;
      color: #000 !important;
    }

    /* === BODY CONTENT === */
    .letter-body {
      text-align: justify;
      color: #000 !important;
    }

    .letter-body p {
      margin-bottom: 1em;
      text-indent: 0;
      color: #000 !important;
    }

    .letter-body p + p {
      text-indent: 0;
    }

    /* === SECTION HEADINGS === */
    .letter-body .section-heading,
    .letter-body h3,
    .letter-body h4 {
      font-weight: bold;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      text-align: left;
      color: #000 !important;
    }

    /* === LEGAL CITATIONS === */
    .legal-citation,
    .statute-reference {
      font-style: italic;
      color: #000 !important;
    }

    /* === LISTS === */
    .letter-body ul,
    .letter-body ol {
      margin-left: 0.5in;
      margin-bottom: 1em;
      color: #000 !important;
    }

    .letter-body li {
      margin-bottom: 0.5em;
      color: #000 !important;
    }

    /* === NDA-SPECIFIC STYLES === */
    .nda-clause {
      margin-bottom: 1em;
    }

    .nda-clause-number {
      font-weight: bold;
    }

    .nda-parties {
      margin-bottom: 1em;
    }

    /* === SIGNATURE BLOCK === */
    .letter-signature {
      margin-top: 1in;
      break-inside: avoid;
      page-break-inside: avoid;
      color: #000 !important;
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
      color: #000 !important;
    }

    .signature-title {
      font-style: italic;
      color: #000 !important;
    }

    /* === FOOTER / CONFIDENTIALITY === */
    .letter-footer {
      margin-top: 1in;
      padding-top: 0.5em;
      border-top: 1px solid #ccc;
      font-size: 9pt;
      color: #666 !important;
      text-align: center;
    }

    /* === AVOID PAGE BREAKS === */
    .avoid-break,
    .letter-signature,
    .nda-clause {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .page-break-before {
      break-before: page;
      page-break-before: always;
    }

    .page-break-after {
      break-after: page;
      page-break-after: always;
    }
  `;
}

// ============================================================================
// PAGE VIEWER STYLES (for displaying pages in preview)
// ============================================================================

export function getPageViewerStyles(pageSize: PageSize = 'letter'): string {
  const spec = PAGE_SPECS[pageSize];
  
  return `
    /* === PAGED.JS PAGE CONTAINER === */
    .pagedjs_pages {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 40px;
      padding: 40px;
      background: #525659;
    }

    /* === INDIVIDUAL PAGE STYLING === */
    .pagedjs_page {
      width: ${spec.widthPx}px !important;
      min-height: ${spec.heightPx}px !important;
      max-width: ${spec.widthPx}px !important;
      background: white !important;
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06),
        0 0 0 1px rgba(0, 0, 0, 0.05);
      border-radius: 2px;
      position: relative;
    }

    /* === PAGE NUMBER BADGE === */
    .pagedjs_page::after {
      content: attr(data-page-number);
      position: absolute;
      bottom: -32px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #9ca3af;
      font-family: system-ui, -apple-system, sans-serif;
      background: rgba(255, 255, 255, 0.1);
      padding: 4px 12px;
      border-radius: 4px;
      white-space: nowrap;
    }

    /* === PAGE CONTENT AREA === */
    .pagedjs_page_content {
      color: #000 !important;
      background: white !important;
    }

    .pagedjs_page_content * {
      color: inherit;
    }

    /* === RESET DARK MODE INTERFERENCE === */
    .pagedjs_page,
    .pagedjs_page * {
      color-scheme: light;
    }

    /* === PAGE MARGIN BOXES (for running headers/footers) === */
    .pagedjs_margin-top-center,
    .pagedjs_margin-bottom-center {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt;
      color: #666;
    }
  `;
}

// ============================================================================
// PDF EXPORT OPTIONS (uses same PAGE_SPECS for consistency)
// ============================================================================

export function getPdfExportOptions(filename: string, pageSize: PageSize = 'letter') {
  const spec = PAGE_SPECS[pageSize];
  
  return {
    margin: 0, // Margins are in the HTML document itself
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      logging: false,
      width: spec.widthPx,
    },
    jsPDF: {
      unit: 'in' as const,
      format: pageSize as 'letter' | 'a4',
      orientation: 'portrait' as const,
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'] as const,
      avoid: ['.avoid-break', '.letter-signature', '.nda-clause'],
    },
  };
}
