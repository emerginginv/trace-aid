import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface InvoiceStatus {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  is_locked: boolean;
  can_edit: boolean;
  can_finalize: boolean;
  can_void: boolean;
  finalized_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  line_items_count: number;
}

export interface InvoiceAuditEntry {
  id: string;
  invoice_id: string;
  user_id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  affected_service_instance_ids: string[] | null;
  affected_activity_ids: string[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export function useInvoiceStatus(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-status', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      
      const { data, error } = await supabase
        .rpc('get_invoice_with_status', { p_invoice_id: invoiceId });
      
      if (error) {
        console.error('Error fetching invoice status:', error);
        throw error;
      }
      
      return data as unknown as InvoiceStatus;
    },
    enabled: !!invoiceId,
  });
}

export function useFinalizeInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .rpc('finalize_invoice', { 
          p_invoice_id: invoiceId,
          p_user_id: user.id 
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; invoice_number?: string; services_locked?: number; activities_locked?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to finalize invoice');
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-status'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-audit-log'] });
      queryClient.invalidateQueries({ queryKey: ['case-service-instances'] });
      queryClient.invalidateQueries({ queryKey: ['case-activities'] });
      
      toast({
        title: "Invoice Finalized",
        description: `Invoice ${data.invoice_number} has been finalized. ${data.services_locked} services and ${data.activities_locked} activities are now locked.`,
      });
    },
    onError: (error) => {
      console.error('Error finalizing invoice:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to finalize invoice",
        variant: "destructive",
      });
    },
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .rpc('void_invoice', { 
          p_invoice_id: invoiceId,
          p_user_id: user.id,
          p_reason: reason
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; invoice_number?: string; services_unlocked?: number; activities_unlocked?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to void invoice');
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-status'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-audit-log'] });
      queryClient.invalidateQueries({ queryKey: ['case-service-instances'] });
      queryClient.invalidateQueries({ queryKey: ['case-activities'] });
      queryClient.invalidateQueries({ queryKey: ['billable-service-instances'] });
      
      toast({
        title: "Invoice Voided",
        description: `Invoice ${data.invoice_number} has been voided. ${data.services_unlocked} services and ${data.activities_unlocked} activities are now available for rebilling.`,
      });
    },
    onError: (error) => {
      console.error('Error voiding invoice:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to void invoice",
        variant: "destructive",
      });
    },
  });
}

export function useInvoiceAuditLog(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-audit-log', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      
      const { data, error } = await supabase
        .from('invoice_audit_log')
        .select(`
          *,
          user:profiles!invoice_audit_log_user_id_fkey(full_name, email)
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching invoice audit log:', error);
        throw error;
      }
      
      return (data || []) as InvoiceAuditEntry[];
    },
    enabled: !!invoiceId,
  });
}

export function useCheckActivityBilled(activityId: string | undefined) {
  return useQuery({
    queryKey: ['activity-billed', activityId],
    queryFn: async () => {
      if (!activityId) return false;
      
      const { data, error } = await supabase
        .rpc('is_activity_billed', { p_activity_id: activityId });
      
      if (error) {
        console.error('Error checking if activity is billed:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!activityId,
  });
}

export function useCheckServiceBilled(serviceInstanceId: string | undefined) {
  return useQuery({
    queryKey: ['service-billed', serviceInstanceId],
    queryFn: async () => {
      if (!serviceInstanceId) return false;
      
      const { data, error } = await supabase
        .rpc('is_service_instance_billed', { p_service_instance_id: serviceInstanceId });
      
      if (error) {
        console.error('Error checking if service is billed:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!serviceInstanceId,
  });
}
