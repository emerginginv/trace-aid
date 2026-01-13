import { useInvoiceAuditLog } from "@/hooks/useInvoiceGuardrails";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Send, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Lock,
  Clock,
  User
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface InvoiceAuditTrailProps {
  invoiceId: string;
}

const actionConfig: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  created: { icon: Plus, label: "Created", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  line_items_added: { icon: Plus, label: "Line Items Added", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  finalized: { icon: Send, label: "Finalized", color: "bg-primary/10 text-primary" },
  voided: { icon: XCircle, label: "Voided", color: "bg-destructive/10 text-destructive" },
  payment_added: { icon: FileText, label: "Payment Added", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  attempted_double_bill: { icon: AlertTriangle, label: "Double-Bill Prevented", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  locked_edit_attempt: { icon: Lock, label: "Edit Blocked", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

export function InvoiceAuditTrail({ invoiceId }: InvoiceAuditTrailProps) {
  const { data: auditLog, isLoading, error } = useInvoiceAuditLog(invoiceId);
  
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
          <p className="text-sm text-destructive">Failed to load audit trail</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!auditLog || auditLog.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No audit entries yet</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Audit Trail
        </CardTitle>
        <CardDescription>
          Complete history of invoice actions
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 p-4">
            {auditLog.map((entry, index) => {
              const config = actionConfig[entry.action] || { 
                icon: FileText, 
                label: entry.action, 
                color: "bg-muted text-muted-foreground" 
              };
              const Icon = config.icon;
              
              return (
                <div key={entry.id} className="relative">
                  {/* Timeline connector */}
                  {index < auditLog.length - 1 && (
                    <div className="absolute left-4 top-10 h-full w-px bg-border" />
                  )}
                  
                  <div className="flex gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                        
                        {entry.previous_status && entry.new_status && (
                          <span className="text-xs text-muted-foreground">
                            {entry.previous_status} → {entry.new_status}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{entry.user?.full_name || entry.user?.email || "System"}</span>
                        <span>•</span>
                        <span>{format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                      
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {entry.action === 'finalized' && entry.metadata.services_locked !== undefined && (
                            <span>Locked {entry.metadata.services_locked as number} service(s) and {entry.metadata.activities_locked as number} activit(ies)</span>
                          )}
                          {entry.action === 'voided' && entry.metadata.void_reason && (
                            <span>Reason: {entry.metadata.void_reason as string}</span>
                          )}
                          {entry.action === 'line_items_added' && (
                            <span>Added {entry.metadata.line_items_created as number} line item(s), total: ${(entry.metadata.total_amount as number)?.toFixed(2)}</span>
                          )}
                          {entry.action === 'attempted_double_bill' && (
                            <span className="text-amber-600 dark:text-amber-400">
                              Prevented duplicate billing of service instance
                            </span>
                          )}
                        </div>
                      )}
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
