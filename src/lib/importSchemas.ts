/**
 * Zod validation schemas for CaseWyze Import System
 */

import { z } from 'zod';

// ============================================
// Common Validators
// ============================================

const emailSchema = z.string().email().optional().or(z.literal(''));
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$|^\d{2}-\d{2}-\d{4}$/).optional();
const datetimeSchema = z.string().optional();
const phoneSchema = z.string().optional();
const positiveNumberSchema = z.number().positive().optional();

// ============================================
// Entity Schemas
// ============================================

export const organizationImportSchema = z.object({
  external_record_id: z.string().min(1, 'External record ID is required'),
  name: z.string().min(1, 'Organization name is required'),
  slug: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  billing_email: emailSchema,
});

export const clientImportSchema = z.object({
  external_record_id: z.string().min(1, 'External record ID is required'),
  name: z.string().min(1, 'Client name is required'),
  industry: z.string().optional(),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  notes: z.string().optional(),
});

export const contactImportSchema = z.object({
  external_record_id: z.string().min(1, 'External record ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  external_account_id: z.string().optional(),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  notes: z.string().optional(),
});

export const caseImportSchema = z.object({
  external_record_id: z.string().min(1, 'External record ID is required'),
  case_number: z.string().min(1, 'Case number is required'),
  title: z.string().min(1, 'Title is required'),
  external_account_id: z.string().optional(),
  external_contact_id: z.string().optional(),
  external_parent_case_id: z.string().optional(),
  claim_number: z.string().optional(),
  status: z.string().optional(),
  start_date: dateSchema,
  due_date: dateSchema,
  case_manager_email: emailSchema,
  investigator_emails: z.array(z.string().email()).optional(),
  budget_hours: positiveNumberSchema,
  budget_dollars: positiveNumberSchema,
  budget_notes: z.string().optional(),
  description: z.string().optional(),
});

const subjectTypeSchema = z.enum(['person', 'business', 'vehicle', 'property', 'other']);

export const subjectDetailsSchema = z.object({
  // Person
  date_of_birth: dateSchema,
  ssn_last4: z.string().length(4).optional(),
  address: z.string().optional(),
  phone: phoneSchema,
  email: emailSchema,
  employer: z.string().optional(),
  occupation: z.string().optional(),
  // Vehicle
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  color: z.string().optional(),
  license_plate: z.string().optional(),
  vin: z.string().optional(),
  // Business
  business_name: z.string().optional(),
  ein: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
}).passthrough(); // Allow additional fields

export const subjectImportSchema = z.object({
  external_record_id: z.string().min(1, 'External record ID is required'),
  external_case_id: z.string().min(1, 'Case reference is required'),
  name: z.string().min(1, 'Subject name is required'),
  subject_type: subjectTypeSchema,
  is_primary: z.boolean().optional(),
  notes: z.string().optional(),
  profile_image_url: z.string().url().optional().or(z.literal('')),
  details: subjectDetailsSchema.optional(),
});

export const updateImportSchema = z.object({
  external_record_id: z.string().min(1, 'External record ID is required'),
  external_case_id: z.string().min(1, 'Case reference is required'),
  title: z.string().min(1, 'Title is required'),
  update_type: z.string().min(1, 'Update type is required'),
  description: z.string().optional(),
  created_at: datetimeSchema,
  author_email: emailSchema,
});

const activityTypeSchema = z.enum(['task', 'event', 'call', 'meeting', 'deadline']);
const activityStatusSchema = z.enum(['to_do', 'in_progress', 'completed']);

export const activityImportSchema = z.object({
  external_record_id: z.string().min(1, 'External record ID is required'),
  external_case_id: z.string().min(1, 'Case reference is required'),
  activity_type: activityTypeSchema,
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: activityStatusSchema.optional(),
  due_date: dateSchema,
  completed: z.boolean().optional(),
  completed_at: datetimeSchema,
  event_subtype: z.string().optional(),
  assigned_to_email: emailSchema,
  created_at: datetimeSchema,
});

export const timeEntryImportSchema = z.object({
  external_record_id: z.string().min(1, 'External record ID is required'),
  external_case_id: z.string().min(1, 'Case reference is required'),
  date: z.string().min(1, 'Date is required'),
  hours: z.number().positive('Hours must be positive'),
  description: z.string().min(1, 'Description is required'),
  hourly_rate: positiveNumberSchema,
  amount: positiveNumberSchema,
  external_subject_id: z.string().optional(),
  external_activity_id: z.string().optional(),
  start_date: dateSchema,
  end_date: dateSchema,
  category: z.string().optional(),
  notes: z.string().optional(),
  author_email: emailSchema,
  created_at: datetimeSchema,
});

export const expenseImportSchema = z.object({
  external_record_id: z.string().min(1, 'External record ID is required'),
  external_case_id: z.string().min(1, 'Case reference is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().optional(),
  quantity: positiveNumberSchema,
  unit_price: positiveNumberSchema,
  external_subject_id: z.string().optional(),
  external_activity_id: z.string().optional(),
  notes: z.string().optional(),
  author_email: emailSchema,
  created_at: datetimeSchema,
});

const budgetAdjustmentTypeSchema = z.enum(['hours', 'dollars']);

export const budgetAdjustmentImportSchema = z.object({
  external_record_id: z.string().min(1, 'External record ID is required'),
  external_case_id: z.string().min(1, 'Case reference is required'),
  adjustment_type: budgetAdjustmentTypeSchema,
  new_value: z.number().min(0, 'New value must be non-negative'),
  reason: z.string().min(1, 'Reason is required'),
  previous_value: z.number().optional(),
  adjustment_amount: z.number().optional(),
  author_email: emailSchema,
  created_at: datetimeSchema,
});

// ============================================
// Import File Schema
// ============================================

export const importFileSchema = z.object({
  source_system: z.string().min(1, 'Source system is required'),
  organization: organizationImportSchema.optional(),
  clients: z.array(clientImportSchema).optional(),
  contacts: z.array(contactImportSchema).optional(),
  cases: z.array(caseImportSchema).optional(),
  subjects: z.array(subjectImportSchema).optional(),
  updates: z.array(updateImportSchema).optional(),
  activities: z.array(activityImportSchema).optional(),
  time_entries: z.array(timeEntryImportSchema).optional(),
  expenses: z.array(expenseImportSchema).optional(),
  budget_adjustments: z.array(budgetAdjustmentImportSchema).optional(),
});

// ============================================
// Type exports from schemas
// ============================================

export type OrganizationImportInput = z.infer<typeof organizationImportSchema>;
export type ClientImportInput = z.infer<typeof clientImportSchema>;
export type ContactImportInput = z.infer<typeof contactImportSchema>;
export type CaseImportInput = z.infer<typeof caseImportSchema>;
export type SubjectImportInput = z.infer<typeof subjectImportSchema>;
export type UpdateImportInput = z.infer<typeof updateImportSchema>;
export type ActivityImportInput = z.infer<typeof activityImportSchema>;
export type TimeEntryImportInput = z.infer<typeof timeEntryImportSchema>;
export type ExpenseImportInput = z.infer<typeof expenseImportSchema>;
export type BudgetAdjustmentImportInput = z.infer<typeof budgetAdjustmentImportSchema>;
export type ImportFileInput = z.infer<typeof importFileSchema>;
