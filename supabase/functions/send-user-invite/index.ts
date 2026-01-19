import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  role: 'admin' | 'manager' | 'investigator' | 'vendor';
  organizationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, role, organizationId }: InviteRequest = await req.json();

    // Verify the requesting user is an admin of the organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (memberError || membership?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can invite users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this email already exists as a user in the system
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    // If user exists, check if they're already in THIS organization
    if (existingProfile) {
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', existingProfile.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: 'This user is already a member of your organization' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if there's already a pending invite for this email in THIS organization
    const { data: existingInvite } = await supabase
      .from('organization_invites')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: 'An invite has already been sent to this email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the invite
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log audit event for USER_INVITED
    await supabase
      .from('audit_events')
      .insert({
        organization_id: organizationId,
        actor_user_id: user.id,
        action: 'USER_INVITED',
        metadata: {
          email,
          role,
          invite_id: invite.id
        }
      });

    // Get the organization's subdomain for constructing invite link
    const { data: org } = await supabase
      .from('organizations')
      .select('subdomain')
      .eq('id', organizationId)
      .single();

    const baseUrl = org?.subdomain 
      ? `https://${org.subdomain}.caseinformation.app`
      : 'https://caseinformation.app';
    
    const inviteLink = `${baseUrl}/accept-invite?token=${invite.token}`;
    
    console.log(`Invite created for ${email} with role ${role} in organization ${organizationId}`);
    console.log(`Invite link: ${inviteLink}`);

    // TODO: Send actual email with invite link using send-notification-email function

    return new Response(
      JSON.stringify({ 
        success: true, 
        invite,
        message: 'Invite sent successfully (email functionality will be added later)'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-user-invite function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
