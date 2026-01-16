/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Invoice Generation Hooks
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * UPDATED: Invoices are now generated from APPROVED BILLING ITEMS only.
 * Services are descriptive context - not the source of truth for billing.
 * 
 * The workflow is:
 * 1. Work is performed and logged via Updates
 * 2. Billing items are created (linked to updates)
 * 3. Billing items are approved
 * 4. Invoices are generated from approved billing items
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * @deprecated Services are now descriptive only. Use approved billing items for invoicing.
 * This interface is retained for backward compatibility with service display.
 */
export interface BillableServiceInstance {
  id: string;
  service_name: string;
  service_code: string | null;
  status: string;
  quantity_actual: number | null;
  quantity_estimated: number | null;
  completion_date: string | null;
  notes: string | null;
  pricing_model: string;
  rate: number;
  estimated_amount: number;
  activity_count: number;
  is_billable: boolean;
  billed_at: string | null;
}

/**
 * Approved billing item ready for invoicing
 */
export interface ApprovedBillingItem {
  id: string;
  case_id: string;
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
  pricing_model: string | null;
  finance_type: string;
  status: string;
  date: string;
  service_name?: string;
  service_code?: string;
  case_service_instance_id: string | null;
  update_id: string | null;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  case_service_instance_id: string | null;
  billing_item_id: string | null;
  service_name: string;
  service_code: string | null;
  description: string;
  pricing_model: string;
  quantity: number;
  rate: number;
  amount: number;
  unit_label: string | null;
  activity_count: number;
  created_at: string;
}

/**
 * @deprecated Use useApprovedBillingItems instead.
 * Services are now descriptive only - not the source of truth for billing.
 */
export function useBillableServiceInstances(caseId: string | undefined) {
  return useQuery({
    queryKey: ['billable-service-instances', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      
      const { data, error } = await supabase
        .rpc('get_billable_service_instances', { p_case_id: caseId });
      
      if (error) {
        console.error('Error fetching billable service instances:', error);
        throw error;
      }
      
      return (data || []) as BillableServiceInstance[];
    },
    enabled: !!caseId,
  });
}

/**
 * Fetch approved billing items ready for invoicing
 * This is the NEW source of truth for invoice generation.
 */
export function useApprovedBillingItems(caseId: string | undefined) {
  return useQuery({
    queryKey: ['approved-billing-items', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (!orgMember) return [];

      const results: ApprovedBillingItem[] = [];
      
      // Fetch approved time entries
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('case_id', caseId)
        .eq('organization_id', orgMember.organization_id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (timeError) {
        console.error('Error fetching approved time entries:', timeError);
      } else {
        results.push(...(timeEntries || []).map(item => ({
          id: item.id,
          case_id: item.case_id,
          description: item.notes || item.item_type || 'Time Entry',
          quantity: item.hours,
          unit_price: item.rate,
          amount: item.total,
          pricing_model: 'hourly',
          finance_type: 'time',
          status: item.status,
          date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          case_service_instance_id: null,
          update_id: item.update_id,
        })));
      }

      // Fetch approved expense entries
      const { data: expenseEntries, error: expenseError } = await supabase
        .from('expense_entries')
        .select('*')
        .eq('case_id', caseId)
        .eq('organization_id', orgMember.organization_id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (expenseError) {
        console.error('Error fetching approved expense entries:', expenseError);
      } else {
        results.push(...(expenseEntries || []).map(item => ({
          id: item.id,
          case_id: item.case_id,
          description: item.notes || item.item_type || 'Expense',
          quantity: item.quantity,
          unit_price: item.rate,
          amount: item.total,
          pricing_model: 'fixed',
          finance_type: 'expense',
          status: item.status,
          date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          case_service_instance_id: null,
          update_id: item.update_id,
        })));
      }

      // Sort by date descending
      return results.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ) as ApprovedBillingItem[];
    },
    enabled: !!caseId,
  });
}

export function useInvoiceLineItems(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-line-items', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as InvoiceLineItem[];
    },
    enabled: !!invoiceId,
  });
}

/**
 * @deprecated Use useGenerateInvoiceFromBillingItems instead.
 */
interface GenerateInvoiceParams {
  caseId: string;
  serviceInstanceIds: string[];
  applyRetainer?: number;
  notes?: string;
}

/**
 * New params for generating invoices from approved billing items
 */
interface GenerateFromBillingItemsParams {
  caseId: string;
  billingItemIds: string[];
  applyRetainer?: number;
  notes?: string;
}

/**
 * @deprecated Use useGenerateInvoiceFromBillingItems instead.
 * This hook generates invoices from service instances (legacy pattern).
 */
export function useGenerateInvoiceFromServices() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ caseId, serviceInstanceIds, applyRetainer = 0, notes }: GenerateInvoiceParams) => {
      // DEPRECATED: This pathway is no longer recommended.
      // Invoices should be generated from approved billing items.
      console.warn('useGenerateInvoiceFromServices is deprecated. Use useGenerateInvoiceFromBillingItems instead.');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (!orgMember?.organization_id) {
        throw new Error("User not in organization");
      }
      
      const organizationId = orgMember.organization_id;
      
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: 'exact', head: true })
        .eq("organization_id", organizationId);
      
      const invoiceNumber = `INV-${String((count || 0) + 1).padStart(5, '0')}`;
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          case_id: caseId,
          user_id: user.id,
          organization_id: organizationId,
          invoice_number: invoiceNumber,
          total: 0,
          retainer_applied: applyRetainer,
          total_paid: applyRetainer,
          date: new Date().toISOString().split('T')[0],
          status: "draft",
          notes: notes || "",
          due_date: dueDate.toISOString().split('T')[0],
        })
        .select()
        .single();
      
      if (invoiceError || !invoice) {
        throw new Error("Failed to create invoice");
      }
      
      const { data: result, error: lineItemsError } = await supabase
        .rpc('generate_invoice_line_items', {
          p_invoice_id: invoice.id,
          p_service_instance_ids: serviceInstanceIds
        });
      
      if (lineItemsError) {
        await supabase.from("invoices").delete().eq("id", invoice.id);
        throw new Error("Failed to generate invoice line items");
      }
      
      if (applyRetainer > 0) {
        await supabase
          .from("retainer_funds")
          .insert({
            case_id: caseId,
            user_id: user.id,
            organization_id: organizationId,
            amount: -applyRetainer,
            invoice_id: invoice.id,
            note: `Applied to invoice ${invoiceNumber}`,
          });
      }
      
      return {
        invoice,
        invoiceNumber,
        result: result as { success: boolean; line_items_created: number; total_amount: number }
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billable-service-instances'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['case-service-instances'] });
      
      toast({
        title: "Invoice Generated",
        description: `Invoice ${data.invoiceNumber} created with ${data.result.line_items_created} line item(s). Total: $${data.result.total_amount.toFixed(2)}`,
      });
    },
    onError: (error) => {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Generate invoice from APPROVED BILLING ITEMS
 * This is the NEW recommended pathway for invoice generation.
 */
export function useGenerateInvoiceFromBillingItems() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ caseId, billingItemIds, applyRetainer = 0, notes }: GenerateFromBillingItemsParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (!orgMember?.organization_id) {
        throw new Error("User not in organization");
      }
      
      const organizationId = orgMember.organization_id;
      
      // Generate invoice number
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: 'exact', head: true })
        .eq("organization_id", organizationId);
      
      const invoiceNumber = `INV-${String((count || 0) + 1).padStart(5, '0')}`;
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          case_id: caseId,
          user_id: user.id,
          organization_id: organizationId,
          invoice_number: invoiceNumber,
          total: 0,
          retainer_applied: applyRetainer,
          total_paid: applyRetainer,
          date: new Date().toISOString().split('T')[0],
          status: "draft",
          notes: notes || "",
          due_date: dueDate.toISOString().split('T')[0],
        })
        .select()
        .single();
      
      if (invoiceError || !invoice) {
        throw new Error("Failed to create invoice");
      }
      
      // Generate line items from APPROVED BILLING ITEMS
      const { data: result, error: lineItemsError } = await supabase
        .rpc('generate_invoice_from_billing_items', {
          p_invoice_id: invoice.id,
          p_billing_item_ids: billingItemIds
        });
      
      if (lineItemsError) {
        await supabase.from("invoices").delete().eq("id", invoice.id);
        throw new Error("Failed to generate invoice line items");
      }
      
      // Apply retainer if specified
      if (applyRetainer > 0) {
        await supabase
          .from("retainer_funds")
          .insert({
            case_id: caseId,
            user_id: user.id,
            organization_id: organizationId,
            amount: -applyRetainer,
            invoice_id: invoice.id,
            note: `Applied to invoice ${invoiceNumber}`,
          });
      }
      
      return {
        invoice,
        invoiceNumber,
        result: result as { success: boolean; line_items_created: number; total_amount: number; skipped_items: string[] }
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['approved-billing-items'] });
      queryClient.invalidateQueries({ queryKey: ['billable-service-instances'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['case-finances'] });
      
      toast({
        title: "Invoice Generated",
        description: `Invoice ${data.invoiceNumber} created with ${data.result.line_items_created} line item(s). Total: $${data.result.total_amount.toFixed(2)}`,
      });
    },
    onError: (error) => {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
    },
  });
}
