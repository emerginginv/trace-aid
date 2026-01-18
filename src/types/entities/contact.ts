/**
 * Contact Entity Types
 * 
 * This file consolidates all Contact-related type definitions.
 * Use these types throughout the codebase for consistency.
 */

import type { Database } from '@/integrations/supabase/types';

// Database row type from Supabase
export type ContactRow = Database['public']['Tables']['contacts']['Row'];
export type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
export type ContactUpdate = Database['public']['Tables']['contacts']['Update'];

/**
 * Core Contact interface for general use across the application.
 */
export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  account_id?: string | null;
  notes?: string | null;
  status?: string | null;
  role?: string | null;
  created_at: string;
  updated_at?: string | null;
  organization_id?: string;
}

/**
 * Contact with account relation.
 */
export interface ContactWithAccount extends Contact {
  account?: { id: string; name: string } | null;
}

/**
 * Minimal Contact reference for dropdowns and selectors.
 */
export interface ContactReference {
  id: string;
  first_name: string;
  last_name: string;
  account_id?: string | null;
}

/**
 * Contact for email composition.
 */
export interface EmailContact {
  id: string;
  name: string;
  email: string;
}

/**
 * Contact list item with computed display fields.
 */
export interface ContactListItem extends Contact {
  full_name?: string;
  account_name?: string | null;
  case_count?: number;
  last_activity_date?: string | null;
}

/**
 * Contact card display data for UI components.
 */
export interface ContactCardData {
  id: string;
  first_name: string;
  last_name: string;
  status?: string | null;
  role?: string | null;
  organization_name?: string | null;
  phone?: string | null;
  email?: string | null;
  case_count?: number;
  last_activity_date?: string | null;
}

/**
 * Helper to get full name from contact.
 */
export function getContactFullName(contact: { first_name: string; last_name: string }): string {
  return `${contact.first_name} ${contact.last_name}`.trim();
}
