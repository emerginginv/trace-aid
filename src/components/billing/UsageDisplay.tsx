import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Users, 
  Briefcase, 
  HardDrive, 
  AlertTriangle, 
  Crown,
  TrendingUp 
} from "lucide-react";
import { useEntitlements } from "@/hooks/use-entitlements";
import { Skeleton } from "@/components/ui/skeleton";

interface UsageDisplayProps {
  showUpgradeCTA?: boolean;
  onUpgrade?: () => void;
}

export function UsageDisplay({ showUpgradeCTA = true, onUpgrade }: UsageDisplayProps) {
  const { 
    entitlements, 
    isLoading, 
    getUsagePercentage, 
    formatStorage,
    isApproachingLimit,
    isAtLimit 
  } = useEntitlements();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage & Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!entitlements) {
    return null;
  }

  const { entitlements: limits, usage, subscription_active } = entitlements;

  const seatsPercentage = getUsagePercentage('seats');
  const casesPercentage = getUsagePercentage('cases');
  const storagePercentage = getUsagePercentage('storage');

  const showWarnings = isApproachingLimit('seats') || isApproachingLimit('cases') || isApproachingLimit('storage');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage & Limits
          </CardTitle>
          <Badge variant={subscription_active ? "default" : "secondary"}>
            {limits.plan_name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Alert */}
        {showWarnings && showUpgradeCTA && (
          <Alert variant="destructive" className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Approaching Limits</AlertTitle>
            <AlertDescription>
              You're approaching one or more plan limits. Consider upgrading to avoid interruptions.
            </AlertDescription>
          </Alert>
        )}

        {/* Seats Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Team Members</span>
            </div>
            <span className={isAtLimit('seats') ? "text-destructive font-medium" : "text-muted-foreground"}>
              {usage.seats_used} / {limits.max_seats > 0 ? limits.max_seats : "Unlimited"}
            </span>
          </div>
          {limits.max_seats > 0 && (
            <Progress 
              value={seatsPercentage} 
              className={seatsPercentage >= 100 ? "[&>div]:bg-destructive" : seatsPercentage >= 80 ? "[&>div]:bg-warning" : ""}
            />
          )}
          {isAtLimit('seats') && (
            <p className="text-xs text-destructive">
              Seat limit reached. Remove members or upgrade to add more.
            </p>
          )}
        </div>

        {/* Cases Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Cases</span>
            </div>
            <span className={isAtLimit('cases') ? "text-destructive font-medium" : "text-muted-foreground"}>
              {usage.cases_count} / {limits.max_cases > 0 ? limits.max_cases : "Unlimited"}
            </span>
          </div>
          {limits.max_cases > 0 && (
            <Progress 
              value={casesPercentage}
              className={casesPercentage >= 100 ? "[&>div]:bg-destructive" : casesPercentage >= 80 ? "[&>div]:bg-warning" : ""}
            />
          )}
          {isAtLimit('cases') && (
            <p className="text-xs text-destructive">
              Case limit reached. Upgrade for unlimited cases.
            </p>
          )}
        </div>

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Storage</span>
            </div>
            <span className={isAtLimit('storage') ? "text-destructive font-medium" : "text-muted-foreground"}>
              {formatStorage(usage.storage_bytes)} / {formatStorage(limits.max_storage_bytes)}
            </span>
          </div>
          <Progress 
            value={storagePercentage}
            className={storagePercentage >= 100 ? "[&>div]:bg-destructive" : storagePercentage >= 80 ? "[&>div]:bg-warning" : ""}
          />
          {isAtLimit('storage') && (
            <p className="text-xs text-destructive">
              Storage limit reached. Upgrade or add a storage addon.
            </p>
          )}
        </div>

        {/* Feature Entitlements */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-3">Plan Features</p>
          <div className="grid grid-cols-2 gap-2">
            <FeatureBadge enabled={true} label="PDF Exports" />
            <FeatureBadge enabled={limits.api_access} label="API Access" />
            <FeatureBadge enabled={limits.advanced_analytics} label="Analytics" />
            <FeatureBadge enabled={limits.custom_domains} label="Custom Domain" />
            <FeatureBadge enabled={limits.priority_support} label="Priority Support" />
          </div>
        </div>

        {/* Upgrade CTA */}
        {showUpgradeCTA && limits.plan_name !== 'The Enterprise' && (
          <div className="pt-4 border-t">
            <Button 
              onClick={onUpgrade} 
              className="w-full"
              variant="outline"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${
      enabled 
        ? "bg-primary/10 text-primary" 
        : "bg-muted text-muted-foreground"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-primary" : "bg-muted-foreground"}`} />
      {label}
    </div>
  );
}

export default UsageDisplay;
