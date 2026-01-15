import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Clock, 
  Receipt, 
  Search, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  FileImage,
  Info
} from "lucide-react";
import { format, parseISO, startOfDay, isWithinInterval } from "date-fns";
import { toast } from "@/hooks/use-toast";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TimeEntry {
  id: string;
  case_id: string;
  event_id: string | null;
  update_id: string | null;
  user_id: string;
  item_type: string;
  notes: string | null;
  hours: number;
  rate: number;
  total: number;
  status: string;
  created_at: string;
}

interface ExpenseEntry {
  id: string;
  case_id: string;
  event_id: string | null;
  update_id: string | null;
  user_id: string;
  item_type: string;
  notes: string | null;
  quantity: number;
  rate: number;
  total: number;
  receipt_url: string | null;
  status: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

interface UpdateInfo {
  id: string;
  title: string;
}

interface CaseTimeExpensesReviewProps {
  caseId: string;
  organizationId: string;
  canApprove: boolean;
}

import { 
  EntryStatusFilter,
  getStatusColor,
  getStatusLabel,
  ENTRY_STATUS_OPTIONS
} from "@/utils/entryStatusConfig";

const formatStatusLabel = (status: string) => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const CaseTimeExpensesReview = ({
  caseId,
  organizationId,
  canApprove,
}: CaseTimeExpensesReviewProps) => {
  const navigate = useNavigate();
  
  // Data state
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [updates, setUpdates] = useState<Record<string, UpdateInfo>>({});
  const [loading, setLoading] = useState(true);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<EntryStatusFilter>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Action dialogs
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineEntryId, setDeclineEntryId] = useState<string | null>(null);
  const [declineEntryType, setDeclineEntryType] = useState<"time" | "expense">("time");
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    fetchEntries();
  }, [caseId]);

  const fetchEntries = async () => {
    try {
      setLoading(true);

      // Fetch time entries
      const { data: timeData } = await supabase
        .from("time_entries")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      // Fetch expense entries
      const { data: expenseData } = await supabase
        .from("expense_entries")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      setTimeEntries(timeData || []);
      setExpenseEntries(expenseData || []);

      // Get unique user IDs
      const userIds = new Set<string>();
      (timeData || []).forEach((e) => userIds.add(e.user_id));
      (expenseData || []).forEach((e) => userIds.add(e.user_id));

      // Fetch user profiles
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(userIds));

        const usersMap: Record<string, UserProfile> = {};
        (profilesData || []).forEach((p) => {
          usersMap[p.id] = p;
        });
        setUsers(usersMap);
      }

      // Get unique update IDs
      const updateIds = new Set<string>();
      (timeData || []).forEach((e) => e.update_id && updateIds.add(e.update_id));
      (expenseData || []).forEach((e) => e.update_id && updateIds.add(e.update_id));

      // Fetch updates
      if (updateIds.size > 0) {
        const { data: updatesData } = await supabase
          .from("case_updates")
          .select("id, title")
          .in("id", Array.from(updateIds));

        const updatesMap: Record<string, UpdateInfo> = {};
        (updatesData || []).forEach((u) => {
          updatesMap[u.id] = u;
        });
        setUpdates(updatesMap);
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique employees for filter dropdown
  const uniqueEmployees = useMemo(() => {
    const employeeIds = new Set<string>();
    timeEntries.forEach((e) => employeeIds.add(e.user_id));
    expenseEntries.forEach((e) => employeeIds.add(e.user_id));
    return Array.from(employeeIds).map((id) => ({
      id,
      name: users[id]?.full_name || users[id]?.email || id,
    }));
  }, [timeEntries, expenseEntries, users]);

  // Filter entries
  const filterEntries = <T extends TimeEntry | ExpenseEntry>(entries: T[]): T[] => {
    return entries.filter((entry) => {
      // Status filter
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;

      // Employee filter
      if (employeeFilter !== "all" && entry.user_id !== employeeFilter) return false;

      // Date range filter
      if (dateFrom || dateTo) {
        const entryDate = startOfDay(parseISO(entry.created_at));
        if (dateFrom && entryDate < startOfDay(parseISO(dateFrom))) return false;
        if (dateTo && entryDate > startOfDay(parseISO(dateTo))) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const userName = users[entry.user_id]?.full_name?.toLowerCase() || "";
        const updateTitle = entry.update_id ? updates[entry.update_id]?.title?.toLowerCase() || "" : "";
        const itemType = entry.item_type?.toLowerCase() || "";
        const notes = entry.notes?.toLowerCase() || "";
        
        if (!userName.includes(query) && !updateTitle.includes(query) && 
            !itemType.includes(query) && !notes.includes(query)) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredTimeEntries = filterEntries(timeEntries);
  const filteredExpenseEntries = filterEntries(expenseEntries);

  // Group entries by date
  const groupByDate = <T extends { created_at: string }>(entries: T[]): Map<string, T[]> => {
    const groups = new Map<string, T[]>();
    entries.forEach((entry) => {
      const dateKey = format(parseISO(entry.created_at), "yyyy-MM-dd");
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(entry);
    });
    return groups;
  };

  // Combine and group all entries
  type CombinedEntry = (TimeEntry | ExpenseEntry) & { entryType: "time" | "expense" };
  
  const allEntries: CombinedEntry[] = [
    ...filteredTimeEntries.map((e) => ({ ...e, entryType: "time" as const })),
    ...filteredExpenseEntries.map((e) => ({ ...e, entryType: "expense" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const groupedEntries = groupByDate(allEntries);

  // Calculate totals (approved only)
  const approvedTimeEntries = timeEntries.filter((e) => e.status === "approved");
  const approvedExpenseEntries = expenseEntries.filter((e) => e.status === "approved");
  
  const totalApprovedHours = approvedTimeEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalApprovedTimeAmount = approvedTimeEntries.reduce((sum, e) => sum + e.total, 0);
  const totalApprovedExpenseAmount = approvedExpenseEntries.reduce((sum, e) => sum + e.total, 0);
  const grandTotal = totalApprovedTimeAmount + totalApprovedExpenseAmount;

  // Handle approve
  const handleApprove = async (entryId: string, entryType: "time" | "expense") => {
    try {
      const table = entryType === "time" ? "time_entries" : "expense_entries";
      const { error } = await supabase
        .from(table)
        .update({ status: "approved" })
        .eq("id", entryId);

      if (error) throw error;

      toast({ title: "Entry approved" });
      fetchEntries();
    } catch (error) {
      console.error("Error approving entry:", error);
      toast({ title: "Error", description: "Failed to approve entry", variant: "destructive" });
    }
  };

  // Handle decline
  const openDeclineDialog = (entryId: string, entryType: "time" | "expense") => {
    setDeclineEntryId(entryId);
    setDeclineEntryType(entryType);
    setDeclineReason("");
    setDeclineDialogOpen(true);
  };

  const confirmDecline = async () => {
    if (!declineEntryId) return;

    try {
      const table = declineEntryType === "time" ? "time_entries" : "expense_entries";
      const { error } = await supabase
        .from(table)
        .update({ 
          status: "declined",
          notes: declineReason ? `DECLINED: ${declineReason}` : undefined
        })
        .eq("id", declineEntryId);

      if (error) throw error;

      toast({ title: "Entry declined" });
      setDeclineDialogOpen(false);
      fetchEntries();
    } catch (error) {
      console.error("Error declining entry:", error);
      toast({ title: "Error", description: "Failed to decline entry", variant: "destructive" });
    }
  };

  // View receipt
  const handleViewReceipt = async (receiptUrl: string) => {
    try {
      const { data } = await supabase.storage
        .from("case-attachments")
        .createSignedUrl(receiptUrl, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      console.error("Error getting receipt URL:", error);
    }
  };

  // Navigate to update
  const navigateToUpdate = (updateId: string) => {
    navigate(`/cases/${caseId}/updates/${updateId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-muted-foreground">Loading entries...</div>
      </div>
    );
  }

  const hasEntries = timeEntries.length > 0 || expenseEntries.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with New Expense Entry Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Time & Expense Entries</h3>
        <Button onClick={() => navigate(`/cases/${caseId}/expenses/new`)}>
          New Expense Entry
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Tip: You can create entries directly from a Case Update by checking "Add time & expenses after saving" — or use the New Expense Entry button above.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EntryStatusFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {ENTRY_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Employee</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {uniqueEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[140px]"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[140px]"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Entries List */}
      {!hasEntries ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No time or expense entries for this case</p>
          </CardContent>
        </Card>
      ) : allEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No entries match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedEntries.entries()).map(([dateKey, entries]) => {
            const dayTotal = entries.reduce((sum, e) => sum + (e as any).total, 0);
            const dayHours = entries
              .filter((e) => e.entryType === "time")
              .reduce((sum, e) => sum + ((e as TimeEntry).hours || 0), 0);

            return (
              <div key={dateKey} className="space-y-2">
                {/* Date Header */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
                  <span className="font-medium">
                    {format(parseISO(dateKey), "EEEE, MMMM d, yyyy")}
                  </span>
                  <div className="flex items-center gap-4 text-sm">
                    {dayHours > 0 && (
                      <span className="text-muted-foreground">
                        {dayHours.toFixed(2)} hrs
                      </span>
                    )}
                    <span className="font-medium">{formatCurrency(dayTotal)}</span>
                  </div>
                </div>

                {/* Entries Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[80px]">Type</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Update</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right w-[80px]">Hrs/Qty</TableHead>
                        <TableHead className="text-right w-[90px]">Rate</TableHead>
                        <TableHead className="text-right w-[90px]">Total</TableHead>
                        <TableHead className="w-[50px]">Rcpt</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => {
                        const isTime = entry.entryType === "time";
                        const timeEntry = entry as TimeEntry;
                        const expenseEntry = entry as ExpenseEntry;
                        const user = users[entry.user_id];
                        const update = entry.update_id ? updates[entry.update_id] : null;
                        const isPending = entry.status === "draft" || entry.status === "pending_review";

                        return (
                          <TableRow key={`${entry.entryType}-${entry.id}`}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {isTime ? (
                                  <><Clock className="h-3 w-3 mr-1" />Time</>
                                ) : (
                                  <><Receipt className="h-3 w-3 mr-1" />Exp</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {user?.full_name || user?.email || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {update ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-left"
                                  onClick={() => navigateToUpdate(entry.update_id!)}
                                >
                                  {update.title}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <span>{entry.item_type}</span>
                                {entry.notes && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {isTime ? timeEntry.hours.toFixed(2) : expenseEntry.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(isTime ? timeEntry.rate : expenseEntry.rate)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatCurrency((entry as any).total)}
                            </TableCell>
                            <TableCell>
                              {!isTime && expenseEntry.receipt_url ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleViewReceipt(expenseEntry.receipt_url!)}
                                >
                                  <FileImage className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getStatusColor(entry.status)} ${entry.status === 'voided' ? 'line-through' : ''}`}
                              >
                                {entry.status === 'paid' ? '✓ ' : ''}{getStatusLabel(entry.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {isPending && canApprove && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => handleApprove(entry.id, entry.entryType)}
                                      title="Approve"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => openDeclineDialog(entry.id, entry.entryType)}
                                      title="Decline"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {entry.update_id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => navigateToUpdate(entry.update_id!)}
                                    title="View Update"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Summary Footer */}
      {hasEntries && (
        <div className="sticky bottom-0 bg-background border-t pt-4 -mx-6 px-6 pb-2">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Hours (Approved)</div>
              <div className="text-xl font-bold">{totalApprovedHours.toFixed(2)}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Time (Wages)</div>
              <div className="text-xl font-bold">{formatCurrency(totalApprovedTimeAmount)}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Expenses</div>
              <div className="text-xl font-bold">{formatCurrency(totalApprovedExpenseAmount)}</div>
            </div>
            <div className="bg-primary/10 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Total (Approved)</div>
              <div className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Dialog */}
      <AlertDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for declining this entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for declining..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDecline}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Decline Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
