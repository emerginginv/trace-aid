import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { token } = body;

    if (!token) {
      console.log("Access attempt with missing token");
      return new Response(
        JSON.stringify({ success: false, error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      console.log("Access attempt with invalid token format:", token.substring(0, 8) + "...");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for storage access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the access token using the database function
    console.log("Validating access token...");
    const { data: validationResult, error: validationError } = await supabase
      .rpc("validate_attachment_access", { p_token: token });

    if (validationError) {
      console.error("Validation error:", validationError);
      return new Response(
        JSON.stringify({ success: false, error: "Validation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if validation returned any results
    if (!validationResult || validationResult.length === 0) {
      console.log("No validation result returned");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = validationResult[0];

    // Check if access is valid
    if (!result.is_valid) {
      console.log("Access denied:", result.denial_reason);
      return new Response(
        JSON.stringify({ success: false, error: result.denial_reason }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the bucket based on attachment type
    const bucketName = result.attachment_type === "case" 
      ? "case-attachments" 
      : "subject-attachments";

    // Generate a signed URL (1 hour expiry)
    const expiresIn = 3600; // 1 hour in seconds
    console.log(`Generating signed URL for ${bucketName}/${result.file_path}`);
    
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from(bucketName)
      .createSignedUrl(result.file_path, expiresIn);

    if (signedUrlError) {
      console.error("Signed URL generation error:", signedUrlError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate download URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Access granted for attachment:", result.attachment_id);
    
    return new Response(
      JSON.stringify({
        success: true,
        file_name: result.file_name,
        file_type: result.file_type,
        download_url: signedUrlData.signedUrl,
        expires_in: expiresIn,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
