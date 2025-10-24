import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSearchParams } from "react-router-dom";

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    priceId: null,
    productId: null,
    features: ["Up to 2 users", "Basic case management", "Email support"],
    maxUsers: 2,
  },
  {
    name: "Standard",
    price: "$49",
    priceId: "price_1SLesURWPtpjyF4hGZI3sw13",
    productId: "prod_TIFNfVbkhFmIuB",
    features: ["Up to 10 users", "Full case management", "Priority support", "Advanced reporting"],
    maxUsers: 10,
  },
  {
    name: "Pro",
    price: "$99",
    priceId: "price_1SLeslRWPtpjyF4hxtzH85Ad",
    productId: "prod_TIFN9OVHNQ1tlK",
    features: ["Unlimited users", "All features", "24/7 support", "Custom integrations", "API access"],
    maxUsers: -1,
  },
];

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

      if (data?.url) {
        window.open(data.url, "_blank");
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
    if (!subscriptionStatus?.product_id) return "free";
    const tier = PRICING_TIERS.find(t => t.productId === subscriptionStatus.product_id);
    return tier?.name.toLowerCase() || "free";
  };

  const currentTier = getCurrentTier();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">Manage your subscription and billing information</p>
      </div>

      {organization && subscriptionStatus?.subscribed && (
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              Your subscription is {organization.subscription_status}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg capitalize">{organization.subscription_tier} Plan</p>
                {subscriptionStatus.subscription_end && (
                  <p className="text-sm text-muted-foreground">
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

      <div className="grid md:grid-cols-3 gap-6">
        {PRICING_TIERS.map((tier) => {
          const isCurrentPlan = tier.name.toLowerCase() === currentTier;
          const isFree = tier.name === "Free";

          return (
            <Card key={tier.name} className={isCurrentPlan ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.name}</CardTitle>
                  {isCurrentPlan && <Badge>Current Plan</Badge>}
                </div>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                  {!isFree && <span className="text-muted-foreground">/month</span>}
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
                {!isCurrentPlan && !isFree && (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(tier.priceId!)}
                    disabled={loading === tier.priceId}
                  >
                    {loading === tier.priceId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Subscribe
                  </Button>
                )}
                {isFree && !isCurrentPlan && (
                  <Button className="w-full" variant="outline" disabled>
                    Contact Support
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
