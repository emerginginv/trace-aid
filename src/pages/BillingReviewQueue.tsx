/**
 * Billing Review Queue Page
 * 
 * PART 8: Review queue for pending billing items.
 * 
 * Features:
 * - View all pending billing items
 * - Approve or reject items
 * - View linked source update and activity
 * - Admin-only diagnostics viewing
 * 
 * Rules:
 * - Only approved billing items may be invoiced
 * - Approval consumes budget definitively
 * - Rejected items remain non-billable
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  ExternalLink, 
  Clock, 
  DollarSign,
  FileText,
  Activity,
  Loader2,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useBillingReviewQueue } from "@/hooks/useBillingReviewQueue";
import { useBillingItemApproval } from "@/hooks/useBillingItemApproval";
import { useUserRole } from "@/hooks/useUserRole";
import { BillingReviewItem } from "@/types/billing";

type StatusFilter = 'pending_review' | 'approved' | 'rejected' | 'all';

export default function BillingReviewQueue() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_review');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BillingReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  const { items, loading, pendingCount, refetch } = useBillingReviewQueue(
    { status: statusFilter === 'all' ? undefined : statusFilter }
  );
  const { approveBillingItem, rejectBillingItem, loading: isApproving } = useBillingItemApproval();

  const handleApprove = async (item: BillingReviewItem) => {
    const result = await approveBillingItem(item.id);
    
    if (result.success) {
      toast({
        title: "Billing Item Approved",
        description: "The billing item has been approved and budget consumed.",
      });
      refetch();
    } else if (result.budgetBlocked) {
      toast({
        title: "Budget Limit Exceeded",
        description: result.error || "Cannot approve: would exceed hard budget cap.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Approval Failed",
        description: result.error || "Failed to approve billing item",
        variant: "destructive",
      });
    }
  };

  const handleRejectClick = (item: BillingReviewItem) => {
    setSelectedItem(item);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedItem) return;
    
    const result = await rejectBillingItem(selectedItem.id, rejectReason || undefined);
    
    if (result.success) {
      toast({
        title: "Billing Item Rejected",
        description: "The billing item has been rejected.",
      });
      setRejectDialogOpen(false);
      setSelectedItem(null);
      refetch();
    } else {
      toast({
        title: "Rejection Failed",
        description: result.error || "Failed to reject billing item",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Awaiting Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Approved</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Declined</Badge>;
      case 'committed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Committed</Badge>;
      case 'voided':
        return <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300 line-through">Voided</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">✓ Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing Review Queue</h1>
          <p className="text-muted-foreground">
            Review and approve pending billing items before invoicing
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Billing Items</CardTitle>
              <CardDescription>
                {statusFilter === 'pending_review' 
                  ? 'Items awaiting approval before they can be invoiced'
                  : `Showing ${statusFilter === 'all' ? 'all' : statusFilter} items`
                }
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All Items</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No billing items found</p>
              <p className="text-sm">
                {statusFilter === 'pending_review' 
                  ? 'All billing items have been reviewed'
                  : 'No items match the selected filter'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Activity / Update</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <button
                          onClick={() => navigate(`/cases/${item.case_id}`)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <span className="font-medium">{item.case_number}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                        {item.case_title && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {item.case_title}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.account_name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.service_name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {item.activity_id && (
                            <span className="flex items-center gap-1 text-xs">
                              <Activity className="h-3 w-3" />
                              {item.activity_title || 'Activity'}
                            </span>
                          )}
                          {item.update_id && (
                            <button
                              onClick={() => navigate(`/updates/${item.update_id}`)}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <FileText className="h-3 w-3" />
                              View Update
                            </button>
                          )}
                          {!item.activity_id && !item.update_id && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.quantity?.toFixed(2) || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.hourly_rate ? formatCurrency(item.hourly_rate) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {item.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(item)}
                                disabled={isApproving}
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRejectClick(item)}
                                disabled={isApproving}
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="View Diagnostics (Admin)"
                              onClick={() => {
                                // Log diagnostics to console for admin viewing
                                console.log('[Admin Diagnostics] Billing Item:', item);
                                toast({
                                  title: "Diagnostics Logged",
                                  description: "Item details logged to browser console (F12)",
                                });
                              }}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Billing Item</DialogTitle>
            <DialogDescription>
              This billing item will be marked as rejected and will not be invoiced.
              Optionally provide a reason for the rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason (Optional)</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            {selectedItem && (
              <div className="text-sm text-muted-foreground">
                <p><strong>Amount:</strong> {formatCurrency(selectedItem.amount)}</p>
                <p><strong>Description:</strong> {selectedItem.description}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectConfirm}
              disabled={isApproving}
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
