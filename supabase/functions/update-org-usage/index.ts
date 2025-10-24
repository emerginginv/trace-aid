import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    // Get user's organization
    const { data: memberData, error: memberError } = await supabaseClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      throw new Error("Organization not found");
    }

    const orgId = memberData.organization_id;

    // Count active members
    const { count: userCount, error: countError } = await supabaseClient
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId);

    if (countError) throw new Error("Failed to count users");

    // Calculate storage usage (sum of all file sizes in bytes, convert to GB)
    const { data: attachments } = await supabaseClient
      .from("case_attachments")
      .select("file_size")
      .eq("organization_id", orgId);

    const { data: subjectAttachments } = await supabaseClient
      .from("subject_attachments")
      .select("file_size")
      .eq("organization_id", orgId);

    const totalBytes = 
      (attachments?.reduce((sum, att) => sum + (att.file_size || 0), 0) || 0) +
      (subjectAttachments?.reduce((sum, att) => sum + (att.file_size || 0), 0) || 0);
    
    const storageGb = totalBytes / (1024 * 1024 * 1024); // Convert bytes to GB

    // Update organization
    const { error: updateError } = await supabaseClient
      .from("organizations")
      .update({
        current_users_count: userCount || 0,
        storage_used_gb: storageGb,
      })
      .eq("id", orgId);

    if (updateError) throw new Error("Failed to update organization");

    return new Response(
      JSON.stringify({ 
        success: true, 
        users_count: userCount || 0,
        storage_gb: storageGb 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
