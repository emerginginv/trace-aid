import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the requesting user is an admin
    const { data: adminCheck, error: adminError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminError || !adminCheck) {
      return new Response(
        JSON.stringify({ error: "Only admins can delete users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[DELETE-USER] Admin ${user.email} deleting user ${userId}`);

    // Check what data the user owns
    const { data: ownedCases, error: casesError } = await supabaseClient
      .from("cases")
      .select("id")
      .eq("user_id", userId);

    if (casesError) {
      console.error("[DELETE-USER] Error checking cases:", casesError);
    }

    const { data: ownedActivities } = await supabaseClient
      .from("case_activities")
      .select("id")
      .or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`);

    const { data: ownedUpdates } = await supabaseClient
      .from("case_updates")
      .select("id")
      .eq("user_id", userId);

    const { data: ownedFinances } = await supabaseClient
      .from("case_finances")
      .select("id")
      .eq("user_id", userId);

    console.log(`[DELETE-USER] User owns: ${ownedCases?.length || 0} cases, ${ownedActivities?.length || 0} activities, ${ownedUpdates?.length || 0} updates, ${ownedFinances?.length || 0} finances`);

    // Delete user data in correct order (respecting foreign key constraints)
    
    // 1. Delete invoice payments (references invoices)
    await supabaseClient
      .from("invoice_payments")
      .delete()
      .eq("user_id", userId);

    // 2. Delete retainer funds (may reference invoices)
    await supabaseClient
      .from("retainer_funds")
      .delete()
      .eq("user_id", userId);

    // 3. Delete invoices
    await supabaseClient
      .from("invoices")
      .delete()
      .eq("user_id", userId);

    // 4. Delete case attachments
    await supabaseClient
      .from("case_attachments")
      .delete()
      .eq("user_id", userId);

    // 5. Delete subject attachments
    await supabaseClient
      .from("subject_attachments")
      .delete()
      .eq("user_id", userId);

    // 6. Delete case finances
    await supabaseClient
      .from("case_finances")
      .delete()
      .eq("user_id", userId);

    // 7. Delete case activities (both created by and assigned to)
    await supabaseClient
      .from("case_activities")
      .delete()
      .or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`);

    // 8. Delete case updates
    await supabaseClient
      .from("case_updates")
      .delete()
      .eq("user_id", userId);

    // 9. Delete case subjects
    await supabaseClient
      .from("case_subjects")
      .delete()
      .eq("user_id", userId);

    // 10. Delete notifications
    await supabaseClient
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    // 11. Remove user from investigator_ids arrays in cases
    const { data: casesWithUser } = await supabaseClient
      .from("cases")
      .select("id, investigator_ids")
      .contains("investigator_ids", [userId]);

    if (casesWithUser && casesWithUser.length > 0) {
      for (const caseItem of casesWithUser) {
        const updatedIds = (caseItem.investigator_ids || []).filter((id: string) => id !== userId);
        await supabaseClient
          .from("cases")
          .update({ investigator_ids: updatedIds })
          .eq("id", caseItem.id);
      }
    }

    // 12. Nullify case_manager_id and closed_by_user_id in cases where user is referenced
    await supabaseClient
      .from("cases")
      .update({ case_manager_id: null })
      .eq("case_manager_id", userId);

    await supabaseClient
      .from("cases")
      .update({ closed_by_user_id: null })
      .eq("closed_by_user_id", userId);

    // 13. Delete organization invites where user was invited_by
    await supabaseClient
      .from("organization_invites")
      .delete()
      .eq("invited_by", userId);

    // 14. Delete cases owned by user
    await supabaseClient
      .from("cases")
      .delete()
      .eq("user_id", userId);

    // 15. Delete contacts
    await supabaseClient
      .from("contacts")
      .delete()
      .eq("user_id", userId);

    // 16. Delete accounts
    await supabaseClient
      .from("accounts")
      .delete()
      .eq("user_id", userId);

    // 17. Delete case update templates
    await supabaseClient
      .from("case_update_templates")
      .delete()
      .eq("user_id", userId);

    // 18. Delete picklists
    await supabaseClient
      .from("picklists")
      .delete()
      .eq("user_id", userId);

    // 19. Delete organization settings
    await supabaseClient
      .from("organization_settings")
      .delete()
      .eq("user_id", userId);

    // 20. Delete organization memberships
    await supabaseClient
      .from("organization_members")
      .delete()
      .eq("user_id", userId);

    // 21. Delete user roles
    await supabaseClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    // 22. Delete the user from auth.users - this will cascade delete the profile
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("[DELETE-USER] Error deleting user from auth:", deleteError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete user from authentication system", 
          details: deleteError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[DELETE-USER] Successfully deleted user ${userId} and all associated data`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "User deleted successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[DELETE-USER] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
