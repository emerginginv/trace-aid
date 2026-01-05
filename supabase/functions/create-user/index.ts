import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { 
  validateCreateUserInput, 
  getClientIp, 
  getUserAgent 
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

    if (memberError || membership?.role !== 'admin') {
      // Log permission denied
      await supabase.rpc('log_security_event', {
        p_event_type: 'permission_denied',
        p_user_id: adminUser.id,
        p_organization_id: organizationId,
        p_metadata: { action: 'create_user', reason: 'not_admin' },
      });
      
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists in auth.users by trying to get them via email
    console.log('[CREATE-USER] Checking if user exists:', email);
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authUsers.users.find(u => u.email === email);

    if (existingAuthUser) {
      console.log('[CREATE-USER] Found existing auth user:', existingAuthUser.id);
      
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('organization_members')
        .select('id, user_id, organization_id, role')
        .eq('user_id', existingAuthUser.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      console.log('[CREATE-USER] Member check result:', { 
        existingMember, 
        memberCheckError,
        userId: existingAuthUser.id,
        orgId: organizationId 
      });

      if (existingMember) {
        console.log('[CREATE-USER] User already a member, rejecting');
        return new Response(
          JSON.stringify({ 
            error: `This user (${email}) is already a member of your organization`,
            details: {
              userId: existingAuthUser.id,
              membershipId: existingMember.id,
              role: existingMember.role
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[CREATE-USER] User exists in auth but not in org, will add to org');

      // User exists but not in this org - add them to the organization
      const { error: orgMemberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: existingAuthUser.id,
          organization_id: organizationId,
          role: role,
        });

      if (orgMemberError) {
        console.error('Error adding existing user to organization:', orgMemberError);
        return new Response(
          JSON.stringify({ error: `Failed to add existing user to organization: ${orgMemberError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add the new role to user_roles WITHOUT deleting existing roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: existingAuthUser.id,
          role: role,
        })
        .select()
        .maybeSingle();

      if (roleError && !roleError.message.includes('duplicate')) {
        console.error('Error adding role:', roleError);
      }

      // Update organization user count
      const { data: orgData } = await supabase
        .from('organizations')
        .select('current_users_count')
        .eq('id', organizationId)
        .single();

      if (orgData) {
        await supabase
          .from('organizations')
          .update({ current_users_count: (orgData.current_users_count || 0) + 1 })
          .eq('id', organizationId);
      }

      // Log the security event
      await supabase.rpc('log_security_event', {
        p_event_type: 'user_created',
        p_user_id: adminUser.id,
        p_organization_id: organizationId,
        p_target_user_id: existingAuthUser.id,
        p_ip_address: getClientIp(req),
        p_user_agent: getUserAgent(req),
        p_metadata: { role, added_existing_user: true },
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          user: {
            id: existingAuthUser.id,
            email: email,
          },
          message: 'Existing user added to organization successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the user with service role (bypasses RLS)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'User creation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add user to organization_members
    const { error: orgMemberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: newUser.user.id,
        organization_id: organizationId,
        role: role,
      });

    if (orgMemberError) {
      console.error('Error adding to organization:', orgMemberError);
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to add user to organization: ${orgMemberError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add role to user_roles
    const { error: deleteRoleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', newUser.user.id);

    if (deleteRoleError) {
      console.error('Error deleting existing roles:', deleteRoleError);
    }

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
      });

    if (roleError) {
      console.error('Error adding role:', roleError);
      return new Response(
        JSON.stringify({ error: `User created but failed to assign role: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update organization user count
    const { data: orgData } = await supabase
      .from('organizations')
      .select('current_users_count')
      .eq('id', organizationId)
      .single();

    if (orgData) {
      await supabase
        .from('organizations')
        .update({ current_users_count: (orgData.current_users_count || 0) + 1 })
        .eq('id', organizationId);
    }

    // Log the security event
    await supabase.rpc('log_security_event', {
      p_event_type: 'user_created',
      p_user_id: adminUser.id,
      p_organization_id: organizationId,
      p_target_user_id: newUser.user.id,
      p_ip_address: getClientIp(req),
      p_user_agent: getUserAgent(req),
      p_metadata: { role, created_new_user: true },
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: fullName,
        },
        message: 'User created successfully'
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
