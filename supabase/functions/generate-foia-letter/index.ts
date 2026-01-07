import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestData {
  jurisdiction: string;
  requestingParty: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email: string;
  };
  receivingAgency: {
    name: string;
    department?: string;
    address: string;
  };
  requestDetails: {
    recordsDescription: string;
    dateRangeStart?: string;
    dateRangeEnd?: string;
    purpose?: string;
    caseNumber?: string;
  };
  options: {
    deliveryPreference: 'email' | 'mail' | 'portal';
    deliveryEmail?: string;
    portalUrl?: string;
    requestFeeWaiver: boolean;
    feeWaiverJustification?: string;
    expeditedProcessing: boolean;
    expeditedJustification?: string;
    includeAppealRights: boolean;
    includeFeeNotice: boolean;
  };
  statuteInfo: {
    statute: string;
    statuteName: string;
    responseDeadline: string;
    appealProvision: string;
    appealDeadline: string;
    appealBody: string;
    feeStructure: {
      searchFee: string;
      duplicationFee: string;
      reviewFee: string;
      freePages: number;
    };
    legalLanguage: {
      opening: string;
      closing: string;
      feeWaiver: string;
      expedited: string;
      appeal: string;
      feeNotice: string;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: RequestData = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Enhanced system prompt - REUSABLE TEMPLATE GENERATION WITH CONDITIONAL SYNTAX
    const systemPrompt = `You are a legal document specialist generating REUSABLE TEMPLATE BODY CONTENT for FOIA and public records requests.

## TEMPLATE GENERATION RULES (NON-NEGOTIABLE)

You are creating a GENERAL-PURPOSE template, NOT a case-specific document.
Templates must be reusable across UNLIMITED cases.
Templates define WHERE content goes, not WHAT the content is.

### CONDITIONAL PLACEHOLDER SYNTAX (CRITICAL)

Use this exact syntax for optional sections:

[IF fee_waiver_enabled]
{{FEE_WAIVER_CONTENT}}
[/IF]

[IF expedited_enabled]
{{EXPEDITED_CONTENT}}
[/IF]

[IF has_date_range]
{{DATE_RANGE_START}} to {{DATE_RANGE_END}}
[/IF]

### AI CONTENT BOUNDARY (CRITICAL)
You are generating BODY CONTENT ONLY. The system handles all other sections.

YOU MUST NOT GENERATE (system-controlled):
- Letterhead or organization branding
- Date blocks (no standalone dates at the start)
- Recipient address blocks
- Salutation (e.g., "Dear...")
- Signature blocks (e.g., "Sincerely,")
- Closing phrases
- Footer content
- Any header/logo references

YOU MAY ONLY GENERATE:
- Body paragraphs with statutory language
- Neutral introductory language
- Placeholders for case-specific data
- Response deadline language
- Optional section markers using [IF]...[/IF] syntax

### REQUIRED PLACEHOLDERS

- {{RECORDS_REQUESTED}} - Description of records sought
- {{STATUTORY_OPENING}} - Opening legal language (or include directly)
- {{RESPONSE_DEADLINE}} - Response deadline statement (or include directly)

### CONDITIONAL SECTIONS (use [IF]...[/IF] syntax)

- [IF fee_waiver_enabled]{{FEE_WAIVER_CONTENT}}[/IF]
- [IF expedited_enabled]{{EXPEDITED_CONTENT}}[/IF]
- [IF has_date_range]{{DATE_RANGE_START}} to {{DATE_RANGE_END}}[/IF]
- [IF appeal_rights_enabled]{{APPEAL_RIGHTS_CONTENT}}[/IF]
- [IF fee_notice_enabled]{{FEE_NOTICE_CONTENT}}[/IF]

### FORBIDDEN (CASE-SPECIFIC CONTENT)

- "I request a waiver because..." (case-specific)
- "This is urgent due to..." (case-specific)
- "Disclosure is in the public interest because X" (case-specific)
- Any filled-in justification text
- Any narrative explaining "why" beyond generic placeholders
- Expedited processing reasons (use placeholder instead)
- Fee waiver justifications (use placeholder instead)
- Hardcoded names, dates, or addresses

### EXAMPLE TEMPLATE OUTPUT

<p>Pursuant to the Freedom of Information Act, 5 U.S.C. § 552, I am requesting access to and copies of the following records:</p>

<blockquote>{{RECORDS_REQUESTED}}</blockquote>

[IF has_date_range]
<p><strong>Date Range:</strong> {{DATE_RANGE_START}} to {{DATE_RANGE_END}}</p>
[/IF]

[IF fee_waiver_enabled]
<div class="optional-section">
  <p><strong>Fee Waiver Request:</strong></p>
  {{FEE_WAIVER_CONTENT}}
</div>
[/IF]

[IF expedited_enabled]
<div class="optional-section">
  <p><strong>Expedited Processing:</strong></p>
  {{EXPEDITED_CONTENT}}
</div>
[/IF]

<p>Please respond within 20 business days as required by law.</p>

[IF appeal_rights_enabled]
{{APPEAL_RIGHTS_CONTENT}}
[/IF]

### CONTENT-ONLY GENERATION RULES:
YOU MUST NOT include:
- Inline style attributes (style="...")
- CSS declarations
- Layout properties
- <style> or <script> blocks
- Class names (class="...")

YOU MAY ONLY USE these HTML tags:
<p>, <br>, <strong>, <em>, <ul>, <ol>, <li>, <span>, <div>, <blockquote>

Start your response with the FIRST body paragraph. Output clean HTML paragraphs only.`;

    const userPrompt = buildUserPrompt(requestData);

    console.log("Generating FOIA letter for jurisdiction:", requestData.jurisdiction);
    console.log("Including appeal rights:", requestData.options.includeAppealRights);
    console.log("Including fee notice:", requestData.options.includeFeeNotice);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedHtml = data.choices?.[0]?.message?.content || "";

    console.log("Successfully generated FOIA letter");

    return new Response(JSON.stringify({ html: generatedHtml }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating FOIA letter:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildUserPrompt(data: RequestData): string {
  const { requestingParty, receivingAgency, requestDetails, options, statuteInfo } = data;
  
  let prompt = `Generate a formal public records request letter with the following details:

## JURISDICTION & STATUTE INFORMATION
- Statute Citation: ${statuteInfo.statute}
- Statute Name: ${statuteInfo.statuteName}
- Response Deadline: ${statuteInfo.responseDeadline}
- Appeal Body: ${statuteInfo.appealBody}
- Appeal Deadline: ${statuteInfo.appealDeadline}

## MANDATORY LEGAL LANGUAGE (USE EXACTLY AS PROVIDED)
Opening Paragraph Language: "${statuteInfo.legalLanguage.opening}"
Closing Paragraph Language: "${statuteInfo.legalLanguage.closing}"
`;

  if (options.includeAppealRights && statuteInfo.legalLanguage.appeal) {
    prompt += `\nAppeal Rights Language (MUST INCLUDE): "${statuteInfo.legalLanguage.appeal}"`;
  }

  if (options.includeFeeNotice && statuteInfo.legalLanguage.feeNotice) {
    prompt += `\nFee Notice Language (MUST INCLUDE): "${statuteInfo.legalLanguage.feeNotice}"`;
  }

  prompt += `

## REQUESTING PARTY
- Name: ${requestingParty.name}
- Address: ${requestingParty.address}
- City, State, ZIP: ${requestingParty.city}, ${requestingParty.state} ${requestingParty.zipCode}
- Phone: ${requestingParty.phone}
- Email: ${requestingParty.email}

## RECEIVING AGENCY
- Agency Name: ${receivingAgency.name}
${receivingAgency.department ? `- Department: ${receivingAgency.department}` : ''}
- Address: ${receivingAgency.address}

## RECORDS REQUESTED
${requestDetails.recordsDescription}
`;

  if (requestDetails.dateRangeStart || requestDetails.dateRangeEnd) {
    prompt += `
## DATE RANGE FOR RECORDS
- From: ${requestDetails.dateRangeStart || 'Beginning of available records'}
- To: ${requestDetails.dateRangeEnd || 'Present'}
`;
  }

  if (requestDetails.caseNumber) {
    prompt += `
## REFERENCE NUMBER
Case/Reference Number: ${requestDetails.caseNumber}
`;
  }

  if (requestDetails.purpose) {
    prompt += `
## PURPOSE OF REQUEST
${requestDetails.purpose}
`;
  }

  prompt += `
## DELIVERY PREFERENCE
Preferred delivery method: ${options.deliveryPreference === 'email' ? 'Electronic delivery via email' : options.deliveryPreference === 'mail' ? 'Physical mail' : 'Agency online portal'}
${options.deliveryPreference === 'email' && options.deliveryEmail ? `Email Address for delivery: ${options.deliveryEmail}` : ''}
${options.deliveryPreference === 'portal' && options.portalUrl ? `Portal URL: ${options.portalUrl}` : ''}
`;

  // Fee waiver - always included as conditional placeholder (case-level setting controls visibility)
  prompt += `
## FEE WAIVER SECTION (ALWAYS INCLUDE AS CONDITIONAL)
Include a fee waiver section wrapped with [IF fee_waiver_enabled]...[/IF] conditional markers.
Fee Waiver Legal Language (USE EXACTLY): "${statuteInfo.legalLanguage.feeWaiver}"
For the justification, use the placeholder: {{fee_waiver_justification}}
DO NOT fill in specific reasons - the case will provide those later.
`;

  // Expedited processing - always included as conditional placeholder (case-level setting controls visibility)
  if (statuteInfo.legalLanguage.expedited) {
    prompt += `
## EXPEDITED PROCESSING SECTION (ALWAYS INCLUDE AS CONDITIONAL)
Include an expedited processing section wrapped with [IF expedited_enabled]...[/IF] conditional markers.
Expedited Legal Language (USE EXACTLY): "${statuteInfo.legalLanguage.expedited}"
For the justification, use the placeholder: {{expedited_justification}}
DO NOT fill in specific reasons - the case will provide those later.
`;
  }

  prompt += `
## FEE STRUCTURE FOR REFERENCE
- Search fees: ${statuteInfo.feeStructure.searchFee}
- Duplication fees: ${statuteInfo.feeStructure.duplicationFee}
- Review fees: ${statuteInfo.feeStructure.reviewFee}
${statuteInfo.feeStructure.freePages > 0 ? `- Free pages: First ${statuteInfo.feeStructure.freePages} pages at no charge` : ''}

Generate a REUSABLE TEMPLATE body in HTML format. Use {{current_date}} for the date placeholder. The template should be professional, legally compliant, and use PLACEHOLDERS for all case-specific content.`;

  return prompt;
}
