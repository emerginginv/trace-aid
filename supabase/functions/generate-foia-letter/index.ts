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
  };
  statuteInfo: {
    statute: string;
    statuteName: string;
    responseDeadline: string;
    legalLanguage: {
      opening: string;
      closing: string;
      feeWaiver: string;
      expedited: string;
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

    const systemPrompt = `You are a legal document specialist generating FOIA and public records request letters.

Your task is to generate a formal, legally compliant records request letter in HTML format.

Requirements:
1. Use the exact statutory citation provided
2. Include all required legal elements
3. Use professional, formal business letter language
4. Format as proper HTML for a printable business letter
5. Include response deadline per statute
6. Do NOT invent case citations or legal references
7. Do NOT include threatening language

The letter should include:
- Current date
- Recipient agency address
- "RE: Public Records Request" or "RE: Freedom of Information Act Request"
- Formal salutation
- Opening paragraph with statutory citation
- Detailed description of records requested
- Date range if provided
- Delivery preference statement
- Fee waiver section if requested (with justification)
- Expedited processing section if requested (with justification)
- Closing with response deadline
- Signature block with requester information

Output only the HTML content for the letter body, starting with the date. Use proper HTML tags like <p>, <br>, <strong>, <ul>, <li> for formatting. Do not include <html>, <head>, or <body> tags.`;

    const userPrompt = buildUserPrompt(requestData);

    console.log("Generating FOIA letter for jurisdiction:", requestData.jurisdiction);

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

JURISDICTION & STATUTE:
- Statute: ${statuteInfo.statute}
- Statute Name: ${statuteInfo.statuteName}
- Response Deadline: ${statuteInfo.responseDeadline}
- Opening Legal Language: "${statuteInfo.legalLanguage.opening}"
- Closing Legal Language: "${statuteInfo.legalLanguage.closing}"

REQUESTING PARTY:
- Name: ${requestingParty.name}
- Address: ${requestingParty.address}
- City, State, ZIP: ${requestingParty.city}, ${requestingParty.state} ${requestingParty.zipCode}
- Phone: ${requestingParty.phone}
- Email: ${requestingParty.email}

RECEIVING AGENCY:
- Agency Name: ${receivingAgency.name}
${receivingAgency.department ? `- Department: ${receivingAgency.department}` : ''}
- Address: ${receivingAgency.address}

RECORDS REQUESTED:
${requestDetails.recordsDescription}
`;

  if (requestDetails.dateRangeStart || requestDetails.dateRangeEnd) {
    prompt += `
DATE RANGE:
- From: ${requestDetails.dateRangeStart || 'N/A'}
- To: ${requestDetails.dateRangeEnd || 'Present'}
`;
  }

  if (requestDetails.caseNumber) {
    prompt += `
REFERENCE CASE NUMBER: ${requestDetails.caseNumber}
`;
  }

  if (requestDetails.purpose) {
    prompt += `
PURPOSE OF REQUEST:
${requestDetails.purpose}
`;
  }

  prompt += `
DELIVERY PREFERENCE: ${options.deliveryPreference}
${options.deliveryPreference === 'email' && options.deliveryEmail ? `Email Address: ${options.deliveryEmail}` : ''}
${options.deliveryPreference === 'portal' && options.portalUrl ? `Portal URL: ${options.portalUrl}` : ''}
`;

  if (options.requestFeeWaiver) {
    prompt += `
FEE WAIVER REQUESTED: Yes
Fee Waiver Justification: ${options.feeWaiverJustification || 'Disclosure serves the public interest.'}
Fee Waiver Legal Language: "${statuteInfo.legalLanguage.feeWaiver}"
`;
  }

  if (options.expeditedProcessing && statuteInfo.legalLanguage.expedited) {
    prompt += `
EXPEDITED PROCESSING REQUESTED: Yes
Expedited Justification: ${options.expeditedJustification || 'Time-sensitive matter.'}
Expedited Legal Language: "${statuteInfo.legalLanguage.expedited}"
`;
  }

  prompt += `
Generate the complete formal letter in HTML format. Use today's date.`;

  return prompt;
}
