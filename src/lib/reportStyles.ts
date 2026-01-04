// Professional Report Stylesheet Generator
// Provides clean typography, clear hierarchy, professional spacing

export interface ReportStyleOptions {
  primaryColor?: string;        // For accents (default: professional navy)
  fontSerif?: string;           // Body font
  fontSans?: string;            // Heading font
  showConfidential?: boolean;   // Show confidentiality markers
  pageSize?: 'letter' | 'a4';   // Page dimensions
  companyName?: string;         // For headers
  caseNumber?: string;          // For headers
}

const DEFAULT_OPTIONS: Required<ReportStyleOptions> = {
  primaryColor: '#1a365d',
  fontSerif: "'Georgia', 'Times New Roman', serif",
  fontSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  showConfidential: true,
  pageSize: 'letter',
  companyName: '',
  caseNumber: '',
};

export function generateReportStyles(options: ReportStyleOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const pageWidth = opts.pageSize === 'letter' ? '8.5in' : '210mm';
  const pageHeight = opts.pageSize === 'letter' ? '11in' : '297mm';

  return `
    /* === REPORT DOCUMENT STYLES === */
    
    /* CSS Reset for Report */
    .report-document * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .report-document {
      font-family: ${opts.fontSerif};
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
    }

    /* === COVER PAGE STYLES === */
    
    .report-cover-page {
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 1.5in 1in;
      page-break-after: always;
      background: #ffffff;
    }

    .cover-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .cover-logo {
      max-width: 200px;
      max-height: 100px;
      object-fit: contain;
    }

    .cover-logo-placeholder {
      font-family: ${opts.fontSans};
      font-size: 24pt;
      font-weight: 700;
      color: ${opts.primaryColor};
      letter-spacing: -0.5px;
    }

    .cover-title-block {
      text-align: center;
      margin: 3rem 0;
    }

    .cover-title {
      font-family: ${opts.fontSans};
      font-size: 28pt;
      font-weight: 700;
      color: ${opts.primaryColor};
      letter-spacing: 2px;
      margin-bottom: 1rem;
    }

    .cover-subtitle {
      font-family: ${opts.fontSans};
      font-size: 14pt;
      font-weight: 400;
      color: #4a5568;
      margin-top: 0.5rem;
    }

    .cover-divider {
      width: 120px;
      height: 3px;
      background: ${opts.primaryColor};
      margin: 1.5rem auto;
    }

    .cover-case-info {
      margin: 2rem auto;
      max-width: 400px;
    }

    .cover-info-table {
      width: 100%;
      border-collapse: collapse;
      font-family: ${opts.fontSans};
      font-size: 11pt;
    }

    .cover-info-table td {
      padding: 8px 12px;
      vertical-align: top;
    }

    .cover-info-table td:first-child {
      font-weight: 600;
      color: #4a5568;
      width: 140px;
      text-align: right;
      padding-right: 16px;
    }

    .cover-info-table td:last-child {
      color: #1a1a1a;
      font-weight: 500;
    }

    .cover-confidential {
      text-align: center;
      margin: 3rem 0;
      padding: 1.5rem;
      border: 2px solid ${opts.primaryColor};
      max-width: 300px;
      margin-left: auto;
      margin-right: auto;
    }

    .cover-confidential-label {
      font-family: ${opts.fontSans};
      font-size: 14pt;
      font-weight: 700;
      color: ${opts.primaryColor};
      letter-spacing: 3px;
      margin-bottom: 0.5rem;
    }

    .cover-confidential-text {
      font-family: ${opts.fontSans};
      font-size: 10pt;
      color: #4a5568;
    }

    .cover-footer {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid #e2e8f0;
      margin-top: auto;
    }

    .cover-company-info {
      font-family: ${opts.fontSans};
      font-size: 9pt;
      color: #4a5568;
      line-height: 1.8;
    }

    .cover-company-name {
      font-weight: 600;
      font-size: 10pt;
      color: ${opts.primaryColor};
      margin-bottom: 4px;
    }

    /* === CONTENT SECTION STYLES === */

    .report-content {
      padding: 0.75in 1in 1in 1in;
    }

    .report-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #cbd5e0;
      margin-bottom: 24px;
      font-family: ${opts.fontSans};
      font-size: 9pt;
      color: #4a5568;
    }

    .header-company {
      font-weight: 600;
    }

    .header-case {
      font-weight: 400;
    }

    /* === SECTION STYLES === */

    .report-section {
      margin-bottom: 32px;
      page-break-inside: avoid;
    }

    .report-section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-family: ${opts.fontSans};
      font-size: 16pt;
      font-weight: 600;
      color: ${opts.primaryColor};
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
      page-break-after: avoid;
    }

    .section-subtitle {
      font-family: ${opts.fontSans};
      font-size: 13pt;
      font-weight: 600;
      color: #2d3748;
      margin-top: 20px;
      margin-bottom: 12px;
    }

    .section-content {
      font-size: 11pt;
      line-height: 1.7;
    }

    .section-content p {
      margin-bottom: 12px;
      text-align: justify;
    }

    .section-content p:last-child {
      margin-bottom: 0;
    }

    /* === TABLE STYLES === */

    .section-table {
      width: 100%;
      border-collapse: collapse;
      font-family: ${opts.fontSans};
      font-size: 10pt;
      margin: 16px 0;
    }

    .section-table th,
    .section-table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }

    .section-table th {
      background: #f7fafc;
      font-weight: 600;
      color: #4a5568;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-table-striped tbody tr:nth-child(even) {
      background: #f7fafc;
    }

    .section-table-compact td {
      padding: 6px 10px;
    }

    .table-label {
      font-weight: 600;
      color: #4a5568;
      width: 180px;
    }

    .table-value {
      color: #1a1a1a;
    }

    /* === UPDATE/EVENT ENTRY STYLES === */

    .entry-group {
      margin-bottom: 24px;
    }

    .entry-group-header {
      font-family: ${opts.fontSans};
      font-size: 12pt;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #f7fafc;
      border-left: 3px solid ${opts.primaryColor};
      page-break-after: avoid;
    }

    .entry-item {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #edf2f7;
      page-break-inside: avoid;
    }

    .entry-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .entry-title {
      font-family: ${opts.fontSans};
      font-size: 11pt;
      font-weight: 600;
      color: #1a1a1a;
    }

    .entry-meta {
      font-family: ${opts.fontSans};
      font-size: 9pt;
      color: #718096;
    }

    .entry-type-badge {
      display: inline-block;
      font-family: ${opts.fontSans};
      font-size: 8pt;
      font-weight: 600;
      color: #4a5568;
      background: #edf2f7;
      padding: 2px 8px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-right: 8px;
    }

    .entry-content {
      font-size: 11pt;
      line-height: 1.65;
      color: #2d3748;
    }

    .entry-content p {
      margin-bottom: 8px;
    }

    .entry-attribution {
      font-family: ${opts.fontSans};
      font-size: 9pt;
      color: #718096;
      font-style: italic;
      margin-top: 8px;
    }

    /* === PAGE FOOTER === */

    .report-page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #cbd5e0;
      margin-top: 32px;
      font-family: ${opts.fontSans};
      font-size: 8pt;
      color: #718096;
    }

    .footer-confidential {
      font-weight: 600;
      letter-spacing: 1px;
      color: ${opts.primaryColor};
    }

    .footer-page {
      font-weight: 400;
    }

    .footer-report-id {
      font-family: 'Courier New', monospace;
      font-size: 7pt;
    }

    /* === UTILITY CLASSES === */

    .text-muted {
      color: #718096;
    }

    .text-emphasis {
      font-weight: 600;
    }

    .no-break {
      page-break-inside: avoid;
    }

    .break-before {
      page-break-before: always;
    }

    .break-after {
      page-break-after: always;
    }

    /* === PRINT STYLES === */

    @media print {
      .report-document {
        font-size: 11pt;
      }

      .report-cover-page {
        height: 100vh;
        page-break-after: always;
      }

      .report-content {
        padding: 0.5in 0.75in 0.75in 0.75in;
      }

      .report-section {
        page-break-inside: avoid;
      }

      .section-title {
        page-break-after: avoid;
      }

      .entry-item {
        page-break-inside: avoid;
      }

      .entry-group-header {
        page-break-after: avoid;
      }

      /* Ensure tables don't break awkwardly */
      .section-table {
        page-break-inside: avoid;
      }

      /* Hide screen-only elements */
      .screen-only {
        display: none !important;
      }
    }

    /* === SCREEN PREVIEW STYLES === */

    @media screen {
      .report-document {
        max-width: ${pageWidth};
        margin: 0 auto;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
      }

      .report-cover-page {
        min-height: 800px;
        border-bottom: 2px dashed #cbd5e0;
      }

      .page-break-indicator {
        width: 100%;
        text-align: center;
        padding: 8px;
        background: #f7fafc;
        color: #718096;
        font-family: ${opts.fontSans};
        font-size: 9pt;
        border: 1px dashed #cbd5e0;
        margin: 16px 0;
      }
    }
  `;
}

// Short hash generator for report ID
export function generateReportHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase().substring(0, 8);
}

// Format date for professional reports
export function formatReportDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatReportDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
