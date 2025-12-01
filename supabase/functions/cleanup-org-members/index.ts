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
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      throw new Error("Organization not found");
    }

    // Only admins can run cleanup
    if (memberData.role !== 'admin') {
      throw new Error("Only admins can run cleanup");
    }

    const orgId = memberData.organization_id;

    console.log('[CLEANUP] Starting cleanup for org:', orgId);

    // Get all organization members
    const { data: orgMembers, error: membersError } = await supabaseClient
      .from("organization_members")
      .select("user_id, id")
      .eq("organization_id", orgId);

    if (membersError) throw membersError;

    console.log('[CLEANUP] Found', orgMembers?.length, 'members');

    // Check which users still exist in auth.users
    const { data: { users: authUsers }, error: authError } = await supabaseClient.auth.admin.listUsers();
    
    if (authError) throw authError;

    const authUserIds = new Set(authUsers.map(u => u.id));
    const orphanedMembers = orgMembers?.filter(m => !authUserIds.has(m.user_id)) || [];

    console.log('[CLEANUP] Found', orphanedMembers.length, 'orphaned members');

    if (orphanedMembers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No orphaned members found',
          cleaned: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Delete orphaned members
    const orphanedIds = orphanedMembers.map(m => m.id);
    const { error: deleteError } = await supabaseClient
      .from("organization_members")
      .delete()
      .in("id", orphanedIds);

    if (deleteError) throw deleteError;

    console.log('[CLEANUP] Deleted', orphanedIds.length, 'orphaned members');

    // Recalculate user count
    const { count: activeCount } = await supabaseClient
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId);

    await supabaseClient
      .from("organizations")
      .update({ current_users_count: activeCount || 0 })
      .eq("id", orgId);

    console.log('[CLEANUP] Updated user count to:', activeCount);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleaned up ${orphanedIds.length} orphaned member records`,
        cleaned: orphanedIds.length,
        newCount: activeCount || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CLEANUP] Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
