/**
 * Case Entity Types
 * 
 * This file consolidates all Case-related type definitions.
 * Use these types throughout the codebase for consistency.
 * 
 * The source of truth for database types is src/integrations/supabase/types.ts
 * These interfaces provide application-level abstractions.
 */

import type { Database } from '@/integrations/supabase/types';

// Database row type from Supabase
export type CaseRow = Database['public']['Tables']['cases']['Row'];
export type CaseInsert = Database['public']['Tables']['cases']['Insert'];
export type CaseUpdate = Database['public']['Tables']['cases']['Update'];

/**
 * Core Case interface for general use across the application.
 * Includes the most commonly needed fields.
 */
export interface Case {
  id: string;
  case_number: string;
  title: string;
  status: string;
  description?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at?: string | null;
  case_type_id?: string | null;
  case_type_tag?: string | null;
  account_id?: string | null;
  contact_id?: string | null;
  case_manager_id?: string | null;
  case_manager_2_id?: string | null;
  organization_id?: string | null;
  user_id?: string | null;
  is_draft?: boolean | null;
}

/**
 * Extended Case interface for detail views with all fields.
 */
export interface CaseDetail extends Case {
  investigator_ids: string[];
  closed_by_user_id: string | null;
  closed_at: string | null;
  parent_case_id: string | null;
  instance_number: number;
  reference_number?: string | null;
  reference_number_2?: string | null;
  reference_number_3?: string | null;
  source_request_id?: string | null;
}

/**
 * Case for editing forms - includes budget fields.
 */
export interface EditableCase {
  id: string;
  title: string;
  case_number: string;
  description: string | null;
  status: string;
  account_id: string | null;
  contact_id: string | null;
  due_date: string | null;
  use_primary_subject_as_title?: boolean;
  budget_hours?: number | null;
  budget_dollars?: number | null;
  budget_notes?: string | null;
  reference_number?: string | null;
  reference_number_2?: string | null;
  reference_number_3?: string | null;
  case_type_id?: string | null;
  case_manager_id?: string | null;
  case_manager_2_id?: string | null;
  investigator_ids?: string[];
}

/**
 * Minimal Case reference for dropdowns and selectors.
 */
export interface CaseReference {
  id: string;
  case_number: string;
  title: string;
}

/**
 * Case list item with computed display fields.
 */
export interface CaseListItem extends Case {
  account_name?: string | null;
  contact_name?: string | null;
  case_type_name?: string | null;
  case_manager_name?: string | null;
  days_until_due?: number | null;
  is_overdue?: boolean;
}

/**
 * Case status type for status management.
 */
export interface CaseStatus {
  value: string;
  label: string;
  color?: string | null;
  status_type?: 'open' | 'closed' | 'pending' | null;
  is_active?: boolean;
}
