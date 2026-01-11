import { ReactNode } from "react";
import { useBillingGate } from "@/hooks/useBillingGate";
import { PaymentPending } from "./PaymentPending";
import { Loader2 } from "lucide-react";

interface BillingGateProps {
  children: ReactNode;
}

/**
 * Wraps protected routes to ensure billing is active.
 * Shows PaymentPending screen when subscription_status is 'pending_payment'.
 */
export function BillingGate({ children }: BillingGateProps) {
  const { 
    isBlocked, 
    isPendingPayment, 
    loading, 
    organization,
    refreshOrganization,
  } = useBillingGate();

  // Show loading state while checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  // No organization yet - let the normal flow handle this
  if (!organization) {
    return <>{children}</>;
  }

  // Block access for pending payment
  if (isPendingPayment) {
    return (
      <PaymentPending
        organizationId={organization.id}
        organizationName={organization.name}
        onRefresh={refreshOrganization}
      />
    );
  }

  // Allow access for active subscriptions
  return <>{children}</>;
}
