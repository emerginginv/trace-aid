import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ENFORCE-ENTITLEMENT] ${step}${detailsStr}`);
};

interface EnforcementRequest {
  organization_id: string;
  action: string;
  payload?: Record<string, unknown>;
}

interface EnforcementResult {
  allowed: boolean;
  error_code?: string;
  message?: string;
  current?: number;
  limit?: number;
  entitlements?: Record<string, unknown>;
  usage?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id });

    const body: EnforcementRequest = await req.json();
    const { organization_id, action, payload = {} } = body;

    if (!organization_id || !action) {
      throw new Error("organization_id and action are required");
    }

    logStep("Checking entitlement", { organization_id, action, payload });

    // Call the database enforcement function
    const { data, error } = await supabaseClient.rpc('enforce_entitlement', {
      p_organization_id: organization_id,
      p_action: action,
      p_payload: payload
    });

    if (error) {
      logStep("Enforcement error", { error: error.message });
      throw new Error(`Enforcement check failed: ${error.message}`);
    }

    const result = data as EnforcementResult;
    
    logStep("Enforcement result", { 
      allowed: result.allowed, 
      error_code: result.error_code 
    });

    // Log audit event if action was denied
    if (!result.allowed) {
      await supabaseClient.from('audit_events').insert({
        organization_id,
        actor_user_id: user.id,
        action: 'ENTITLEMENT_DENIED',
        metadata: {
          attempted_action: action,
          error_code: result.error_code,
          payload
        }
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.allowed ? 200 : 403,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      allowed: false,
      error_code: "SYSTEM_ERROR",
      message: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
