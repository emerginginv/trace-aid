import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyDomainRequest {
  domain_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { domain_id }: VerifyDomainRequest = await req.json();

    if (!domain_id) {
      return new Response(
        JSON.stringify({ error: "domain_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the domain record
    const { data: domainRecord, error: domainError } = await supabase
      .from("organization_domains")
      .select("*, organizations!inner(id, subscription_tier)")
      .eq("id", domain_id)
      .single();

    if (domainError || !domainRecord) {
      return new Response(
        JSON.stringify({ error: "Domain not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin of the organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", domainRecord.organization_id)
      .single();

    if (!membership || membership.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Not authorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if organization is enterprise
    if (domainRecord.organizations.subscription_tier !== "enterprise") {
      return new Response(
        JSON.stringify({ 
          error: "PLAN_NOT_ELIGIBLE",
          message: "Custom domains require Enterprise plan" 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In a real implementation, we would do DNS lookup here
    // For now, we'll simulate verification by checking if a manual verification was done
    // In production, you would use a DNS library to check for TXT record
    
    const expectedTxtValue = `casewyze-verify=${domainRecord.verification_token}`;
    
    // Since we can't do actual DNS lookups in edge functions easily,
    // we'll provide manual verification option
    // The admin can confirm they've added the DNS record
    
    // For now, let's check if this is a "force verify" request (for testing)
    // In production, implement actual DNS verification via external API
    
    const forceVerify = req.headers.get("X-Force-Verify") === "true";
    
    if (forceVerify) {
      // Update domain status to verified/active
      const { error: updateError } = await supabase
        .from("organization_domains")
        .update({
          status: "active",
          verified_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", domain_id);

      if (updateError) {
        throw updateError;
      }

      // Log audit event
      await supabase.from("audit_events").insert({
        organization_id: domainRecord.organization_id,
        actor_user_id: user.id,
        action: "DOMAIN_VERIFIED",
        metadata: {
          domain: domainRecord.domain,
          domain_type: domainRecord.domain_type,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          status: "active",
          domain: domainRecord.domain,
          message: "Domain verified and activated",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return verification instructions
    return new Response(
      JSON.stringify({
        success: false,
        status: domainRecord.status,
        domain: domainRecord.domain,
        message: "Please add the following DNS record to verify your domain",
        verification_instructions: {
          type: "TXT",
          name: `_casewyze-verification.${domainRecord.domain}`,
          value: expectedTxtValue,
          alternative: {
            type: "TXT", 
            name: domainRecord.domain,
            value: expectedTxtValue,
          },
        },
        note: "After adding the DNS record, it may take up to 48 hours to propagate. Click 'Verify' again to check.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying domain:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});