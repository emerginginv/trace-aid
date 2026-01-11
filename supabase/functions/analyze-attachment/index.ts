import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// File types that support content analysis
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
const DOCUMENT_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

// Max file size for content analysis (10MB)
const MAX_CONTENT_ANALYSIS_SIZE = 10 * 1024 * 1024;

interface AnalysisResult {
  attachment_id: string;
  file_name: string;
  description: string;
  tags: string[];
  success: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { attachment_ids, organization_id } = await req.json();

    if (!attachment_ids || !Array.isArray(attachment_ids) || attachment_ids.length === 0) {
      return new Response(JSON.stringify({ error: "No attachments selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch attachment metadata
    const { data: attachments, error: attachmentsError } = await supabase
      .from("case_attachments")
      .select("id, file_name, file_path, file_type, file_size, description, tags")
      .in("id", attachment_ids)
      .eq("organization_id", organization_id);

    if (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
      return new Response(JSON.stringify({ error: "Failed to fetch attachments" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!attachments || attachments.length === 0) {
      return new Response(JSON.stringify({ error: "No attachments found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: AnalysisResult[] = [];

    // Investigative prompt for factual, objective descriptions
    const investigativeSystemPrompt = `You are an evidence cataloging assistant for a private investigation agency.
Your task is to describe files factually and objectively for case documentation.

STRICT GUIDELINES:
- Describe ONLY what is visibly present or explicitly stated in the content
- Use neutral, objective language suitable for legal/investigative records
- NO opinions, interpretations, speculative statements, or subjective assessments
- NO emotional language or conclusions about what "might" be happening
- For images: describe physical characteristics (colors, objects, people by visible attributes like approximate age/gender/clothing, locations, vehicles, text visible, timestamps)
- For documents: summarize the document type and key factual content only
- Keep descriptions concise but thorough (2-4 sentences maximum)

You MUST use the analyze_evidence function to return your analysis.`;

    for (const attachment of attachments) {
      try {
        const fileType = attachment.file_type || "";
        const fileName = attachment.file_name || "";
        const fileSize = attachment.file_size || 0;

        let analysisPrompt = "";
        let messageContent: any[] = [];

        // Determine analysis approach based on file type
        const isImage = IMAGE_TYPES.some(t => fileType.includes(t.split("/")[1]));
        const isDocument = DOCUMENT_TYPES.some(t => fileType === t);
        const canAnalyzeContent = fileSize <= MAX_CONTENT_ANALYSIS_SIZE;

        if (isImage && canAnalyzeContent) {
          // Download image and convert to base64 for vision analysis
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("case-attachments")
            .download(attachment.file_path);

          if (downloadError || !fileData) {
            throw new Error("Failed to download file for analysis");
          }

          const arrayBuffer = await fileData.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          const mimeType = fileType || "image/jpeg";

          messageContent = [
            {
              type: "text",
              text: `Analyze this image for investigative case documentation. File name: "${fileName}". Describe what is visible factually and objectively. Provide 3-8 literal, descriptive tags that would help categorize and search for this evidence.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            }
          ];
        } else if (isDocument && canAnalyzeContent && fileType === "application/pdf") {
          // For PDFs, we'll analyze based on filename since full text extraction is complex
          // In a production scenario, you'd use a PDF parsing library
          analysisPrompt = `Analyze this document for investigative case documentation.
File name: "${fileName}"
File type: PDF document
File size: ${Math.round(fileSize / 1024)} KB

Based on the filename and document type, provide a factual description of what this document likely contains.
Provide 3-8 literal, descriptive tags that would help categorize and search for this evidence.`;
          messageContent = [{ type: "text", text: analysisPrompt }];
        } else if (isDocument && canAnalyzeContent && fileType.includes("wordprocessingml")) {
          // For DOCX files, analyze based on filename
          analysisPrompt = `Analyze this document for investigative case documentation.
File name: "${fileName}"
File type: Microsoft Word document
File size: ${Math.round(fileSize / 1024)} KB

Based on the filename and document type, provide a factual description of what this document likely contains.
Provide 3-8 literal, descriptive tags that would help categorize and search for this evidence.`;
          messageContent = [{ type: "text", text: analysisPrompt }];
        } else {
          // Metadata-only analysis for unsupported or large files
          const typeDescription = fileType.startsWith("video/") ? "video file" :
                                  fileType.startsWith("audio/") ? "audio file" :
                                  "file";
          
          analysisPrompt = `Analyze this ${typeDescription} for investigative case documentation.
File name: "${fileName}"
File type: ${fileType}
File size: ${Math.round(fileSize / 1024)} KB

Based on the filename and file type, provide a factual description of what this file likely contains.
Provide 3-8 literal, descriptive tags that would help categorize and search for this evidence.
Note: Full content analysis is not available for this file type.`;
          messageContent = [{ type: "text", text: analysisPrompt }];
        }

        // Call AI with tool calling for structured output
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [
              { role: "system", content: investigativeSystemPrompt },
              { role: "user", content: messageContent }
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "analyze_evidence",
                  description: "Return the factual description and tags for the evidence file",
                  parameters: {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                        description: "A factual, objective description of the file content (2-4 sentences)"
                      },
                      tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "3-8 lowercase, literal tags for categorization and search"
                      }
                    },
                    required: ["description", "tags"],
                    additionalProperties: false
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "analyze_evidence" } }
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            results.push({
              attachment_id: attachment.id,
              file_name: fileName,
              description: "",
              tags: [],
              success: false,
              error: "Rate limit exceeded. Please try again later."
            });
            continue;
          }
          if (aiResponse.status === 402) {
            results.push({
              attachment_id: attachment.id,
              file_name: fileName,
              description: "",
              tags: [],
              success: false,
              error: "AI usage limit reached. Please add credits."
            });
            continue;
          }
          throw new Error(`AI request failed with status ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        
        // Extract tool call result
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall || toolCall.function.name !== "analyze_evidence") {
          throw new Error("Invalid AI response format");
        }

        const analysisResult = JSON.parse(toolCall.function.arguments);

        results.push({
          attachment_id: attachment.id,
          file_name: fileName,
          description: analysisResult.description || "",
          tags: (analysisResult.tags || []).map((t: string) => t.toLowerCase().trim()),
          success: true
        });

      } catch (error) {
        console.error(`Error analyzing attachment ${attachment.id}:`, error);
        results.push({
          attachment_id: attachment.id,
          file_name: attachment.file_name,
          description: "",
          tags: [],
          success: false,
          error: error instanceof Error ? error.message : "Analysis failed"
        });
      }
    }

    return new Response(
      JSON.stringify({
        results,
        analyzed_count: results.filter(r => r.success).length,
        total_count: attachment_ids.length,
        generated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-attachment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
