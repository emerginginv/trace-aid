import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { getBillingStatusConfig } from "@/lib/billingUtils";
import { Organization, SubscriptionStatus } from "@/contexts/OrganizationContext";
import { getPlanLimits } from "@/lib/planLimits";

interface BillingStatusSectionProps {
  organization: Organization | null;
  subscriptionStatus: SubscriptionStatus | null;
  onManageSubscription: () => void;
  loading: boolean;
}

export function BillingStatusSection({
  organization,
  subscriptionStatus,
  onManageSubscription,
  loading,
}: BillingStatusSectionProps) {
  if (!organization) return null;

  const statusConfig = getBillingStatusConfig(organization.subscription_status);
  const planLimits = getPlanLimits(subscriptionStatus?.product_id || organization.subscription_product_id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <CardTitle>Billing Status</CardTitle>
          </div>
          <Badge className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
        </div>
        <CardDescription>
          Your current subscription and billing information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <p className="font-semibold capitalize">{planLimits.name}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Billing Status</p>
            <p className="font-semibold capitalize">
              {organization.subscription_status?.replace(/_/g, ' ') || 'Unknown'}
            </p>
          </div>
          
          {subscriptionStatus?.subscription_end && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {subscriptionStatus.status === 'trialing' ? 'Trial Ends' : 'Next Billing Date'}
              </p>
              <p className="font-semibold">
                {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {subscriptionStatus?.subscribed && (
          <div className="pt-4 border-t">
            <Button onClick={onManageSubscription} disabled={loading} variant="outline">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CreditCard className="w-4 h-4 mr-2" />
              Update Payment Method
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
