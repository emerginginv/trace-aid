import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

/**
 * Supported trigger event types
 */
export type TriggerEventType = 
  | 'investigator_assigned'
  | 'investigator_confirmed'
  | 'invoice_created'
  | 'all_invoices_paid'
  | 'report_uploaded'
  | 'case_approved';

export const TRIGGER_EVENT_TYPES: TriggerEventType[] = [
  'investigator_assigned',
  'investigator_confirmed',
  'invoice_created',
  'all_invoices_paid',
  'report_uploaded',
  'case_approved'
];

/**
 * Human-readable labels for each event type
 */
export const EVENT_TYPE_LABELS: Record<TriggerEventType, string> = {
  investigator_assigned: 'Investigator Assigned',
  investigator_confirmed: 'Investigator Confirmed',
  invoice_created: 'Invoice Created',
  all_invoices_paid: 'All Invoices Paid',
  report_uploaded: 'Report Uploaded',
  case_approved: 'Case Request Approved'
};

/**
 * Descriptions for each event type
 */
export const EVENT_TYPE_DESCRIPTIONS: Record<TriggerEventType, string> = {
  investigator_assigned: 'When an investigator is assigned to a case',
  investigator_confirmed: 'When an assigned investigator confirms their assignment',
  invoice_created: 'When an invoice is created for a case',
  all_invoices_paid: 'When all invoices for a case are marked as paid',
  report_uploaded: 'When a report is uploaded to the case',
  case_approved: 'When a case request is approved and case is created'
};

/**
 * Trigger configuration from database
 */
export interface CaseStatusTrigger {
  id: string;
  organization_id: string;
  event_type: TriggerEventType;
  target_status_id: string;
  enabled: boolean;
  allow_override_manual: boolean;
  workflow: string;
  created_at: string;
  updated_at: string;
  target_status?: {
    id: string;
    name: string;
    color: string | null;
  };
}

/**
 * Trigger log entry
 */
export interface TriggerLogEntry {
  id: string;
  case_id: string;
  trigger_id: string | null;
  event_type: TriggerEventType;
  from_status_id: string | null;
  to_status_id: string | null;
  result: string;
  reason: string | null;
  triggered_at: string;
  triggered_by: string | null;
}

/**
 * Input for creating/updating a trigger
 */
export interface TriggerInput {
  organization_id: string;
  event_type: TriggerEventType;
  target_status_id: string;
  enabled?: boolean;
  allow_override_manual?: boolean;
  workflow?: string;
}

/**
 * Hook for managing case status triggers
 */
export function useCaseStatusTriggers(workflow: string = 'standard') {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  
  const queryKey = ['case-status-triggers', organization?.id, workflow];
  
  // Fetch all triggers for organization and workflow
  const { data: triggers, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('case_status_triggers')
        .select(`
          *,
          target_status:case_statuses(id, name, color)
        `)
        .eq('organization_id', organization.id)
        .eq('workflow', workflow);
      
      if (error) {
        console.error('Error fetching triggers:', error);
        throw error;
      }
      
      return (data || []) as CaseStatusTrigger[];
    },
    enabled: !!organization?.id
  });
  
  // Get trigger by event type
  const getTriggerByEvent = (eventType: TriggerEventType): CaseStatusTrigger | undefined => {
    return triggers?.find(t => t.event_type === eventType);
  };
  
  // Create or update trigger
  const upsertTriggerMutation = useMutation({
    mutationFn: async (input: TriggerInput) => {
      const { data, error } = await supabase
        .from('case_status_triggers')
        .upsert(
          {
            ...input,
            workflow: input.workflow || workflow
          },
          { 
            onConflict: 'organization_id,event_type,workflow',
            ignoreDuplicates: false
          }
        )
        .select(`
          *,
          target_status:case_statuses(id, name, color)
        `)
        .single();
      
      if (error) throw error;
      return data as CaseStatusTrigger;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Trigger saved');
    },
    onError: (error) => {
      console.error('Error saving trigger:', error);
      toast.error('Failed to save trigger');
    }
  });
  
  // Update trigger enabled status
  const toggleTriggerMutation = useMutation({
    mutationFn: async ({ triggerId, enabled }: { triggerId: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from('case_status_triggers')
        .update({ enabled })
        .eq('id', triggerId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Trigger updated');
    },
    onError: (error) => {
      console.error('Error toggling trigger:', error);
      toast.error('Failed to update trigger');
    }
  });
  
  // Delete trigger
  const deleteTriggerMutation = useMutation({
    mutationFn: async (triggerId: string) => {
      const { error } = await supabase
        .from('case_status_triggers')
        .delete()
        .eq('id', triggerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Trigger removed');
    },
    onError: (error) => {
      console.error('Error deleting trigger:', error);
      toast.error('Failed to remove trigger');
    }
  });
  
  // Set trigger for an event type (creates or updates)
  const setTriggerForEvent = async (
    eventType: TriggerEventType, 
    targetStatusId: string | null,
    options?: { allowOverrideManual?: boolean }
  ) => {
    if (!organization?.id) return;
    
    const existingTrigger = getTriggerByEvent(eventType);
    
    if (targetStatusId === null) {
      // Remove trigger
      if (existingTrigger) {
        await deleteTriggerMutation.mutateAsync(existingTrigger.id);
      }
    } else {
      // Create or update trigger
      await upsertTriggerMutation.mutateAsync({
        organization_id: organization.id,
        event_type: eventType,
        target_status_id: targetStatusId,
        enabled: true,
        allow_override_manual: options?.allowOverrideManual ?? existingTrigger?.allow_override_manual ?? false,
        workflow
      });
    }
  };
  
  // Toggle trigger enabled/disabled
  const toggleTrigger = async (eventType: TriggerEventType) => {
    const trigger = getTriggerByEvent(eventType);
    if (trigger) {
      await toggleTriggerMutation.mutateAsync({ 
        triggerId: trigger.id, 
        enabled: !trigger.enabled 
      });
    }
  };
  
  // Update allow_override_manual setting
  const setAllowOverride = async (eventType: TriggerEventType, allowOverride: boolean) => {
    const trigger = getTriggerByEvent(eventType);
    if (trigger) {
      const { error } = await supabase
        .from('case_status_triggers')
        .update({ allow_override_manual: allowOverride })
        .eq('id', trigger.id);
      
      if (error) {
        toast.error('Failed to update setting');
        return;
      }
      
      queryClient.invalidateQueries({ queryKey });
      toast.success('Setting updated');
    }
  };
  
  return {
    triggers: triggers || [],
    isLoading,
    error,
    refetch,
    getTriggerByEvent,
    setTriggerForEvent,
    toggleTrigger,
    setAllowOverride,
    upsertTrigger: upsertTriggerMutation.mutate,
    deleteTrigger: deleteTriggerMutation.mutate,
    isSaving: upsertTriggerMutation.isPending || toggleTriggerMutation.isPending || deleteTriggerMutation.isPending
  };
}

/**
 * Hook for fetching trigger execution logs
 */
export function useTriggerLogs(caseId?: string, limit: number = 50) {
  const { organization } = useOrganization();
  
  return useQuery({
    queryKey: ['trigger-logs', organization?.id, caseId, limit],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      let query = supabase
        .from('case_status_trigger_log')
        .select(`
          *,
          from_status:case_statuses!case_status_trigger_log_from_status_id_fkey(id, name),
          to_status:case_statuses!case_status_trigger_log_to_status_id_fkey(id, name)
        `)
        .eq('organization_id', organization.id)
        .order('triggered_at', { ascending: false })
        .limit(limit);
      
      if (caseId) {
        query = query.eq('case_id', caseId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching trigger logs:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!organization?.id
  });
}
