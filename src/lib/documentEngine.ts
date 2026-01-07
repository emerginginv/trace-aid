import { format } from "date-fns";
import { CaseVariables } from "./caseVariables";
import { OrganizationProfile, formatFullAddress } from "./organizationProfile";
import { resolveConditionals, buildConditionalContextFromCase, ConditionalContext } from "./letterTemplateRenderer";

export interface DocumentVariables {
  // Organization data
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  company_logo: string;
  
  // Case data
  case_title: string;
  case_number: string;
  reference_number: string;
  assignment_date: string;
  due_date: string;
  case_manager: string;
  client_list: string;
  primary_client: string;
  subject_list: string;
  primary_subject: string;
  investigator_list: string;
  case_description: string;
  case_status: string;
  
  // Date/metadata
  current_date: string;
  document_date: string;
}

// Build document variables from case and organization data
export function buildDocumentVariables(
  caseData: CaseVariables,
  orgProfile: OrganizationProfile | null
): DocumentVariables {
  const now = new Date();
  
  return {
    // Organization data
    company_name: orgProfile?.companyName || '',
    company_address: orgProfile ? formatFullAddress(
      orgProfile.streetAddress,
      orgProfile.city,
      orgProfile.state,
      orgProfile.zipCode
    ) : '',
    company_phone: orgProfile?.phone || '',
    company_email: orgProfile?.email || '',
    company_website: orgProfile?.websiteUrl || '',
    company_logo: '', // Logo URL would be fetched separately
    
    // Case data
    case_title: caseData.caseTitle || '',
    case_number: caseData.caseNumber || '',
    reference_number: caseData.referenceNumber || '',
    assignment_date: caseData.assignmentDate 
      ? format(new Date(caseData.assignmentDate), 'MMMM d, yyyy')
      : '',
    due_date: caseData.dueDate
      ? format(new Date(caseData.dueDate), 'MMMM d, yyyy')
      : '',
    case_manager: caseData.caseManager || '',
    client_list: caseData.clientList || '',
    primary_client: caseData.primaryClient?.name || '',
    subject_list: caseData.subjectList || '',
    primary_subject: caseData.primarySubject?.name || '',
    investigator_list: caseData.investigatorList || '',
    case_description: '',
    case_status: '',
    
    // Date/metadata
    current_date: format(now, 'MMMM d, yyyy'),
    document_date: format(now, 'MMMM d, yyyy'),
  };
}

// Get all available placeholder variables with descriptions
export function getAvailablePlaceholders(): { variable: string; description: string; category: string }[] {
  return [
    // Organization
    { variable: '{{company_name}}', description: 'Organization name', category: 'Organization' },
    { variable: '{{company_address}}', description: 'Full formatted address', category: 'Organization' },
    { variable: '{{company_phone}}', description: 'Phone number', category: 'Organization' },
    { variable: '{{company_email}}', description: 'Email address', category: 'Organization' },
    { variable: '{{company_website}}', description: 'Website URL', category: 'Organization' },
    
    // Case
    { variable: '{{case_title}}', description: 'Case title', category: 'Case' },
    { variable: '{{case_number}}', description: 'Case number', category: 'Case' },
    { variable: '{{reference_number}}', description: 'Reference number', category: 'Case' },
    { variable: '{{assignment_date}}', description: 'Assignment date', category: 'Case' },
    { variable: '{{due_date}}', description: 'Due date', category: 'Case' },
    { variable: '{{case_manager}}', description: 'Case manager name', category: 'Case' },
    { variable: '{{case_description}}', description: 'Case description', category: 'Case' },
    { variable: '{{case_status}}', description: 'Case status', category: 'Case' },
    
    // People
    { variable: '{{client_list}}', description: 'All clients (comma-separated)', category: 'People' },
    { variable: '{{primary_client}}', description: 'Primary client name', category: 'People' },
    { variable: '{{subject_list}}', description: 'All subjects (comma-separated)', category: 'People' },
    { variable: '{{primary_subject}}', description: 'Primary subject name', category: 'People' },
    { variable: '{{investigator_list}}', description: 'Investigators (comma-separated)', category: 'People' },
    
    // Dates
    { variable: '{{current_date}}', description: 'Today\'s date', category: 'Dates' },
    { variable: '{{document_date}}', description: 'Document generation date', category: 'Dates' },
  ];
}

// Replace placeholders in template body with actual values
export function renderDocument(
  templateBody: string,
  variables: DocumentVariables,
  conditionalContext?: Partial<ConditionalContext>
): string {
  let rendered = templateBody;
  
  // Step 1: Resolve conditionals first (remove/keep [IF]...[/IF] blocks)
  if (conditionalContext) {
    rendered = resolveConditionals(rendered, conditionalContext);
  }
  
  // Step 2: Replace all placeholders
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
    rendered = rendered.replace(regex, value || '');
  });
  
  return rendered;
}

// Wrap rendered content in a printable document structure
export function wrapInDocumentHtml(
  content: string,
  title: string,
  includeLetterhead: boolean = true,
  orgProfile?: OrganizationProfile | null
): string {
  const letterhead = includeLetterhead && orgProfile ? `
    <div style="border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
      <div style="font-size: 24px; font-weight: bold; color: #333;">${orgProfile.companyName || ''}</div>
      ${orgProfile.streetAddress || orgProfile.city ? `
        <div style="font-size: 12px; color: #666; margin-top: 5px;">
          ${formatFullAddress(orgProfile.streetAddress, orgProfile.city, orgProfile.state, orgProfile.zipCode)}
        </div>
      ` : ''}
      <div style="font-size: 12px; color: #666;">
        ${[orgProfile.phone, orgProfile.email, orgProfile.websiteUrl].filter(Boolean).join(' • ')}
      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page {
          size: letter;
          margin: 1in;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #333;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0;
        }
        .document-content {
          padding: 0;
        }
        p {
          margin: 0 0 12pt 0;
        }
        h1 { font-size: 18pt; margin: 24pt 0 12pt 0; }
        h2 { font-size: 14pt; margin: 18pt 0 9pt 0; }
        h3 { font-size: 12pt; margin: 12pt 0 6pt 0; }
        .letterhead {
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        @media print {
          body { margin: 0; padding: 0; }
        }
      </style>
    </head>
    <body>
      ${letterhead}
      <div class="document-content">
        ${content}
      </div>
    </body>
    </html>
  `;
}

// Generate a preview of the document (limited content)
export function generateDocumentPreview(
  templateBody: string,
  variables: DocumentVariables,
  maxLength: number = 500
): string {
  const rendered = renderDocument(templateBody, variables);
  // Strip HTML tags for preview
  const textOnly = rendered.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (textOnly.length > maxLength) {
    return textOnly.substring(0, maxLength) + '...';
  }
  return textOnly;
}

// Default template bodies for each document type
export function getDefaultTemplateBody(documentType: string): string {
  switch (documentType) {
    case 'letter':
      return `<p>{{current_date}}</p>

<p>{{primary_client}}<br>
[Client Address]</p>

<p>Re: {{case_title}}<br>
Case Number: {{case_number}}</p>

<p>Dear {{primary_client}},</p>

<p>Thank you for retaining {{company_name}} to assist with your investigation needs. This letter serves to confirm our engagement and provide an update on the matter referenced above.</p>

<p>[Body of letter]</p>

<p>Please do not hesitate to contact our office should you have any questions or require additional information.</p>

<p>Sincerely,</p>

<p>{{case_manager}}<br>
{{company_name}}<br>
{{company_phone}}<br>
{{company_email}}</p>`;

    case 'notice':
      return `<h2 style="text-align: center;">NOTICE</h2>

<p><strong>Date:</strong> {{current_date}}</p>
<p><strong>Re:</strong> {{case_title}}</p>
<p><strong>Case Number:</strong> {{case_number}}</p>

<p>Please be advised that:</p>

<p>[Notice content]</p>

<p>If you have any questions regarding this notice, please contact:</p>

<p>{{company_name}}<br>
{{company_address}}<br>
{{company_phone}}<br>
{{company_email}}</p>`;

    case 'request':
      return `<p>{{current_date}}</p>

<p>[Recipient Name]<br>
[Recipient Title]<br>
[Organization]<br>
[Address]</p>

<p>Re: Records Request - {{case_title}}<br>
Case Number: {{case_number}}</p>

<p>Dear Sir/Madam,</p>

<p>On behalf of our client, {{primary_client}}, we are requesting the following records and/or information:</p>

<p>[Specify records requested]</p>

<p>This request is made in connection with an ongoing investigation. Please direct any correspondence or documents to our office at the address below.</p>

<p>Thank you for your prompt attention to this matter.</p>

<p>Sincerely,</p>

<p>{{case_manager}}<br>
{{company_name}}<br>
{{company_address}}<br>
{{company_phone}}<br>
{{company_email}}</p>`;

    case 'agreement':
      return `<h2 style="text-align: center;">SERVICE AGREEMENT</h2>

<p><strong>Agreement Date:</strong> {{current_date}}</p>

<p>This Agreement is entered into between:</p>

<p><strong>{{company_name}}</strong> ("Company")<br>
{{company_address}}<br>
{{company_phone}} | {{company_email}}</p>

<p>AND</p>

<p><strong>{{primary_client}}</strong> ("Client")</p>

<p><strong>Re:</strong> {{case_title}}<br>
<strong>Case Number:</strong> {{case_number}}</p>

<hr>

<h3>1. SCOPE OF SERVICES</h3>
<p>[Define the services to be provided]</p>

<h3>2. FEES AND PAYMENT</h3>
<p>[Define fee structure and payment terms]</p>

<h3>3. CONFIDENTIALITY</h3>
<p>All information obtained during the course of this investigation shall be treated as confidential.</p>

<h3>4. TERM</h3>
<p>This agreement shall commence on {{assignment_date}} and continue until the services are completed or terminated by either party.</p>

<hr>

<p><strong>AGREED AND ACCEPTED:</strong></p>

<table style="width: 100%; margin-top: 40px;">
<tr>
<td style="width: 45%;">
<p>______________________________<br>
{{company_name}}<br>
Date: _____________</p>
</td>
<td style="width: 10%;"></td>
<td style="width: 45%;">
<p>______________________________<br>
{{primary_client}}<br>
Date: _____________</p>
</td>
</tr>
</table>`;

    default:
      return `<p>{{current_date}}</p>

<p>[Content]</p>

<p>{{company_name}}<br>
{{company_phone}}<br>
{{company_email}}</p>`;
  }
}
