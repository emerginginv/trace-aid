/**
 * Contact Service
 * 
 * Abstracts Supabase operations for Contact entities.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Contact, ContactListItem, ContactReference, ContactWithAccount } from '@/types/entities';

export interface ContactFilters {
  organizationId: string;
  accountId?: string;
  status?: string;
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ContactCreateData {
  first_name: string;
  last_name: string;
  organization_id: string;
  user_id: string;
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
}

export interface ContactUpdateData {
  first_name?: string;
  last_name?: string;
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
}

class ContactService {
  /**
   * Fetch a list of contacts with optional filters.
   */
  async list(filters: ContactFilters): Promise<{ data: ContactListItem[]; count: number }> {
    let query = supabase
      .from('contacts')
      .select('*, accounts(id, name)', { count: 'exact' })
      .eq('organization_id', filters.organizationId);

    if (filters.accountId) {
      query = query.eq('account_id', filters.accountId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    query = query.order('last_name', { ascending: true });

    const { data, error, count } = await query;

    if (error) throw error;

    const contacts: ContactListItem[] = (data || []).map((row: any) => ({
      ...row,
      full_name: `${row.first_name} ${row.last_name}`.trim(),
      account_name: row.accounts?.name || null,
    }));

    return { data: contacts, count: count || 0 };
  }

  /**
   * Fetch contact references for dropdowns.
   */
  async listReferences(organizationId: string, accountId?: string): Promise<ContactReference[]> {
    let query = supabase
      .from('contacts')
      .select('id, first_name, last_name, account_id')
      .eq('organization_id', organizationId)
      .order('last_name', { ascending: true });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as ContactReference[];
  }

  /**
   * Fetch a single contact by ID.
   */
  async getById(contactId: string): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (error) throw error;
    return data as Contact | null;
  }

  /**
   * Fetch a contact with its account relation.
   */
  async getWithAccount(contactId: string): Promise<ContactWithAccount | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, accounts(id, name)')
      .eq('id', contactId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      account: data.accounts,
    } as ContactWithAccount;
  }

  /**
   * Create a new contact.
   */
  async create(contactData: ContactCreateData): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (error) throw error;
    return data as Contact;
  }

  /**
   * Update an existing contact.
   */
  async update(contactId: string, updates: ContactUpdateData): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;
    return data as Contact;
  }

  /**
   * Delete a contact.
   */
  async delete(contactId: string): Promise<void> {
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) throw error;
  }

  /**
   * Get contacts by account.
   */
  async getByAccountId(accountId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('account_id', accountId)
      .order('last_name', { ascending: true });

    if (error) throw error;
    return (data || []) as Contact[];
  }
}

export const contactService = new ContactService();
