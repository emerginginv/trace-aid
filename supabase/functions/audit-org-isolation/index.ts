import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditResult {
  table: string;
  orphaned_count: number;
  null_org_count: number;
  invalid_org_count: number;
  sample_ids: string[];
  severity: 'critical' | 'warning' | 'info';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin - check both user_roles and organization_members tables
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const { data: orgMemberRole } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = userRole?.role === 'admin' || orgMemberRole?.role === 'admin';
    
    console.log('Admin check:', { userId: user.id, userRole, orgMemberRole, isAdmin });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting org isolation audit...');

    // Tables to audit (all tables with organization_id column)
    // NOTE: picklists is excluded because NULL organization_id is valid for global/system values
    const tablesToAudit = [
      'notifications',
      'cases',
      'case_updates',
      'case_activities',
      'case_attachments',
      'case_finances',
      'case_subjects',
      'contacts',
      'accounts',
      'invoices',
      'invoice_payments',
      'retainer_funds',
      'subject_attachments',
      'organization_settings',
    ];

    const results: AuditResult[] = [];

    // Get all valid organization IDs
    const { data: validOrgs } = await supabase
      .from('organizations')
      .select('id');
    
    const validOrgIds = validOrgs?.map(org => org.id) || [];

    // Audit each table
    for (const table of tablesToAudit) {
      try {
        console.log(`Auditing table: ${table}`);

        // Count rows with NULL organization_id
        const { count: nullCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .is('organization_id', null);

        // Get sample IDs with NULL org_id
        const { data: nullSamples } = await supabase
          .from(table)
          .select('id')
          .is('organization_id', null)
          .limit(5);

        // For tables that allow NULL (like picklists for global values), check for invalid org_ids
        const { data: allRows } = await supabase
          .from(table)
          .select('id, organization_id')
          .not('organization_id', 'is', null);

        const invalidOrgRows = allRows?.filter(
          row => !validOrgIds.includes(row.organization_id)
        ) || [];

        const orphanedCount = nullCount || 0;
        const invalidOrgCount = invalidOrgRows.length;
        const totalIssues = orphanedCount + invalidOrgCount;

        if (totalIssues > 0) {
          const sampleIds = [
            ...(nullSamples?.map(s => s.id) || []),
            ...invalidOrgRows.slice(0, 5).map(r => r.id),
          ];

          results.push({
            table,
            orphaned_count: orphanedCount,
            null_org_count: orphanedCount,
            invalid_org_count: invalidOrgCount,
            sample_ids: sampleIds,
            severity: orphanedCount > 0 ? 'critical' : 'warning',
          });
        } else {
          results.push({
            table,
            orphaned_count: 0,
            null_org_count: 0,
            invalid_org_count: 0,
            sample_ids: [],
            severity: 'info',
          });
        }
      } catch (error) {
        console.error(`Error auditing table ${table}:`, error);
        results.push({
          table,
          orphaned_count: -1,
          null_org_count: -1,
          invalid_org_count: -1,
          sample_ids: [],
          severity: 'warning',
        });
      }
    }

    // Calculate summary
    const criticalIssues = results.filter(r => r.severity === 'critical').length;
    const totalOrphaned = results.reduce((sum, r) => sum + (r.orphaned_count > 0 ? r.orphaned_count : 0), 0);
    const totalInvalid = results.reduce((sum, r) => sum + (r.invalid_org_count > 0 ? r.invalid_org_count : 0), 0);

    console.log(`Audit complete. Critical issues: ${criticalIssues}, Total orphaned: ${totalOrphaned}, Total invalid: ${totalInvalid}`);

    // If there are critical issues, create a notification for admins
    if (criticalIssues > 0) {
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminUsers) {
        for (const admin of adminUsers) {
          // Get admin's org
          const { data: orgMember } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', admin.user_id)
            .single();

          if (orgMember) {
            await supabase.from('notifications').insert({
              user_id: admin.user_id,
              organization_id: orgMember.organization_id,
              type: 'settings',
              title: '🚨 Data Isolation Alert',
              message: `Audit detected ${totalOrphaned} rows without org_id across ${criticalIssues} tables`,
              priority: 'high',
              link: '/settings',
              read: false,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          tables_audited: tablesToAudit.length,
          critical_issues: criticalIssues,
          total_orphaned: totalOrphaned,
          total_invalid: totalInvalid,
        },
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Audit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
