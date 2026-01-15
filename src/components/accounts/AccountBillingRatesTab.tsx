import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Trash2, DollarSign, Clock, Hash, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  useAccountBillingItems,
  useUpsertAccountRate,
  useDeleteAccountRate,
  AccountBillingItem,
} from "@/hooks/useAccountBillingRates";
import { AccountRateDialog } from "./AccountRateDialog";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * INVARIANT 1: Client billing rates live ONLY on the Account
 * This component manages rates in the client_price_list table
 * Visible to Admin/Manager roles only
 */

interface AccountBillingRatesTabProps {
  accountId: string;
  accountName?: string;
  canEdit: boolean;
  showCard?: boolean;
}

export function AccountBillingRatesTab({ 
  accountId, 
  accountName = "Account", 
  canEdit,
  showCard = true 
}: AccountBillingRatesTabProps) {
  const [editingItem, setEditingItem] = useState<AccountBillingItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AccountBillingItem | null>(null);

  const { data: billingItems, isLoading } = useAccountBillingItems(accountId);
  const upsertRate = useUpsertAccountRate();
  const deleteRate = useDeleteAccountRate();

  // Count items without rates configured
  const unconfiguredCount = billingItems?.filter(item => item.customRate === null).length || 0;

  const handleEditRate = (item: AccountBillingItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleSaveRate = (data: {
    customRate: number;
    effectiveDate: string | null;
    endDate: string | null;
    notes: string | null;
  }) => {
    if (!editingItem) return;

    upsertRate.mutate(
      {
        financeItemId: editingItem.id,
        accountId: accountId,
        customRate: data.customRate,
        effectiveDate: data.effectiveDate,
        endDate: data.endDate,
        notes: data.notes,
        existingId: editingItem.overrideId,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingItem(null);
        },
      }
    );
  };

  const handleDeleteRate = (item: AccountBillingItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRate = () => {
    if (!itemToDelete?.overrideId) return;

    deleteRate.mutate(
      { id: itemToDelete.overrideId, accountId: accountId },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setItemToDelete(null);
        },
      }
    );
  };

  const getRateTypeIcon = (rateType: string) => {
    switch (rateType) {
      case "hourly":
        return <Clock className="h-3.5 w-3.5" />;
      case "variable":
        return <Hash className="h-3.5 w-3.5" />;
      case "fixed":
        return <DollarSign className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const getRateTypeLabel = (rateType: string) => {
    switch (rateType) {
      case "hourly":
        return "Hourly";
      case "variable":
        return "Per Unit";
      case "fixed":
        return "Flat";
      default:
        return rateType;
    }
  };

  const formatRate = (rate: number | null, rateType: string) => {
    if (rate === null) return "—";
    const formatted = `$${rate.toFixed(2)}`;
    switch (rateType) {
      case "hourly":
        return `${formatted}/hr`;
      case "variable":
        return `${formatted}/unit`;
      case "fixed":
        return formatted;
      default:
        return formatted;
    }
  };

  const content = (
    <>
      {/* Warning for unconfigured rates */}
      {unconfiguredCount > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Billing Rates</AlertTitle>
          <AlertDescription>
            {unconfiguredCount} item{unconfiguredCount !== 1 ? 's' : ''} without billing rates configured. 
            Work cannot be billed until rates are set.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Billing Items Table */}
      {!isLoading && billingItems && (
        <>
          {billingItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No billing rate items configured. Add invoice items in Invoice & Expense Items settings.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Billing Rate</TableHead>
                    <TableHead>Effective</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingItems.map((item) => (
                    <TableRow key={item.id} className={item.customRate === null ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          {getRateTypeIcon(item.rateType)}
                          {getRateTypeLabel(item.rateType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.customRate !== null ? (
                          <span className="font-mono font-medium text-primary">
                            {formatRate(item.customRate, item.rateType)}
                          </span>
                        ) : (
                          <Badge variant="destructive" className="font-normal">
                            Not configured
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.effectiveDate ? (
                          <span className="text-sm">
                            {format(new Date(item.effectiveDate), "MMM d, yyyy")}
                            {item.endDate && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {format(new Date(item.endDate), "MMM d, yyyy")}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRate(item)}
                              title={item.customRate !== null ? "Edit rate" : "Configure rate"}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {item.overrideId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteRate(item)}
                                title="Remove rate"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            These rates determine what this client is charged for work. 
            Services without configured rates cannot be billed.
          </p>
        </>
      )}

      {/* Edit Dialog */}
      <AccountRateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        accountName={accountName}
        onSave={handleSaveRate}
        isSaving={upsertRate.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Billing Rate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the billing rate for "{itemToDelete?.name}". 
              Work using this item will not be billable until a new rate is configured.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRate}
              disabled={deleteRate.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Rate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (!showCard) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Billing Rates
        </CardTitle>
        <CardDescription>
          Manage billing rates for this client. These rates determine what the client is charged for services.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  );
}
