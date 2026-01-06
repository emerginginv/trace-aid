// Letter generation functions for each category

export function generatePublicRecordsLetter(formData: {
  agencyName: string;
  agencyAddress: string;
  recordsRequested: string;
  purpose: string;
  legalAuthority: string;
  customAuthority: string;
  formatPreference: string;
  requestFeeWaiver: boolean;
  feeWaiverJustification: string;
}): string {
  let body = `<p style="text-align: right;">{{current_date}}</p>`;
  body += `<p>${formData.agencyName || '{{agency_name}}'}<br/>`;
  body += `${formData.agencyAddress || '{{agency_address}}'}</p>`;
  body += `<p><strong>RE: Public Records Request</strong></p>`;
  body += `<p>Dear Records Custodian,</p>`;
  
  const authority = formData.legalAuthority === 'custom' 
    ? formData.customAuthority 
    : 'applicable public records laws';
  
  body += `<p>Pursuant to ${authority}, I am requesting access to and copies of the following records:</p>`;
  body += `<blockquote style="border-left: 2px solid #ccc; padding-left: 1rem; margin: 1rem 0;">`;
  body += `${formData.recordsRequested || '{{records_requested}}'}</blockquote>`;
  
  if (formData.purpose) {
    body += `<p><strong>Purpose:</strong> ${formData.purpose}</p>`;
  }
  
  const formatText = formData.formatPreference === 'electronic' 
    ? 'electronic format (PDF preferred)'
    : formData.formatPreference === 'paper' 
      ? 'paper copies' 
      : 'either electronic or paper format';
  body += `<p>I request that records be provided in ${formatText}.</p>`;
  
  if (formData.requestFeeWaiver) {
    body += `<p>I am requesting a waiver of any applicable fees. ${formData.feeWaiverJustification}</p>`;
  }
  
  body += `<p>Please respond within the time period required by law. If you have any questions, please contact me at the information provided below.</p>`;
  body += `<p>Sincerely,</p>`;
  body += `<p>{{signature_name}}<br/>{{company_name}}<br/>{{company_phone}}<br/>{{company_email}}</p>`;
  
  return body;
}

export function generateStatePRALetter(formData: {
  state: string;
  agencyName: string;
  agencyAddress: string;
  recordsRequested: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  formatPreference: string;
  expeditedProcessing: boolean;
  expeditedReason: string;
  requestFeeWaiver: boolean;
  feeWaiverJustification: string;
}, stateInfo: { label: string; statute: string } | null): string {
  let body = `<p style="text-align: right;">{{current_date}}</p>`;
  body += `<p>${formData.agencyName || '{{agency_name}}'}<br/>`;
  body += `${formData.agencyAddress || '{{agency_address}}'}</p>`;
  body += `<p><strong>RE: Public Records Request Pursuant to ${stateInfo?.statute || '[State Statute]'}</strong></p>`;
  body += `<p>Dear Records Custodian,</p>`;
  body += `<p>Pursuant to ${stateInfo?.statute || 'the applicable state public records act'}, I hereby request access to and copies of the following records:</p>`;
  body += `<blockquote style="border-left: 2px solid #ccc; padding-left: 1rem; margin: 1rem 0;">`;
  body += `${formData.recordsRequested || '{{records_requested}}'}</blockquote>`;
  
  if (formData.dateRangeStart || formData.dateRangeEnd) {
    body += `<p><strong>Date Range:</strong> ${formData.dateRangeStart || 'N/A'} to ${formData.dateRangeEnd || 'Present'}</p>`;
  }
  
  if (formData.expeditedProcessing) {
    body += `<p><strong>Request for Expedited Processing:</strong> ${formData.expeditedReason || 'Urgent matter requiring immediate attention.'}</p>`;
  }
  
  if (formData.requestFeeWaiver) {
    body += `<p><strong>Fee Waiver Request:</strong> ${formData.feeWaiverJustification || 'Request waiver of applicable fees.'}</p>`;
  }
  
  body += `<p>Please respond within the statutory time period. Contact me with any questions.</p>`;
  body += `<p>Sincerely,</p>`;
  body += `<p>{{signature_name}}<br/>{{company_name}}</p>`;
  
  return body;
}

export function generateFOIALetter(formData: {
  federalAgency: string;
  subAgency: string;
  recordsRequested: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  feeCategory: string;
  formatPreference: string;
  requestFeeWaiver: boolean;
  feeWaiverJustification: string;
  expeditedProcessing: boolean;
  expeditedJustification: string;
}): string {
  let body = `<p style="text-align: right;">{{current_date}}</p>`;
  body += `<p>FOIA Officer<br/>`;
  body += `${formData.federalAgency || '{{federal_agency}}'}<br/>`;
  if (formData.subAgency) {
    body += `${formData.subAgency}<br/>`;
  }
  body += `</p>`;
  body += `<p><strong>RE: Freedom of Information Act Request</strong></p>`;
  body += `<p>Dear FOIA Officer,</p>`;
  body += `<p>Pursuant to the Freedom of Information Act, 5 U.S.C. § 552, I am requesting access to and copies of the following records:</p>`;
  body += `<blockquote style="border-left: 2px solid #ccc; padding-left: 1rem; margin: 1rem 0;">`;
  body += `${formData.recordsRequested || '{{records_requested}}'}</blockquote>`;
  
  if (formData.dateRangeStart || formData.dateRangeEnd) {
    body += `<p><strong>Date Range:</strong> ${formData.dateRangeStart || 'N/A'} to ${formData.dateRangeEnd || 'Present'}</p>`;
  }
  
  const feeCategoryLabels: Record<string, string> = {
    commercial: 'Commercial Use',
    educational: 'Educational Institution',
    news_media: 'News Media',
    scientific: 'Scientific Institution',
    other: 'Other',
  };
  body += `<p><strong>Fee Category:</strong> ${feeCategoryLabels[formData.feeCategory] || 'Other'}</p>`;
  
  if (formData.requestFeeWaiver) {
    body += `<p><strong>Fee Waiver Request:</strong> ${formData.feeWaiverJustification || 'Disclosure is in the public interest.'}</p>`;
  }
  
  if (formData.expeditedProcessing) {
    body += `<p><strong>Expedited Processing Request:</strong> ${formData.expeditedJustification || 'Urgent processing requested.'}</p>`;
  }
  
  body += `<p>Please respond within 20 business days as required by law.</p>`;
  body += `<p>Sincerely,</p>`;
  body += `<p>{{signature_name}}<br/>{{company_name}}</p>`;
  
  return body;
}

export function generateNDALetter(formData: {
  agreementType: string;
  disclosingParty: string;
  disclosingAddress: string;
  receivingParty: string;
  receivingAddress: string;
  purposeOfDisclosure: string;
  confidentialInfoDefinition: string;
  duration: string;
  governingLaw: string;
  disputeResolution: string;
  includeNonSolicitation: boolean;
  includeNonCompete: boolean;
}): string {
  const isMutual = formData.agreementType === 'mutual';
  
  let body = `<h2 style="text-align: center;">${isMutual ? 'MUTUAL ' : ''}NON-DISCLOSURE AGREEMENT</h2>`;
  body += `<p>This Non-Disclosure Agreement ("Agreement") is entered into as of {{current_date}} by and between:</p>`;
  body += `<p><strong>Disclosing Party:</strong> ${formData.disclosingParty || '{{disclosing_party}}'}<br/>`;
  body += `${formData.disclosingAddress || '{{disclosing_address}}'}</p>`;
  body += `<p><strong>Receiving Party:</strong> ${formData.receivingParty || '{{receiving_party}}'}<br/>`;
  body += `${formData.receivingAddress || '{{receiving_address}}'}</p>`;
  
  body += `<h3>1. Purpose</h3>`;
  body += `<p>${formData.purposeOfDisclosure || 'The parties wish to explore a potential business relationship and may need to share confidential information.'}</p>`;
  
  body += `<h3>2. Definition of Confidential Information</h3>`;
  body += `<p>${formData.confidentialInfoDefinition || 'Confidential Information means any and all information or data that has or could have commercial value or other utility in the business in which the disclosing party is engaged.'}</p>`;
  
  body += `<h3>3. Obligations of Receiving Party</h3>`;
  body += `<p>The Receiving Party agrees to: (a) hold the Confidential Information in strict confidence; (b) not to disclose the Confidential Information to any third parties; (c) not to use the Confidential Information for any purpose except as necessary for the Purpose.</p>`;
  
  body += `<h3>4. Term</h3>`;
  body += `<p>This Agreement shall remain in effect for ${formData.duration === 'perpetual' ? 'perpetuity' : `${formData.duration} year(s)`} from the date of execution.</p>`;
  
  if (formData.governingLaw) {
    body += `<h3>5. Governing Law</h3>`;
    body += `<p>This Agreement shall be governed by and construed in accordance with the laws of the State of ${formData.governingLaw}.</p>`;
  }
  
  if (formData.includeNonSolicitation) {
    body += `<h3>Non-Solicitation</h3>`;
    body += `<p>During the term of this Agreement and for a period of one (1) year thereafter, neither party shall solicit or hire any employee of the other party.</p>`;
  }
  
  if (formData.includeNonCompete) {
    body += `<h3>Non-Compete</h3>`;
    body += `<p>During the term of this Agreement, the Receiving Party agrees not to engage in any business activity that directly competes with the Disclosing Party's business.</p>`;
  }
  
  body += `<div style="margin-top: 3rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">`;
  body += `<div><p style="border-top: 1px solid #000; padding-top: 0.5rem;">${formData.disclosingParty || 'Disclosing Party'}<br/>Signature / Date</p></div>`;
  body += `<div><p style="border-top: 1px solid #000; padding-top: 0.5rem;">${formData.receivingParty || 'Receiving Party'}<br/>Signature / Date</p></div>`;
  body += `</div>`;
  
  return body;
}

export function generateCorrespondenceLetter(formData: {
  recipientType: string;
  recipientName: string;
  recipientTitle: string;
  recipientAddress: string;
  subject: string;
  salutation: string;
  tone: string;
  closingLine: string;
}, bodySections: { id: string; content: string }[]): string {
  let body = `<p style="text-align: right;">{{current_date}}</p>`;
  body += `<p>${formData.recipientTitle ? formData.recipientTitle + ' ' : ''}${formData.recipientName || '{{recipient_name}}'}<br/>`;
  body += `${formData.recipientAddress || '{{recipient_address}}'}</p>`;
  
  if (formData.subject) {
    body += `<p><strong>RE: ${formData.subject}</strong></p>`;
  }
  
  const salutation = formData.salutation === 'formal'
    ? `Dear ${formData.recipientTitle ? formData.recipientTitle + ' ' : ''}${formData.recipientName || '{{recipient_name}}'}`
    : `Hello ${formData.recipientName || '{{recipient_name}}'}`;
  body += `<p>${salutation},</p>`;
  
  bodySections.forEach((section, index) => {
    body += `<p>${section.content || `{{paragraph_${index + 1}}}`}</p>`;
  });
  
  if (formData.closingLine) {
    body += `<p>${formData.closingLine}</p>`;
  }
  
  body += `<p>Sincerely,</p>`;
  body += `<p>{{signature_name}}<br/>{{signature_title}}<br/>{{company_name}}<br/>{{company_phone}}<br/>{{company_email}}</p>`;
  
  return body;
}
