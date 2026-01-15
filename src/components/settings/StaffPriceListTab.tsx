import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Pencil, RotateCcw, DollarSign, Clock, Hash } from "lucide-react";
import { format } from "date-fns";
import {
  useStaffPricingItems,
  useStaffMembers,
  useUpsertEmployeeRate,
  useDeleteEmployeeRate,
  StaffPricingItem,
} from "@/hooks/useStaffPricing";
import { StaffRateOverrideDialog } from "./StaffRateOverrideDialog";
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

interface StaffPriceListTabProps {
  currentUserId: string | null;
  currentUserRole: string | null;
}

export function StaffPriceListTab({ currentUserId, currentUserRole }: StaffPriceListTabProps) {
  const isAdmin = currentUserRole === "admin" || currentUserRole === "manager";
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    isAdmin ? null : currentUserId
  );
  const [editingItem, setEditingItem] = useState<StaffPricingItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [itemToReset, setItemToReset] = useState<StaffPricingItem | null>(null);

  const { data: staffMembers, isLoading: staffLoading } = useStaffMembers();
  const { data: pricingItems, isLoading: itemsLoading } = useStaffPricingItems(selectedUserId);
  const upsertRate = useUpsertEmployeeRate();
  const deleteRate = useDeleteEmployeeRate();

  // For non-admins, always show their own rates
  useEffect(() => {
    if (!isAdmin && currentUserId) {
      setSelectedUserId(currentUserId);
    }
  }, [isAdmin, currentUserId]);

  const selectedStaff = staffMembers?.find((s) => s.id === selectedUserId);

  const handleEditRate = (item: StaffPricingItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleSaveRate = (data: {
    customRate: number;
    effectiveDate: string | null;
    endDate: string | null;
    notes: string | null;
  }) => {
    if (!editingItem || !selectedUserId) return;

    upsertRate.mutate(
      {
        financeItemId: editingItem.id,
        userId: selectedUserId,
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

  const handleResetRate = (item: StaffPricingItem) => {
    setItemToReset(item);
    setResetDialogOpen(true);
  };

  const confirmResetRate = () => {
    if (!itemToReset?.overrideId || !selectedUserId) return;

    deleteRate.mutate(
      { id: itemToReset.overrideId, userId: selectedUserId },
      {
        onSuccess: () => {
          setResetDialogOpen(false);
          setItemToReset(null);
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

  const isLoading = staffLoading || itemsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Staff Price List
        </CardTitle>
        <CardDescription>
          {isAdmin
            ? "Manage investigator pay rates for time and expense items. Custom rates override defaults."
            : "View your pay rates for time and expense items."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Staff Selector - Only for Admins */}
        {isAdmin && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Staff Member:</label>
            <Select
              value={selectedUserId || ""}
              onValueChange={(value) => setSelectedUserId(value || null)}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a staff member..." />
              </SelectTrigger>
              <SelectContent>
                {staffMembers?.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={staff.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {staff.fullName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{staff.fullName}</span>
                      <Badge variant="outline" className="text-xs">
                        {staff.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Staff Info Banner - For non-admin viewing their own */}
        {!isAdmin && selectedStaff && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedStaff.avatarUrl || undefined} />
              <AvatarFallback>
                {selectedStaff.fullName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{selectedStaff.fullName}</p>
              <p className="text-sm text-muted-foreground">Your Pay Rates</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No Staff Selected */}
        {!isLoading && !selectedUserId && isAdmin && (
          <div className="text-center py-12 text-muted-foreground">
            Select a staff member to view and manage their pay rates.
          </div>
        )}

        {/* Pricing Items Table */}
        {!isLoading && selectedUserId && pricingItems && (
          <>
            {pricingItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pricing items configured. Add expense items in Invoice & Expense Items settings.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Default Rate</TableHead>
                      <TableHead className="text-right">
                        {isAdmin ? "Staff Rate" : "Your Rate"}
                      </TableHead>
                      <TableHead>Effective</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingItems.map((item) => (
                      <TableRow key={item.id}>
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
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatRate(item.defaultRate, item.rateType)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.customRate !== null ? (
                            <span className="font-mono font-medium text-primary">
                              {formatRate(item.customRate, item.rateType)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Default</span>
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
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditRate(item)}
                                title="Edit rate"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {item.overrideId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleResetRate(item)}
                                  title="Reset to default"
                                >
                                  <RotateCcw className="h-4 w-4" />
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

            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "These rates determine what staff members are paid for their time and expense entries. Custom rates override the default rates set in Invoice & Expense Items."
                : "These rates determine your pay for time and expense entries."}
            </p>
          </>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <StaffRateOverrideDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        staffName={selectedStaff?.fullName || "Staff Member"}
        onSave={handleSaveRate}
        isSaving={upsertRate.isPending}
      />

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default Rate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the custom rate for "{itemToReset?.name}" and use the default rate of{" "}
              {formatRate(itemToReset?.defaultRate ?? null, itemToReset?.rateType || "fixed")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetRate}
              disabled={deleteRate.isPending}
            >
              {deleteRate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset to Default"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
