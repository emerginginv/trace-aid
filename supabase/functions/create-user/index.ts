import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { 
  validateCreateUserInput, 
  getClientIp, 
  getUserAgent,
  escapeHtml
} from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authenticated admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const rawInput = await req.json();
    const validationResult = validateCreateUserInput(rawInput);
    
    if (!validationResult.success) {
      console.log('[CREATE-USER] Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, fullName, password, role, organizationId } = validationResult.data!;

    // Verify the requesting user is an admin of the organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', adminUser.id)
      .single();

    if (memberError || (membership?.role !== 'admin' && membership?.role !== 'owner')) {
      // Log permission denied
      await supabase.rpc('log_security_event', {
        p_event_type: 'permission_denied',
        p_user_id: adminUser.id,
        p_organization_id: organizationId,
        p_metadata: { action: 'create_user', reason: 'not_admin' },
      });
      
      return new Response(
        JSON.stringify({ error: 'Only admins and owners can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists in auth.users by trying to get them via email
    console.log('[CREATE-USER] Checking if user exists:', email);
    
    // Fetch organization info for the welcome email and subdomain
    let orgName = 'your organization';
    let subdomain = 'caseinformation.app';
    try {
      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('name, subdomain')
        .eq('id', organizationId)
        .maybeSingle();
      
      if (currentOrg?.name) {
        orgName = currentOrg.name;
      }
      if (currentOrg?.subdomain) {
        subdomain = currentOrg.subdomain;
      }
    } catch (e) {
      console.error('Error fetching org info:', e);
    }

    // Use the same verified From.Email as `send-welcome-email`
    // (signup emails) to avoid Mailjet sender verification issues.
    let senderEmail = 'support@caseinformation.app';
    let signatureName = '';
    let signatureTitle = '';
    let signaturePhone = '';
    let signatureEmail = '';
    
    try {
      const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (orgSettings) {
        // Keep senderEmail fixed to match the signup email sender.
        signatureName = orgSettings.signature_name || '';
        signatureTitle = orgSettings.signature_title || '';
        signaturePhone = orgSettings.signature_phone || '';
        signatureEmail = orgSettings.signature_email || '';
      }
    } catch (e) {
      console.error('Error fetching org settings:', e);
    }
    
    const loginUrl = subdomain && subdomain !== 'caseinformation.app' 
      ? `https://${subdomain}.caseinformation.app/login`
      : 'https://caseinformation.app/login';
    const portalUrl = loginUrl.replace(/\/login$/, '');
    
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    let existingAuthUser = authUsers.users.find((u: any) => u.email === email);

    if (!existingAuthUser) {
      // Create user in Auth because we want them to login with credentials instead of signing up
      const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          setup_completed: true
        }
      });
      if (createAuthError) {
        return new Response(
          JSON.stringify({ error: `Failed to create auth user: ${createAuthError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      existingAuthUser = newAuthUser.user;
    } else {
      // If user exists, we might still want to update their password to the new one so they can login.
      // But maybe they already have an account and password. We will NOT update their password if they exist,
      // they should login with their existing password.
    }

    // Check if user already exists in THIS organization
    if (existingAuthUser) {
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', existingAuthUser.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: 'User is already a member of this organization' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 1. Create the invitation record
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: adminUser.id,
        // Optional: store fullName and temp password in metadata if needed, 
        // though usually users set their own password on signup.
        // We'll store them so the accept_invitation flow can use them.
        metadata: {
          full_name: fullName,
          temporary_password: password
        }
      })
      .select()
      .single();

    if (inviteError) {
      console.error('[CREATE-USER] Error creating invite:', inviteError);
      return new Response(
        JSON.stringify({ error: `Failed to create invitation: ${inviteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Log the security event
    await supabase.rpc('log_security_event', {
      p_event_type: 'user_invited',
      p_user_id: adminUser.id,
      p_organization_id: organizationId,
      p_metadata: { email, role, invite_id: invite.id },
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        invite: {
          id: invite.id,
          email: invite.email,
          token: invite.token,
          role: invite.role,
        },
        message: 'Invitation created successfully.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
