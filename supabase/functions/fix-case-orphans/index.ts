import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixRequest {
  tables?: string[];
  dryRun?: boolean;
}

interface FixResult {
  table: string;
  deleted_count: number;
  errors: string[];
  sample_ids: string[];
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

    // Parse request body
    const body: FixRequest = await req.json().catch(() => ({}));
    const { tables: requestedTables, dryRun = false } = body;

    // All fixable tables
    const allFixableTables = [
      'case_activities',
      'case_attachments',
      'case_finances',
      'case_subjects',
      'case_updates',
      'case_budget_adjustments',
      'invoices',
      'retainer_funds',
    ];

    const tablesToFix = requestedTables?.filter(t => allFixableTables.includes(t)) || allFixableTables;

    // Get all valid case IDs in the organization
    const { data: validCases } = await supabase
      .from('cases')
      .select('id')
      .eq('organization_id', orgId);

    const validCaseIds = new Set(validCases?.map(c => c.id) || []);

    const results: FixResult[] = [];
    const deletedRecords: any[] = [];
    let totalDeleted = 0;
    let totalErrors = 0;

    for (const table of tablesToFix) {
      const tableResult: FixResult = {
        table,
        deleted_count: 0,
        errors: [],
        sample_ids: [],
      };

      try {
        // Get all records with case_id in this org
        const { data: records, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .eq('organization_id', orgId);

        if (fetchError) {
          tableResult.errors.push(`Fetch error: ${fetchError.message}`);
          results.push(tableResult);
          continue;
        }

        // Find orphaned records
        const orphanedRecords = (records || []).filter(
          r => r.case_id && !validCaseIds.has(r.case_id)
        );

        if (orphanedRecords.length === 0) {
          results.push(tableResult);
          continue;
        }

        // Store records for export before deletion
        deletedRecords.push(...orphanedRecords.map(r => ({
          table,
          ...r,
        })));

        tableResult.sample_ids = orphanedRecords.slice(0, 5).map(r => r.id);

        if (!dryRun) {
          // Delete orphaned records
          const orphanedIds = orphanedRecords.map(r => r.id);
          
          const { error: deleteError, count } = await supabase
            .from(table)
            .delete()
            .in('id', orphanedIds);

          if (deleteError) {
            tableResult.errors.push(`Delete error: ${deleteError.message}`);
            totalErrors++;
          } else {
            tableResult.deleted_count = orphanedRecords.length;
            totalDeleted += orphanedRecords.length;
          }
        } else {
          // Dry run - just report what would be deleted
          tableResult.deleted_count = orphanedRecords.length;
          totalDeleted += orphanedRecords.length;
        }
      } catch (err: any) {
        tableResult.errors.push(`Exception: ${err.message}`);
        totalErrors++;
      }

      results.push(tableResult);
    }

    // Send notification if records were deleted
    if (!dryRun && totalDeleted > 0) {
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          organization_id: orgId,
          type: 'system',
          title: 'Orphaned Case Data Cleanup Complete',
          message: `Successfully deleted ${totalDeleted} orphaned records across ${results.filter(r => r.deleted_count > 0).length} tables.`,
          priority: 'normal',
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        timestamp: new Date().toISOString(),
        summary: {
          tables_fixed: results.filter(r => r.deleted_count > 0).length,
          total_deleted: totalDeleted,
          total_errors: totalErrors,
        },
        results,
        deleted_records: deletedRecords,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Fix error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
