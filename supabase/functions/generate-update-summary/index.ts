import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { update_ids, case_id, organization_id } = await req.json();

    if (!update_ids || !Array.isArray(update_ids) || update_ids.length === 0) {
      return new Response(JSON.stringify({ error: "No updates selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the selected updates
    const { data: updates, error: updatesError } = await supabase
      .from("case_updates")
      .select(`
        id,
        title,
        description,
        created_at,
        update_type,
        user_id,
        profiles:user_id(full_name)
      `)
      .in("id", update_ids)
      .eq("case_id", case_id)
      .order("created_at", { ascending: true });

    if (updatesError) {
      console.error("Error fetching updates:", updatesError);
      return new Response(JSON.stringify({ error: "Failed to fetch updates" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!updates || updates.length === 0) {
      return new Response(JSON.stringify({ error: "No updates found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch linked attachments for these updates
    const { data: attachmentLinks } = await supabase
      .from("update_attachment_links")
      .select(`
        update_id,
        case_attachments!inner(file_name, file_type)
      `)
      .in("update_id", update_ids);

    // Group attachments by update_id
    const attachmentsByUpdate: Record<string, { file_name: string; file_type: string }[]> = {};
    if (attachmentLinks) {
      for (const link of attachmentLinks) {
        const updateId = link.update_id;
        if (!attachmentsByUpdate[updateId]) {
          attachmentsByUpdate[updateId] = [];
        }
        attachmentsByUpdate[updateId].push({
          file_name: (link.case_attachments as any).file_name,
          file_type: (link.case_attachments as any).file_type,
        });
      }
    }

    // Build the prompt for the AI
    const updatesText = updates.map((u: any) => {
      const profile = u.profiles as { full_name: string } | null;
      const author = profile?.full_name || "Unknown";
      const date = new Date(u.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const attachments = attachmentsByUpdate[u.id];
      const attachmentInfo = attachments && attachments.length > 0
        ? `\nAttached files: ${attachments.map(a => a.file_name).join(", ")}`
        : "";
      
      return `---
Date: ${date}
Type: ${u.update_type}
Author: ${author}
Title: ${u.title}
${u.description ? `Content: ${u.description}` : ""}${attachmentInfo}`;
    }).join("\n\n");

    const systemPrompt = `You are an investigative case summarizer. Your task is to consolidate multiple case updates into a single, professional summary.

Guidelines:
- Use neutral, professional language appropriate for legal/investigative work
- Organize information chronologically when dates are available
- Report only facts stated in the source updates
- Reference attached files by name when relevant
- Do not speculate, draw conclusions, or add opinions
- Do not invent facts or events not present in sources
- Keep the summary concise but comprehensive

Format the output as clean HTML suitable for a case management system. Use paragraphs (<p>), bullet lists (<ul><li>), and bold text (<strong>) where appropriate for readability. Do not include any wrapper tags like <html> or <body>.`;

    const userPrompt = `Please summarize the following ${updates.length} case update(s):

${updatesText}

Create a consolidated summary that captures all key information chronologically.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to generate summary" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        summary,
        source_count: updates.length,
        generated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-update-summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
