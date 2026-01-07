import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CustomLetterRequest {
  purpose: string;
  recipient: {
    type: string;
    name?: string;
    organization?: string;
  };
  tone: 'professional' | 'formal' | 'firm' | 'neutral';
  keyPoints: string[];
  additionalContext?: string;
  length: 'brief' | 'standard' | 'detailed';
  regenerateSection?: {
    sectionId: string;
    currentSections: Array<{
      id: string;
      type: string;
      content: string;
    }>;
  };
}

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: 'Courteous, collaborative, standard business language. Maintains respect while being direct.',
  formal: 'Traditional, ceremonial, maximum formality. Uses formal salutations and structured paragraphs.',
  firm: 'Direct and assertive. Sets clear expectations and boundaries without being rude or aggressive.',
  neutral: 'Factual, objective, balanced perspective. Avoids emotional language, focuses on information.',
};

const LENGTH_GUIDELINES: Record<string, string> = {
  brief: '2-3 short paragraphs, get straight to the point',
  standard: '4-5 paragraphs, balanced detail and conciseness',
  detailed: '6-8 paragraphs, comprehensive coverage of all points',
};

// CRITICAL: Legal content prohibitions for custom letters
const LEGAL_PROHIBITIONS = `
## CRITICAL LEGAL RESTRICTIONS - BUSINESS LETTERS ONLY

This is a BUSINESS CORRESPONDENCE tool, NOT a legal document generator.

YOU MUST NOT under any circumstances:
- Include ANY statutory citations (e.g., "5 U.S.C. § 552", "pursuant to Section...", "under Article...")
- Reference specific laws, codes, regulations, statutes, or ordinances
- Cite legal deadlines, statutory response requirements, or regulatory timeframes
- Use legal phrases like "pursuant to", "in accordance with statute", "as required by law", "under penalty of"
- Claim legal authority, rights, remedies, or entitlements
- Reference FOIA, Freedom of Information Act, public records acts, or any open records laws
- Reference trade secret laws, confidentiality statutes, or NDA enforcement provisions
- Include legal threats, mention litigation, or reference court proceedings
- Generate NDA, contract, agreement, or legally-binding document language
- Cite any federal, state, or local agency regulations

IF the user's purpose suggests they need a legal document (FOIA request, records request, NDA, legal demand, contract):
- DO NOT generate the letter
- Instead, return this exact JSON response:
{
  "redirect": true,
  "message": "This request appears to require a legal document. Please use the appropriate specialized builder: FOIA/Public Records Builder for records requests, or NDA Builder for confidentiality agreements. Custom letters are for general business correspondence only."
}

This tool generates ONLY general business correspondence such as:
- Meeting requests and confirmations
- Follow-up communications
- Thank you letters
- Inquiry letters
- Appointment confirmations
- General notifications
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: CustomLetterRequest = await req.json();
    const { purpose, recipient, tone, keyPoints, additionalContext, length, regenerateSection } = request;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (regenerateSection) {
      // Regenerating a specific section
      systemPrompt = `You are a professional letter writing assistant. You need to regenerate a SINGLE section of a letter.

CURRENT LETTER CONTEXT:
${regenerateSection.currentSections.map(s => `[${s.type.toUpperCase()}]: ${s.content}`).join('\n\n')}

REGENERATE ONLY the section with id "${regenerateSection.sectionId}".

OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "section": {
    "id": "${regenerateSection.sectionId}",
    "type": "[the section type]",
    "content": "[new HTML content for this section only]"
  }
}

TONE: ${tone} - ${TONE_DESCRIPTIONS[tone]}

Make the regenerated section fit naturally with the surrounding content.
Use proper HTML formatting (<p>, <br>, etc.).
DO NOT include markdown code blocks or any text outside the JSON.`;

      userPrompt = `Regenerate the "${regenerateSection.sectionId}" section with a fresh approach while maintaining coherence with the rest of the letter.`;
    } else {
      // Generating full letter - BODY CONTENT ONLY
      systemPrompt = `You are a professional BUSINESS letter writing assistant. Generate letter BODY CONTENT ONLY.

## AI CONTENT BOUNDARY (CRITICAL)
You are generating BODY CONTENT ONLY. The system handles all other sections.

YOU MUST NOT GENERATE (system-controlled):
- Letterhead or organization branding
- Date blocks (no dates at the start)
- Recipient address blocks
- Any header/logo references

The system will automatically add: letterhead, date, and document framing.

${LEGAL_PROHIBITIONS}

OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "sections": [
    {
      "id": "salutation",
      "type": "salutation",
      "content": "<p>Dear [Recipient],</p>"
    },
    {
      "id": "opening",
      "type": "opening", 
      "content": "<p>Opening paragraph content...</p>"
    },
    {
      "id": "body-1",
      "type": "body",
      "content": "<p>First body paragraph...</p>"
    },
    {
      "id": "body-2",
      "type": "body",
      "content": "<p>Second body paragraph...</p>"
    },
    {
      "id": "closing",
      "type": "closing",
      "content": "<p>Closing paragraph...</p>"
    },
    {
      "id": "signature",
      "type": "signature",
      "content": "<p>Sincerely,</p><p><br></p><p>{{signature_name}}</p><p>{{signature_title}}</p>"
    }
  ]
}

TONE GUIDELINES:
${tone.toUpperCase()}: ${TONE_DESCRIPTIONS[tone]}

LENGTH: ${LENGTH_GUIDELINES[length]}

STRUCTURE REQUIREMENTS:
1. Salutation - appropriate greeting based on recipient type and formality
2. Opening paragraph - clear statement of letter purpose
3. Body paragraphs - cover key points with appropriate detail
4. Closing paragraph - call to action or next steps
5. Signature block - use {{signature_name}} and {{signature_title}} placeholders

Each section must be self-contained HTML that can be edited independently.
Use proper HTML tags: <p> for paragraphs, <br> for line breaks, <strong> for emphasis.
DO NOT include markdown code blocks or any text outside the JSON.
DO NOT include any dates, letterhead, or address blocks.

## CONTENT-ONLY GENERATION RULES (CRITICAL)

YOU MUST NOT include ANY of the following:
- Inline style attributes (style="...")
- CSS declarations of any kind
- Layout properties: position, float, display, margin, padding, width, height
- Pagination properties: page-break, break-before, break-after
- Font sizing: font-size, line-height (use semantic tags instead)
- <style> or <script> blocks
- Class names (class="...")
- @page or @media rules
- Date blocks or standalone dates
- Letterhead elements

YOU MAY ONLY USE these HTML tags:
<p>, <br>, <strong>, <em>, <b>, <i>, <ul>, <ol>, <li>, <span>, <div>

The template controls ALL layout. You provide CONTENT ONLY.`;

      const keyPointsList = keyPoints.length > 0 
        ? `\n\nKey points to cover:\n${keyPoints.map(p => `- ${p}`).join('\n')}`
        : '';
      
      const contextInfo = additionalContext 
        ? `\n\nAdditional context: ${additionalContext}`
        : '';

      userPrompt = `Generate a letter with the following details:

Purpose: ${purpose}

Recipient:
- Type: ${recipient.type}
${recipient.name ? `- Name: ${recipient.name}` : ''}
${recipient.organization ? `- Organization: ${recipient.organization}` : ''}

Tone: ${tone}
Length: ${length}${keyPointsList}${contextInfo}`;
    }

    console.log('Calling Lovable AI for custom letter generation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error('No content generated from AI');
    }

    console.log('Raw AI response:', generatedText);

    // Parse the JSON response
    let parsedResponse;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedText = generatedText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      parsedResponse = JSON.parse(cleanedText);
      
      // Check if AI detected a legal document request and redirected
      if (parsedResponse.redirect) {
        console.log('AI detected legal document request, redirecting user');
        return new Response(JSON.stringify({ 
          redirect: true,
          message: parsedResponse.message || 'This request requires a specialized legal document builder.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw text:', generatedText);
      
      // Fallback: create a single body section with the content
      parsedResponse = {
        sections: [
          { id: 'salutation', type: 'salutation', content: '<p>Dear Sir or Madam,</p>' },
          { id: 'body-1', type: 'body', content: `<p>${generatedText.replace(/\n/g, '</p><p>')}</p>` },
          { id: 'signature', type: 'signature', content: '<p>Sincerely,</p><p><br></p><p>{{signature_name}}</p><p>{{signature_title}}</p>' }
        ]
      };
    }

    // Build full HTML for preview
    let fullHtml = '';
    const sections = regenerateSection ? [parsedResponse.section] : parsedResponse.sections;
    
    if (!regenerateSection) {
      fullHtml = `
        <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px;">
          <div style="text-align: right; margin-bottom: 40px;">
            <p>{{current_date}}</p>
          </div>
          ${parsedResponse.sections.map((s: { content: string }) => s.content).join('\n')}
        </div>
      `;
    }

    const result = regenerateSection 
      ? { section: parsedResponse.section }
      : { sections: parsedResponse.sections, fullHtml };

    console.log('Returning structured response');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-custom-letter:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
