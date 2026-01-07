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
      min-height: 11in;
      height: 11in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 72px 72px;
      page-break-after: always;
      background: #ffffff;
      box-sizing: border-box;
    }

    .cover-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .cover-logo {
      max-width: 150px !important;
      max-height: 80px !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      display: block !important;
      margin: 0 auto 16px auto !important;
    }

    .cover-logo-placeholder {
      font-family: ${opts.fontSans};
      font-size: 20pt;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.5px;
    }

    .cover-company-name {
      font-family: ${opts.fontSans};
      font-size: 14pt;
      font-weight: 600;
      color: #1a1a1a;
      margin-top: 8px;
      letter-spacing: 0.5px;
    }

    .cover-title-block {
      text-align: center;
      margin: 48px 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .cover-title {
      font-family: ${opts.fontSans};
      font-size: 42pt;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: 4px;
      line-height: 1.1;
      margin: 0;
    }

    .cover-subtitle {
      font-family: ${opts.fontSans};
      font-size: 14pt;
      font-weight: 500;
      color: #2d3748;
      margin-top: 16px;
    }

    .cover-divider {
      width: 80px;
      height: 4px;
      background: #1a1a1a;
      margin: 24px auto;
    }

    .cover-meta-block {
      margin: 32px auto;
      max-width: 400px;
    }

    .cover-meta-table {
      width: 100%;
      border-collapse: collapse;
      font-family: ${opts.fontSans};
      font-size: 11pt;
    }

    .cover-meta-table tr {
      border-bottom: 1px solid #e2e8f0;
    }

    .cover-meta-table td {
      padding: 10px 0;
      vertical-align: top;
    }

    .cover-meta-table .meta-label {
      font-weight: 600;
      color: #4a5568;
      width: 140px;
      text-align: left;
    }

    .cover-meta-table .meta-value {
      color: #1a1a1a;
      font-weight: 500;
      text-align: left;
    }

    .cover-prepared-section {
      margin: 32px 0;
      text-align: left;
    }

    .cover-prepared-label {
      font-family: ${opts.fontSans};
      font-size: 10pt;
      color: #4a5568;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cover-prepared-name {
      font-family: ${opts.fontSans};
      font-size: 14pt;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .cover-prepared-contact {
      font-family: ${opts.fontSans};
      font-size: 10pt;
      color: #2d3748;
      margin-bottom: 2px;
    }

    .cover-confidential-badge {
      display: inline-block;
      padding: 8px 24px;
      border: 2px solid #1a1a1a;
      margin-bottom: 16px;
    }

    .confidential-text {
      font-family: ${opts.fontSans};
      font-size: 11pt;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: 3px;
    }

    .cover-client-text {
      font-family: ${opts.fontSans};
      font-size: 10pt;
      color: #4a5568;
      margin-bottom: 16px;
    }

    .cover-footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      margin-top: auto;
    }

    .cover-company-info {
      font-family: ${opts.fontSans};
      font-size: 9pt;
      color: #4a5568;
      line-height: 1.6;
      margin-top: 12px;
    }

    .cover-company-footer {
      font-weight: 600;
      font-size: 10pt;
      color: #1a1a1a;
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
      font-size: 14pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #cbd5e0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      color: #1a1a1a;
    }

    /* Force readable content even if template HTML contains muted/opacity classes */
    .section-content,
    .section-content * {
      color: #1a1a1a;
      opacity: 1;
    }

    .section-content a {
      color: ${opts.primaryColor};
      text-decoration: underline;
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
      background: none;
      font-weight: 600;
      color: #4a5568;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #1a1a1a;
    }

    .section-table-striped tbody tr:nth-child(even) {
      background: transparent;
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
      padding-bottom: 6px;
      background: none;
      border-bottom: 1px solid #e2e8f0;
      page-break-after: avoid;
    }

    .entry-item {
      margin-bottom: 24px;
      padding-bottom: 0;
      border-bottom: none;
      page-break-inside: avoid;
    }

    .entry-item:last-child {
      margin-bottom: 0;
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
      display: inline;
      font-family: ${opts.fontSans};
      font-size: 9pt;
      font-weight: 600;
      color: #4a5568;
      background: none;
      padding: 0;
      border-radius: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-right: 8px;
    }

    .entry-content {
      font-size: 11pt;
      line-height: 1.65;
      color: #2d3748;
    }

    /* Force readable rich-text content (remove accidental low opacity / muted colors) */
    .entry-content,
    .entry-content * {
      color: #2d3748;
      opacity: 1;
    }

    .entry-content a {
      color: ${opts.primaryColor};
      text-decoration: underline;
    }

    .entry-content p {
      margin-bottom: 8px;
    }

    .entry-content p:last-child {
      margin-bottom: 0;
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

    /* === CONFIGURABLE RUNNING HEADER === */

    .report-running-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid #cbd5e0;
      margin-bottom: 24px;
      font-family: ${opts.fontSans};
      font-size: 9pt;
      color: #4a5568;
    }

    .running-header-left,
    .running-header-right {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .running-header-left {
      align-items: flex-start;
    }

    .running-header-right {
      align-items: flex-end;
      text-align: right;
    }

    .running-header-logo {
      max-width: 100px;
      max-height: 40px;
      width: auto;
      height: auto;
      object-fit: contain;
    }

    .running-header-org {
      font-weight: 600;
      color: #1a1a1a;
      font-size: 10pt;
    }

    .running-header-contact,
    .running-header-address {
      font-size: 8pt;
      color: #718096;
    }

    .running-header-title {
      font-weight: 600;
      color: #1a1a1a;
    }

    .running-header-case,
    .running-header-date {
      font-size: 8pt;
      color: #718096;
    }

    /* === CONFIGURABLE RUNNING FOOTER === */

    .report-running-footer {
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

    .running-footer-left,
    .running-footer-center,
    .running-footer-right {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .running-footer-left {
      align-items: flex-start;
      flex: 1;
    }

    .running-footer-center {
      align-items: center;
      flex: 2;
      text-align: center;
    }

    .running-footer-right {
      align-items: flex-end;
      text-align: right;
      flex: 1;
    }

    .running-footer-org {
      font-weight: 600;
      color: #4a5568;
    }

    .running-footer-website,
    .running-footer-phone {
      font-size: 7pt;
      color: #a0aec0;
    }

    .running-footer-confidential {
      font-weight: 600;
      letter-spacing: 1px;
      color: ${opts.primaryColor};
      font-size: 9pt;
    }

    .running-footer-page {
      font-weight: 400;
    }

    .running-footer-date {
      font-size: 7pt;
    }

    .running-footer-id {
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
        height: 11in;
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
        min-height: 11in;
        height: auto;
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
