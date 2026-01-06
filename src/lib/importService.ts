/**
 * Core Import Service for CaseWyze Import System
 * 
 * Handles validation, reference resolution, and batch processing of imports.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ImportFile,
  ImportBatch,
  ImportConfig,
  ImportError,
  ImportProcessingResult,
  ImportValidationResult,
  ReferenceMap,
  ImportEntityType,
  ClientImport,
  ContactImport,
  CaseImport,
  SubjectImport,
  UpdateImport,
  ActivityImport,
  TimeEntryImport,
  ExpenseImport,
  BudgetAdjustmentImport,
  MappingConfig,
  NormalizationLog,
  DryRunResult,
  DryRunRecordDetail,
  DryRunError,
  DryRunWarning,
} from '@/types/import';
import { DEFAULT_IMPORT_CONFIG, EMPTY_NORMALIZATION_LOG } from '@/types/import';
import {
  importFileSchema,
  clientImportSchema,
  contactImportSchema,
  caseImportSchema,
  subjectImportSchema,
  updateImportSchema,
  activityImportSchema,
  timeEntryImportSchema,
  expenseImportSchema,
  budgetAdjustmentImportSchema,
} from './importSchemas';
import {
  parseDate,
  parseDateTime,
  normalizeEmail,
  normalizePhone,
  normalizeState,
  cleanString,
  parseNumber,
  validateUniqueExternalIds,
} from './importUtils';
import { ZodSchema } from 'zod';

// ============================================
// Import Service Class
// ============================================

export class ImportService {
  private organizationId: string;
  private userId: string;
  private config: ImportConfig;
  private referenceMap: ReferenceMap;
  private errors: ImportError[];
  private warnings: ImportError[];

  constructor(
    organizationId: string,
    userId: string,
    config: Partial<ImportConfig> = {}
  ) {
    this.organizationId = organizationId;
    this.userId = userId;
    this.config = { ...DEFAULT_IMPORT_CONFIG, ...config };
    this.referenceMap = {
      clients: new Map(),
      contacts: new Map(),
      cases: new Map(),
      subjects: new Map(),
      activities: new Map(),
      users: new Map(),
    };
    this.errors = [];
    this.warnings = [];
  }

  // ============================================
  // Validation
  // ============================================

  /**
   * Validate an import file structure and contents
   */
  async validateImportFile(data: unknown): Promise<ImportValidationResult> {
    this.errors = [];
    this.warnings = [];

    // Schema validation
    const parseResult = importFileSchema.safeParse(data);
    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        this.errors.push({
          field: issue.path.join('.'),
          message: issue.message,
          timestamp: new Date().toISOString(),
        });
      }
      return { valid: false, errors: this.errors, warnings: this.warnings };
    }

    const importFile = parseResult.data as ImportFile;

    // Validate unique external IDs within each entity type
    this.validateUniqueIds(importFile);

    // Validate referential integrity
    await this.validateReferences(importFile);

    // Load user email -> ID mapping
    await this.loadUserMap();

    // Validate user references
    this.validateUserReferences(importFile);

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private validateUniqueIds(importFile: ImportFile): void {
    const entities: Array<{ key: keyof ImportFile; type: ImportEntityType }> = [
      { key: 'clients', type: 'client' },
      { key: 'contacts', type: 'contact' },
      { key: 'cases', type: 'case' },
      { key: 'subjects', type: 'subject' },
      { key: 'updates', type: 'update' },
      { key: 'activities', type: 'activity' },
      { key: 'time_entries', type: 'time_entry' },
      { key: 'expenses', type: 'expense' },
      { key: 'budget_adjustments', type: 'budget_adjustment' },
    ];

    for (const { key, type } of entities) {
      const records = importFile[key] as Array<{ external_record_id: string }> | undefined;
      if (records && records.length > 0) {
        const result = validateUniqueExternalIds(records, type);
        if (!result.valid) {
          this.errors.push({
            entity_type: type,
            message: `Duplicate external_record_id values: ${result.duplicates.join(', ')}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  private async validateReferences(importFile: ImportFile): Promise<void> {
    // Build internal reference sets from import file
    const clientIds = new Set((importFile.clients || []).map(c => c.external_record_id));
    const contactIds = new Set((importFile.contacts || []).map(c => c.external_record_id));
    const caseIds = new Set((importFile.cases || []).map(c => c.external_record_id));
    const subjectIds = new Set((importFile.subjects || []).map(s => s.external_record_id));
    const activityIds = new Set((importFile.activities || []).map(a => a.external_record_id));

    // Validate case references to clients and contacts
    for (const caseRecord of importFile.cases || []) {
      if (caseRecord.external_account_id && !clientIds.has(caseRecord.external_account_id)) {
        this.errors.push({
          entity_type: 'case',
          external_record_id: caseRecord.external_record_id,
          message: `References unknown client: ${caseRecord.external_account_id}`,
          timestamp: new Date().toISOString(),
        });
      }
      if (caseRecord.external_contact_id && !contactIds.has(caseRecord.external_contact_id)) {
        this.errors.push({
          entity_type: 'case',
          external_record_id: caseRecord.external_record_id,
          message: `References unknown contact: ${caseRecord.external_contact_id}`,
          timestamp: new Date().toISOString(),
        });
      }
      if (caseRecord.external_parent_case_id && !caseIds.has(caseRecord.external_parent_case_id)) {
        this.warnings.push({
          entity_type: 'case',
          external_record_id: caseRecord.external_record_id,
          message: `References unknown parent case: ${caseRecord.external_parent_case_id}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Validate subject/update/activity references to cases
    for (const subject of importFile.subjects || []) {
      if (!caseIds.has(subject.external_case_id)) {
        this.errors.push({
          entity_type: 'subject',
          external_record_id: subject.external_record_id,
          message: `References unknown case: ${subject.external_case_id}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    for (const update of importFile.updates || []) {
      if (!caseIds.has(update.external_case_id)) {
        this.errors.push({
          entity_type: 'update',
          external_record_id: update.external_record_id,
          message: `References unknown case: ${update.external_case_id}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    for (const activity of importFile.activities || []) {
      if (!caseIds.has(activity.external_case_id)) {
        this.errors.push({
          entity_type: 'activity',
          external_record_id: activity.external_record_id,
          message: `References unknown case: ${activity.external_case_id}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Validate time entries and expenses
    for (const entry of importFile.time_entries || []) {
      if (!caseIds.has(entry.external_case_id)) {
        this.errors.push({
          entity_type: 'time_entry',
          external_record_id: entry.external_record_id,
          message: `References unknown case: ${entry.external_case_id}`,
          timestamp: new Date().toISOString(),
        });
      }
      if (entry.external_subject_id && !subjectIds.has(entry.external_subject_id)) {
        this.warnings.push({
          entity_type: 'time_entry',
          external_record_id: entry.external_record_id,
          message: `References unknown subject: ${entry.external_subject_id}`,
          timestamp: new Date().toISOString(),
        });
      }
      if (entry.external_activity_id && !activityIds.has(entry.external_activity_id)) {
        this.warnings.push({
          entity_type: 'time_entry',
          external_record_id: entry.external_record_id,
          message: `References unknown activity: ${entry.external_activity_id}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    for (const expense of importFile.expenses || []) {
      if (!caseIds.has(expense.external_case_id)) {
        this.errors.push({
          entity_type: 'expense',
          external_record_id: expense.external_record_id,
          message: `References unknown case: ${expense.external_case_id}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    for (const adjustment of importFile.budget_adjustments || []) {
      if (!caseIds.has(adjustment.external_case_id)) {
        this.errors.push({
          entity_type: 'budget_adjustment',
          external_record_id: adjustment.external_record_id,
          message: `References unknown case: ${adjustment.external_case_id}`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private async loadUserMap(): Promise<void> {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email');

    if (profiles) {
      for (const profile of profiles) {
        this.referenceMap.users.set(normalizeEmail(profile.email)!, profile.id);
      }
    }
  }

  private validateUserReferences(importFile: ImportFile): void {
    // Validate case manager and investigator emails
    for (const caseRecord of importFile.cases || []) {
      if (caseRecord.case_manager_email) {
        const normalized = normalizeEmail(caseRecord.case_manager_email);
        if (normalized && !this.referenceMap.users.has(normalized)) {
          this.warnings.push({
            entity_type: 'case',
            external_record_id: caseRecord.external_record_id,
            message: `Case manager email not found: ${caseRecord.case_manager_email}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
      for (const email of caseRecord.investigator_emails || []) {
        const normalized = normalizeEmail(email);
        if (normalized && !this.referenceMap.users.has(normalized)) {
          this.warnings.push({
            entity_type: 'case',
            external_record_id: caseRecord.external_record_id,
            message: `Investigator email not found: ${email}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  // ============================================
  // Import Processing
  // ============================================

  /**
   * Process a validated import file
   */
  async processImport(importFile: ImportFile): Promise<ImportProcessingResult> {
    // Create import batch
    const batch = await this.createBatch(importFile.source_system, importFile);

    if (this.config.dryRun) {
      return {
        batch_id: batch.id,
        status: 'completed',
        total_records: batch.total_records,
        processed_records: 0,
        failed_records: 0,
        errors: [],
      };
    }

    try {
      // Update batch status
      await this.updateBatchStatus(batch.id, 'processing');

      // Process in order for referential integrity
      await this.processClients(batch.id, importFile.clients || []);
      await this.processContacts(batch.id, importFile.contacts || []);
      await this.processCases(batch.id, importFile.cases || []);
      await this.processSubjects(batch.id, importFile.subjects || []);
      await this.processUpdates(batch.id, importFile.updates || []);
      await this.processActivities(batch.id, importFile.activities || []);
      await this.processTimeEntries(batch.id, importFile.time_entries || []);
      await this.processExpenses(batch.id, importFile.expenses || []);
      await this.processBudgetAdjustments(batch.id, importFile.budget_adjustments || []);

      // Finalize batch
      const result = await this.finalizeBatch(batch.id);
      return result;
    } catch (error) {
      await this.updateBatchStatus(batch.id, 'failed');
      throw error;
    }
  }

  private async createBatch(sourceSystem: string, importFile: ImportFile): Promise<ImportBatch> {
    const totalRecords =
      (importFile.clients?.length || 0) +
      (importFile.contacts?.length || 0) +
      (importFile.cases?.length || 0) +
      (importFile.subjects?.length || 0) +
      (importFile.updates?.length || 0) +
      (importFile.activities?.length || 0) +
      (importFile.time_entries?.length || 0) +
      (importFile.expenses?.length || 0) +
      (importFile.budget_adjustments?.length || 0);

    const { data, error } = await (supabase
      .from('import_batches' as any)
      .insert({
        organization_id: this.organizationId,
        user_id: this.userId,
        source_system: sourceSystem,
        total_records: totalRecords,
        started_at: new Date().toISOString(),
      })
      .select()
      .single() as any);

    if (error) throw error;
    return data as ImportBatch;
  }

  private async updateBatchStatus(batchId: string, status: string): Promise<void> {
    await (supabase
      .from('import_batches' as any)
      .update({ status })
      .eq('id', batchId) as any);
  }

  private async finalizeBatch(batchId: string): Promise<ImportProcessingResult> {
    const { data: records } = await (supabase
      .from('import_records' as any)
      .select('status')
      .eq('batch_id', batchId) as any);

    const processed = records?.filter((r: any) => r.status === 'imported').length || 0;
    const failed = records?.filter((r: any) => r.status === 'failed').length || 0;

    await (supabase
      .from('import_batches' as any)
      .update({
        status: 'completed',
        processed_records: processed,
        failed_records: failed,
        completed_at: new Date().toISOString(),
        error_log: this.errors,
      })
      .eq('id', batchId) as any);

    return {
      batch_id: batchId,
      status: 'completed',
      total_records: (records?.length || 0),
      processed_records: processed,
      failed_records: failed,
      errors: this.errors,
    };
  }

  // ============================================
  // Entity Processors
  // ============================================

  private async processClients(batchId: string, clients: ClientImport[]): Promise<void> {
    for (const client of clients) {
      try {
        const { data, error } = await supabase
          .from('accounts')
          .insert({
            organization_id: this.organizationId,
            user_id: this.userId,
            external_record_id: client.external_record_id,
            import_batch_id: batchId,
            name: client.name,
            industry: cleanString(client.industry),
            phone: normalizePhone(client.phone),
            email: normalizeEmail(client.email),
            address: cleanString(client.address),
            city: cleanString(client.city),
            state: normalizeState(client.state),
            zip_code: cleanString(client.zip_code),
            notes: cleanString(client.notes),
          })
          .select('id')
          .single();

        if (error) throw error;

        this.referenceMap.clients.set(client.external_record_id, data.id);
        await this.recordImportSuccess(batchId, 'client', client.external_record_id, client, data.id);
      } catch (error) {
        await this.recordImportFailure(batchId, 'client', client.external_record_id, client, error);
      }
    }
  }

  private async processContacts(batchId: string, contacts: ContactImport[]): Promise<void> {
    for (const contact of contacts) {
      try {
        const accountId = contact.external_account_id
          ? this.referenceMap.clients.get(contact.external_account_id)
          : null;

        const { data, error } = await supabase
          .from('contacts')
          .insert({
            organization_id: this.organizationId,
            user_id: this.userId,
            external_record_id: contact.external_record_id,
            import_batch_id: batchId,
            first_name: contact.first_name,
            last_name: contact.last_name,
            account_id: accountId,
            email: normalizeEmail(contact.email),
            phone: normalizePhone(contact.phone),
            address: cleanString(contact.address),
            city: cleanString(contact.city),
            state: normalizeState(contact.state),
            zip_code: cleanString(contact.zip_code),
            notes: cleanString(contact.notes),
          })
          .select('id')
          .single();

        if (error) throw error;

        this.referenceMap.contacts.set(contact.external_record_id, data.id);
        await this.recordImportSuccess(batchId, 'contact', contact.external_record_id, contact, data.id);
      } catch (error) {
        await this.recordImportFailure(batchId, 'contact', contact.external_record_id, contact, error);
      }
    }
  }

  private async processCases(batchId: string, cases: CaseImport[]): Promise<void> {
    for (const caseRecord of cases) {
      try {
        const accountId = caseRecord.external_account_id
          ? this.referenceMap.clients.get(caseRecord.external_account_id)
          : null;
        const contactId = caseRecord.external_contact_id
          ? this.referenceMap.contacts.get(caseRecord.external_contact_id)
          : null;
        const caseManagerId = caseRecord.case_manager_email
          ? this.referenceMap.users.get(normalizeEmail(caseRecord.case_manager_email)!)
          : null;
        const investigatorIds = (caseRecord.investigator_emails || [])
          .map(email => this.referenceMap.users.get(normalizeEmail(email)!))
          .filter((id): id is string => !!id);

        const { data, error } = await supabase
          .from('cases')
          .insert({
            organization_id: this.organizationId,
            user_id: this.userId,
            external_record_id: caseRecord.external_record_id,
            import_batch_id: batchId,
            case_number: caseRecord.case_number,
            title: caseRecord.title,
            account_id: accountId,
            contact_id: contactId,
            case_manager_id: caseManagerId,
            investigator_ids: investigatorIds,
            claim_number: cleanString(caseRecord.claim_number),
            status: caseRecord.status || 'open',
            due_date: parseDate(caseRecord.due_date),
            budget_hours: parseNumber(caseRecord.budget_hours),
            budget_dollars: parseNumber(caseRecord.budget_dollars),
            budget_notes: cleanString(caseRecord.budget_notes),
            description: cleanString(caseRecord.description),
          })
          .select('id')
          .single();

        if (error) throw error;

        this.referenceMap.cases.set(caseRecord.external_record_id, data.id);
        await this.recordImportSuccess(batchId, 'case', caseRecord.external_record_id, caseRecord, data.id);
      } catch (error) {
        await this.recordImportFailure(batchId, 'case', caseRecord.external_record_id, caseRecord, error);
      }
    }
  }

  private async processSubjects(batchId: string, subjects: SubjectImport[]): Promise<void> {
    for (const subject of subjects) {
      try {
        const caseId = this.referenceMap.cases.get(subject.external_case_id);
        if (!caseId) {
          throw new Error(`Case not found: ${subject.external_case_id}`);
        }

        const insertData = {
          organization_id: this.organizationId,
          user_id: this.userId,
          external_record_id: subject.external_record_id,
          import_batch_id: batchId,
          case_id: caseId,
          name: subject.name,
          subject_type: subject.subject_type,
          is_primary: subject.is_primary || false,
          notes: cleanString(subject.notes),
          profile_image_url: cleanString(subject.profile_image_url),
          details: (subject.details || {}) as Record<string, unknown>,
        };

        const { data, error } = await supabase
          .from('case_subjects')
          .insert(insertData as any)
          .select('id')
          .single();

        if (error) throw error;

        this.referenceMap.subjects.set(subject.external_record_id, data.id);
        await this.recordImportSuccess(batchId, 'subject', subject.external_record_id, subject, data.id);
      } catch (error) {
        await this.recordImportFailure(batchId, 'subject', subject.external_record_id, subject, error);
      }
    }
  }

  private async processUpdates(batchId: string, updates: UpdateImport[]): Promise<void> {
    for (const update of updates) {
      try {
        const caseId = this.referenceMap.cases.get(update.external_case_id);
        if (!caseId) {
          throw new Error(`Case not found: ${update.external_case_id}`);
        }

        const authorId = update.author_email
          ? this.referenceMap.users.get(normalizeEmail(update.author_email)!)
          : this.userId;

        const { data, error } = await supabase
          .from('case_updates')
          .insert({
            organization_id: this.organizationId,
            user_id: authorId || this.userId,
            external_record_id: update.external_record_id,
            import_batch_id: batchId,
            case_id: caseId,
            title: update.title,
            update_type: update.update_type,
            description: cleanString(update.description),
            created_at: parseDateTime(update.created_at) || new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) throw error;

        await this.recordImportSuccess(batchId, 'update', update.external_record_id, update, data.id);
      } catch (error) {
        await this.recordImportFailure(batchId, 'update', update.external_record_id, update, error);
      }
    }
  }

  private async processActivities(batchId: string, activities: ActivityImport[]): Promise<void> {
    for (const activity of activities) {
      try {
        const caseId = this.referenceMap.cases.get(activity.external_case_id);
        if (!caseId) {
          throw new Error(`Case not found: ${activity.external_case_id}`);
        }

        const assignedUserId = activity.assigned_to_email
          ? this.referenceMap.users.get(normalizeEmail(activity.assigned_to_email)!)
          : null;

        const { data, error } = await supabase
          .from('case_activities')
          .insert({
            organization_id: this.organizationId,
            user_id: this.userId,
            external_record_id: activity.external_record_id,
            import_batch_id: batchId,
            case_id: caseId,
            activity_type: activity.activity_type,
            title: activity.title,
            description: cleanString(activity.description),
            status: activity.status || 'to_do',
            due_date: parseDate(activity.due_date),
            completed: activity.completed || false,
            completed_at: activity.completed_at ? parseDateTime(activity.completed_at) : null,
            event_subtype: cleanString(activity.event_subtype),
            assigned_user_id: assignedUserId,
            created_at: parseDateTime(activity.created_at) || new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) throw error;

        this.referenceMap.activities.set(activity.external_record_id, data.id);
        await this.recordImportSuccess(batchId, 'activity', activity.external_record_id, activity, data.id);
      } catch (error) {
        await this.recordImportFailure(batchId, 'activity', activity.external_record_id, activity, error);
      }
    }
  }

  private async processTimeEntries(batchId: string, entries: TimeEntryImport[]): Promise<void> {
    for (const entry of entries) {
      try {
        const caseId = this.referenceMap.cases.get(entry.external_case_id);
        if (!caseId) {
          throw new Error(`Case not found: ${entry.external_case_id}`);
        }

        const subjectId = entry.external_subject_id
          ? this.referenceMap.subjects.get(entry.external_subject_id)
          : null;
        const activityId = entry.external_activity_id
          ? this.referenceMap.activities.get(entry.external_activity_id)
          : null;

        const hourlyRate = parseNumber(entry.hourly_rate) || this.config.defaultHourlyRate || 0;
        const hours = parseNumber(entry.hours) || 0;
        const amount = parseNumber(entry.amount) || hours * hourlyRate;

        const { data, error } = await supabase
          .from('case_finances')
          .insert({
            organization_id: this.organizationId,
            user_id: this.userId,
            external_record_id: entry.external_record_id,
            import_batch_id: batchId,
            case_id: caseId,
            finance_type: 'time',
            date: parseDate(entry.date) || new Date().toISOString().split('T')[0],
            hours: hours,
            hourly_rate: hourlyRate,
            amount: amount,
            description: entry.description,
            subject_id: subjectId,
            activity_id: activityId,
            start_date: parseDate(entry.start_date),
            end_date: parseDate(entry.end_date),
            category: cleanString(entry.category),
            notes: cleanString(entry.notes),
            created_at: parseDateTime(entry.created_at) || new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) throw error;

        await this.recordImportSuccess(batchId, 'time_entry', entry.external_record_id, entry, data.id);
      } catch (error) {
        await this.recordImportFailure(batchId, 'time_entry', entry.external_record_id, entry, error);
      }
    }
  }

  private async processExpenses(batchId: string, expenses: ExpenseImport[]): Promise<void> {
    for (const expense of expenses) {
      try {
        const caseId = this.referenceMap.cases.get(expense.external_case_id);
        if (!caseId) {
          throw new Error(`Case not found: ${expense.external_case_id}`);
        }

        const subjectId = expense.external_subject_id
          ? this.referenceMap.subjects.get(expense.external_subject_id)
          : null;
        const activityId = expense.external_activity_id
          ? this.referenceMap.activities.get(expense.external_activity_id)
          : null;

        const { data, error } = await supabase
          .from('case_finances')
          .insert({
            organization_id: this.organizationId,
            user_id: this.userId,
            external_record_id: expense.external_record_id,
            import_batch_id: batchId,
            case_id: caseId,
            finance_type: 'expense',
            date: parseDate(expense.date) || new Date().toISOString().split('T')[0],
            amount: parseNumber(expense.amount) || 0,
            description: expense.description,
            category: cleanString(expense.category),
            quantity: parseNumber(expense.quantity),
            unit_price: parseNumber(expense.unit_price),
            subject_id: subjectId,
            activity_id: activityId,
            notes: cleanString(expense.notes),
            created_at: parseDateTime(expense.created_at) || new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) throw error;

        await this.recordImportSuccess(batchId, 'expense', expense.external_record_id, expense, data.id);
      } catch (error) {
        await this.recordImportFailure(batchId, 'expense', expense.external_record_id, expense, error);
      }
    }
  }

  private async processBudgetAdjustments(batchId: string, adjustments: BudgetAdjustmentImport[]): Promise<void> {
    for (const adjustment of adjustments) {
      try {
        const caseId = this.referenceMap.cases.get(adjustment.external_case_id);
        if (!caseId) {
          throw new Error(`Case not found: ${adjustment.external_case_id}`);
        }

        const authorId = adjustment.author_email
          ? this.referenceMap.users.get(normalizeEmail(adjustment.author_email)!)
          : this.userId;

        const previousValue = parseNumber(adjustment.previous_value);
        const newValue = parseNumber(adjustment.new_value) || 0;
        const adjustmentAmount = adjustment.adjustment_amount !== undefined
          ? parseNumber(adjustment.adjustment_amount)
          : previousValue !== null
            ? newValue - previousValue
            : null;

        const { data, error } = await supabase
          .from('case_budget_adjustments')
          .insert({
            organization_id: this.organizationId,
            user_id: authorId || this.userId,
            external_record_id: adjustment.external_record_id,
            import_batch_id: batchId,
            case_id: caseId,
            adjustment_type: adjustment.adjustment_type,
            previous_value: previousValue,
            new_value: newValue,
            adjustment_amount: adjustmentAmount,
            reason: adjustment.reason,
            created_at: parseDateTime(adjustment.created_at) || new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) throw error;

        await this.recordImportSuccess(batchId, 'budget_adjustment', adjustment.external_record_id, adjustment, data.id);
      } catch (error) {
        await this.recordImportFailure(batchId, 'budget_adjustment', adjustment.external_record_id, adjustment, error);
      }
    }
  }

  // ============================================
  // Import Record Tracking
  // ============================================

  private async recordImportSuccess(
    batchId: string,
    entityType: ImportEntityType,
    externalId: string,
    sourceData: unknown,
    casewyzeId: string
  ): Promise<void> {
    const insertData = {
      batch_id: batchId,
      entity_type: entityType,
      external_record_id: externalId,
      source_data: sourceData as Record<string, unknown>,
      casewyze_id: casewyzeId,
      status: 'imported',
    };
    await (supabase.from('import_records' as any).insert(insertData) as any);
  }

  private async recordImportFailure(
    batchId: string,
    entityType: ImportEntityType,
    externalId: string,
    sourceData: unknown,
    error: unknown
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.errors.push({
      entity_type: entityType,
      external_record_id: externalId,
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });

    const insertData = {
      batch_id: batchId,
      entity_type: entityType,
      external_record_id: externalId,
      source_data: sourceData as Record<string, unknown>,
      status: 'failed',
      error_message: errorMessage,
    };
    await (supabase.from('import_records' as any).insert(insertData) as any);
  }
}

// ============================================
// Rollback Function
// ============================================

/**
 * Rollback an import batch by deleting all imported records
 */
export async function rollbackImportBatch(batchId: string): Promise<void> {
  // Get all imported records
  const { data: records } = await (supabase
    .from('import_records' as any)
    .select('entity_type, casewyze_id')
    .eq('batch_id', batchId)
    .eq('status', 'imported') as any);

  if (!records || records.length === 0) return;

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

    const tableMap: Record<ImportEntityType, string> = {
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

    await (supabase
      .from(tableMap[entityType] as any)
      .delete()
      .in('id', ids) as any);
  }

  // Update batch status
  await (supabase
    .from('import_batches' as any)
    .update({ status: 'rolled_back' })
    .eq('id', batchId) as any);
}

// ============================================
// Dry-Run Import Functions
// ============================================

import { ParsedCSV } from '@/lib/csvParser';
import { normalizeRecord } from '@/lib/importNormalization';
import { resolveUpdateType, resolveEventType } from '@/lib/importMapping';

interface DryRunReferenceData {
  clients: Map<string, string>;
  contacts: Map<string, string>;
  cases: Map<string, string>;
  subjects: Map<string, string>;
  activities: Map<string, string>;
  users: Map<string, string>;
}

interface DryRunImportMaps {
  clients: Map<string, Record<string, unknown>>;
  contacts: Map<string, Record<string, unknown>>;
  cases: Map<string, Record<string, unknown>>;
  subjects: Map<string, Record<string, unknown>>;
  activities: Map<string, Record<string, unknown>>;
}

interface DryRunValidationContext {
  existingRefs: DryRunReferenceData;
  importMaps: DryRunImportMaps;
  picklists: { updateTypes: string[]; eventTypes: string[]; };
  mappingConfig: MappingConfig;
  seenIds: Map<string, Set<string>>;
}

function buildDryRunImportMaps(parsedFiles: ParsedCSV[]): DryRunImportMaps {
  const maps: DryRunImportMaps = {
    clients: new Map(),
    contacts: new Map(),
    cases: new Map(),
    subjects: new Map(),
    activities: new Map(),
  };
  
  for (const file of parsedFiles) {
    const mapKey = file.entityType === 'client' ? 'clients' 
      : file.entityType === 'contact' ? 'contacts'
      : file.entityType === 'case' ? 'cases'
      : file.entityType === 'subject' ? 'subjects'
      : file.entityType === 'activity' ? 'activities'
      : null;
    
    if (mapKey) {
      for (const row of file.rows) {
        const extId = row.external_record_id as string;
        if (extId) {
          maps[mapKey].set(extId, row);
        }
      }
    }
  }
  
  return maps;
}

async function loadDryRunExistingReferences(organizationId: string): Promise<DryRunReferenceData> {
  const refs: DryRunReferenceData = {
    clients: new Map(),
    contacts: new Map(),
    cases: new Map(),
    subjects: new Map(),
    activities: new Map(),
    users: new Map(),
  };
  
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, external_record_id')
    .eq('organization_id', organizationId)
    .not('external_record_id', 'is', null);
  
  for (const acc of accounts || []) {
    if (acc.external_record_id) refs.clients.set(acc.external_record_id, acc.id);
  }
  
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, external_record_id')
    .eq('organization_id', organizationId)
    .not('external_record_id', 'is', null);
  
  for (const contact of contacts || []) {
    if (contact.external_record_id) refs.contacts.set(contact.external_record_id, contact.id);
  }
  
  const { data: cases } = await supabase
    .from('cases')
    .select('id, external_record_id')
    .eq('organization_id', organizationId)
    .not('external_record_id', 'is', null);
  
  for (const c of cases || []) {
    if (c.external_record_id) refs.cases.set(c.external_record_id, c.id);
  }
  
  const { data: subjects } = await supabase
    .from('case_subjects')
    .select('id, external_record_id')
    .eq('organization_id', organizationId)
    .not('external_record_id', 'is', null);
  
  for (const subj of subjects || []) {
    if (subj.external_record_id) refs.subjects.set(subj.external_record_id, subj.id);
  }
  
  const { data: activities } = await supabase
    .from('case_activities')
    .select('id, external_record_id')
    .eq('organization_id', organizationId)
    .not('external_record_id', 'is', null);
  
  for (const act of activities || []) {
    if (act.external_record_id) refs.activities.set(act.external_record_id, act.id);
  }
  
  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id, profiles:user_id (email)')
    .eq('organization_id', organizationId);
  
  for (const member of members || []) {
    const profile = member.profiles as { email?: string } | null;
    if (profile?.email) refs.users.set(profile.email.toLowerCase(), member.user_id);
  }
  
  return refs;
}

async function loadDryRunPicklistValues(organizationId: string): Promise<{ updateTypes: string[]; eventTypes: string[]; }> {
  const { data: picklists } = await supabase
    .from('picklists')
    .select('type, value')
    .eq('organization_id', organizationId)
    .eq('is_active', true);
  
  const updateTypes: string[] = [];
  const eventTypes: string[] = [];
  
  for (const pl of picklists || []) {
    if (pl.type === 'update_type') updateTypes.push(pl.value);
    else if (pl.type === 'event_type') eventTypes.push(pl.value);
  }
  
  return { updateTypes, eventTypes };
}

function validateDryRunRecord(
  record: Record<string, unknown>,
  entityType: string,
  rowNumber: number,
  context: DryRunValidationContext
): { errors: DryRunError[]; warnings: DryRunWarning[] } {
  const errors: DryRunError[] = [];
  const warnings: DryRunWarning[] = [];
  const extId = (record.external_record_id as string) || '';
  
  if (!extId) {
    errors.push({
      row: rowNumber, entityType, externalRecordId: '',
      field: 'external_record_id', message: 'Missing required field: external_record_id', severity: 'blocking'
    });
  }
  
  if (extId) {
    const seenSet = context.seenIds.get(entityType) || new Set();
    if (seenSet.has(extId)) {
      errors.push({
        row: rowNumber, entityType, externalRecordId: extId,
        field: 'external_record_id', message: `Duplicate external_record_id: ${extId}`, severity: 'blocking'
      });
    }
    seenSet.add(extId);
    context.seenIds.set(entityType, seenSet);
  }
  
  switch (entityType) {
    case 'client':
      if (!record.name) {
        errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'name', message: 'Missing required field: name', severity: 'blocking' });
      }
      break;
    
    case 'contact':
      if (!record.first_name) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'first_name', message: 'Missing required field: first_name', severity: 'blocking' });
      if (!record.last_name) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'last_name', message: 'Missing required field: last_name', severity: 'blocking' });
      if (record.external_account_id) {
        const accId = record.external_account_id as string;
        if (!context.importMaps.clients.has(accId) && !context.existingRefs.clients.has(accId)) {
          errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_account_id', message: `Referenced client not found: ${accId}`, severity: 'blocking' });
        }
      }
      break;
    
    case 'case':
      if (!record.case_number) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'case_number', message: 'Missing required field: case_number', severity: 'blocking' });
      if (!record.title) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'title', message: 'Missing required field: title', severity: 'blocking' });
      if (record.external_account_id) {
        const accId = record.external_account_id as string;
        if (!context.importMaps.clients.has(accId) && !context.existingRefs.clients.has(accId)) {
          errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_account_id', message: `Referenced client not found: ${accId}`, severity: 'blocking' });
        }
      }
      if (record.case_manager_email) {
        const email = (record.case_manager_email as string).toLowerCase();
        if (!context.existingRefs.users.has(email)) {
          warnings.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'case_manager_email', message: `User not found: ${email}`, autoResolution: 'Field will be skipped' });
        }
      }
      break;
    
    case 'subject':
      if (!record.name) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'name', message: 'Missing required field: name', severity: 'blocking' });
      if (!record.subject_type) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'subject_type', message: 'Missing required field: subject_type', severity: 'blocking' });
      if (!record.external_case_id) {
        errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: 'Missing required field: external_case_id', severity: 'blocking' });
      } else {
        const caseId = record.external_case_id as string;
        if (!context.importMaps.cases.has(caseId) && !context.existingRefs.cases.has(caseId)) {
          errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: `Referenced case not found: ${caseId}`, severity: 'blocking' });
        }
      }
      break;
    
    case 'update':
      if (!record.title) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'title', message: 'Missing required field: title', severity: 'blocking' });
      if (!record.update_type) {
        errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'update_type', message: 'Missing required field: update_type', severity: 'blocking' });
      } else {
        const result = resolveUpdateType(record.update_type as string, context.mappingConfig, context.picklists.updateTypes);
        if (result.wasCreated) warnings.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'update_type', message: `New update type: ${result.value}`, autoResolution: 'Will create picklist value' });
        else if (result.matchType === 'fuzzy') warnings.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'update_type', message: `Fuzzy matched: ${record.update_type} → ${result.value}`, autoResolution: 'Using closest match' });
      }
      if (!record.external_case_id) {
        errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: 'Missing required field: external_case_id', severity: 'blocking' });
      } else {
        const caseId = record.external_case_id as string;
        if (!context.importMaps.cases.has(caseId) && !context.existingRefs.cases.has(caseId)) {
          errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: `Referenced case not found: ${caseId}`, severity: 'blocking' });
        }
      }
      break;
    
    case 'activity':
      if (!record.title) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'title', message: 'Missing required field: title', severity: 'blocking' });
      if (!record.activity_type) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'activity_type', message: 'Missing required field: activity_type', severity: 'blocking' });
      if (record.event_subtype) {
        const result = resolveEventType(record.event_subtype as string, context.mappingConfig, context.picklists.eventTypes);
        if (result.wasCreated) warnings.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'event_subtype', message: `New event type: ${result.value}`, autoResolution: 'Will create picklist value' });
        else if (result.matchType === 'fuzzy') warnings.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'event_subtype', message: `Fuzzy matched: ${record.event_subtype} → ${result.value}`, autoResolution: 'Using closest match' });
      }
      if (!record.external_case_id) {
        errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: 'Missing required field: external_case_id', severity: 'blocking' });
      } else {
        const caseId = record.external_case_id as string;
        if (!context.importMaps.cases.has(caseId) && !context.existingRefs.cases.has(caseId)) {
          errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: `Referenced case not found: ${caseId}`, severity: 'blocking' });
        }
      }
      break;
    
    case 'time_entry':
      if (!record.description) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'description', message: 'Missing required field: description', severity: 'blocking' });
      if (record.hours === undefined) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'hours', message: 'Missing required field: hours', severity: 'blocking' });
      else if (Number(record.hours) > 24) warnings.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'hours', message: `Unusually high hours: ${record.hours}`, autoResolution: 'Will import as-is' });
      if (!record.external_case_id) {
        errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: 'Missing required field: external_case_id', severity: 'blocking' });
      } else {
        const caseId = record.external_case_id as string;
        if (!context.importMaps.cases.has(caseId) && !context.existingRefs.cases.has(caseId)) {
          errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: `Referenced case not found: ${caseId}`, severity: 'blocking' });
        }
      }
      break;
    
    case 'expense':
      if (!record.description) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'description', message: 'Missing required field: description', severity: 'blocking' });
      if (record.amount === undefined) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'amount', message: 'Missing required field: amount', severity: 'blocking' });
      if (!record.external_case_id) {
        errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: 'Missing required field: external_case_id', severity: 'blocking' });
      } else {
        const caseId = record.external_case_id as string;
        if (!context.importMaps.cases.has(caseId) && !context.existingRefs.cases.has(caseId)) {
          errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: `Referenced case not found: ${caseId}`, severity: 'blocking' });
        }
      }
      break;
    
    case 'budget_adjustment':
      if (!record.reason) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'reason', message: 'Missing required field: reason', severity: 'blocking' });
      if (!record.adjustment_type) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'adjustment_type', message: 'Missing required field: adjustment_type', severity: 'blocking' });
      if (record.new_value === undefined) errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'new_value', message: 'Missing required field: new_value', severity: 'blocking' });
      if (!record.external_case_id) {
        errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: 'Missing required field: external_case_id', severity: 'blocking' });
      } else {
        const caseId = record.external_case_id as string;
        if (!context.importMaps.cases.has(caseId) && !context.existingRefs.cases.has(caseId)) {
          errors.push({ row: rowNumber, entityType, externalRecordId: extId, field: 'external_case_id', message: `Referenced case not found: ${caseId}`, severity: 'blocking' });
        }
      }
      break;
  }
  
  return { errors, warnings };
}

export interface DryRunOptions {
  parsedFiles: ParsedCSV[];
  mappingConfig: MappingConfig;
  organizationId: string;
  onProgress?: (progress: number, message: string) => void;
}

export async function performDryRun(options: DryRunOptions): Promise<DryRunResult> {
  const { parsedFiles, mappingConfig, organizationId, onProgress } = options;
  const startTime = Date.now();
  
  const errors: DryRunError[] = [];
  const warnings: DryRunWarning[] = [];
  const details: DryRunRecordDetail[] = [];
  const normalizationLog: NormalizationLog = { ...EMPTY_NORMALIZATION_LOG };
  
  onProgress?.(0, 'Loading existing data...');
  
  const existingRefs = await loadDryRunExistingReferences(organizationId);
  const picklists = await loadDryRunPicklistValues(organizationId);
  const importMaps = buildDryRunImportMaps(parsedFiles);
  
  const context: DryRunValidationContext = {
    existingRefs,
    importMaps,
    picklists,
    mappingConfig,
    seenIds: new Map()
  };
  
  const totalRecords = parsedFiles.reduce((sum, f) => sum + f.rowCount, 0);
  let processed = 0;
  let recordsToCreate = 0;
  let recordsToSkip = 0;
  
  for (const file of parsedFiles) {
    onProgress?.(Math.round((processed / totalRecords) * 100), `Validating ${file.entityType}...`);
    
    for (let i = 0; i < file.rows.length; i++) {
      const row = file.rows[i];
      const rowNumber = i + 2;
      
      const { normalized, changes } = normalizeRecord(row, file.entityType);
      
      for (const change of changes) {
        if (change.rule.includes('date')) normalizationLog.datesNormalized++;
        else if (change.rule.includes('currency')) normalizationLog.currenciesCleaned++;
        else if (change.rule.includes('text')) normalizationLog.textsTrimmed++;
        else if (change.rule.includes('email')) normalizationLog.emailsNormalized++;
        else if (change.rule.includes('phone')) normalizationLog.phonesNormalized++;
        else if (change.rule.includes('state')) normalizationLog.statesNormalized++;
      }
      
      const validation = validateDryRunRecord(normalized, file.entityType, rowNumber, context);
      const hasBlockingError = validation.errors.some(e => e.severity === 'blocking');
      const extId = (row.external_record_id as string) || `row-${rowNumber}`;
      
      let operation: 'create' | 'update' | 'skip' = 'create';
      let skipReason: string | undefined;
      
      if (hasBlockingError) {
        operation = 'skip';
        skipReason = validation.errors[0].message;
        recordsToSkip++;
      } else {
        const refMap = file.entityType === 'client' ? existingRefs.clients
          : file.entityType === 'contact' ? existingRefs.contacts
          : file.entityType === 'case' ? existingRefs.cases
          : file.entityType === 'subject' ? existingRefs.subjects
          : file.entityType === 'activity' ? existingRefs.activities
          : null;
        
        if (refMap && extId && refMap.has(extId)) operation = 'update';
        recordsToCreate++;
      }
      
      details.push({
        entityType: file.entityType,
        externalRecordId: extId,
        operation,
        normalizedData: normalized,
        originalData: row,
        fieldChanges: changes,
        mappingsApplied: [],
        warnings: validation.warnings.map(w => w.message),
        skipReason
      });
      
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
      processed++;
    }
  }
  
  normalizationLog.typesMapped = { 
    update_type: mappingConfig.updateTypes.filter(m => m.casewyzeValue).length, 
    event_type: mappingConfig.eventTypes.filter(m => m.casewyzeValue).length 
  };
  normalizationLog.typesCreated = [...mappingConfig.updateTypes, ...mappingConfig.eventTypes]
    .filter(m => m.autoCreate).map(m => m.casewyzeValue);
  
  onProgress?.(100, 'Dry run complete');
  
  return {
    success: !errors.some(e => e.severity === 'blocking'),
    totalRecords,
    recordsToCreate,
    recordsToUpdate: details.filter(d => d.operation === 'update').length,
    recordsToSkip,
    errors,
    warnings,
    details,
    normalizationLog,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime
  };
}

export function exportDryRunAsCSV(result: DryRunResult): string {
  const headers = ['Entity Type', 'External ID', 'Operation', 'Status', 'Field', 'Original Value', 'Normalized Value', 'Warnings'];
  const rows: string[][] = [headers];
  
  for (const detail of result.details) {
    const status = detail.operation === 'skip' ? 'error' : 'valid';
    const warningText = detail.warnings.join('; ');
    
    if (detail.fieldChanges.length === 0) {
      rows.push([detail.entityType, detail.externalRecordId, detail.operation, status, '', '', '', warningText]);
    } else {
      for (const change of detail.fieldChanges) {
        rows.push([detail.entityType, detail.externalRecordId, detail.operation, status, change.field, String(change.originalValue ?? ''), String(change.normalizedValue ?? ''), warningText]);
      }
    }
  }
  
  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function exportDryRunAsJSON(result: DryRunResult): string {
  return JSON.stringify({
    timestamp: result.timestamp,
    duration_ms: result.durationMs,
    summary: { total: result.totalRecords, to_create: result.recordsToCreate, to_update: result.recordsToUpdate, to_skip: result.recordsToSkip, errors: result.errors.length, warnings: result.warnings.length },
    normalization_log: result.normalizationLog,
    records: result.details,
    errors: result.errors,
    warnings: result.warnings
  }, null, 2);
}
