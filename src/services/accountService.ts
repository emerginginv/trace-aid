/**
 * Account Service
 * 
 * Abstracts Supabase operations for Account entities.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Account, AccountListItem, AccountReference } from '@/types/entities';

export interface AccountFilters {
  organizationId: string;
  status?: string;
  industry?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AccountCreateData {
  name: string;
  organization_id: string;
  user_id: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  industry?: string | null;
  notes?: string | null;
  status?: string | null;
}

export interface AccountUpdateData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  industry?: string | null;
  notes?: string | null;
  status?: string | null;
}

class AccountService {
  /**
   * Fetch a list of accounts with optional filters.
   */
  async list(filters: AccountFilters): Promise<{ data: AccountListItem[]; count: number }> {
    let query = supabase
      .from('accounts')
      .select('*', { count: 'exact' })
      .eq('organization_id', filters.organizationId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    query = query.order('name', { ascending: true });

    const { data, error, count } = await query;

    if (error) throw error;

    return { data: (data || []) as AccountListItem[], count: count || 0 };
  }

  /**
   * Fetch account references for dropdowns.
   */
  async listReferences(organizationId: string): Promise<AccountReference[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as AccountReference[];
  }

  /**
   * Fetch a single account by ID.
   */
  async getById(accountId: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .maybeSingle();

    if (error) throw error;
    return data as Account | null;
  }

  /**
   * Create a new account.
   */
  async create(accountData: AccountCreateData): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .insert(accountData)
      .select()
      .single();

    if (error) throw error;
    return data as Account;
  }

  /**
   * Update an existing account.
   */
  async update(accountId: string, updates: AccountUpdateData): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;
    return data as Account;
  }

  /**
   * Delete an account.
   */
  async delete(accountId: string): Promise<void> {
    const { error } = await supabase.from('accounts').delete().eq('id', accountId);
    if (error) throw error;
  }

  /**
   * Get account with case count.
   */
  async getWithCaseCount(accountId: string): Promise<AccountListItem | null> {
    const [accountResult, caseCountResult] = await Promise.all([
      supabase.from('accounts').select('*').eq('id', accountId).maybeSingle(),
      supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId),
    ]);

    if (accountResult.error) throw accountResult.error;
    if (!accountResult.data) return null;

    return {
      ...accountResult.data,
      case_count: caseCountResult.count || 0,
    } as AccountListItem;
  }
}

export const accountService = new AccountService();
