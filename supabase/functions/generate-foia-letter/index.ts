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

    // Enhanced system prompt with strict requirements
    const systemPrompt = `You are a legal document specialist generating FOIA and public records request letters.

Your task is to generate a formal, legally compliant records request letter in HTML format.

## MANDATORY REQUIREMENTS (DO NOT OMIT):
1. Include the EXACT statutory citation provided (e.g., "Fla. Stat. § 119.01", "5 U.S.C. § 552")
2. Use the EXACT opening legal language provided to introduce the request
3. Include the EXACT response deadline statement from the closing language
4. If appeal rights are requested, include the EXACT appeal language provided
5. If fee notice is requested, include the EXACT fee acknowledgment language provided
6. If fee waiver is requested, include the EXACT fee waiver language provided
7. If expedited processing is requested, include the EXACT expedited language provided

## YOU MUST:
- Use the exact statutory citations - never paraphrase or abbreviate them
- Include all legal elements as provided
- Use professional, formal business letter format
- Format as proper HTML for a printable letter
- Structure the letter logically with clear paragraphs

## YOU MUST NOT:
- Remove, modify, or paraphrase any statutory citations
- Omit the response deadline requirement
- Remove appeal rights language when requested
- Invent case citations or make up legal references
- Add threatening, adversarial, or demanding language beyond what's provided
- Use casual or informal tone
- Include personal opinions

## YOU MAY:
- Adjust paragraph structure for better readability
- Add professional courtesies and transitions
- Format lists for clarity when describing multiple records
- Improve sentence flow while preserving exact legal language

## CONTENT-ONLY GENERATION RULES (CRITICAL):
YOU MUST NOT include ANY of the following:
- Inline style attributes (style="...")
- CSS declarations of any kind
- Layout properties: position, float, display, margin, padding, width, height
- Pagination properties: page-break, break-before, break-after
- Font sizing: font-size, line-height
- <style> or <script> blocks
- Class names (class="...")
- @page or @media rules

YOU MAY ONLY USE these HTML tags:
<p>, <br>, <strong>, <em>, <ul>, <ol>, <li>, <span>, <div>

The template controls ALL layout and styling. You provide CONTENT ONLY.

Output only the HTML content for the letter body, starting with the date. Do not include <html>, <head>, or <body> tags.`;

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

  if (options.requestFeeWaiver) {
    prompt += `
## FEE WAIVER REQUEST (MUST INCLUDE)
Fee Waiver Justification: ${options.feeWaiverJustification || 'Disclosure serves the public interest.'}
Fee Waiver Legal Language (USE EXACTLY): "${statuteInfo.legalLanguage.feeWaiver}"
`;
  }

  if (options.expeditedProcessing && statuteInfo.legalLanguage.expedited) {
    prompt += `
## EXPEDITED PROCESSING REQUEST (MUST INCLUDE)
Expedited Justification: ${options.expeditedJustification || 'This is a time-sensitive matter.'}
Expedited Legal Language (USE EXACTLY): "${statuteInfo.legalLanguage.expedited}"
`;
  }

  prompt += `
## FEE STRUCTURE FOR REFERENCE
- Search fees: ${statuteInfo.feeStructure.searchFee}
- Duplication fees: ${statuteInfo.feeStructure.duplicationFee}
- Review fees: ${statuteInfo.feeStructure.reviewFee}
${statuteInfo.feeStructure.freePages > 0 ? `- Free pages: First ${statuteInfo.feeStructure.freePages} pages at no charge` : ''}

Generate the complete formal letter in HTML format. Use today's date. The letter should be professional, legally compliant, and include ALL mandatory language exactly as provided.`;

  return prompt;
}
