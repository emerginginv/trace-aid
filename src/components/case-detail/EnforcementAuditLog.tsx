import { useEnforcementActions } from "@/hooks/useEnforcement";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  ShieldX, 
  DollarSign, 
  Layers, 
  Lock, 
  AlertTriangle,
  User,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface EnforcementAuditLogProps {
  caseId: string;
  limit?: number;
}

const enforcementTypeConfig: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  budget: { icon: DollarSign, label: "Budget", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  tier: { icon: Layers, label: "Tier", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  pricing: { icon: AlertTriangle, label: "Pricing", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  lock: { icon: Lock, label: "Lock", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  permission: { icon: Shield, label: "Permission", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const actionTypeLabels: Record<string, string> = {
  activity_create: "Create Activity",
  activity_update: "Update Activity",
  service_create: "Create Service",
  service_complete: "Complete Service",
  invoice_generate: "Generate Invoice",
};

export function EnforcementAuditLog({ caseId, limit = 20 }: EnforcementAuditLogProps) {
  const { data: actions, isLoading, error } = useEnforcementActions(caseId, limit);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">Failed to load enforcement log</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!actions || actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enforcement Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No enforcement actions recorded</p>
        </CardContent>
      </Card>
    );
  }
  
  const blockedCount = actions.filter(a => a.was_blocked).length;
  const allowedCount = actions.filter(a => !a.was_blocked).length;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enforcement Log
          </CardTitle>
          <div className="flex gap-2">
            {blockedCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <ShieldX className="h-3 w-3" />
                {blockedCount} blocked
              </Badge>
            )}
            {allowedCount > 0 && (
              <Badge variant="outline" className="gap-1">
                {allowedCount} allowed
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Record of all enforcement checks and actions
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[350px]">
          <div className="space-y-1 p-4">
            {actions.map((action, index) => {
              const config = enforcementTypeConfig[action.enforcement_type] || { 
                icon: Shield, 
                label: action.enforcement_type, 
                color: "bg-muted text-muted-foreground" 
              };
              const Icon = config.icon;
              
              return (
                <div key={action.id} className="relative">
                  {/* Timeline connector */}
                  {index < actions.length - 1 && (
                    <div className="absolute left-4 top-10 h-full w-px bg-border" />
                  )}
                  
                  <div className={`flex gap-3 p-2 rounded-md transition-colors ${
                    action.was_blocked 
                      ? 'bg-destructive/5 hover:bg-destructive/10' 
                      : 'hover:bg-accent/50'
                  }`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      action.was_blocked 
                        ? 'bg-destructive/10 text-destructive' 
                        : config.color
                    }`}>
                      {action.was_blocked ? <ShieldX className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={action.was_blocked ? "destructive" : "outline"} 
                          className="text-xs"
                        >
                          {action.was_blocked ? "BLOCKED" : "ALLOWED"}
                        </Badge>
                        <Badge variant="secondary" className={`text-xs ${config.color}`}>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {actionTypeLabels[action.action_type] || action.action_type}
                        </span>
                      </div>
                      
                      {action.block_reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {action.block_reason}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{action.user?.full_name || action.user?.email || "System"}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(action.created_at), "MMM d 'at' h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
