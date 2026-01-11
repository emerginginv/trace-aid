import { useOrganization } from "@/contexts/OrganizationContext";

/**
 * Hook to check if the current organization has pending payment
 * and should be blocked from app access
 */
export function useBillingGate() {
  const { organization, loading, refreshOrganization } = useOrganization();

  const isPendingPayment = organization?.subscription_status === "pending_payment";
  const isCanceled = organization?.subscription_status === "canceled";
  const isBlocked = isPendingPayment || isCanceled;

  return {
    isBlocked,
    isPendingPayment,
    isCanceled,
    loading,
    organization,
    refreshOrganization,
  };
}
