/**
 * Account Entity Types
 * 
 * This file consolidates all Account-related type definitions.
 * Use these types throughout the codebase for consistency.
 */

import type { Database } from '@/integrations/supabase/types';

// Database row type from Supabase
export type AccountRow = Database['public']['Tables']['accounts']['Row'];
export type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
export type AccountUpdate = Database['public']['Tables']['accounts']['Update'];

/**
 * Core Account interface for general use across the application.
 */
export interface Account {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  industry?: string | null;
  notes?: string | null;
  status?: string | null;
  created_at: string;
  updated_at?: string | null;
  organization_id?: string;
}

/**
 * Account for detail views with all fields.
 */
export interface AccountDetail extends Account {
  user_id?: string;
  external_record_id?: string | null;
  external_system_name?: string | null;
}

/**
 * Minimal Account reference for dropdowns and selectors.
 */
export interface AccountReference {
  id: string;
  name: string;
}

/**
 * Account list item with computed display fields.
 */
export interface AccountListItem extends Account {
  case_count?: number;
  contact_count?: number;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
}

/**
 * Account card display data for UI components.
 */
export interface AccountCardData {
  id: string;
  name: string;
  status?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  primary_contact_name?: string | null;
  case_count?: number;
}
