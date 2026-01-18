/**
 * Invoice Entity Types
 * 
 * This file consolidates all Invoice-related type definitions.
 */

import type { Database } from '@/integrations/supabase/types';

// Database row type from Supabase
export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

/**
 * Invoice status values.
 */
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'void';

/**
 * Core Invoice interface for general use.
 */
export interface Invoice {
  id: string;
  invoice_number: string;
  case_id: string;
  account_id?: string | null;
  status: InvoiceStatus | string;
  invoice_date: string;
  due_date?: string | null;
  subtotal: number;
  tax_amount?: number | null;
  total: number;
  amount_paid?: number | null;
  balance_due: number;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  organization_id: string;
}

/**
 * Invoice with related data for detail views.
 */
export interface InvoiceDetail extends Invoice {
  case?: { case_number: string; title: string } | null;
  account?: { name: string } | null;
  line_items?: InvoiceLineItem[];
  payments?: InvoicePayment[];
}

/**
 * Invoice line item.
 */
export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  billing_item_id?: string | null;
  billing_item_type?: string | null;
}

/**
 * Invoice payment record.
 */
export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

/**
 * Invoice list item with computed fields.
 */
export interface InvoiceListItem extends Invoice {
  case_number?: string;
  case_title?: string;
  account_name?: string | null;
  days_overdue?: number | null;
  is_overdue?: boolean;
}
