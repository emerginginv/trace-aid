import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate SAML Service Provider metadata
function generateSAMLMetadata(
  entityId: string,
  assertionConsumerServiceUrl: string,
  orgName: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor 
  xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${entityId}">
  <md:SPSSODescriptor 
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${assertionConsumerServiceUrl}"
      index="0"
      isDefault="true"/>
  </md:SPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="en">${orgName}</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">${orgName}</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">${entityId}</md:OrganizationURL>
  </md:Organization>
</md:EntityDescriptor>`;
}

// Generate OIDC client registration metadata
function generateOIDCMetadata(
  clientId: string,
  redirectUri: string,
  orgName: string
): object {
  return {
    client_id: clientId,
    client_name: orgName,
    redirect_uris: [redirectUri],
    response_types: ['code'],
    grant_types: ['authorization_code'],
    token_endpoint_auth_method: 'client_secret_basic',
    subject_type: 'public',
  };
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
    const format = url.searchParams.get('format') || 'saml'; // saml or oidc

    if (!orgId) {
      return new Response(JSON.stringify({ error: 'Organization ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get organization info
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get SSO configuration
    const { data: ssoConfig } = await supabase
      .from('organization_sso_configs')
      .select('client_id, provider')
      .eq('organization_id', orgId)
      .single();

    const entityId = `${supabaseUrl}/functions/v1/sso-metadata?org_id=${orgId}`;
    const callbackUrl = `${supabaseUrl}/functions/v1/sso-callback`;

    if (format === 'saml') {
      const metadata = generateSAMLMetadata(entityId, callbackUrl, org.name);
      
      return new Response(metadata, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/samlmetadata+xml',
          'Content-Disposition': `attachment; filename="${org.name.replace(/[^a-zA-Z0-9]/g, '_')}_saml_metadata.xml"`,
        },
      });
    } else if (format === 'oidc') {
      const metadata = generateOIDCMetadata(
        ssoConfig?.client_id || 'pending-configuration',
        callbackUrl,
        org.name
      );
      
      return new Response(JSON.stringify(metadata, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } else if (format === 'info') {
      // Return setup information for admins
      const info = {
        entity_id: entityId,
        assertion_consumer_service_url: callbackUrl,
        callback_url: callbackUrl,
        name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        organization_name: org.name,
        saml_metadata_url: `${supabaseUrl}/functions/v1/sso-metadata?org_id=${orgId}&format=saml`,
        oidc_metadata_url: `${supabaseUrl}/functions/v1/sso-metadata?org_id=${orgId}&format=oidc`,
        required_attributes: {
          email: 'Required - User email address (used as NameID)',
          name: 'Optional - User display name',
          groups: 'Optional - Group memberships for role mapping',
        },
        supported_bindings: [
          'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
          'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
        ],
      };
      
      return new Response(JSON.stringify(info, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid format. Use saml, oidc, or info' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('SSO metadata error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
