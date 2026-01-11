import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SSOConfig {
  id: string;
  provider: 'oidc' | 'saml';
  idp_name: string;
  issuer_url: string;
  client_id: string;
  sso_login_url: string | null;
  enabled: boolean;
  enforce_sso: boolean;
  default_role: string;
}

// Generate a cryptographically secure random string
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate PKCE code verifier and challenge for OIDC
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = base64Encode(array).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64Encode(new Uint8Array(hash)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return { verifier, challenge };
}

// Build SAML AuthnRequest
function buildSAMLAuthnRequest(
  issuer: string,
  assertionConsumerServiceURL: string,
  requestId: string
): string {
  const now = new Date().toISOString();
  
  const authnRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest 
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}"
  Version="2.0"
  IssueInstant="${now}"
  AssertionConsumerServiceURL="${assertionConsumerServiceURL}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${issuer}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>`;

  return authnRequest;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const orgId = url.searchParams.get('org_id');
    const redirectUrl = url.searchParams.get('redirect_url') || '/';

    if (!orgId) {
      return new Response(JSON.stringify({ error: 'Organization ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get SSO configuration for organization
    const { data: ssoConfig, error: ssoError } = await supabase
      .from('organization_sso_configs')
      .select('*')
      .eq('organization_id', orgId)
      .eq('enabled', true)
      .single();

    if (ssoError || !ssoConfig) {
      return new Response(JSON.stringify({ error: 'SSO not configured or disabled for this organization' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = ssoConfig as SSOConfig;
    const state = generateState();
    const callbackUrl = `${supabaseUrl}/functions/v1/sso-callback`;

    // Store state with org_id and redirect_url for callback verification
    // Using a simple approach - in production you'd want a proper state store
    const stateData = {
      org_id: orgId,
      redirect_url: redirectUrl,
      created_at: Date.now(),
    };
    const encodedState = base64Encode(JSON.stringify(stateData));

    if (config.provider === 'oidc') {
      // OIDC flow
      const { verifier, challenge } = await generatePKCE();
      
      // Store PKCE verifier - in production use a secure session store
      // For now we encode it in the state (not ideal for production)
      const oidcStateData = {
        ...stateData,
        code_verifier: verifier,
        nonce: generateState(),
      };
      const oidcEncodedState = base64Encode(JSON.stringify(oidcStateData));

      // Discover OIDC endpoints
      const discoveryUrl = config.issuer_url.endsWith('/')
        ? `${config.issuer_url}.well-known/openid-configuration`
        : `${config.issuer_url}/.well-known/openid-configuration`;

      let authorizationEndpoint = `${config.issuer_url}/authorize`;
      
      try {
        const discoveryResponse = await fetch(discoveryUrl);
        if (discoveryResponse.ok) {
          const discovery = await discoveryResponse.json();
          authorizationEndpoint = discovery.authorization_endpoint;
        }
      } catch (e) {
        console.log('OIDC discovery failed, using default endpoint');
      }

      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: config.client_id,
        redirect_uri: callbackUrl,
        scope: 'openid email profile',
        state: oidcEncodedState,
        nonce: oidcStateData.nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });

      const authUrl = `${authorizationEndpoint}?${authParams.toString()}`;

      // Log SSO initiation
      await supabase.from('audit_events').insert({
        organization_id: orgId,
        action: 'SSO_LOGIN_INITIATED',
        metadata: { provider: config.provider, idp_name: config.idp_name },
      });

      return Response.redirect(authUrl, 302);

    } else if (config.provider === 'saml') {
      // SAML flow
      const samlLoginUrl = config.sso_login_url || config.issuer_url;
      const requestId = `_${generateState()}`;
      const issuer = `${supabaseUrl}/functions/v1/sso-metadata?org_id=${orgId}`;
      
      const authnRequest = buildSAMLAuthnRequest(issuer, callbackUrl, requestId);
      
      // Encode SAML request
      const encoder = new TextEncoder();
      const data = encoder.encode(authnRequest);
      const compressedData = data; // In production, use deflate compression
      const samlRequest = base64Encode(compressedData);
      
      // Store request ID for validation
      const samlStateData = {
        ...stateData,
        request_id: requestId,
      };
      const samlEncodedState = base64Encode(JSON.stringify(samlStateData));

      const samlParams = new URLSearchParams({
        SAMLRequest: samlRequest,
        RelayState: samlEncodedState,
      });

      const samlUrl = `${samlLoginUrl}?${samlParams.toString()}`;

      // Log SSO initiation
      await supabase.from('audit_events').insert({
        organization_id: orgId,
        action: 'SSO_LOGIN_INITIATED',
        metadata: { provider: config.provider, idp_name: config.idp_name },
      });

      return Response.redirect(samlUrl, 302);
    }

    return new Response(JSON.stringify({ error: 'Unsupported SSO provider type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('SSO initiate error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
