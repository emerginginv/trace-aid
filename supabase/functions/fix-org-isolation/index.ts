import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixRequest {
  tables?: string[]; // If empty/undefined, fix all tables
  dryRun?: boolean; // If true, only log what would be done without making changes
}

interface FixResult {
  table: string;
  backfilled_count: number;
  deleted_count: number;
  errors: string[];
  sample_ids: string[];
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

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tables, dryRun = false }: FixRequest = await req.json();

    console.log(`Starting org isolation fix... (Dry run: ${dryRun})`);

    // Tables that should always have organization_id (excluding picklists which allows NULL for global values)
    const fixableTables = [
      'contacts',
      'accounts',
      'organization_settings',
      'case_subjects',
      'subject_attachments',
      'retainer_funds',
      'invoice_payments',
      'invoices',
      'case_finances',
      'case_attachments',
      'case_activities',
      'case_updates',
      'cases',
      'notifications',
    ];

    const tablesToFix = tables && tables.length > 0 ? tables : fixableTables;
    const results: FixResult[] = [];
    const auditLog: any[] = [];

    for (const table of tablesToFix) {
      if (!fixableTables.includes(table)) {
        console.log(`Skipping non-fixable table: ${table}`);
        continue;
      }

      try {
        console.log(`Fixing table: ${table}`);
        
        // Find orphaned records
        const { data: orphanedRecords, error: findError } = await supabase
          .from(table)
          .select('id, user_id')
          .is('organization_id', null);

        if (findError) throw findError;

        const orphanedCount = orphanedRecords?.length || 0;
        
        if (orphanedCount === 0) {
          results.push({
            table,
            backfilled_count: 0,
            deleted_count: 0,
            errors: [],
            sample_ids: [],
          });
          continue;
        }

        console.log(`Found ${orphanedCount} orphaned records in ${table}`);

        let backfilledCount = 0;
        let deletedCount = 0;
        const sampleIds: string[] = [];
        const errors: string[] = [];

        // Process each orphaned record
        for (const record of orphanedRecords || []) {
          sampleIds.push(record.id);

          // Try to find the user's organization
          const { data: orgMember } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', record.user_id)
            .maybeSingle();

          if (orgMember?.organization_id) {
            // Backfill the organization_id
            if (!dryRun) {
              const { error: updateError } = await supabase
                .from(table)
                .update({ organization_id: orgMember.organization_id })
                .eq('id', record.id);

              if (updateError) {
                errors.push(`Failed to backfill ${record.id}: ${updateError.message}`);
                console.error(`Error backfilling ${table}.${record.id}:`, updateError);
              } else {
                backfilledCount++;
                auditLog.push({
                  action: 'backfill',
                  table,
                  record_id: record.id,
                  organization_id: orgMember.organization_id,
                  timestamp: new Date().toISOString(),
                });
              }
            } else {
              console.log(`[DRY RUN] Would backfill ${table}.${record.id} with org_id: ${orgMember.organization_id}`);
              backfilledCount++;
            }
          } else {
            // User not in any organization - delete the record
            if (!dryRun) {
              const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('id', record.id);

              if (deleteError) {
                errors.push(`Failed to delete ${record.id}: ${deleteError.message}`);
                console.error(`Error deleting ${table}.${record.id}:`, deleteError);
              } else {
                deletedCount++;
                auditLog.push({
                  action: 'delete',
                  table,
                  record_id: record.id,
                  reason: 'user_not_in_organization',
                  timestamp: new Date().toISOString(),
                });
              }
            } else {
              console.log(`[DRY RUN] Would delete ${table}.${record.id} (user not in org)`);
              deletedCount++;
            }
          }
        }

        results.push({
          table,
          backfilled_count: backfilledCount,
          deleted_count: deletedCount,
          errors,
          sample_ids: sampleIds.slice(0, 5),
        });

        console.log(`Fixed ${table}: ${backfilledCount} backfilled, ${deletedCount} deleted`);
      } catch (error) {
        console.error(`Error fixing table ${table}:`, error);
        results.push({
          table,
          backfilled_count: 0,
          deleted_count: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          sample_ids: [],
        });
      }
    }

    // Calculate totals
    const totalBackfilled = results.reduce((sum, r) => sum + r.backfilled_count, 0);
    const totalDeleted = results.reduce((sum, r) => sum + r.deleted_count, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Fix complete. Backfilled: ${totalBackfilled}, Deleted: ${totalDeleted}, Errors: ${totalErrors}`);

    // Create notification for admin about the fix
    if (!dryRun && (totalBackfilled > 0 || totalDeleted > 0)) {
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (orgMember) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          organization_id: orgMember.organization_id,
          type: 'settings',
          title: '✅ Org Isolation Fixed',
          message: `Successfully fixed ${totalBackfilled + totalDeleted} records (${totalBackfilled} backfilled, ${totalDeleted} deleted)`,
          priority: 'medium',
          link: '/settings',
          read: false,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        timestamp: new Date().toISOString(),
        summary: {
          tables_fixed: tablesToFix.length,
          total_backfilled: totalBackfilled,
          total_deleted: totalDeleted,
          total_errors: totalErrors,
        },
        results,
        audit_log: auditLog,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Fix error:', error);
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
