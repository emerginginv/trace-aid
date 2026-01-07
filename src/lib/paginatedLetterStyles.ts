// Paged media styles for print-accurate letter preview
// These styles work with Paged.js to render true page breaks

export function getPagedMediaStyles(): string {
  return `
    /* === PAGE SETUP === */
    @page {
      size: 8.5in 11in;
      margin: 1in;
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

// Additional viewer-specific styles for displaying pages
export function getPageViewerStyles(): string {
  return `
    /* === PAGED.JS PAGE STYLES === */
    .pagedjs_pages {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
      padding: 32px;
    }

    .pagedjs_page {
      background: white !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      border: 1px solid #ddd;
      position: relative;
    }

    /* Page number display */
    .pagedjs_page::after {
      content: attr(data-page-number);
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #666;
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* Ensure content within pages is visible */
    .pagedjs_page_content {
      color: #000 !important;
      background: white !important;
    }

    .pagedjs_page_content * {
      color: inherit;
    }

    /* Reset any dark mode interference */
    .pagedjs_page,
    .pagedjs_page * {
      color-scheme: light;
    }
  `;
}
