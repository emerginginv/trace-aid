import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  DollarSign, 
  Layers,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useEnforcementStatus } from "@/hooks/useEnforcement";
import { Skeleton } from "@/components/ui/skeleton";

interface EnforcementStatusCardProps {
  caseId: string;
}

export function EnforcementStatusCard({ caseId }: EnforcementStatusCardProps) {
  const { data: status, isLoading, error } = useEnforcementStatus(caseId);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !status) {
    return null;
  }
  
  const hasActiveEnforcement = status.has_active_enforcement;
  const hasBlockedActions = status.blocked_actions_last_7_days > 0;
  
  return (
    <Card className={hasBlockedActions ? "border-amber-500/50" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {hasBlockedActions ? (
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          ) : hasActiveEnforcement ? (
            <Shield className="h-5 w-5 text-primary" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          )}
          Enforcement Status
        </CardTitle>
        <CardDescription>
          Budget limits, locked records, and tier restrictions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Enforcement */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Budget Enforcement</span>
          </div>
          {status.budget.has_budget ? (
            <Badge variant={status.budget.hard_cap ? "default" : "secondary"}>
              {status.budget.hard_cap ? "Hard Cap Active" : "Soft Limit"}
            </Badge>
          ) : (
            <Badge variant="outline">No Budget</Badge>
          )}
        </div>
        
        {/* Locked Records */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Locked Records</span>
          </div>
          <div className="flex gap-2">
            {status.locked_services > 0 && (
              <Badge variant="secondary">
                {status.locked_services} service{status.locked_services !== 1 ? 's' : ''}
              </Badge>
            )}
            {status.locked_activities > 0 && (
              <Badge variant="secondary">
                {status.locked_activities} activit{status.locked_activities !== 1 ? 'ies' : 'y'}
              </Badge>
            )}
            {status.locked_services === 0 && status.locked_activities === 0 && (
              <Badge variant="outline">None</Badge>
            )}
          </div>
        </div>
        
        {/* Blocked Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Blocked Actions (7 days)</span>
          </div>
          <Badge variant={hasBlockedActions ? "destructive" : "outline"}>
            {status.blocked_actions_last_7_days}
          </Badge>
        </div>
        
        {/* Alert for blocked actions */}
        {hasBlockedActions && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {status.blocked_actions_last_7_days} action(s) were blocked in the last 7 days due to budget or tier restrictions.
            </AlertDescription>
          </Alert>
        )}
        
        {/* All clear message */}
        {!hasBlockedActions && !hasActiveEnforcement && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-2">
            <CheckCircle className="h-4 w-4" />
            <span>No active restrictions on this case</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
