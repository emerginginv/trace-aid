import { useOrganization } from "@/contexts/OrganizationContext";

/**
 * Hook to check if the current organization has billing issues
 * and should be blocked or warned about app access
 */
export function useBillingGate() {
  const { organization, loading, refreshOrganization } = useOrganization();

  const subscriptionStatus = organization?.subscription_status;
  
  const isPendingPayment = subscriptionStatus === "pending_payment";
  const isCanceled = subscriptionStatus === "canceled";
  const isPastDue = subscriptionStatus === "past_due";
  const isActive = subscriptionStatus === "active";
  
  // Block access for pending payment or canceled
  const isBlocked = isPendingPayment || isCanceled;
  
  // Show warning banner for past due (allow limited access)
  const showWarning = isPastDue;

  return {
    isBlocked,
    isPendingPayment,
    isCanceled,
    isPastDue,
    isActive,
    showWarning,
    loading,
    organization,
    refreshOrganization,
  };
}
