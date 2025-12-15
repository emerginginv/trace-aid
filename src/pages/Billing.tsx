import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Loader2, HardDrive, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSearchParams } from "react-router-dom";
import { PRICING_TIERS, STORAGE_ADDON_TIERS, getPlanLimits, getStorageAddon, getTotalStorage, getTotalAddonStorage } from "@/lib/planLimits";

export default function Billing() {
  const { organization, subscriptionStatus, checkSubscription } = useOrganization();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkSubscription();
    
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
      checkSubscription();
    }
  }, [searchParams]);

  const handleSubscribe = async (priceId: string) => {
    setLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      // If subscription was updated directly (upgrade/downgrade)
      if (data?.success) {
        toast.success(data.message || "Subscription updated successfully!");
        await checkSubscription();
      } else if (data?.url) {
        // New subscription - redirect to checkout
        window.open(data.url, "_blank");
      } else if (data?.message) {
        toast.info(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading("portal");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const getCurrentTier = () => {
    if (!subscriptionStatus?.product_id) return null;
    const tier = PRICING_TIERS.find(t => t.productId === subscriptionStatus.product_id);
    return tier?.name || null;
  };

  const currentTierName = getCurrentTier();
  const currentPlanLimits = getPlanLimits(subscriptionStatus?.product_id || null);
  const addonStorage = getTotalAddonStorage(subscriptionStatus?.storage_addons || null);
  const totalStorage = getTotalStorage(subscriptionStatus?.product_id || null, subscriptionStatus?.storage_addons || null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">Choose the plan that fits your investigation needs</p>
      </div>

      {/* Current Plan Card */}
      {organization && subscriptionStatus?.subscribed && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Current Plan
            </CardTitle>
            <CardDescription>
              Your subscription is {organization.subscription_status}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-semibold text-lg">{currentTierName || organization.subscription_tier} Plan</p>
                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                  <span>{currentPlanLimits.max_admin_users} Admin Users</span>
                  <span>•</span>
                  <span>
                    {totalStorage}GB Storage
                    {addonStorage > 0 && (
                      <span className="text-primary ml-1">
                        (+{addonStorage}GB add-on)
                      </span>
                    )}
                  </span>
                </div>
                {subscriptionStatus.subscription_end && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Renews on {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button onClick={handleManageSubscription} disabled={loading === "portal"}>
                {loading === "portal" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Tiers */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Subscription Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier) => {
            const isCurrentPlan = tier.name === currentTierName;

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
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
                  </div>
                  <CardDescription>
                    <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
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
                      disabled={loading === tier.priceId}
                    >
                      {loading === tier.priceId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
        <h2 className="text-xl font-semibold mb-2">Additional Storage</h2>
        <p className="text-muted-foreground mb-4">Need more space? Add extra storage to your plan.</p>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
          {STORAGE_ADDON_TIERS.map((addon) => (
            <Card key={addon.name}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{addon.name}</CardTitle>
                </div>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{addon.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleSubscribe(addon.priceId)}
                  disabled={loading === addon.priceId || !subscriptionStatus?.subscribed}
                >
                  {loading === addon.priceId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {!subscriptionStatus?.subscribed ? "Subscribe to a plan first" : "Add Storage"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
