import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, CreditCard, Loader2, RotateCcw, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SubscriptionCanceledProps {
  organizationName: string;
  organizationId: string;
  onRefresh?: () => void;
}

export function SubscriptionCanceled({ 
  organizationName, 
  organizationId,
  onRefresh 
}: SubscriptionCanceledProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResubscribe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          planKey: "solo",
          organizationId,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start checkout";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Subscription Canceled</h1>
          <p className="text-muted-foreground mt-2">
            Your subscription for <strong>{organizationName}</strong> has been canceled.
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-muted">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Your data is preserved and will remain accessible for 30 days.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Resubscribe anytime to regain full access to your cases and data.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Need help? Contact support@unifiedcases.com
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            className="w-full" 
            onClick={handleResubscribe}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Resubscribe
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={onRefresh}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
