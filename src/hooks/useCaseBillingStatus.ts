import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CaseBillingStatus {
  hasBilling: boolean;
  invoiceCount: number;
  lockedReason?: string;
}

/**
 * Hook to check if billing has started for a case.
 * A case is considered to have billing if it has any non-voided/non-cancelled invoices.
 * This is used to determine if the Case Type should be locked.
 */
export function useCaseBillingStatus(caseId: string | undefined) {
  return useQuery<CaseBillingStatus>({
    queryKey: ['case-billing-status', caseId],
    queryFn: async () => {
      if (!caseId) {
        return { hasBilling: false, invoiceCount: 0 };
      }
      
      // Check for non-voided/non-cancelled invoices
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('case_id', caseId)
        .not('status', 'in', '("voided","cancelled")');
      
      if (error) {
        console.error('Error checking billing status:', error);
        return { hasBilling: false, invoiceCount: 0 };
      }

      const invoiceCount = invoices?.length || 0;
      const hasBilling = invoiceCount > 0;
      
      return { 
        hasBilling,
        invoiceCount,
        lockedReason: hasBilling 
          ? `Case has ${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''} created. Case type changes are locked after billing begins.`
          : undefined,
      };
    },
    enabled: !!caseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
