import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NDARequest {
  agreementType: 'mutual' | 'unilateral';
  disclosingParty: {
    name: string;
    address: string;
  };
  receivingParty: {
    name: string;
    address: string;
  };
  purpose: string;
  termLength: string;
  governingState: string;
  stateProvisions: {
    governingLawLanguage: string;
    venueLanguage: string;
    tradeSecretStatute: string;
    tradeSecretStatuteName: string;
  };
  options: {
    style: 'standard' | 'simplified' | 'tightened';
    includeNonSolicitation: boolean;
    includeNonCompete: boolean;
    disputeResolution: 'litigation' | 'arbitration' | 'mediation';
  };
  confidentialInfoDefinition?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: NDARequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { 
      agreementType, 
      disclosingParty, 
      receivingParty, 
      purpose, 
      termLength, 
      governingState,
      stateProvisions,
      options,
      confidentialInfoDefinition
    } = requestData;

    // Build the system prompt with strict structural requirements - BODY CONTENT ONLY
    const systemPrompt = `You are a legal document specialist generating Non-Disclosure Agreements (NDAs).

## AI CONTENT BOUNDARY (CRITICAL)
You are generating the AGREEMENT BODY CONTENT ONLY. The system handles letterhead and page framing.

YOU MUST NOT GENERATE (system-controlled):
- Letterhead or organization branding at the top
- Standalone date blocks before the agreement title
- Any header/logo references

YOU MAY GENERATE:
- Agreement title and recitals
- All NDA clauses and sections
- Signature blocks (these are part of the NDA structure, not letter structure)

Generate a professional, enforceable NDA in HTML format based on the provided information.

## STRUCTURAL CLAUSES (NEVER MODIFY OR OMIT):
You MUST include ALL of these sections in order:

1. **RECITALS** - Introduction of parties and purpose
2. **DEFINITION OF CONFIDENTIAL INFORMATION** - Comprehensive definition of what is protected
3. **EXCLUSIONS FROM CONFIDENTIALITY** - Standard legal exclusions (public information, prior knowledge, independent development, required disclosure)
4. **OBLIGATIONS OF RECEIVING PARTY** - Non-disclosure, limited use, reasonable care, need-to-know basis
5. **TERM AND TERMINATION** - Duration and survival provisions
6. **RETURN OF MATERIALS** - Obligations upon termination
7. **REMEDIES** - Include injunctive relief language and reference to trade secret statute
8. **GOVERNING LAW AND JURISDICTION** - Use the EXACT governing law language provided
9. **GENERAL PROVISIONS** - Severability, entire agreement, amendment, waiver, assignment
10. **SIGNATURE BLOCKS** - For both parties with date lines

## STYLE REQUIREMENTS:
${options.style === 'standard' ? 
  '- Use professional business language with industry-standard legal terms\n- Maintain formal tone throughout\n- Include standard legal definitions' :
  options.style === 'simplified' ?
  '- Use plain English that is easier to understand\n- Avoid excessive legal jargon while maintaining legal effect\n- Explain complex terms when used' :
  '- Use more restrictive language with stronger protections\n- Include broader definitions of confidential information\n- Add stricter obligations and penalties'
}

## GOVERNING LAW:
Use this EXACT governing law language: "${stateProvisions.governingLawLanguage}"

Use this EXACT venue language: "${stateProvisions.venueLanguage}"

Reference this trade secret statute in remedies section: ${stateProvisions.tradeSecretStatuteName} (${stateProvisions.tradeSecretStatute})

## DISPUTE RESOLUTION:
${options.disputeResolution === 'litigation' ? 
  'Include standard litigation clause with venue specified above.' :
  options.disputeResolution === 'arbitration' ?
  'Include binding arbitration clause with AAA or JAMS rules, arbitrator selection process, and location.' :
  'Include mediation-first clause requiring good faith mediation before litigation.'
}

${options.includeNonSolicitation ? `
## NON-SOLICITATION CLAUSE:
Include a non-solicitation provision preventing solicitation of employees, contractors, and business relationships for a reasonable period.
` : ''}

${options.includeNonCompete ? `
## NON-COMPETE CLAUSE:
Include a carefully drafted non-compete provision. Note: This may not be enforceable in all jurisdictions.
` : ''}

## FORMATTING REQUIREMENTS:
- Output clean HTML suitable for PDF generation
- Use proper heading hierarchy (h1 for title, h2 for sections)
- Use ordered lists for numbered clauses
- Make signature blocks clearly formatted with lines for signatures and dates

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
<h1>, <h2>, <h3>, <p>, <br>, <strong>, <em>, <ol>, <ul>, <li>, <span>, <div>, <table>, <tr>, <td>, <th>

The template controls ALL layout and styling. You provide CONTENT ONLY.

## YOU MUST NOT:
- Remove or modify any structural clause
- Change the meaning of protective provisions
- Omit the governing law or venue language
- Add clauses not requested
- Use aggressive or threatening language
- Include any placeholder text like "[insert]" or "[TBD]"
- Add letterhead or branding at the top`;

    // Build the user prompt with specific details
    const userPrompt = `Generate a ${agreementType === 'mutual' ? 'Mutual' : 'Unilateral'} Non-Disclosure Agreement with the following details:

**PARTIES:**
Disclosing Party: ${disclosingParty.name}
Address: ${disclosingParty.address}

Receiving Party: ${receivingParty.name}
Address: ${receivingParty.address}

**PURPOSE OF DISCLOSURE:**
${purpose}

**TERM:**
${termLength === 'perpetual' ? 'Perpetual (continues indefinitely)' : `${termLength} year(s) from the date of execution`}

**GOVERNING STATE:** ${governingState}

${confidentialInfoDefinition ? `**SPECIFIC CONFIDENTIAL INFORMATION DEFINITION:**
${confidentialInfoDefinition}` : '**CONFIDENTIAL INFORMATION DEFINITION:** Use standard comprehensive definition covering business, technical, and financial information.'}

Generate the complete NDA document in HTML format now.`;

    console.log("Generating NDA with AI...");

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
          { role: "user", content: userPrompt }
        ],
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
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("No content generated from AI");
    }

    // Extract HTML content (remove markdown code blocks if present)
    let htmlContent = generatedContent;
    const htmlMatch = generatedContent.match(/```html\n?([\s\S]*?)```/);
    if (htmlMatch) {
      htmlContent = htmlMatch[1].trim();
    } else {
      // Check if it starts with HTML tags
      if (!generatedContent.trim().startsWith('<')) {
        // Wrap in basic HTML structure
        htmlContent = `<div class="nda-document">${generatedContent}</div>`;
      }
    }

    console.log("NDA generated successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      html: htmlContent,
      metadata: {
        agreementType,
        governingState,
        termLength,
        style: options.style,
        generatedAt: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-nda function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
