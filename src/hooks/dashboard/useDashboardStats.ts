import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { DashboardStats } from './types';

const defaultStats: DashboardStats = {
  totalCases: 0,
  activeCases: 0,
  openCases: 0,
  closedCases: 0,
  totalContacts: 0,
  totalAccounts: 0,
};

async function fetchDashboardStats(orgId: string): Promise<DashboardStats> {
  // Fetch counts in parallel
  const [casesResult, contactsResult, accountsResult, allCasesResult, statusPicklistsResult, activeCasesResult] = 
    await Promise.all([
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('cases').select('status').eq('organization_id', orgId),
      supabase
        .from('picklists')
        .select('value, status_type')
        .eq('type', 'case_status')
        .eq('is_active', true)
        .or(`organization_id.eq.${orgId},organization_id.is.null`),
      supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'open'),
    ]);

  // Calculate open/closed counts based on status_type
  let openCasesCount = 0;
  let closedCasesCount = 0;
  
  if (allCasesResult.data && statusPicklistsResult.data) {
    allCasesResult.data.forEach((caseItem) => {
      const statusPicklist = statusPicklistsResult.data.find((s) => s.value === caseItem.status);
      if (statusPicklist?.status_type === 'open') {
        openCasesCount++;
      } else if (statusPicklist?.status_type === 'closed') {
        closedCasesCount++;
      }
    });
  }

  return {
    totalCases: casesResult.count || 0,
    activeCases: activeCasesResult.count || 0,
    openCases: openCasesCount,
    closedCases: closedCasesCount,
    totalContacts: contactsResult.count || 0,
    totalAccounts: accountsResult.count || 0,
  };
}

export function useDashboardStats() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['dashboard', 'stats', orgId],
    queryFn: () => fetchDashboardStats(orgId!),
    enabled: !!orgId,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: defaultStats,
  });
}
