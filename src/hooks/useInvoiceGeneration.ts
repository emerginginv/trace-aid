import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  case_service_instance_id: string;
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

interface GenerateInvoiceParams {
  caseId: string;
  serviceInstanceIds: string[];
  applyRetainer?: number;
  notes?: string;
}

export function useGenerateInvoiceFromServices() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ caseId, serviceInstanceIds, applyRetainer = 0, notes }: GenerateInvoiceParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Get organization
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
      
      // Create the invoice (starts with 0 total, will be updated by function)
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
      
      // Generate line items from service instances using the database function
      const { data: result, error: lineItemsError } = await supabase
        .rpc('generate_invoice_line_items', {
          p_invoice_id: invoice.id,
          p_service_instance_ids: serviceInstanceIds
        });
      
      if (lineItemsError) {
        // Rollback - delete the invoice
        await supabase.from("invoices").delete().eq("id", invoice.id);
        throw new Error("Failed to generate invoice line items");
      }
      
      // If retainer was applied, record it
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
