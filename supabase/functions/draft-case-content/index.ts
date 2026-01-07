import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * CASE-SCOPED AI CONTENT DRAFTING
 * 
 * AI SCOPE RESTRICTIONS (HARD BOUNDARIES):
 * 
 * AI MAY DRAFT:
 * ✅ Fee waiver justifications
 * ✅ Expedited processing justifications  
 * ✅ Purpose-of-request explanations
 * ✅ Tone and clarity refinements
 * 
 * AI MUST NEVER:
 * ❌ Modify templates
 * ❌ Insert layout elements
 * ❌ Alter statutory language
 * ❌ Change section order
 * ❌ Generate structural HTML
 * ❌ Include dates, addresses, letterhead
 * 
 * OUTPUT:
 * Plain text or minimal HTML (p, br, strong, em only)
 * Content intended to fill {{PLACEHOLDER}} slots
 */

interface DraftRequest {
  type: 'fee_waiver' | 'expedited' | 'purpose' | 'refine';
  caseContext: {
    caseTitle: string;
    caseNumber: string;
    statute?: string;
    agencyType?: string;
    state?: string;
    subjects?: string[];
    recordsRequested?: string;
  };
  existingText?: string;
  toneDirection?: 'formal' | 'assertive' | 'diplomatic';
}

const SYSTEM_PROMPT = `You are drafting CASE-SPECIFIC CONTENT for a public records request.

## ROLE: CASE CONTENT DRAFTER

You fill in placeholder content for a specific case. You DO NOT modify templates.

## HARD BOUNDARIES (NON-NEGOTIABLE)

YOU MUST NOT:
- Generate template structure or HTML layout
- Include conditional markers like [IF]...[/IF]
- Include placeholder syntax like {{PLACEHOLDER}}
- Generate letterhead, dates, addresses, or signature blocks
- Include @page rules or CSS styling
- Modify statutory language
- Change document section order
- Use markdown formatting (no **, ##, etc.)

YOU MAY ONLY:
- Draft persuasive justification text
- Explain the purpose of a request
- Refine tone and clarity of existing text
- Write paragraph content in plain text

## OUTPUT RULES

1. Return ONLY the content text - no JSON, no markdown
2. No HTML tags at all - plain text only
3. No layout elements whatsoever
4. Maximum 1500 characters
5. Content should be ready to insert into a document placeholder
6. Use natural paragraph breaks (double newline) if needed

## CONTEXT AWARENESS

Use the provided case context (case number, case title, agency type, statute) to make the content specific and relevant.`;

const TYPE_PROMPTS: Record<DraftRequest['type'], string> = {
  fee_waiver: `Draft a compelling fee waiver justification for a public records request.

The justification should:
- Explain how disclosure serves the public interest
- Reference the nature of the investigation
- Be professional and persuasive
- Be 2-3 sentences, concise but thorough
- NOT include phrases like "I am requesting" (this goes inside the template)`,

  expedited: `Draft a compelling expedited processing justification.

The justification should:
- Explain the urgency or time-sensitivity
- Reference why standard processing times are insufficient
- Be professional and persuasive
- Be 2-3 sentences, concise but thorough`,

  purpose: `Draft a clear purpose-of-request explanation for a public records request.

The purpose statement should:
- Clearly explain why the records are being requested
- Reference the investigation scope
- Be professional and direct
- Be 1-2 sentences`,

  refine: `Refine the provided text for better tone and clarity.

Your refinements should:
- Improve professional tone
- Enhance clarity and readability
- Maintain the original meaning and intent
- Keep similar length to original
- NOT add new information or claims`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body: DraftRequest = await req.json();
    const { type, caseContext, existingText, toneDirection } = body;

    if (!type || !caseContext) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type and caseContext' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context string for the AI
    let contextInfo = `Case: "${caseContext.caseTitle}" (${caseContext.caseNumber})`;
    if (caseContext.agencyType) contextInfo += `\nAgency Type: ${caseContext.agencyType}`;
    if (caseContext.statute) contextInfo += `\nApplicable Statute: ${caseContext.statute}`;
    if (caseContext.state) contextInfo += `\nState: ${caseContext.state}`;
    if (caseContext.subjects?.length) contextInfo += `\nSubjects: ${caseContext.subjects.join(', ')}`;
    if (caseContext.recordsRequested) contextInfo += `\nRecords Requested: ${caseContext.recordsRequested}`;

    // Build user prompt
    let userPrompt = TYPE_PROMPTS[type] || TYPE_PROMPTS.purpose;
    userPrompt += `\n\n## CASE CONTEXT\n${contextInfo}`;

    if (toneDirection) {
      userPrompt += `\n\n## TONE DIRECTION\nUse a ${toneDirection} tone.`;
    }

    if (existingText && type === 'refine') {
      userPrompt += `\n\n## TEXT TO REFINE\n${existingText}`;
    }

    console.log(`[draft-case-content] Drafting ${type} for case ${caseContext.caseNumber}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('[draft-case-content] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    // Sanitize output - ensure no template markers or HTML
    content = content
      .replace(/\{\{[^}]+\}\}/g, '') // Remove any placeholder syntax
      .replace(/\[IF[^\]]*\]/g, '')  // Remove any conditional markers
      .replace(/\[\/IF\]/g, '')
      .replace(/<[^>]+>/g, '')       // Remove any HTML tags
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove markdown bold
      .replace(/##\s*/g, '')         // Remove markdown headers
      .trim();

    // Validate length
    if (content.length > 2000) {
      content = content.substring(0, 2000);
    }

    console.log(`[draft-case-content] Successfully drafted ${type} content (${content.length} chars)`);

    return new Response(
      JSON.stringify({ 
        content,
        type,
        caseNumber: caseContext.caseNumber 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[draft-case-content] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
