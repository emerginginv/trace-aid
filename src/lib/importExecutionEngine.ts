/**
 * Import Execution Engine
 * 
 * Handles atomic import transactions with comprehensive logging,
 * rollback capabilities, and audit trail generation.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ImportEntityType,
  ImportLogEventType,
  ImportErrorCode,
  ImportLogEntry,
  ImportErrorEntry,
  ImportExecutionResult,
  DryRunResult,
  MappingConfig,
  ExecuteImportRequest,
  ExecuteImportResponse,
  ExecuteImportEntity,
} from '@/types/import';
import type { ParsedCSV } from '@/lib/csvParser';
import {
  parseDate,
  parseDateTime,
  normalizeEmail,
  normalizePhone,
  normalizeState,
  cleanString,
  parseNumber,
} from './importUtils';

// ============================================
// Constants
// ============================================

const ENTITY_ORDER: ImportEntityType[] = [
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

const TABLE_MAP: Record<ImportEntityType, string> = {
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

// ============================================
// Import Execution Engine Class
// ============================================

export class ImportExecutionEngine {
  private organizationId: string;
  private userId: string;
  private batchId: string;
  private sourceSystemName: string;
  private mappingConfig: MappingConfig;
  private logs: ImportLogEntry[] = [];
  private errors: ImportErrorEntry[] = [];
  private startTime: number = 0;
  private userMap: Map<string, string> = new Map();

  constructor(
    organizationId: string,
    userId: string,
    batchId: string,
    sourceSystemName: string,
    mappingConfig: MappingConfig
  ) {
    this.organizationId = organizationId;
    this.userId = userId;
    this.batchId = batchId;
    this.sourceSystemName = sourceSystemName;
    this.mappingConfig = mappingConfig;
  }

  // ============================================
  // Main Execution Method
  // ============================================

  async execute(
    parsedFiles: ParsedCSV[],
    dryRunResult: DryRunResult
  ): Promise<ImportExecutionResult> {
    this.startTime = Date.now();

    try {
      // Log start
      await this.logEvent('started', 'Import execution started');

      // Update batch status to processing
      await this.updateBatchStatus('processing');

      // Load user email -> ID mapping
      await this.loadUserMap();

      // Prepare entities for execution
      const entities = this.prepareEntitiesForExecution(parsedFiles, dryRunResult);

      // Call edge function for atomic execution
      const response = await this.invokeExecuteImport(entities);

      if (response.success) {
        await this.logEvent('completed', `Import completed successfully. ${response.successCount} records imported.`);
        await this.updateBatchStatus('completed', response.successCount, response.failedCount);
      } else {
        await this.logEvent('failed', `Import failed. ${response.failedCount} errors. Rollback ${response.rollbackPerformed ? 'performed' : 'not needed'}.`);
        await this.updateBatchStatus('failed', response.successCount, response.failedCount);
      }

      // Store errors from edge function
      for (const error of response.errors) {
        await this.logError(
          error.entityType as ImportEntityType,
          error.externalRecordId,
          error.errorCode as ImportErrorCode,
          error.errorMessage,
          error.errorDetails
        );
      }

      return {
        success: response.success,
        batchId: this.batchId,
        status: response.success ? 'completed' : 'failed',
        totalRecords: dryRunResult.recordsToCreate,
        successfulRecords: response.successCount,
        failedRecords: response.failedCount,
        skippedRecords: response.skippedCount,
        errors: this.errors,
        logs: this.logs,
        rollbackPerformed: response.rollbackPerformed,
        durationMs: Date.now() - this.startTime,
        referenceMap: response.referenceMap,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logEvent('failed', `Import execution failed: ${errorMessage}`);
      await this.logError('client', '', 'TRANSACTION_FAILED', errorMessage, { stack: error instanceof Error ? error.stack : undefined });
      await this.updateBatchStatus('failed', 0, 0);

      return {
        success: false,
        batchId: this.batchId,
        status: 'failed',
        totalRecords: dryRunResult.recordsToCreate,
        successfulRecords: 0,
        failedRecords: dryRunResult.recordsToCreate,
        skippedRecords: 0,
        errors: this.errors,
        logs: this.logs,
        rollbackPerformed: false,
        durationMs: Date.now() - this.startTime,
      };
    }
  }

  // ============================================
  // Prepare Entities
  // ============================================

  private prepareEntitiesForExecution(
    parsedFiles: ParsedCSV[],
    dryRunResult: DryRunResult
  ): ExecuteImportEntity[] {
    const entities: ExecuteImportEntity[] = [];
    const importTimestamp = new Date().toISOString();

    for (const entityType of ENTITY_ORDER) {
      const file = parsedFiles.find(f => this.getEntityTypeFromFileName(f.fileName) === entityType);
      if (!file || file.rows.length === 0) continue;

      const records = file.rows
        .filter((row, idx) => {
          // Check if this record passed dry-run validation
          const detail = dryRunResult.details.find(
            d => d.entityType === entityType && d.externalRecordId === row.external_record_id
          );
          return detail?.operation === 'create';
        })
        .map(row => {
          const normalizedData = this.normalizeRecord(entityType, row as unknown as Record<string, unknown>, importTimestamp);
          return {
            externalRecordId: row.external_record_id,
            data: normalizedData,
            sourceData: row as unknown as Record<string, unknown>,
          };
        });

      if (records.length > 0) {
        entities.push({ entityType, records });
      }
    }

    return entities;
  }

  private getEntityTypeFromFileName(fileName: string): ImportEntityType | null {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('client') || lowerName.includes('account') || lowerName.includes('organization')) return 'client';
    if (lowerName.includes('contact')) return 'contact';
    if (lowerName.includes('case')) return 'case';
    if (lowerName.includes('subject')) return 'subject';
    if (lowerName.includes('update')) return 'update';
    if (lowerName.includes('event') || lowerName.includes('activity') || lowerName.includes('task')) return 'activity';
    if (lowerName.includes('time')) return 'time_entry';
    if (lowerName.includes('expense')) return 'expense';
    if (lowerName.includes('budget')) return 'budget_adjustment';
    return null;
  }

  private normalizeRecord(
    entityType: ImportEntityType,
    row: Record<string, unknown>,
    importTimestamp: string
  ): Record<string, unknown> {
    const base = {
      organization_id: this.organizationId,
      user_id: this.userId,
      import_batch_id: this.batchId,
      external_record_id: row.external_record_id,
      external_system_name: this.sourceSystemName,
      import_timestamp: importTimestamp,
    };

    switch (entityType) {
      case 'client':
        return {
          ...base,
          name: row.name,
          industry: cleanString(row.industry as string),
          phone: normalizePhone(row.phone as string),
          email: normalizeEmail(row.email as string),
          address: cleanString(row.address as string),
          city: cleanString(row.city as string),
          state: normalizeState(row.state as string),
          zip_code: cleanString(row.zip_code as string),
          notes: cleanString(row.notes as string),
        };

      case 'contact':
        return {
          ...base,
          first_name: row.first_name,
          last_name: row.last_name,
          external_account_id: row.external_account_id,
          email: normalizeEmail(row.email as string),
          phone: normalizePhone(row.phone as string),
          address: cleanString(row.address as string),
          city: cleanString(row.city as string),
          state: normalizeState(row.state as string),
          zip_code: cleanString(row.zip_code as string),
          notes: cleanString(row.notes as string),
        };

      case 'case':
        return {
          ...base,
          case_number: row.case_number,
          title: row.title,
          external_account_id: row.external_account_id,
          external_contact_id: row.external_contact_id,
          external_parent_case_id: row.external_parent_case_id,
          case_manager_email: row.case_manager_email,
          investigator_emails: row.investigator_emails,
          claim_number: cleanString(row.claim_number as string),
          status: row.status || 'open',
          due_date: parseDate(row.due_date as string),
          budget_hours: parseNumber(row.budget_hours as string),
          budget_dollars: parseNumber(row.budget_dollars as string),
          budget_notes: cleanString(row.budget_notes as string),
          description: cleanString(row.description as string),
        };

      case 'subject':
        return {
          ...base,
          external_case_id: row.external_case_id,
          name: row.name,
          subject_type: row.subject_type || 'person',
          is_primary: row.is_primary === 'true' || row.is_primary === true,
          notes: cleanString(row.notes as string),
          profile_image_url: cleanString(row.profile_image_url as string),
          details: row.details || {},
        };

      case 'update':
        return {
          ...base,
          external_case_id: row.external_case_id,
          title: row.title,
          update_type: row.update_type || 'Other',
          description: cleanString(row.description as string),
          created_at: parseDateTime(row.created_at as string) || new Date().toISOString(),
          author_email: row.author_email,
        };

      case 'activity':
        return {
          ...base,
          external_case_id: row.external_case_id,
          activity_type: row.activity_type || 'task',
          title: row.title,
          description: cleanString(row.description as string),
          status: row.status || 'to_do',
          due_date: parseDate(row.due_date as string),
          completed: row.completed === 'true' || row.completed === true,
          completed_at: row.completed_at ? parseDateTime(row.completed_at as string) : null,
          event_subtype: cleanString(row.event_subtype as string),
          assigned_to_email: row.assigned_to_email,
          created_at: parseDateTime(row.created_at as string) || new Date().toISOString(),
        };

      case 'time_entry':
        const hours = parseNumber(row.hours as string) || 0;
        const hourlyRate = parseNumber(row.hourly_rate as string) || 0;
        return {
          ...base,
          external_case_id: row.external_case_id,
          finance_type: 'time',
          date: parseDate(row.date as string) || new Date().toISOString().split('T')[0],
          hours,
          hourly_rate: hourlyRate,
          amount: parseNumber(row.amount as string) || hours * hourlyRate,
          description: row.description,
          external_subject_id: row.external_subject_id,
          external_activity_id: row.external_activity_id,
          start_date: parseDate(row.start_date as string),
          end_date: parseDate(row.end_date as string),
          category: cleanString(row.category as string),
          notes: cleanString(row.notes as string),
          created_at: parseDateTime(row.created_at as string) || new Date().toISOString(),
        };

      case 'expense':
        return {
          ...base,
          external_case_id: row.external_case_id,
          finance_type: 'expense',
          date: parseDate(row.date as string) || new Date().toISOString().split('T')[0],
          amount: parseNumber(row.amount as string) || 0,
          description: row.description,
          category: cleanString(row.category as string),
          quantity: parseNumber(row.quantity as string),
          unit_price: parseNumber(row.unit_price as string),
          external_subject_id: row.external_subject_id,
          external_activity_id: row.external_activity_id,
          notes: cleanString(row.notes as string),
          created_at: parseDateTime(row.created_at as string) || new Date().toISOString(),
        };

      case 'budget_adjustment':
        const previousValue = parseNumber(row.previous_value as string);
        const newValue = parseNumber(row.new_value as string) || 0;
        return {
          ...base,
          external_case_id: row.external_case_id,
          adjustment_type: row.adjustment_type || 'dollars',
          previous_value: previousValue,
          new_value: newValue,
          adjustment_amount: row.adjustment_amount !== undefined 
            ? parseNumber(row.adjustment_amount as string)
            : previousValue !== null ? newValue - previousValue : null,
          reason: row.reason,
          author_email: row.author_email,
          created_at: parseDateTime(row.created_at as string) || new Date().toISOString(),
        };

      default:
        return base;
    }
  }

  // ============================================
  // Edge Function Invocation
  // ============================================

  private async invokeExecuteImport(
    entities: ExecuteImportEntity[]
  ): Promise<ExecuteImportResponse> {
    const request: ExecuteImportRequest = {
      batchId: this.batchId,
      organizationId: this.organizationId,
      userId: this.userId,
      sourceSystemName: this.sourceSystemName,
      entities,
      mappingConfig: this.mappingConfig,
    };

    const { data, error } = await supabase.functions.invoke('execute-import', {
      body: request,
    });

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }

    return data as ExecuteImportResponse;
  }

  // ============================================
  // User Map Loading
  // ============================================

  private async loadUserMap(): Promise<void> {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email');

    if (profiles) {
      for (const profile of profiles) {
        const normalized = normalizeEmail(profile.email);
        if (normalized) {
          this.userMap.set(normalized, profile.id);
        }
      }
    }
  }

  // ============================================
  // Logging Methods
  // ============================================

  async logEvent(
    eventType: ImportLogEventType,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    const logEntry = {
      batch_id: this.batchId,
      event_type: eventType,
      message,
      details,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase
      .from('import_logs' as any)
      .insert(logEntry) as any)
      .select('id')
      .single();

    if (!error && data) {
      this.logs.push({ ...logEntry, id: (data as any).id } as ImportLogEntry);
    }
  }

  async logError(
    entityType: ImportEntityType,
    externalRecordId: string,
    errorCode: ImportErrorCode,
    errorMessage: string,
    errorDetails?: Record<string, unknown>
  ): Promise<void> {
    const errorEntry = {
      batch_id: this.batchId,
      entity_type: entityType,
      external_record_id: externalRecordId,
      error_code: errorCode,
      error_message: errorMessage,
      error_details: errorDetails,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase
      .from('import_errors' as any)
      .insert(errorEntry) as any)
      .select('id')
      .single();

    if (!error && data) {
      this.errors.push({ ...errorEntry, id: (data as any).id } as ImportErrorEntry);
    }
  }

  // ============================================
  // Batch Status Management
  // ============================================

  private async updateBatchStatus(
    status: string,
    processedRecords?: number,
    failedRecords?: number
  ): Promise<void> {
    const updateData: Record<string, unknown> = { 
      status,
      source_system_name: this.sourceSystemName,
    };
    
    if (processedRecords !== undefined) {
      updateData.processed_records = processedRecords;
    }
    if (failedRecords !== undefined) {
      updateData.failed_records = failedRecords;
    }
    if (status === 'completed' || status === 'failed' || status === 'rolled_back') {
      updateData.completed_at = new Date().toISOString();
    }

    await (supabase
      .from('import_batches' as any)
      .update(updateData)
      .eq('id', this.batchId) as any);
  }
}

// ============================================
// Enhanced Rollback Function
// ============================================

export async function rollbackImportBatchWithLogging(batchId: string): Promise<{
  success: boolean;
  recordsDeleted: number;
  error?: string;
}> {
  const startTime = Date.now();
  let recordsDeleted = 0;

  try {
    // Log rollback start
    await supabase.from('import_logs' as any).insert({
      batch_id: batchId,
      event_type: 'rolled_back',
      message: 'Manual rollback initiated',
      created_at: new Date().toISOString(),
    });

    // Get all imported records
    const { data: records } = await (supabase
      .from('import_records' as any)
      .select('entity_type, casewyze_id')
      .eq('batch_id', batchId)
      .eq('status', 'imported') as any);

    if (!records || records.length === 0) {
      await supabase.from('import_logs' as any).insert({
        batch_id: batchId,
        event_type: 'rolled_back',
        message: 'No records to rollback',
        details: { durationMs: Date.now() - startTime },
        created_at: new Date().toISOString(),
      });
      return { success: true, recordsDeleted: 0 };
    }

    // Delete in reverse order of dependencies
    const entityOrder: ImportEntityType[] = [
      'budget_adjustment',
      'expense',
      'time_entry',
      'activity',
      'update',
      'subject',
      'case',
      'contact',
      'client',
    ];

    for (const entityType of entityOrder) {
      const ids = (records as any[])
        .filter(r => r.entity_type === entityType && r.casewyze_id)
        .map(r => r.casewyze_id);

      if (ids.length === 0) continue;

      const { error } = await (supabase
        .from(TABLE_MAP[entityType] as any)
        .delete()
        .in('id', ids) as any);

      if (error) {
        throw new Error(`Failed to delete ${entityType} records: ${error.message}`);
      }

      recordsDeleted += ids.length;

      // Log entity rollback
      await supabase.from('import_logs' as any).insert({
        batch_id: batchId,
        event_type: 'rolled_back',
        entity_type: entityType,
        message: `Rolled back ${ids.length} ${entityType} records`,
        created_at: new Date().toISOString(),
      });
    }

    // Update batch status
    await (supabase
      .from('import_batches' as any)
      .update({ 
        status: 'rolled_back',
        completed_at: new Date().toISOString(),
      })
      .eq('id', batchId) as any);

    // Log completion
    await supabase.from('import_logs' as any).insert({
      batch_id: batchId,
      event_type: 'rolled_back',
      message: `Rollback completed. ${recordsDeleted} records deleted.`,
      details: { 
        recordsDeleted, 
        durationMs: Date.now() - startTime 
      },
      created_at: new Date().toISOString(),
    });

    return { success: true, recordsDeleted };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error
    await supabase.from('import_errors' as any).insert({
      batch_id: batchId,
      entity_type: 'client',
      error_code: 'ROLLBACK_FAILED',
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });

    return { success: false, recordsDeleted, error: errorMessage };
  }
}
