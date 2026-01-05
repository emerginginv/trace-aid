import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditResult {
  table: string;
  orphaned_count: number;
  sample_ids: string[];
  severity: 'critical' | 'warning' | 'info';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!orgMember) {
      return new Response(JSON.stringify({ error: 'No organization found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orgId = orgMember.organization_id;

    // Tables that have case_id foreign key
    const tablesToAudit = [
      'case_activities',
      'case_attachments',
      'case_finances',
      'case_subjects',
      'case_updates',
      'case_budget_adjustments',
      'invoices',
      'retainer_funds',
    ];

    // Get all valid case IDs in the organization
    const { data: validCases } = await supabase
      .from('cases')
      .select('id')
      .eq('organization_id', orgId);

    const validCaseIds = new Set(validCases?.map(c => c.id) || []);

    const results: AuditResult[] = [];
    let totalOrphaned = 0;
    let criticalIssues = 0;

    for (const table of tablesToAudit) {
      try {
        // Get all records with case_id in this org
        const { data: records, error } = await supabase
          .from(table)
          .select('id, case_id')
          .eq('organization_id', orgId);

        if (error) {
          console.error(`Error querying ${table}:`, error);
          continue;
        }

        // Find orphaned records (case_id not in valid cases)
        const orphanedRecords = (records || []).filter(
          r => r.case_id && !validCaseIds.has(r.case_id)
        );

        const orphanedCount = orphanedRecords.length;
        const sampleIds = orphanedRecords.slice(0, 5).map(r => r.id);

        let severity: 'critical' | 'warning' | 'info' = 'info';
        if (orphanedCount > 0) {
          severity = 'critical';
          criticalIssues++;
          totalOrphaned += orphanedCount;
        }

        results.push({
          table,
          orphaned_count: orphanedCount,
          sample_ids: sampleIds,
          severity,
        });
      } catch (err) {
        console.error(`Error auditing ${table}:`, err);
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
        },
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Audit error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
