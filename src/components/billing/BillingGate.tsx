import { ReactNode, useState } from "react";
import { useBillingGate } from "@/hooks/useBillingGate";
import { PaymentPending } from "./PaymentPending";
import { SubscriptionCanceled } from "./SubscriptionCanceled";
import { PastDueBanner } from "./PastDueBanner";
import { Loader2 } from "lucide-react";

interface BillingGateProps {
  children: ReactNode;
}

/**
 * Wraps protected routes to ensure billing is active.
 * Handles all billing states: pending_payment, past_due, canceled, active
 */
export function BillingGate({ children }: BillingGateProps) {
  const { 
    isPendingPayment, 
    isCanceled,
    isPastDue,
    loading, 
    organization,
    refreshOrganization,
  } = useBillingGate();
  
  const [bannerDismissed, setBannerDismissed] = useState(false);

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

  // Block access for pending payment - show plan selection
  if (isPendingPayment) {
    return (
      <PaymentPending
        organizationId={organization.id}
        organizationName={organization.name}
        organizationSubdomain={organization.subdomain}
        onRefresh={refreshOrganization}
      />
    );
  }

  // Block access for canceled subscription
  if (isCanceled) {
    return (
      <SubscriptionCanceled
        organizationId={organization.id}
        organizationName={organization.name}
        onRefresh={refreshOrganization}
      />
    );
  }

  // Allow access with warning banner for past due
  if (isPastDue && !bannerDismissed) {
    return (
      <>
        <PastDueBanner onDismiss={() => setBannerDismissed(true)} />
        {children}
      </>
    );
  }

  // Allow full access for active subscriptions
  return <>{children}</>;
}
