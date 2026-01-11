import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CaseWyze schema reference for AI
const CASEWYZE_SCHEMA = `
CaseWyze Entity Schema:

1. accounts (Clients):
   - Required: name
   - Optional: email, phone, address, city, state, zip_code, industry, notes
   - Description: Client companies or organizations

2. contacts:
   - Required: first_name, last_name
   - Optional: email, phone, address, city, state, zip_code, notes
   - Description: Individual contacts at client companies

3. cases:
   - Required: case_number, title
   - Optional: status, description, due_date, reference_number, budget_hours, budget_dollars
   - Description: Investigation cases or matters

4. subjects:
   - Required: name, subject_type (person/vehicle/business/property)
   - Optional: notes, date_of_birth, address, phone, email, employer, occupation
   - Description: Subject records (people, vehicles, businesses)

5. case_updates:
   - Required: title
   - Optional: description, update_type
   - Description: Case notes and updates

6. case_activities (Events):
   - Required: title, activity_type
   - Optional: description, due_date, status, completed
   - Description: Scheduled events and tasks

7. time_entries:
   - Required: date, hours, description
   - Optional: hourly_rate, amount, category
   - Description: Billable time records

8. expenses:
   - Required: date, amount, description
   - Optional: category, quantity, unit_price
   - Description: Expense records
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { files } = await req.json();

    if (!files || files.length === 0) {
      throw new Error('No files provided for analysis');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare file content for AI analysis
    const fileDescriptions = files.map((f: any) => {
      let preview = '';
      if (f.headers && f.content) {
        preview = `Headers: ${f.headers.join(', ')}\nSample content (first 2000 chars):\n${f.content.slice(0, 2000)}`;
      } else {
        preview = f.content?.slice(0, 2000) || '';
      }
      return `File: ${f.name} (${f.type})\nRow count: ${f.rowCount || 'unknown'}\n${preview}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `You are a data migration specialist for CaseWyze, an investigation case management system.

Analyze the uploaded data files and return a structured JSON response with:
1. detectedEntities - which CaseWyze entities the data maps to
2. columnMappings - field-to-field mappings based on column names and sample data
3. conflicts - any data that doesn't fit the CaseWyze schema
4. dataQualityIssues - format issues, missing data, etc.
5. fileSummaries - summary for each file
6. summary - overall counts

${CASEWYZE_SCHEMA}

IMPORTANT RULES:
- Be conservative with confidence scores (only use "high" if very certain)
- Flag CSS files as metadata-only (styles are NOT applied)
- Identify common patterns from legacy systems like CaseMap, TimeMatters, etc.
- NEVER suggest importing CSS styles - only extract metadata
- Return valid JSON only

Return format:
{
  "detectedEntities": [
    {"sourceFile": "filename.csv", "entityType": "cases", "confidence": 0.95, "reasoning": "Contains case_number and title columns"}
  ],
  "columnMappings": {
    "filename.csv": [
      {"sourceColumn": "Case #", "targetField": "case_number", "confidence": "high", "transformation": null, "aiReasoning": "Direct match to case_number field"}
    ]
  },
  "conflicts": [
    {"id": "c1", "type": "missing_required", "severity": "error", "message": "Missing required field", "suggestion": "Add the field or skip import"}
  ],
  "dataQualityIssues": [
    {"column": "date", "issue": "Inconsistent date formats", "exampleValues": ["01/15/2024", "2024-01-15"], "suggestedFix": "Normalize to YYYY-MM-DD", "affectedRows": 5}
  ],
  "fileSummaries": [
    {"fileName": "file.csv", "fileType": "csv", "detectedEntity": "cases", "confidence": 0.9, "columnCount": 10, "rowCount": 100, "mappedColumns": 8, "unmappedColumns": 2, "issues": 1}
  ],
  "summary": {
    "totalFiles": 1,
    "totalRecords": 100,
    "readyToImport": 95,
    "needsReview": 5,
    "unsupported": 0
  }
}`;

    const userPrompt = `Analyze these files for import into CaseWyze:\n\n${fileDescriptions}`;

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON from AI response
    let analysisResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return a fallback analysis
      analysisResult = createFallbackAnalysis(files);
    }

    const processingTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      ...analysisResult,
      sessionId: crypto.randomUUID(),
      status: 'success',
      processingTime,
      aiModel: 'google/gemini-3-flash-preview'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Fallback analysis when AI parsing fails
function createFallbackAnalysis(files: any[]) {
  const detectedEntities = files.map(f => ({
    sourceFile: f.name,
    entityType: detectEntityFromFilename(f.name),
    confidence: 0.5,
    reasoning: 'Detected from filename pattern'
  }));

  const columnMappings: Record<string, any[]> = {};
  files.forEach(f => {
    if (f.headers) {
      columnMappings[f.name] = f.headers.map((h: string) => ({
        sourceColumn: h,
        targetField: guessTargetField(h),
        confidence: 'low',
        transformation: null,
        aiReasoning: 'Basic column name matching'
      }));
    }
  });

  return {
    detectedEntities,
    columnMappings,
    conflicts: [],
    dataQualityIssues: [],
    fileSummaries: files.map(f => ({
      fileName: f.name,
      fileType: f.type,
      detectedEntity: detectEntityFromFilename(f.name),
      confidence: 0.5,
      columnCount: f.headers?.length || 0,
      rowCount: f.rowCount || 0,
      mappedColumns: 0,
      unmappedColumns: f.headers?.length || 0,
      issues: 0
    })),
    summary: {
      totalFiles: files.length,
      totalRecords: files.reduce((sum: number, f: any) => sum + (f.rowCount || 0), 0),
      readyToImport: 0,
      needsReview: files.length,
      unsupported: 0
    }
  };
}

function detectEntityFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('client') || lower.includes('account')) return 'accounts';
  if (lower.includes('contact')) return 'contacts';
  if (lower.includes('case')) return 'cases';
  if (lower.includes('subject')) return 'subjects';
  if (lower.includes('update') || lower.includes('note')) return 'case_updates';
  if (lower.includes('event') || lower.includes('task') || lower.includes('activity')) return 'case_activities';
  if (lower.includes('time') || lower.includes('hour')) return 'time_entries';
  if (lower.includes('expense') || lower.includes('cost')) return 'expenses';
  return 'unknown';
}

function guessTargetField(columnName: string): string | null {
  const lower = columnName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const mappings: Record<string, string> = {
    'name': 'name',
    'firstname': 'first_name',
    'lastname': 'last_name',
    'email': 'email',
    'phone': 'phone',
    'address': 'address',
    'city': 'city',
    'state': 'state',
    'zip': 'zip_code',
    'zipcode': 'zip_code',
    'casenumber': 'case_number',
    'caseno': 'case_number',
    'title': 'title',
    'description': 'description',
    'status': 'status',
    'duedate': 'due_date',
    'date': 'date',
    'hours': 'hours',
    'amount': 'amount',
  };
  return mappings[lower] || null;
}
