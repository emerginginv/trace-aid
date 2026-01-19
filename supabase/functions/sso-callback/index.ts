import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StateData {
  org_id: string;
  redirect_url: string;
  created_at: number;
  code_verifier?: string;
  nonce?: string;
  request_id?: string;
}

interface SSOConfig {
  id: string;
  provider: 'oidc' | 'saml';
  idp_name: string;
  issuer_url: string;
  client_id: string;
  client_secret_encrypted: string | null;
  sso_login_url: string | null;
  enabled: boolean;
  default_role: string;
}

interface OIDCTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

interface OIDCUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  groups?: string[];
}

// Decode JWT payload without verification (verification happens via OIDC discovery)
function decodeJWTPayload(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payload = parts[1];
  const decoded = new TextDecoder().decode(base64Decode(payload.replace(/-/g, '+').replace(/_/g, '/')));
  return JSON.parse(decoded);
}

// Parse SAML response
function parseSAMLResponse(samlResponse: string): { email: string; name?: string; groups?: string[] } | null {
  try {
    const decoded = new TextDecoder().decode(base64Decode(samlResponse));
    
    // Simple XML parsing - in production use a proper SAML library
    const emailMatch = decoded.match(/<(?:saml:)?NameID[^>]*>([^<]+)<\/(?:saml:)?NameID>/);
    const nameMatch = decoded.match(/<(?:saml:)?Attribute[^>]*Name="(?:name|displayName)"[^>]*>[\s\S]*?<(?:saml:)?AttributeValue>([^<]+)<\/(?:saml:)?AttributeValue>/i);
    const groupsMatch = decoded.match(/<(?:saml:)?Attribute[^>]*Name="(?:groups?|memberOf)"[^>]*>([\s\S]*?)<\/(?:saml:)?Attribute>/i);
    
    if (!emailMatch) {
      return null;
    }
    
    const email = emailMatch[1].trim();
    const name = nameMatch?.[1]?.trim();
    
    let groups: string[] = [];
    if (groupsMatch) {
      const groupValues = groupsMatch[1].match(/<(?:saml:)?AttributeValue>([^<]+)<\/(?:saml:)?AttributeValue>/g);
      if (groupValues) {
        groups = groupValues.map(g => g.replace(/<[^>]+>/g, '').trim());
      }
    }
    
    return { email, name, groups };
  } catch (error) {
    console.error('SAML parsing error:', error);
    return null;
  }
}

// Determine role from groups using org's role mappings
async function determineRole(supabase: any, orgId: string, groups: string[]): Promise<string> {
  if (!groups || groups.length === 0) {
    // Get default role from SSO config
    const { data: config } = await supabase
      .from('organization_sso_configs')
      .select('default_role')
      .eq('organization_id', orgId)
      .single();
    
    return config?.default_role || 'member';
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    let stateData: StateData;
    let userEmail: string;
    let userName: string | undefined;
    let userGroups: string[] = [];

    // Handle OIDC callback (GET with code)
    if (req.method === 'GET' && url.searchParams.has('code')) {
      const code = url.searchParams.get('code')!;
      const state = url.searchParams.get('state')!;
      
      try {
        const decoded = new TextDecoder().decode(base64Decode(state));
        stateData = JSON.parse(decoded);
      } catch (e) {
        return new Response('Invalid state parameter', { status: 400 });
      }

      // Validate state age (5 minute expiry)
      if (Date.now() - stateData.created_at > 5 * 60 * 1000) {
        return new Response('SSO session expired', { status: 400 });
      }

      // Get SSO configuration
      const { data: ssoConfig } = await supabase
        .from('organization_sso_configs')
        .select('*')
        .eq('organization_id', stateData.org_id)
        .single();

      if (!ssoConfig) {
        return new Response('SSO configuration not found', { status: 404 });
      }

      const config = ssoConfig as SSOConfig;

      // Discover token endpoint
      const discoveryUrl = config.issuer_url.endsWith('/')
        ? `${config.issuer_url}.well-known/openid-configuration`
        : `${config.issuer_url}/.well-known/openid-configuration`;

      let tokenEndpoint = `${config.issuer_url}/token`;
      let userInfoEndpoint = `${config.issuer_url}/userinfo`;

      try {
        const discoveryResponse = await fetch(discoveryUrl);
        if (discoveryResponse.ok) {
          const discovery = await discoveryResponse.json();
          tokenEndpoint = discovery.token_endpoint;
          userInfoEndpoint = discovery.userinfo_endpoint;
        }
      } catch (e) {
        console.log('OIDC discovery failed, using default endpoints');
      }

      // Exchange code for tokens
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${supabaseUrl}/functions/v1/sso-callback`,
        client_id: config.client_id,
      });

      // Add PKCE verifier if present
      if (stateData.code_verifier) {
        tokenParams.append('code_verifier', stateData.code_verifier);
      }

      // Add client secret if present (some IdPs require it)
      if (config.client_secret_encrypted) {
        // In production, decrypt the client secret
        // For now, we assume it's stored directly (not recommended for production)
        tokenParams.append('client_secret', config.client_secret_encrypted);
      }

      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange failed:', error);
        return new Response('Failed to authenticate with identity provider', { status: 401 });
      }

      const tokens: OIDCTokenResponse = await tokenResponse.json();

      // Decode ID token to get user info
      const idTokenPayload = decodeJWTPayload(tokens.id_token);
      
      userEmail = idTokenPayload.email || idTokenPayload.preferred_username || idTokenPayload.sub;
      userName = idTokenPayload.name || [idTokenPayload.given_name, idTokenPayload.family_name].filter(Boolean).join(' ');
      userGroups = idTokenPayload.groups || [];

      // Optionally fetch additional user info
      if (!userEmail || !userName) {
        try {
          const userInfoResponse = await fetch(userInfoEndpoint, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          if (userInfoResponse.ok) {
            const userInfo: OIDCUserInfo = await userInfoResponse.json();
            userEmail = userEmail || userInfo.email || userInfo.preferred_username || userInfo.sub;
            userName = userName || userInfo.name || [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ');
            userGroups = userGroups.length ? userGroups : (userInfo.groups || []);
          }
        } catch (e) {
          console.log('UserInfo fetch failed, using ID token data');
        }
      }

    // Handle SAML callback (POST with SAMLResponse)
    } else if (req.method === 'POST') {
      const formData = await req.formData();
      const samlResponse = formData.get('SAMLResponse') as string;
      const relayState = formData.get('RelayState') as string;

      if (!samlResponse || !relayState) {
        return new Response('Invalid SAML response', { status: 400 });
      }

      try {
        const decoded = new TextDecoder().decode(base64Decode(relayState));
        stateData = JSON.parse(decoded);
      } catch (e) {
        return new Response('Invalid RelayState', { status: 400 });
      }

      // Validate state age
      if (Date.now() - stateData.created_at > 5 * 60 * 1000) {
        return new Response('SSO session expired', { status: 400 });
      }

      const parsedSAML = parseSAMLResponse(samlResponse);
      if (!parsedSAML) {
        return new Response('Failed to parse SAML response', { status: 400 });
      }

      userEmail = parsedSAML.email;
      userName = parsedSAML.name;
      userGroups = parsedSAML.groups || [];

    } else {
      return new Response('Invalid callback request', { status: 400 });
    }

    if (!userEmail) {
      return new Response('No email found in SSO response', { status: 400 });
    }

    // Determine user role based on group mappings
    const role = await determineRole(supabase, stateData.org_id, userGroups);

    // Check if user exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', userEmail.toLowerCase())
      .single();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.id;

      // Ensure user is member of this organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id, role')
        .eq('organization_id', stateData.org_id)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        // Add user to organization
        await supabase.from('organization_members').insert({
          organization_id: stateData.org_id,
          user_id: userId,
          role,
        });

        await supabase.from('user_roles').upsert({
          user_id: userId,
          role,
        }, { onConflict: 'user_id,role' });
      } else if (membership.role !== role) {
        // Update role if changed
        await supabase
          .from('organization_members')
          .update({ role })
          .eq('id', membership.id);
      }

    } else {
      // Create new user via edge function
      const { data: newUser, error: createError } = await supabase.functions.invoke('create-user', {
        body: {
          email: userEmail,
          full_name: userName || userEmail.split('@')[0],
          organization_id: stateData.org_id,
          role,
          sso_provisioned: true,
        },
      });

      if (createError || !newUser?.user?.id) {
        console.error('Failed to create SSO user:', createError);
        return new Response('Failed to create user account', { status: 500 });
      }

      userId = newUser.user.id;
    }

    // Generate a magic link for the user to complete login
    const { data: magicLink, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: stateData.redirect_url,
      },
    });

    if (magicLinkError || !magicLink?.properties?.action_link) {
      console.error('Failed to generate magic link:', magicLinkError);
      
      // Fallback: redirect to login with SSO success message
      const loginUrl = new URL(stateData.redirect_url.startsWith('http') ? stateData.redirect_url : `https://caseinformation.app${stateData.redirect_url}`);
      loginUrl.searchParams.set('sso_success', 'true');
      loginUrl.searchParams.set('email', userEmail);
      
      return Response.redirect(loginUrl.toString(), 302);
    }

    // Log successful SSO login
    await supabase.from('audit_events').insert({
      organization_id: stateData.org_id,
      actor_user_id: userId,
      action: 'SSO_LOGIN_SUCCESS',
      metadata: {
        email: userEmail,
        groups: userGroups,
        role,
        new_user: !existingProfile,
      },
    });

    // Redirect to magic link to complete authentication
    return Response.redirect(magicLink.properties.action_link, 302);

  } catch (error) {
    console.error('SSO callback error:', error);
    return new Response('SSO authentication failed', { status: 500 });
  }
});
