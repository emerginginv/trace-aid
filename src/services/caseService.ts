/**
 * Case Service
 * 
 * Abstracts Supabase operations for Case entities.
 * Provides a clean API for CRUD operations and common queries.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Case, CaseDetail, CaseListItem } from '@/types/entities';

export interface CaseFilters {
  organizationId: string;
  status?: string;
  accountId?: string;
  contactId?: string;
  caseManagerId?: string;
  caseTypeId?: string;
  search?: string;
  isDraft?: boolean;
  limit?: number;
  offset?: number;
}

export interface CaseCreateData {
  title: string;
  case_number: string;
  organization_id: string;
  user_id: string;
  description?: string | null;
  status?: string;
  account_id?: string | null;
  contact_id?: string | null;
  case_manager_id?: string | null;
  case_manager_2_id?: string | null;
  case_type_id?: string | null;
  due_date?: string | null;
  is_draft?: boolean;
}

export interface CaseUpdateData {
  title?: string;
  description?: string | null;
  status?: string;
  account_id?: string | null;
  contact_id?: string | null;
  case_manager_id?: string | null;
  case_manager_2_id?: string | null;
  case_type_id?: string | null;
  due_date?: string | null;
  is_draft?: boolean;
}

class CaseService {
  /**
   * Fetch a list of cases with optional filters.
   */
  async list(filters: CaseFilters): Promise<{ data: CaseListItem[]; count: number }> {
    let query = supabase
      .from('cases')
      .select('*, accounts(name), contacts(first_name, last_name)', { count: 'exact' })
      .eq('organization_id', filters.organizationId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.accountId) {
      query = query.eq('account_id', filters.accountId);
    }
    if (filters.contactId) {
      query = query.eq('contact_id', filters.contactId);
    }
    if (filters.caseManagerId) {
      query = query.eq('case_manager_id', filters.caseManagerId);
    }
    if (filters.caseTypeId) {
      query = query.eq('case_type_id', filters.caseTypeId);
    }
    if (filters.isDraft !== undefined) {
      query = query.eq('is_draft', filters.isDraft);
    }
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,case_number.ilike.%${filters.search}%`
      );
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    const cases: CaseListItem[] = (data || []).map((row: any) => ({
      ...row,
      account_name: row.accounts?.name || null,
      contact_name: row.contacts
        ? `${row.contacts.first_name} ${row.contacts.last_name}`.trim()
        : null,
    }));

    return { data: cases, count: count || 0 };
  }

  /**
   * Fetch a single case by ID.
   */
  async getById(caseId: string): Promise<CaseDetail | null> {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return data as CaseDetail;
  }

  /**
   * Create a new case.
   */
  async create(caseData: CaseCreateData): Promise<Case> {
    const { data, error } = await supabase
      .from('cases')
      .insert(caseData)
      .select()
      .single();

    if (error) throw error;
    return data as Case;
  }

  /**
   * Update an existing case.
   */
  async update(caseId: string, updates: CaseUpdateData): Promise<Case> {
    const { data, error } = await supabase
      .from('cases')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', caseId)
      .select()
      .single();

    if (error) throw error;
    return data as Case;
  }

  /**
   * Delete a case.
   */
  async delete(caseId: string): Promise<void> {
    const { error } = await supabase.from('cases').delete().eq('id', caseId);
    if (error) throw error;
  }

  /**
   * Update case status.
   */
  async updateStatus(caseId: string, status: string): Promise<Case> {
    return this.update(caseId, { status });
  }

  /**
   * Get case count by status for an organization.
   */
  async getCountByStatus(organizationId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('cases')
      .select('status')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const counts: Record<string, number> = {};
    (data || []).forEach((row) => {
      counts[row.status] = (counts[row.status] || 0) + 1;
    });

    return counts;
  }
}

export const caseService = new CaseService();
