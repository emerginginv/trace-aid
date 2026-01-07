/**
 * LETTER BODY GENERATORS
 * 
 * ══════════════════════════════════════════════════════════════════════════════
 * These functions generate BODY CONTENT ONLY.
 * They do NOT generate:
 * - Headers/letterhead
 * - Dates
 * - Recipient addresses
 * - Salutations
 * - Closings
 * - Signature blocks
 * - Footers
 * 
 * Layout is handled by letterDocumentEngine.ts via createLetterDocument()
 * ══════════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FOIABodyContent {
  /** Opening paragraph with statutory citation */
  opening: string;
  /** Record request description */
  requestDescription: string;
  /** Date range specification (optional) */
  dateRange?: string;
  /** Fee category declaration */
  feeCategory?: string;
  /** Fee waiver request (optional) */
  feeWaiver?: string;
  /** Expedited processing request (optional) */
  expeditedProcessing?: string;
  /** Response deadline reminder */
  responseDeadline: string;
}

export interface StatePRABodyContent {
  /** Opening paragraph with statutory citation */
  opening: string;
  /** Record request description */
  requestDescription: string;
  /** Date range specification (optional) */
  dateRange?: string;
  /** Expedited processing request (optional) */
  expeditedProcessing?: string;
  /** Fee waiver request (optional) */
  feeWaiver?: string;
  /** Response deadline reminder */
  responseDeadline: string;
}

export interface PublicRecordsBodyContent {
  /** Opening paragraph with legal authority */
  opening: string;
  /** Record request description */
  requestDescription: string;
  /** Purpose statement (optional) */
  purpose?: string;
  /** Format preference */
  formatPreference: string;
  /** Fee waiver request (optional) */
  feeWaiver?: string;
  /** Response deadline reminder */
  responseDeadline: string;
}

export interface CorrespondenceBodyContent {
  /** Body paragraphs */
  paragraphs: string[];
  /** Closing line (optional) */
  closingLine?: string;
}

export interface NDABodyContent {
  /** Agreement title */
  title: string;
  /** Preamble with effective date */
  preamble: string;
  /** Party definitions */
  parties: {
    disclosing: { name: string; address?: string };
    receiving: { name: string; address?: string };
  };
  /** Agreement sections */
  sections: { heading: string; content: string }[];
  /** Signature blocks (part of NDA body, not letter signature) */
  signatureBlocks: { partyName: string; lines: string[] }[];
}

// ============================================================================
// FEE CATEGORY LABELS
// ============================================================================

const FEE_CATEGORY_LABELS: Record<string, string> = {
  commercial: 'Commercial Use',
  educational: 'Educational Institution',
  news_media: 'News Media',
  scientific: 'Scientific Institution',
  other: 'Other',
};

// ============================================================================
// FOIA BODY GENERATORS
// ============================================================================

export interface FOIAFormData {
  federalAgency: string;
  subAgency?: string;
  recordsRequested: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  feeCategory: string;
  formatPreference?: string;
  requestFeeWaiver: boolean;
  feeWaiverJustification?: string;
  expeditedProcessing: boolean;
  expeditedJustification?: string;
}

/**
 * Generate FOIA letter body content (paragraphs only)
 */
export function generateFOIABodyContent(formData: FOIAFormData): FOIABodyContent {
  const content: FOIABodyContent = {
    opening: 'Pursuant to the Freedom of Information Act, 5 U.S.C. § 552, I am requesting access to and copies of the following records:',
    requestDescription: formData.recordsRequested || '{{records_requested}}',
    responseDeadline: 'Please respond within 20 business days as required by law.',
  };

  if (formData.dateRangeStart || formData.dateRangeEnd) {
    content.dateRange = `${formData.dateRangeStart || 'N/A'} to ${formData.dateRangeEnd || 'Present'}`;
  }

  content.feeCategory = FEE_CATEGORY_LABELS[formData.feeCategory] || 'Other';

  if (formData.requestFeeWaiver) {
    content.feeWaiver = formData.feeWaiverJustification || 'Disclosure is in the public interest.';
  }

  if (formData.expeditedProcessing) {
    content.expeditedProcessing = formData.expeditedJustification || 'Urgent processing requested.';
  }

  return content;
}

/**
 * Render FOIA body content as HTML paragraphs
 */
export function renderFOIABodyHtml(content: FOIABodyContent): string {
  const paragraphs: string[] = [];

  // Opening statutory language
  paragraphs.push(`<p>${content.opening}</p>`);

  // Record request (blockquote for emphasis)
  paragraphs.push(`<blockquote class="record-request">${content.requestDescription}</blockquote>`);

  // Date range if specified
  if (content.dateRange) {
    paragraphs.push(`<p><strong>Date Range:</strong> ${content.dateRange}</p>`);
  }

  // Fee category
  if (content.feeCategory) {
    paragraphs.push(`<p><strong>Fee Category:</strong> ${content.feeCategory}</p>`);
  }

  // Fee waiver request
  if (content.feeWaiver) {
    paragraphs.push(`<p><strong>Fee Waiver Request:</strong> ${content.feeWaiver}</p>`);
  }

  // Expedited processing
  if (content.expeditedProcessing) {
    paragraphs.push(`<p><strong>Expedited Processing Request:</strong> ${content.expeditedProcessing}</p>`);
  }

  // Response deadline
  paragraphs.push(`<p>${content.responseDeadline}</p>`);

  return paragraphs.join('\n');
}

// ============================================================================
// STATE PRA BODY GENERATORS
// ============================================================================

export interface StatePRAFormData {
  state: string;
  agencyName?: string;
  agencyAddress?: string;
  recordsRequested: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  formatPreference?: string;
  expeditedProcessing: boolean;
  expeditedReason?: string;
  requestFeeWaiver: boolean;
  feeWaiverJustification?: string;
}

export interface StateInfo {
  label: string;
  statute: string;
}

/**
 * Generate State PRA letter body content (paragraphs only)
 */
export function generateStatePRABodyContent(
  formData: StatePRAFormData,
  stateInfo: StateInfo | null
): StatePRABodyContent {
  const statuteRef = stateInfo?.statute || 'the applicable state public records act';
  
  const content: StatePRABodyContent = {
    opening: `Pursuant to ${statuteRef}, I hereby request access to and copies of the following records:`,
    requestDescription: formData.recordsRequested || '{{records_requested}}',
    responseDeadline: 'Please respond within the statutory time period. Contact me with any questions.',
  };

  if (formData.dateRangeStart || formData.dateRangeEnd) {
    content.dateRange = `${formData.dateRangeStart || 'N/A'} to ${formData.dateRangeEnd || 'Present'}`;
  }

  if (formData.expeditedProcessing) {
    content.expeditedProcessing = formData.expeditedReason || 'Urgent matter requiring immediate attention.';
  }

  if (formData.requestFeeWaiver) {
    content.feeWaiver = formData.feeWaiverJustification || 'Request waiver of applicable fees.';
  }

  return content;
}

/**
 * Render State PRA body content as HTML paragraphs
 */
export function renderStatePRABodyHtml(content: StatePRABodyContent): string {
  const paragraphs: string[] = [];

  // Opening statutory language
  paragraphs.push(`<p>${content.opening}</p>`);

  // Record request (blockquote for emphasis)
  paragraphs.push(`<blockquote class="record-request">${content.requestDescription}</blockquote>`);

  // Date range if specified
  if (content.dateRange) {
    paragraphs.push(`<p><strong>Date Range:</strong> ${content.dateRange}</p>`);
  }

  // Expedited processing
  if (content.expeditedProcessing) {
    paragraphs.push(`<p><strong>Request for Expedited Processing:</strong> ${content.expeditedProcessing}</p>`);
  }

  // Fee waiver request
  if (content.feeWaiver) {
    paragraphs.push(`<p><strong>Fee Waiver Request:</strong> ${content.feeWaiver}</p>`);
  }

  // Response deadline
  paragraphs.push(`<p>${content.responseDeadline}</p>`);

  return paragraphs.join('\n');
}

// ============================================================================
// PUBLIC RECORDS BODY GENERATORS
// ============================================================================

export interface PublicRecordsFormData {
  agencyName?: string;
  agencyAddress?: string;
  recordsRequested: string;
  purpose?: string;
  legalAuthority: string;
  customAuthority?: string;
  formatPreference: string;
  requestFeeWaiver: boolean;
  feeWaiverJustification?: string;
}

/**
 * Generate Public Records letter body content (paragraphs only)
 */
export function generatePublicRecordsBodyContent(formData: PublicRecordsFormData): PublicRecordsBodyContent {
  const authority = formData.legalAuthority === 'custom'
    ? formData.customAuthority
    : 'applicable public records laws';

  const formatText = formData.formatPreference === 'electronic'
    ? 'electronic format (PDF preferred)'
    : formData.formatPreference === 'paper'
      ? 'paper copies'
      : 'either electronic or paper format';

  const content: PublicRecordsBodyContent = {
    opening: `Pursuant to ${authority}, I am requesting access to and copies of the following records:`,
    requestDescription: formData.recordsRequested || '{{records_requested}}',
    formatPreference: `I request that records be provided in ${formatText}.`,
    responseDeadline: 'Please respond within the time period required by law. If you have any questions, please contact me at the information provided below.',
  };

  if (formData.purpose) {
    content.purpose = formData.purpose;
  }

  if (formData.requestFeeWaiver) {
    content.feeWaiver = formData.feeWaiverJustification 
      ? `I am requesting a waiver of any applicable fees. ${formData.feeWaiverJustification}`
      : 'I am requesting a waiver of any applicable fees.';
  }

  return content;
}

/**
 * Render Public Records body content as HTML paragraphs
 */
export function renderPublicRecordsBodyHtml(content: PublicRecordsBodyContent): string {
  const paragraphs: string[] = [];

  // Opening with legal authority
  paragraphs.push(`<p>${content.opening}</p>`);

  // Record request (blockquote for emphasis)
  paragraphs.push(`<blockquote class="record-request">${content.requestDescription}</blockquote>`);

  // Purpose if specified
  if (content.purpose) {
    paragraphs.push(`<p><strong>Purpose:</strong> ${content.purpose}</p>`);
  }

  // Format preference
  paragraphs.push(`<p>${content.formatPreference}</p>`);

  // Fee waiver request
  if (content.feeWaiver) {
    paragraphs.push(`<p>${content.feeWaiver}</p>`);
  }

  // Response deadline
  paragraphs.push(`<p>${content.responseDeadline}</p>`);

  return paragraphs.join('\n');
}

// ============================================================================
// CORRESPONDENCE BODY GENERATORS
// ============================================================================

export interface CorrespondenceFormData {
  recipientType?: string;
  recipientName?: string;
  recipientTitle?: string;
  recipientAddress?: string;
  subject?: string;
  salutation?: string;
  tone?: string;
  closingLine?: string;
}

export interface BodySection {
  id: string;
  content: string;
}

/**
 * Generate Correspondence letter body content (paragraphs only)
 */
export function generateCorrespondenceBodyContent(
  formData: CorrespondenceFormData,
  bodySections: BodySection[]
): CorrespondenceBodyContent {
  const paragraphs = bodySections
    .map((section, index) => section.content || `{{paragraph_${index + 1}}}`)
    .filter(Boolean);

  return {
    paragraphs,
    closingLine: formData.closingLine || undefined,
  };
}

/**
 * Render Correspondence body content as HTML paragraphs
 */
export function renderCorrespondenceBodyHtml(content: CorrespondenceBodyContent): string {
  const paragraphs: string[] = [];

  // Body paragraphs
  content.paragraphs.forEach((paragraph) => {
    paragraphs.push(`<p>${paragraph}</p>`);
  });

  // Closing line if specified
  if (content.closingLine) {
    paragraphs.push(`<p>${content.closingLine}</p>`);
  }

  return paragraphs.join('\n');
}

// ============================================================================
// NDA BODY GENERATORS
// ============================================================================

export interface NDAFormData {
  agreementType: 'mutual' | 'unilateral';
  disclosingParty: string;
  disclosingAddress?: string;
  receivingParty: string;
  receivingAddress?: string;
  purposeOfDisclosure: string;
  confidentialInfoDefinition?: string;
  duration: string;
  governingLaw: string;
  disputeResolution?: string;
  includeNonSolicitation?: boolean;
  includeNonCompete?: boolean;
}

/**
 * Generate NDA body content (contract sections only)
 * Note: NDA has its own signature blocks as part of the document body
 */
export function generateNDABodyContent(formData: NDAFormData): NDABodyContent {
  const isMutual = formData.agreementType === 'mutual';
  
  const sections: { heading: string; content: string }[] = [
    {
      heading: '1. Purpose',
      content: formData.purposeOfDisclosure || 'The parties wish to explore a potential business relationship and may need to share confidential information.',
    },
    {
      heading: '2. Definition of Confidential Information',
      content: formData.confidentialInfoDefinition || 'Confidential Information means any and all information or data that has or could have commercial value or other utility in the business in which the disclosing party is engaged.',
    },
    {
      heading: '3. Obligations of Receiving Party',
      content: 'The Receiving Party agrees to: (a) hold the Confidential Information in strict confidence; (b) not to disclose the Confidential Information to any third parties; (c) not to use the Confidential Information for any purpose except as necessary for the Purpose.',
    },
    {
      heading: '4. Term',
      content: `This Agreement shall remain in effect for ${formData.duration === 'perpetual' ? 'perpetuity' : `${formData.duration} year(s)`} from the date of execution.`,
    },
  ];

  if (formData.governingLaw) {
    sections.push({
      heading: '5. Governing Law',
      content: `This Agreement shall be governed by and construed in accordance with the laws of the State of ${formData.governingLaw}.`,
    });
  }

  if (formData.includeNonSolicitation) {
    sections.push({
      heading: 'Non-Solicitation',
      content: 'During the term of this Agreement and for a period of one (1) year thereafter, neither party shall solicit or hire any employee of the other party.',
    });
  }

  if (formData.includeNonCompete) {
    sections.push({
      heading: 'Non-Compete',
      content: "During the term of this Agreement, the Receiving Party agrees not to engage in any business activity that directly competes with the Disclosing Party's business.",
    });
  }

  return {
    title: `${isMutual ? 'MUTUAL ' : ''}NON-DISCLOSURE AGREEMENT`,
    preamble: 'This Non-Disclosure Agreement ("Agreement") is entered into as of {{current_date}} by and between:',
    parties: {
      disclosing: {
        name: formData.disclosingParty || '{{disclosing_party}}',
        address: formData.disclosingAddress || '{{disclosing_address}}',
      },
      receiving: {
        name: formData.receivingParty || '{{receiving_party}}',
        address: formData.receivingAddress || '{{receiving_address}}',
      },
    },
    sections,
    signatureBlocks: [
      {
        partyName: formData.disclosingParty || 'Disclosing Party',
        lines: ['Signature / Date'],
      },
      {
        partyName: formData.receivingParty || 'Receiving Party',
        lines: ['Signature / Date'],
      },
    ],
  };
}

/**
 * Render NDA body content as HTML
 */
export function renderNDABodyHtml(content: NDABodyContent): string {
  const parts: string[] = [];

  // Title
  parts.push(`<h2 class="nda-title">${content.title}</h2>`);

  // Preamble
  parts.push(`<p>${content.preamble}</p>`);

  // Parties
  parts.push(`<p><strong>Disclosing Party:</strong> ${content.parties.disclosing.name}`);
  if (content.parties.disclosing.address) {
    parts.push(`<br/>${content.parties.disclosing.address}</p>`);
  } else {
    parts.push('</p>');
  }

  parts.push(`<p><strong>Receiving Party:</strong> ${content.parties.receiving.name}`);
  if (content.parties.receiving.address) {
    parts.push(`<br/>${content.parties.receiving.address}</p>`);
  } else {
    parts.push('</p>');
  }

  // Sections
  content.sections.forEach((section) => {
    parts.push(`<h3>${section.heading}</h3>`);
    parts.push(`<p>${section.content}</p>`);
  });

  // NDA-specific signature blocks (different from letter signature)
  parts.push('<div class="nda-signatures">');
  content.signatureBlocks.forEach((block) => {
    parts.push(`<div class="nda-signature-block">`);
    parts.push(`<div class="nda-signature-line"></div>`);
    parts.push(`<p>${block.partyName}</p>`);
    block.lines.forEach((line) => {
      parts.push(`<p class="nda-signature-label">${line}</p>`);
    });
    parts.push('</div>');
  });
  parts.push('</div>');

  return parts.join('\n');
}
