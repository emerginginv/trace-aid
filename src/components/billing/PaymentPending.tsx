import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Loader2, Shield, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PRICING_TIERS } from "@/lib/planLimits";
import type { PlanKey } from "@/lib/planLimits";

interface PaymentPendingProps {
  organizationId: string;
  organizationName: string;
  onRefresh?: () => void;
}

export function PaymentPending({ 
  organizationId, 
  organizationName,
  onRefresh 
}: PaymentPendingProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("solo");

  const handleSelectPlan = async (planKey: PlanKey, priceId: string) => {
    setLoading(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          planKey,
          priceId,
          organizationId,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start checkout";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  const handleRefresh = () => {
    onRefresh?.();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to CaseWyze</h1>
          <p className="text-muted-foreground mt-2">
            Choose a plan to activate your organization: <strong>{organizationName}</strong>
          </p>
        </div>

        {/* Status Banner */}
        <Card className="mb-8 border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="flex items-center gap-4 py-4">
            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Payment Required
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Select a subscription plan below to activate your account. You'll get a 14-day free trial.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Tiers */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {PRICING_TIERS.map((tier) => {
            const planKey = tier.productId === "prod_TagUwxglXyq7Ls" ? "solo" 
              : tier.productId === "prod_TagbsPhNweUFpe" ? "team" 
              : "enterprise";
            
            return (
              <Card 
                key={tier.name} 
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  tier.popular ? "border-primary/50 ring-2 ring-primary/20" : ""
                }`}
                onClick={() => setSelectedPlan(planKey)}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
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
                  <div className="pt-2">
                    <Badge variant="outline" className="w-full justify-center py-1">
                      14-day free trial
                    </Badge>
                  </div>
                  <Button
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(planKey, tier.priceId);
                    }}
                    disabled={loading === planKey}
                  >
                    {loading === planKey && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <CreditCard className="w-4 h-4 mr-2" />
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Refresh Status */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Already completed payment?
          </p>
          <Button variant="ghost" onClick={handleRefresh}>
            <Loader2 className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>
    </div>
  );
}
