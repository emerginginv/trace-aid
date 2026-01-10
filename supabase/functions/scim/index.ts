import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/scim+json',
};

interface SCIMUser {
  schemas: string[];
  id?: string;
  externalId?: string;
  userName: string;
  name?: {
    givenName?: string;
    familyName?: string;
    formatted?: string;
  };
  emails?: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  active?: boolean;
  groups?: Array<{
    value: string;
    display?: string;
  }>;
}

interface SCIMListResponse {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: SCIMUser[];
}

interface SCIMError {
  schemas: string[];
  detail: string;
  status: number;
}

// Helper to create SCIM error response
function scimError(detail: string, status: number): Response {
  const error: SCIMError = {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
    detail,
    status,
  };
  return new Response(JSON.stringify(error), {
    status,
    headers: corsHeaders,
  });
}

// Extract org ID and validate token from request
async function authenticateRequest(req: Request, supabase: any): Promise<{ orgId: string } | Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Expected path: /scim/v2/{orgId}/Users or /scim/v2/{orgId}/Users/{userId}
  const scimIndex = pathParts.indexOf('scim');
  if (scimIndex === -1 || pathParts[scimIndex + 1] !== 'v2') {
    return scimError("Invalid SCIM endpoint", 404);
  }
  
  const orgId = pathParts[scimIndex + 2];
  if (!orgId) {
    return scimError("Organization ID required", 400);
  }
  
  // Extract bearer token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return scimError("Authorization header required", 401);
  }
  
  const token = authHeader.substring(7);
  
  // Validate token against org's SCIM config
  const { data: isValid, error } = await supabase.rpc('validate_scim_token', {
    p_org_id: orgId,
    p_token: token,
  });
  
  if (error || !isValid) {
    return scimError("Invalid or expired SCIM token", 401);
  }
  
  // Check org is active
  const { data: org } = await supabase
    .from('organizations')
    .select('id, status')
    .eq('id', orgId)
    .single();
  
  if (!org || org.status !== 'active') {
    return scimError("Organization not found or inactive", 404);
  }
  
  return { orgId };
}

// Map SCIM user to internal profile format
function mapSCIMToProfile(scimUser: SCIMUser): { email: string; full_name: string } {
  const email = scimUser.emails?.find(e => e.primary)?.value 
    || scimUser.emails?.[0]?.value 
    || scimUser.userName;
  
  const fullName = scimUser.name?.formatted 
    || [scimUser.name?.givenName, scimUser.name?.familyName].filter(Boolean).join(' ')
    || scimUser.userName.split('@')[0];
  
  return { email, full_name: fullName };
}

// Map internal profile to SCIM user format
function mapProfileToSCIM(profile: any, externalId?: string): SCIMUser {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: profile.id,
    externalId: externalId || profile.id,
    userName: profile.email,
    name: {
      formatted: profile.full_name,
    },
    emails: [{
      value: profile.email,
      type: "work",
      primary: true,
    }],
    active: true,
  };
}

// Determine role from IdP groups using org's role mappings
async function determineRole(supabase: any, orgId: string, groups: string[]): Promise<string> {
  if (!groups || groups.length === 0) {
    return 'member';
  }
  
  const { data: mappings } = await supabase
    .from('sso_role_mappings')
    .select('idp_group_name, app_role, priority')
    .eq('organization_id', orgId)
    .order('priority', { ascending: false });
  
  if (!mappings || mappings.length === 0) {
    return 'member';
  }
  
  // Find first matching group by priority
  for (const mapping of mappings) {
    if (groups.some(g => g.toLowerCase() === mapping.idp_group_name.toLowerCase())) {
      return mapping.app_role;
    }
  }
  
  return 'member';
}

// Log SCIM action
async function logSCIMAction(
  supabase: any,
  orgId: string,
  action: 'create' | 'update' | 'deactivate' | 'reactivate',
  targetEmail: string,
  success: boolean,
  options: { 
    targetUserId?: string; 
    externalId?: string; 
    roleAssigned?: string;
    errorMessage?: string;
    requestPayload?: any;
  } = {}
) {
  await supabase.from('scim_provisioning_logs').insert({
    organization_id: orgId,
    action,
    target_user_id: options.targetUserId,
    target_email: targetEmail,
    external_id: options.externalId,
    role_assigned: options.roleAssigned,
    success,
    error_message: options.errorMessage,
    request_payload: options.requestPayload,
  });
  
  // Also log audit event
  await supabase.from('audit_events').insert({
    organization_id: orgId,
    action: `SCIM_USER_${action.toUpperCase()}`,
    metadata: {
      target_email: targetEmail,
      external_id: options.externalId,
      role: options.roleAssigned,
      success,
    },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Authenticate request
  const authResult = await authenticateRequest(req, supabase);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const { orgId } = authResult;
  
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Find Users resource in path
  const usersIndex = pathParts.indexOf('Users');
  if (usersIndex === -1) {
    return scimError("Only /Users resource is supported", 404);
  }
  
  const userId = pathParts[usersIndex + 1]; // May be undefined for collection operations
  
  try {
    switch (req.method) {
      case 'GET': {
        if (userId) {
          // Get single user
          const { data: member } = await supabase
            .from('organization_members')
            .select('user_id, role')
            .eq('organization_id', orgId)
            .eq('user_id', userId)
            .single();
          
          if (!member) {
            return scimError("User not found", 404);
          }
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (!profile) {
            return scimError("User profile not found", 404);
          }
          
          return new Response(JSON.stringify(mapProfileToSCIM(profile)), {
            status: 200,
            headers: corsHeaders,
          });
        } else {
          // List users with pagination and filtering
          const startIndex = parseInt(url.searchParams.get('startIndex') || '1');
          const count = parseInt(url.searchParams.get('count') || '100');
          const filter = url.searchParams.get('filter');
          
          let query = supabase
            .from('organization_members')
            .select('user_id, profiles!inner(id, email, full_name)', { count: 'exact' })
            .eq('organization_id', orgId);
          
          // Handle simple email filter: userName eq "email@example.com"
          if (filter) {
            const emailMatch = filter.match(/userName eq "([^"]+)"/);
            if (emailMatch) {
              query = query.eq('profiles.email', emailMatch[1]);
            }
          }
          
          const { data: members, count: totalCount } = await query
            .range(startIndex - 1, startIndex - 1 + count - 1);
          
          const resources: SCIMUser[] = (members || []).map((m: any) => 
            mapProfileToSCIM(m.profiles)
          );
          
          const response: SCIMListResponse = {
            schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            totalResults: totalCount || 0,
            startIndex,
            itemsPerPage: resources.length,
            Resources: resources,
          };
          
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: corsHeaders,
          });
        }
      }
      
      case 'POST': {
        // Create user
        const scimUser: SCIMUser = await req.json();
        const { email, full_name } = mapSCIMToProfile(scimUser);
        
        // Determine role from groups
        const groupNames = scimUser.groups?.map(g => g.display || g.value) || [];
        const role = await determineRole(supabase, orgId, groupNames);
        
        // Check if user already exists in this org
        const { data: existingMember } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', orgId)
          .eq('profiles.email', email)
          .single();
        
        if (existingMember) {
          await logSCIMAction(supabase, orgId, 'create', email, false, {
            externalId: scimUser.externalId,
            errorMessage: 'User already exists in organization',
            requestPayload: scimUser,
          });
          return scimError("User already exists in this organization", 409);
        }
        
        // Check if user exists in system
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();
        
        if (existingProfile) {
          // Add existing user to organization
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              organization_id: orgId,
              user_id: existingProfile.id,
              role,
            });
          
          if (memberError) {
            await logSCIMAction(supabase, orgId, 'create', email, false, {
              targetUserId: existingProfile.id,
              externalId: scimUser.externalId,
              errorMessage: memberError.message,
              requestPayload: scimUser,
            });
            return scimError("Failed to add user to organization", 500);
          }
          
          // Also add to user_roles
          await supabase.from('user_roles').upsert({
            user_id: existingProfile.id,
            role,
          }, { onConflict: 'user_id,role' });
          
          await logSCIMAction(supabase, orgId, 'create', email, true, {
            targetUserId: existingProfile.id,
            externalId: scimUser.externalId,
            roleAssigned: role,
            requestPayload: scimUser,
          });
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', existingProfile.id)
            .single();
          
          return new Response(JSON.stringify(mapProfileToSCIM(profile, scimUser.externalId)), {
            status: 201,
            headers: { ...corsHeaders, 'Location': `/scim/v2/${orgId}/Users/${existingProfile.id}` },
          });
        }
        
        // Create new user via edge function
        const { data: newUser, error: createError } = await supabase.functions.invoke('create-user', {
          body: { email, full_name, organization_id: orgId, role },
        });
        
        if (createError || !newUser?.user?.id) {
          await logSCIMAction(supabase, orgId, 'create', email, false, {
            externalId: scimUser.externalId,
            errorMessage: createError?.message || 'Failed to create user',
            requestPayload: scimUser,
          });
          return scimError("Failed to create user", 500);
        }
        
        await logSCIMAction(supabase, orgId, 'create', email, true, {
          targetUserId: newUser.user.id,
          externalId: scimUser.externalId,
          roleAssigned: role,
          requestPayload: scimUser,
        });
        
        const createdProfile = {
          id: newUser.user.id,
          email,
          full_name,
        };
        
        return new Response(JSON.stringify(mapProfileToSCIM(createdProfile, scimUser.externalId)), {
          status: 201,
          headers: { ...corsHeaders, 'Location': `/scim/v2/${orgId}/Users/${newUser.user.id}` },
        });
      }
      
      case 'PATCH': {
        // Update user (typically for role change or deactivation)
        if (!userId) {
          return scimError("User ID required for PATCH", 400);
        }
        
        const patchData = await req.json();
        const operations = patchData.Operations || [];
        
        // Check user exists in org
        const { data: member } = await supabase
          .from('organization_members')
          .select('user_id, role')
          .eq('organization_id', orgId)
          .eq('user_id', userId)
          .single();
        
        if (!member) {
          return scimError("User not found in organization", 404);
        }
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        for (const op of operations) {
          if (op.path === 'active' && op.value === false) {
            // Deactivate user - remove from organization
            await supabase
              .from('organization_members')
              .delete()
              .eq('organization_id', orgId)
              .eq('user_id', userId);
            
            // Invalidate any active sessions (if session table exists)
            // This would be handled by auth system
            
            await logSCIMAction(supabase, orgId, 'deactivate', profile.email, true, {
              targetUserId: userId,
              requestPayload: patchData,
            });
            
            return new Response(JSON.stringify({
              ...mapProfileToSCIM(profile),
              active: false,
            }), {
              status: 200,
              headers: corsHeaders,
            });
          }
          
          if (op.path === 'active' && op.value === true) {
            // Reactivate - would need to re-add to org, but this is unusual
            await logSCIMAction(supabase, orgId, 'reactivate', profile.email, true, {
              targetUserId: userId,
              requestPayload: patchData,
            });
          }
        }
        
        await logSCIMAction(supabase, orgId, 'update', profile.email, true, {
          targetUserId: userId,
          requestPayload: patchData,
        });
        
        return new Response(JSON.stringify(mapProfileToSCIM(profile)), {
          status: 200,
          headers: corsHeaders,
        });
      }
      
      case 'DELETE': {
        // Delete/deactivate user
        if (!userId) {
          return scimError("User ID required for DELETE", 400);
        }
        
        // Get user info before deletion
        const { data: member } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', orgId)
          .eq('user_id', userId)
          .single();
        
        if (!member) {
          return scimError("User not found in organization", 404);
        }
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();
        
        // Remove from organization (don't delete user account)
        await supabase
          .from('organization_members')
          .delete()
          .eq('organization_id', orgId)
          .eq('user_id', userId);
        
        await logSCIMAction(supabase, orgId, 'deactivate', profile?.email || userId, true, {
          targetUserId: userId,
        });
        
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }
      
      default:
        return scimError("Method not allowed", 405);
    }
  } catch (error) {
    console.error('SCIM error:', error);
    return scimError("Internal server error", 500);
  }
});
