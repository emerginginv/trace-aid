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
} from '@/types/import';
import { DEFAULT_IMPORT_CONFIG } from '@/types/import';
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
            start_date: parseDate(caseRecord.start_date),
            due_date: parseDate(caseRecord.due_date),
            surveillance_start_date: parseDate(caseRecord.surveillance_start_date),
            surveillance_end_date: parseDate(caseRecord.surveillance_end_date),
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
