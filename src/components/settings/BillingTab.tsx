import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Check, AlertTriangle, HardDrive, Users as UsersIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getPlanLimits, isTrialActive, getTrialDaysRemaining, PRICING_TIERS, STORAGE_ADDON_TIERS } from "@/lib/planLimits";
import { Organization, SubscriptionStatus } from "@/contexts/OrganizationContext";

interface BillingTabProps {
  organization: Organization | null;
  subscriptionStatus: SubscriptionStatus | null;
}

export const BillingTab = ({
  organization,
  subscriptionStatus,
}: BillingTabProps) => {
  const [billingLoading, setBillingLoading] = useState<string | null>(null);

  const handleSubscribe = (priceId: string) => {
    setBillingLoading(priceId);
    supabase.functions.invoke("create-checkout", {
      body: { priceId },
    }).then(({ data, error }) => {
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    }).catch((error: any) => {
      toast.error(error.message);
    }).finally(() => {
      setBillingLoading(null);
    });
  };

  const handleManageSubscription = () => {
    setBillingLoading("portal");
    supabase.functions.invoke("customer-portal")
      .then(({ data, error }) => {
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, "_blank");
        }
      }).catch((error: any) => {
        toast.error(error.message);
      }).finally(() => {
        setBillingLoading(null);
      });
  };

  const getCurrentTier = () => {
    if (!subscriptionStatus?.product_id) return null;
    const tier = PRICING_TIERS.find(t => t.productId === subscriptionStatus.product_id);
    return tier?.name || null;
  };

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {subscriptionStatus?.trial_end && isTrialActive(subscriptionStatus.trial_end) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{getPlanLimits(subscriptionStatus.product_id).name} Trial Active</AlertTitle>
          <AlertDescription>
            You have {getTrialDaysRemaining(subscriptionStatus.trial_end)} days remaining in your 14-day trial of {getPlanLimits(subscriptionStatus.product_id).name}.
            Trial ends on {new Date(subscriptionStatus.trial_end).toLocaleDateString()}.
            You have access to {getPlanLimits(subscriptionStatus.product_id).max_admin_users} admin users and {getPlanLimits(subscriptionStatus.product_id).storage_gb + (subscriptionStatus.storage_addon_gb || 0)}GB storage during this trial.
          </AlertDescription>
        </Alert>
      )}

      {/* Expired Trial Banner */}
      {subscriptionStatus?.trial_end && !isTrialActive(subscriptionStatus.trial_end) && subscriptionStatus.status !== "active" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Trial Expired</AlertTitle>
          <AlertDescription>
            Your trial has ended. Please add a payment method to continue using premium features.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan & Usage */}
      {organization && (() => {
        const activeProductId = subscriptionStatus?.product_id || organization.subscription_product_id;
        const planLimits = getPlanLimits(activeProductId);
        const baseStorage = planLimits.storage_gb;
        const addonStorage = subscriptionStatus?.storage_addon_gb || 0;
        const totalStorage = baseStorage + addonStorage;
        
        return (
          <Card>
            <CardHeader>
              <CardTitle>Current Plan & Usage</CardTitle>
              <CardDescription>
                {subscriptionStatus?.subscribed ? (
                  <>Your subscription is {subscriptionStatus.status === "trialing" ? "on trial" : organization.subscription_status}</>
                ) : (
                  <>You are on the Free plan</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-lg capitalize">
                    {planLimits.name}
                  </p>
                  {subscriptionStatus?.subscription_end && (
                    <p className="text-sm text-muted-foreground">
                      {subscriptionStatus.status === "trialing" ? "Trial ends" : "Renews"} on {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {subscriptionStatus?.subscribed && (
                  <Button onClick={handleManageSubscription} disabled={billingLoading === "portal"}>
                    {billingLoading === "portal" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                )}
              </div>

              {/* Usage Metrics */}
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="w-4 h-4" />
                      <span>Admin Users</span>
                    </div>
                    <span className="text-muted-foreground">
                      {organization.current_users_count || 0} / {planLimits.max_admin_users === Infinity ? "Unlimited" : planLimits.max_admin_users}
                    </span>
                  </div>
                  <Progress 
                    value={
                      planLimits.max_admin_users === Infinity 
                        ? 0 
                        : ((organization.current_users_count || 0) / planLimits.max_admin_users) * 100
                    } 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      <span>Storage</span>
                    </div>
                    <span className="text-muted-foreground">
                      {(organization.storage_used_gb || 0).toFixed(2)} GB / {totalStorage} GB
                      {addonStorage > 0 && (
                        <span className="text-primary text-xs ml-1">
                          (+{addonStorage}GB add-on)
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress 
                    value={((organization.storage_used_gb || 0) / totalStorage) * 100} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Subscription Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Subscription Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier) => {
            const isCurrentPlan = tier.name === getCurrentTier();

            return (
              <Card 
                key={tier.name} 
                className={`relative ${isCurrentPlan ? "border-primary shadow-lg ring-2 ring-primary/20" : ""} ${tier.popular ? "border-primary/50" : ""}`}
              >
                {tier.popular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
                  </div>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {!isCurrentPlan ? (
                    <Button
                      className="w-full"
                      variant={tier.popular ? "default" : "outline"}
                      onClick={() => handleSubscribe(tier.priceId)}
                      disabled={billingLoading === tier.priceId}
                    >
                      {billingLoading === tier.priceId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {subscriptionStatus?.subscribed ? "Switch Plan" : "Subscribe"}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="secondary" disabled>
                      Current Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Storage Add-ons */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Additional Storage</h3>
        <p className="text-muted-foreground text-sm mb-4">Need more space? Add extra storage to your plan.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          {STORAGE_ADDON_TIERS.map((addon) => (
            <Card key={addon.name}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">{addon.name}</CardTitle>
                </div>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">{addon.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleSubscribe(addon.priceId)}
                  disabled={billingLoading === addon.priceId || !subscriptionStatus?.subscribed}
                >
                  {billingLoading === addon.priceId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {!subscriptionStatus?.subscribed ? "Subscribe to a plan first" : "Add Storage"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BillingTab;
