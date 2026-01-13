import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Send, XCircle, AlertTriangle, Edit, Clock } from "lucide-react";
import { useInvoiceStatus, useFinalizeInvoice, useVoidInvoice } from "@/hooks/useInvoiceGuardrails";
import { format } from "date-fns";

interface InvoiceStatusActionsProps {
  invoiceId: string;
  onStatusChange?: () => void;
}

export function InvoiceStatusActions({ invoiceId, onStatusChange }: InvoiceStatusActionsProps) {
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  
  const { data: invoiceStatus, isLoading } = useInvoiceStatus(invoiceId);
  const finalizeMutation = useFinalizeInvoice();
  const voidMutation = useVoidInvoice();
  
  if (isLoading || !invoiceStatus) {
    return null;
  }
  
  const handleFinalize = async () => {
    await finalizeMutation.mutateAsync(invoiceId);
    setShowFinalizeDialog(false);
    onStatusChange?.();
  };
  
  const handleVoid = async () => {
    if (!voidReason.trim()) return;
    await voidMutation.mutateAsync({ invoiceId, reason: voidReason });
    setShowVoidDialog(false);
    setVoidReason("");
    onStatusChange?.();
  };
  
  const getStatusBadge = () => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Lock }> = {
      draft: { variant: "outline", icon: Edit },
      sent: { variant: "default", icon: Send },
      partial: { variant: "secondary", icon: Clock },
      paid: { variant: "default", icon: Lock },
      overdue: { variant: "destructive", icon: AlertTriangle },
      voided: { variant: "destructive", icon: XCircle },
    };
    
    const config = statusConfig[invoiceStatus.status] || { variant: "outline" as const, icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {invoiceStatus.status.toUpperCase()}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {invoiceStatus.is_locked && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Locked</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {invoiceStatus.can_finalize && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowFinalizeDialog(true)}
              disabled={finalizeMutation.isPending}
              className="gap-1"
            >
              <Send className="h-4 w-4" />
              Finalize & Send
            </Button>
          )}
          
          {invoiceStatus.can_void && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowVoidDialog(true)}
              disabled={voidMutation.isPending}
              className="gap-1"
            >
              <XCircle className="h-4 w-4" />
              Void Invoice
            </Button>
          )}
        </div>
      </div>
      
      {invoiceStatus.finalized_at && (
        <p className="text-sm text-muted-foreground">
          Finalized on {format(new Date(invoiceStatus.finalized_at), "MMM d, yyyy 'at' h:mm a")}
        </p>
      )}
      
      {invoiceStatus.voided_at && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm font-medium text-destructive">Voided on {format(new Date(invoiceStatus.voided_at), "MMM d, yyyy 'at' h:mm a")}</p>
          {invoiceStatus.void_reason && (
            <p className="text-sm text-muted-foreground mt-1">Reason: {invoiceStatus.void_reason}</p>
          )}
        </div>
      )}
      
      {/* Finalize Dialog */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Finalize Invoice?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Finalizing invoice <strong>{invoiceStatus.invoice_number}</strong> will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Lock all included service instances from modification</li>
                <li>Lock all related activities from modification</li>
                <li>Change status to "Sent"</li>
                <li>Record this action in the audit trail</li>
              </ul>
              <p className="text-amber-600 dark:text-amber-400 font-medium mt-3">
                This action cannot be undone without voiding the invoice.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize} disabled={finalizeMutation.isPending}>
              {finalizeMutation.isPending ? "Finalizing..." : "Finalize Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Void Dialog */}
      <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Void Invoice?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Voiding invoice <strong>{invoiceStatus.invoice_number}</strong> will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Unlock all included service instances for rebilling</li>
                <li>Unlock all related activities for modification</li>
                <li>Mark the invoice as "Voided"</li>
                <li>Record this action in the audit trail</li>
              </ul>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground">
                  Reason for voiding (required):
                </label>
                <Textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Enter the reason for voiding this invoice..."
                  className="mt-2"
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              disabled={voidMutation.isPending || !voidReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {voidMutation.isPending ? "Voiding..." : "Void Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
