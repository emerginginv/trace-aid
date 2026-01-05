/**
 * Execute Import Edge Function
 * 
 * Handles atomic import transactions with rollback on failure.
 * This function processes imports server-side to ensure true atomicity.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateExecuteImportInput } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Entity processing order (dependency order)
const ENTITY_ORDER = [
  'client',
  'contact',
  'case',
  'subject',
  'update',
  'activity',
  'time_entry',
  'expense',
  'budget_adjustment',
];

const TABLE_MAP: Record<string, string> = {
  client: 'accounts',
  contact: 'contacts',
  case: 'cases',
  subject: 'case_subjects',
  update: 'case_updates',
  activity: 'case_activities',
  time_entry: 'case_finances',
  expense: 'case_finances',
  budget_adjustment: 'case_budget_adjustments',
};

interface ImportError {
  entityType: string;
  externalRecordId: string;
  errorCode: string;
  errorMessage: string;
  errorDetails?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate input
    const rawInput = await req.json();
    const validationResult = validateExecuteImportInput(rawInput);
    
    if (!validationResult.success) {
      console.log('[execute-import] Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          batchId: '',
          successCount: 0,
          failedCount: 1,
          skippedCount: 0,
          errors: [{
            entityType: 'validation',
            externalRecordId: '',
            errorCode: 'VALIDATION_ERROR',
            errorMessage: validationResult.error,
          }],
          referenceMap: {},
          rollbackPerformed: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const request = validationResult.data!;
    console.log(`[execute-import] Starting import for batch ${request.batchId}`);
    console.log(`[execute-import] Entities to process: ${request.entities.map(e => `${e.entityType}(${e.records.length})`).join(', ')}`);

    const errors: ImportError[] = [];
    const referenceMap: Record<string, Record<string, string>> = {
      clients: {},
      contacts: {},
      cases: {},
      subjects: {},
      activities: {},
    };
    let successCount = 0;
    let rollbackPerformed = false;

    // Load user email -> ID mapping
    const userMap: Record<string, string> = {};
    const { data: profiles } = await supabase.from('profiles').select('id, email');
    if (profiles) {
      for (const profile of profiles) {
        const normalized = profile.email.toLowerCase().trim();
        userMap[normalized] = profile.id;
      }
    }
    console.log(`[execute-import] Loaded ${Object.keys(userMap).length} user mappings`);

    // Log start
    await supabase.from('import_logs').insert({
      batch_id: request.batchId,
      event_type: 'started',
      message: `Atomic import execution started for ${request.entities.reduce((sum, e) => sum + e.records.length, 0)} records`,
    });

    // Track all inserted records for potential rollback
    const insertedRecords: { entityType: string; id: string; table: string }[] = [];

    try {
      // Process entities in dependency order
      for (const entityType of ENTITY_ORDER) {
        const entityData = request.entities.find(e => e.entityType === entityType);
        if (!entityData || entityData.records.length === 0) continue;

        const tableName = TABLE_MAP[entityType];
        console.log(`[execute-import] Processing ${entityData.records.length} ${entityType} records`);

        // Log entity start
        await supabase.from('import_logs').insert({
          batch_id: request.batchId,
          event_type: 'entity_started',
          entity_type: entityType,
          message: `Processing ${entityData.records.length} ${entityType} records`,
        });

        for (const record of entityData.records) {
          try {
            // Resolve references based on entity type
            const resolvedData = resolveReferences(
              entityType,
              record.data,
              referenceMap,
              userMap,
              request.userId
            );

            // Insert the record
            const { data: inserted, error: insertError } = await supabase
              .from(tableName)
              .insert(resolvedData)
              .select('id')
              .single();

            if (insertError) {
              throw new Error(insertError.message);
            }

            // Track for potential rollback
            insertedRecords.push({
              entityType,
              id: inserted.id,
              table: tableName,
            });

            // Update reference map
            updateReferenceMap(entityType, record.externalRecordId, inserted.id, referenceMap);

            // Record success in import_records
            await supabase.from('import_records').insert({
              batch_id: request.batchId,
              entity_type: entityType,
              external_record_id: record.externalRecordId,
              source_data: record.sourceData,
              casewyze_id: inserted.id,
              status: 'imported',
            });

            successCount++;
          } catch (recordError) {
            const errorMessage = recordError instanceof Error ? recordError.message : String(recordError);
            console.error(`[execute-import] Failed to import ${entityType} ${record.externalRecordId}: ${errorMessage}`);

            errors.push({
              entityType,
              externalRecordId: record.externalRecordId,
              errorCode: categorizeError(errorMessage),
              errorMessage,
            });

            // Record failure in import_records
            await supabase.from('import_records').insert({
              batch_id: request.batchId,
              entity_type: entityType,
              external_record_id: record.externalRecordId,
              source_data: record.sourceData,
              status: 'failed',
              error_message: errorMessage,
            });

            // If any record fails, rollback all
            throw new Error(`Import failed for ${entityType} record ${record.externalRecordId}: ${errorMessage}`);
          }
        }

        // Log entity completion
        await supabase.from('import_logs').insert({
          batch_id: request.batchId,
          event_type: 'entity_completed',
          entity_type: entityType,
          message: `Completed processing ${entityData.records.length} ${entityType} records`,
        });
      }

      console.log(`[execute-import] Import completed successfully. ${successCount} records imported.`);

      return new Response(
        JSON.stringify({
          success: true,
          batchId: request.batchId,
          successCount,
          failedCount: 0,
          skippedCount: 0,
          errors: [],
          referenceMap,
          rollbackPerformed: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (transactionError) {
      const errorMessage = transactionError instanceof Error ? transactionError.message : String(transactionError);
      console.error(`[execute-import] Transaction failed, initiating rollback: ${errorMessage}`);

      // Perform rollback
      rollbackPerformed = await performRollback(supabase as ReturnType<typeof createClient>, insertedRecords, request.batchId);

      // Log rollback
      await supabase.from('import_logs').insert({
        batch_id: request.batchId,
        event_type: 'rolled_back',
        message: `Transaction failed. Rollback ${rollbackPerformed ? 'completed' : 'failed'}. ${insertedRecords.length} records removed.`,
        details: { error: errorMessage, recordsRolledBack: insertedRecords.length },
      });

      return new Response(
        JSON.stringify({
          success: false,
          batchId: request.batchId,
          successCount: 0,
          failedCount: errors.length || 1,
          skippedCount: 0,
          errors: errors.length > 0 ? errors : [{
            entityType: 'unknown',
            externalRecordId: '',
            errorCode: 'TRANSACTION_FAILED',
            errorMessage,
          }],
          referenceMap: {},
          rollbackPerformed,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[execute-import] Fatal error: ${errorMessage}`);

    return new Response(
      JSON.stringify({
        success: false,
        batchId: '',
        successCount: 0,
        failedCount: 1,
        skippedCount: 0,
        errors: [{
          entityType: 'unknown',
          externalRecordId: '',
          errorCode: 'UNKNOWN_ERROR',
          errorMessage,
        }],
        referenceMap: {},
        rollbackPerformed: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// ============================================
// Helper Functions
// ============================================

function resolveReferences(
  entityType: string,
  data: Record<string, unknown>,
  referenceMap: Record<string, Record<string, string>>,
  userMap: Record<string, string>,
  defaultUserId: string
): Record<string, unknown> {
  const resolved = { ...data };

  // Remove external reference fields and resolve to actual IDs
  switch (entityType) {
    case 'contact':
      if (resolved.external_account_id) {
        resolved.account_id = referenceMap.clients[resolved.external_account_id as string] || null;
      }
      delete resolved.external_account_id;
      break;

    case 'case':
      if (resolved.external_account_id) {
        resolved.account_id = referenceMap.clients[resolved.external_account_id as string] || null;
      }
      if (resolved.external_contact_id) {
        resolved.contact_id = referenceMap.contacts[resolved.external_contact_id as string] || null;
      }
      if (resolved.external_parent_case_id) {
        resolved.parent_case_id = referenceMap.cases[resolved.external_parent_case_id as string] || null;
      }
      if (resolved.case_manager_email) {
        const normalizedEmail = (resolved.case_manager_email as string).toLowerCase().trim();
        resolved.case_manager_id = userMap[normalizedEmail] || null;
      }
      if (resolved.investigator_emails && Array.isArray(resolved.investigator_emails)) {
        resolved.investigator_ids = (resolved.investigator_emails as string[])
          .map(email => userMap[email.toLowerCase().trim()])
          .filter(Boolean);
      }
      delete resolved.external_account_id;
      delete resolved.external_contact_id;
      delete resolved.external_parent_case_id;
      delete resolved.case_manager_email;
      delete resolved.investigator_emails;
      break;

    case 'subject':
    case 'update':
    case 'activity':
    case 'time_entry':
    case 'expense':
    case 'budget_adjustment':
      if (resolved.external_case_id) {
        const caseId = referenceMap.cases[resolved.external_case_id as string];
        if (!caseId) {
          throw new Error(`Case not found for external ID: ${resolved.external_case_id}`);
        }
        resolved.case_id = caseId;
      }
      delete resolved.external_case_id;

      // Handle subject reference for time entries and expenses
      if (resolved.external_subject_id) {
        resolved.subject_id = referenceMap.subjects[resolved.external_subject_id as string] || null;
      }
      delete resolved.external_subject_id;

      // Handle activity reference for time entries and expenses
      if (resolved.external_activity_id) {
        resolved.activity_id = referenceMap.activities[resolved.external_activity_id as string] || null;
      }
      delete resolved.external_activity_id;

      // Handle author email
      if (resolved.author_email) {
        const normalizedEmail = (resolved.author_email as string).toLowerCase().trim();
        resolved.user_id = userMap[normalizedEmail] || defaultUserId;
      }
      delete resolved.author_email;

      // Handle assigned to email for activities
      if (resolved.assigned_to_email) {
        const normalizedEmail = (resolved.assigned_to_email as string).toLowerCase().trim();
        resolved.assigned_user_id = userMap[normalizedEmail] || null;
      }
      delete resolved.assigned_to_email;
      break;
  }

  return resolved;
}

function updateReferenceMap(
  entityType: string,
  externalId: string,
  casewyzeId: string,
  referenceMap: Record<string, Record<string, string>>
): void {
  switch (entityType) {
    case 'client':
      referenceMap.clients[externalId] = casewyzeId;
      break;
    case 'contact':
      referenceMap.contacts[externalId] = casewyzeId;
      break;
    case 'case':
      referenceMap.cases[externalId] = casewyzeId;
      break;
    case 'subject':
      referenceMap.subjects[externalId] = casewyzeId;
      break;
    case 'activity':
      referenceMap.activities[externalId] = casewyzeId;
      break;
  }
}

function categorizeError(message: string): string {
  if (message.includes('duplicate') || message.includes('unique')) {
    return 'DUPLICATE_RECORD';
  }
  if (message.includes('not found') || message.includes('does not exist')) {
    return 'REFERENCE_NOT_FOUND';
  }
  if (message.includes('violates') || message.includes('constraint')) {
    return 'CONSTRAINT_VIOLATION';
  }
  if (message.includes('validation')) {
    return 'VALIDATION_FAILED';
  }
  return 'DATABASE_ERROR';
}

async function performRollback(
  supabase: ReturnType<typeof createClient>,
  insertedRecords: { entityType: string; id: string; table: string }[],
  batchId: string
): Promise<boolean> {
  try {
    // Delete in reverse order to respect foreign key constraints
    const reverseOrder = ['budget_adjustment', 'expense', 'time_entry', 'activity', 'update', 'subject', 'case', 'contact', 'client'];
    
    for (const entityType of reverseOrder) {
      const recordsToDelete = insertedRecords
        .filter(r => r.entityType === entityType)
        .map(r => r.id);

      if (recordsToDelete.length === 0) continue;

      const tableName = TABLE_MAP[entityType];
      // Using any to bypass strict Supabase typing for dynamic table access
      const { error } = await (supabase as any)
        .from(tableName)
        .delete()
        .in('id', recordsToDelete);

      if (error) {
        console.error(`[execute-import] Failed to rollback ${entityType}: ${error.message}`);
      } else {
        console.log(`[execute-import] Rolled back ${recordsToDelete.length} ${entityType} records`);
      }
    }

    // Update import_records to mark as rolled_back
    // Using any to bypass strict Supabase typing
    await (supabase as any)
      .from('import_records')
      .update({ status: 'failed', error_message: 'Rolled back due to transaction failure' })
      .eq('batch_id', batchId)
      .eq('status', 'imported');

    return true;
  } catch (error) {
    console.error(`[execute-import] Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
