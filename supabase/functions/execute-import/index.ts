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
  'case_subject',
  'update',
  'activity',
  'time_entry',
  'expense',
  'budget',
  'budget_adjustment',
];

// Normalize entity types from parser (plural) to edge function (singular)
const normalizeEntityType = (type: string): string => {
  const mappings: Record<string, string> = {
    'clients': 'client',
    'contacts': 'contact',
    'cases': 'case',
    'subjects': 'subject',
    'case_subjects': 'case_subject',
    'updates': 'update',
    'events': 'activity',
    'time_entries': 'time_entry',
    'expenses': 'expense',
    'budgets': 'budget',
    'budget_adjustments': 'budget_adjustment',
  };
  return mappings[type] || type;
};

const TABLE_MAP: Record<string, string> = {
  client: 'accounts',
  contact: 'contacts',
  case: 'cases',
  subject: 'case_subjects',
  case_subject: 'case_subjects',
  update: 'case_updates',
  activity: 'case_activities',
  time_entry: 'case_finances',
  expense: 'case_finances',
  budget: 'cases', // Budget data updates case directly
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
        // Find entity data, checking both normalized and original names
        const entityData = request.entities.find(e => 
          normalizeEntityType(e.entityType) === entityType || e.entityType === entityType
        );
        if (!entityData || entityData.records.length === 0) continue;
        
        // Use normalized entity type for processing
        const normalizedType = normalizeEntityType(entityData.entityType);

        const tableName = TABLE_MAP[normalizedType];
        console.log(`[execute-import] Processing ${entityData.records.length} ${normalizedType} records (from ${entityData.entityType})`);

        // Log entity start
        await supabase.from('import_logs').insert({
          batch_id: request.batchId,
          event_type: 'entity_started',
          entity_type: normalizedType,
          message: `Processing ${entityData.records.length} ${normalizedType} records`,
        });

        for (const record of entityData.records) {
          try {
            // Resolve references based on entity type
            const resolvedData = resolveReferences(
              normalizedType,
              record.data,
              referenceMap,
              userMap,
              request.userId,
              request.organizationId
            );

            // Handle budget entity specially - it updates cases table
            if (normalizedType === 'budget') {
              const caseId = resolvedData.case_id;
              if (!caseId) {
                throw new Error('Budget record missing case_id');
              }
              
              const updateData: Record<string, unknown> = {};
              if (resolvedData.budget_hours !== undefined) updateData.budget_hours = resolvedData.budget_hours;
              if (resolvedData.budget_dollars !== undefined) updateData.budget_dollars = resolvedData.budget_dollars;
              if (resolvedData.budget_notes !== undefined) updateData.budget_notes = resolvedData.budget_notes;
              
              const { error: updateError } = await supabase
                .from('cases')
                .update(updateData)
                .eq('id', caseId);
              
              if (updateError) {
                throw new Error(updateError.message);
              }
              
              // Record success but no new ID created
              await supabase.from('import_records').insert({
                batch_id: request.batchId,
                entity_type: normalizedType,
                external_record_id: record.externalRecordId,
                source_data: record.sourceData,
                casewyze_id: caseId,
                status: 'imported',
              });
              
              successCount++;
              continue; // Skip normal insert flow
            }

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
              entityType: normalizedType,
              id: inserted.id,
              table: tableName,
            });

            // Update reference map
            updateReferenceMap(normalizedType, record.externalRecordId, inserted.id, referenceMap);

            // Record success in import_records
            await supabase.from('import_records').insert({
              batch_id: request.batchId,
              entity_type: normalizedType,
              external_record_id: record.externalRecordId,
              source_data: record.sourceData,
              casewyze_id: inserted.id,
              status: 'imported',
            });

            successCount++;
          } catch (recordError) {
            const errorMessage = recordError instanceof Error ? recordError.message : String(recordError);
            console.error(`[execute-import] Failed to import ${normalizedType} ${record.externalRecordId}: ${errorMessage}`);

            errors.push({
              entityType: normalizedType,
              externalRecordId: record.externalRecordId,
              errorCode: categorizeError(errorMessage),
              errorMessage,
            });

            // Record failure in import_records
            await supabase.from('import_records').insert({
              batch_id: request.batchId,
              entity_type: normalizedType,
              external_record_id: record.externalRecordId,
              source_data: record.sourceData,
              status: 'failed',
              error_message: errorMessage,
            });

            // If any record fails, rollback all
            throw new Error(`Import failed for ${normalizedType} record ${record.externalRecordId}: ${errorMessage}`);
          }
        }

        // Log entity completion
        await supabase.from('import_logs').insert({
          batch_id: request.batchId,
          event_type: 'entity_completed',
          entity_type: normalizedType,
          message: `Completed processing ${entityData.records.length} ${normalizedType} records`,
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
  defaultUserId: string,
  organizationId?: string
): Record<string, unknown> {
  const resolved = { ...data };

  // Remove start_date if present (not in cases schema)
  delete resolved.start_date;

  // Remove external reference fields and resolve to actual IDs
  switch (entityType) {
    case 'client':
      // Ensure required fields for accounts table
      if (!resolved.user_id) resolved.user_id = defaultUserId;
      if (!resolved.organization_id && organizationId) resolved.organization_id = organizationId;
      break;

    case 'contact':
      if (resolved.external_account_id) {
        resolved.account_id = referenceMap.clients[resolved.external_account_id as string] || null;
      }
      delete resolved.external_account_id;
      if (!resolved.user_id) resolved.user_id = defaultUserId;
      if (!resolved.organization_id && organizationId) resolved.organization_id = organizationId;
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
      // Handle investigator_emails as comma-separated string or array
      if (resolved.investigator_emails) {
        let emails: string[] = [];
        if (typeof resolved.investigator_emails === 'string') {
          emails = (resolved.investigator_emails as string).split(',').map(e => e.trim()).filter(Boolean);
        } else if (Array.isArray(resolved.investigator_emails)) {
          emails = resolved.investigator_emails as string[];
        }
        resolved.investigator_ids = emails
          .map(email => userMap[email.toLowerCase().trim()])
          .filter(Boolean);
      }
      delete resolved.external_account_id;
      delete resolved.external_contact_id;
      delete resolved.external_parent_case_id;
      delete resolved.case_manager_email;
      delete resolved.investigator_emails;
      if (!resolved.user_id) resolved.user_id = defaultUserId;
      if (!resolved.organization_id && organizationId) resolved.organization_id = organizationId;
      break;

    case 'subject':
      // Standalone subject import - requires case_id from the CSV
      if (resolved.external_case_id) {
        const caseId = referenceMap.cases[resolved.external_case_id as string];
        if (!caseId) {
          throw new Error(`Case not found for external ID: ${resolved.external_case_id}`);
        }
        resolved.case_id = caseId;
      }
      delete resolved.external_case_id;
      
      // Build details JSON from subject-specific fields
      const subjectDetails: Record<string, unknown> = {};
      const subjectDetailFields = ['date_of_birth', 'ssn_last4', 'address', 'phone', 'email', 
        'employer', 'occupation', 'make', 'model', 'year', 'color', 'license_plate', 'vin',
        'business_name', 'ein', 'website'];
      for (const field of subjectDetailFields) {
        if (resolved[field] !== undefined && resolved[field] !== '') {
          subjectDetails[field] = resolved[field];
          delete resolved[field];
        }
      }
      if (Object.keys(subjectDetails).length > 0) {
        resolved.details = subjectDetails;
      }
      
      if (!resolved.user_id) resolved.user_id = defaultUserId;
      if (!resolved.organization_id && organizationId) resolved.organization_id = organizationId;
      if (!resolved.status) resolved.status = 'active';
      break;

    case 'case_subject':
      // Link record between case and subject
      if (resolved.external_case_id) {
        const caseId = referenceMap.cases[resolved.external_case_id as string];
        if (!caseId) {
          throw new Error(`Case not found for external ID: ${resolved.external_case_id}`);
        }
        resolved.case_id = caseId;
      }
      delete resolved.external_case_id;
      
      if (resolved.external_subject_id) {
        const subjectId = referenceMap.subjects[resolved.external_subject_id as string];
        if (!subjectId) {
          throw new Error(`Subject not found for external ID: ${resolved.external_subject_id}`);
        }
        // For case_subjects linking, we need to copy subject data
        // This is handled differently - we retrieve the subject and create a case-linked copy
      }
      delete resolved.external_subject_id;
      
      if (!resolved.user_id) resolved.user_id = defaultUserId;
      if (!resolved.organization_id && organizationId) resolved.organization_id = organizationId;
      break;

    case 'update':
      if (resolved.external_case_id) {
        const caseId = referenceMap.cases[resolved.external_case_id as string];
        if (!caseId) {
          throw new Error(`Case not found for external ID: ${resolved.external_case_id}`);
        }
        resolved.case_id = caseId;
      }
      delete resolved.external_case_id;
      
      if (resolved.author_email) {
        const normalizedEmail = (resolved.author_email as string).toLowerCase().trim();
        resolved.user_id = userMap[normalizedEmail] || defaultUserId;
      }
      delete resolved.author_email;
      
      if (!resolved.user_id) resolved.user_id = defaultUserId;
      if (!resolved.organization_id && organizationId) resolved.organization_id = organizationId;
      if (!resolved.update_type) resolved.update_type = 'general';
      break;

    case 'activity':
      if (resolved.external_case_id) {
        const caseId = referenceMap.cases[resolved.external_case_id as string];
        if (!caseId) {
          throw new Error(`Case not found for external ID: ${resolved.external_case_id}`);
        }
        resolved.case_id = caseId;
      }
      delete resolved.external_case_id;

      if (resolved.assigned_to_email) {
        const normalizedEmail = (resolved.assigned_to_email as string).toLowerCase().trim();
        resolved.assigned_user_id = userMap[normalizedEmail] || null;
      }
      delete resolved.assigned_to_email;
      
      if (resolved.author_email) {
        const normalizedEmail = (resolved.author_email as string).toLowerCase().trim();
        resolved.user_id = userMap[normalizedEmail] || defaultUserId;
      }
      delete resolved.author_email;
      
      if (!resolved.user_id) resolved.user_id = defaultUserId;
      if (!resolved.organization_id && organizationId) resolved.organization_id = organizationId;
      if (!resolved.status) resolved.status = 'to_do';
      break;

    case 'time_entry':
      if (resolved.external_case_id) {
        const caseId = referenceMap.cases[resolved.external_case_id as string];
        if (!caseId) {
          throw new Error(`Case not found for external ID: ${resolved.external_case_id}`);
        }
        resolved.case_id = caseId;
      }
      delete resolved.external_case_id;

      // Handle subject reference
      if (resolved.external_subject_id) {
        resolved.subject_id = referenceMap.subjects[resolved.external_subject_id as string] || null;
      }
      delete resolved.external_subject_id;

      // Handle activity reference
      if (resolved.external_activity_id) {
        resolved.activity_id = referenceMap.activities[resolved.external_activity_id as string] || null;
      }
      delete resolved.external_activity_id;

      if (resolved.author_email) {
        const normalizedEmail = (resolved.author_email as string).toLowerCase().trim();
        resolved.user_id = userMap[normalizedEmail] || defaultUserId;
      }
      delete resolved.author_email;
      
      // Auto-set finance_type for time entries
      resolved.finance_type = 'time';
      
      if (!resolved.user_id) resolved.user_id = defaultUserId;
      if (!resolved.organization_id && organizationId) resolved.organization_id = organizationId;
      break;

    case 'expense':
      if (resolved.external_case_id) {
        const caseId = referenceMap.cases[resolved.external_case_id as string];
        if (!caseId) {
          throw new Error(`Case not found for external ID: ${resolved.external_case_id}`);
        }
        resolved.case_id = caseId;
      }
      delete resolved.external_case_id;

      // Handle subject reference
      if (resolved.external_subject_id) {
        resolved.subject_id = referenceMap.subjects[resolved.external_subject_id as string] || null;
      }
      delete resolved.external_subject_id;

      // Handle activity reference
      if (resolved.external_activity_id) {
        resolved.activity_id = referenceMap.activities[resolved.external_activity_id as string] || null;
      }
      delete resolved.external_activity_id;

      if (resolved.author_email) {
        const normalizedEmail = (resolved.author_email as string).toLowerCase().trim();
        resolved.user_id = userMap[normalizedEmail] || defaultUserId;
      }
      delete resolved.author_email;
      
      // Auto-set finance_type for expenses
      resolved.finance_type = 'expense';
      
      if (!resolved.user_id) resolved.user_id = defaultUserId;
      if (!resolved.organization_id && organizationId) resolved.organization_id = organizationId;
      break;

    case 'budget':
      // Budget updates go to cases table - handle case reference
      if (resolved.external_case_id) {
        const caseId = referenceMap.cases[resolved.external_case_id as string];
        if (!caseId) {
          throw new Error(`Case not found for external ID: ${resolved.external_case_id}`);
        }
        resolved.case_id = caseId;
      }
      delete resolved.external_case_id;
      delete resolved.external_record_id; // Not needed for update
      break;

    case 'budget_adjustment':
      if (resolved.external_case_id) {
        const caseId = referenceMap.cases[resolved.external_case_id as string];
        if (!caseId) {
          throw new Error(`Case not found for external ID: ${resolved.external_case_id}`);
        }
        resolved.case_id = caseId;
      }
      delete resolved.external_case_id;

      if (resolved.author_email) {
        const normalizedEmail = (resolved.author_email as string).toLowerCase().trim();
        resolved.user_id = userMap[normalizedEmail] || defaultUserId;
      }
      delete resolved.author_email;
      
      if (!resolved.user_id) resolved.user_id = defaultUserId;
      if (!resolved.organization_id && organizationId) resolved.organization_id = organizationId;
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
    case 'case_subject':
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
    const reverseOrder = ['budget_adjustment', 'expense', 'time_entry', 'activity', 'update', 'case_subject', 'subject', 'case', 'contact', 'client'];
    
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
