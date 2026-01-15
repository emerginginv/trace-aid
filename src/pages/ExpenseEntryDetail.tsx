import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
  Plus,
  Copy,
  Pencil,
  Trash2,
  FileText,
  User,
  Briefcase,
  ExternalLink,
  FileImage,
  Ban,
} from "lucide-react";
import { format } from "date-fns";
import {
  getStatusColor,
  getStatusLabel,
  getStatusConfig,
} from "@/utils/entryStatusConfig";

interface TimeEntry {
  id: string;
  item_type: string;
  notes: string | null;
  hours: number;
  rate: number;
  total: number;
  status: string;
  created_at: string;
  user_id: string;
}

interface ExpenseEntry {
  id: string;
  item_type: string;
  notes: string | null;
  quantity: number;
  rate: number;
  total: number;
  receipt_url: string | null;
  status: string;
  created_at: string;
  user_id: string;
}

interface CaseInfo {
  id: string;
  case_number: string;
  title: string;
}

interface Activity {
  id: string;
  title: string;
  activity_type: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface CaseUpdate {
  id: string;
  title: string;
  description: string | null;
  update_type: string;
  created_at: string;
  user_id: string;
}

interface AuditEvent {
  id: string;
  action: string;
  created_at: string;
  actor_user_id: string | null;
  metadata: any;
}

const ExpenseEntryDetail = () => {
  const { caseId, expenseId } = useParams<{ caseId: string; expenseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { isAdmin, isManager } = useUserRole();

  // Data state
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [staffProfile, setStaffProfile] = useState<UserProfile | null>(null);
  const [linkedUpdates, setLinkedUpdates] = useState<CaseUpdate[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [timeExpanded, setTimeExpanded] = useState(true);
  const [expenseExpanded, setExpenseExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [receiptExpanded, setReceiptExpanded] = useState(true);
  const [showEdits, setShowEdits] = useState(false);

  // Dialog state
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Determine entry type and data
  const [entryType, setEntryType] = useState<"time" | "expense" | "combined">("combined");
  const [primaryEntry, setPrimaryEntry] = useState<TimeEntry | ExpenseEntry | null>(null);
  const [entryDate, setEntryDate] = useState<string>("");
  const [overallStatus, setOverallStatus] = useState<string>("pending");

  // Generate expense number from ID
  const expenseNumber = `EXP-${expenseId?.slice(0, 5).toUpperCase()}`;

  useSetBreadcrumbs([
    { label: "Cases", href: "/cases" },
    { label: caseInfo?.case_number || "Case", href: `/cases/${caseId}` },
    { label: "Expenses", href: `/cases/${caseId}?tab=finances` },
    { label: expenseNumber },
  ]);

  useEffect(() => {
    if (expenseId && caseId && organization?.id) {
      fetchExpenseData();
    }
  }, [expenseId, caseId, organization?.id]);

  const fetchExpenseData = async () => {
    try {
      setLoading(true);

      // Try to fetch as time entry first
      const { data: timeData, error: timeError } = await supabase
        .from("time_entries")
        .select("*")
        .eq("id", expenseId)
        .maybeSingle();

      // Try to fetch as expense entry
      const { data: expenseData, error: expenseError } = await supabase
        .from("expense_entries")
        .select("*")
        .eq("id", expenseId)
        .maybeSingle();

      let foundEntry: TimeEntry | ExpenseEntry | null = null;
      let type: "time" | "expense" = "expense";

      if (timeData) {
        foundEntry = timeData;
        type = "time";
        setTimeEntries([timeData]);
        setOverallStatus(timeData.status);
        setEntryDate(timeData.created_at);
        
        // Also fetch related expense entries with same update_id or event_id
        if (timeData.update_id) {
          const { data: relatedExpenses } = await supabase
            .from("expense_entries")
            .select("*")
            .eq("update_id", timeData.update_id);
          if (relatedExpenses) setExpenseEntries(relatedExpenses);
        }
      } else if (expenseData) {
        foundEntry = expenseData;
        type = "expense";
        setExpenseEntries([expenseData]);
        setOverallStatus(expenseData.status);
        setEntryDate(expenseData.created_at);
        
        // Also fetch related time entries with same update_id or event_id
        if (expenseData.update_id) {
          const { data: relatedTime } = await supabase
            .from("time_entries")
            .select("*")
            .eq("update_id", expenseData.update_id);
          if (relatedTime) setTimeEntries(relatedTime);
        }
      }

      if (!foundEntry) {
        toast({
          title: "Entry not found",
          description: "The requested expense entry could not be found.",
          variant: "destructive",
        });
        navigate(`/cases/${caseId}?tab=finances`);
        return;
      }

      setPrimaryEntry(foundEntry);
      setEntryType(type);

      // Fetch case info
      const { data: caseData } = await supabase
        .from("cases")
        .select("id, case_number, title")
        .eq("id", caseId)
        .single();
      if (caseData) setCaseInfo(caseData);

      // Fetch staff profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", foundEntry.user_id)
        .single();
      if (profileData) setStaffProfile(profileData);

      // Fetch linked activity if exists
      const eventId = (foundEntry as any).event_id;
      if (eventId) {
        const { data: activityData } = await supabase
          .from("case_activities")
          .select("id, title, activity_type")
          .eq("id", eventId)
          .single();
        if (activityData) setActivity(activityData);
      }

      // Fetch linked updates
      const updateId = (foundEntry as any).update_id;
      if (updateId) {
        const { data: updatesData } = await supabase
          .from("case_updates")
          .select("*")
          .eq("id", updateId);
        if (updatesData) setLinkedUpdates(updatesData);
      }

      // Fetch audit events (simplified - using created_at as proxy)
      // In a real implementation, you'd have a dedicated audit_events table
      const mockAuditEvents: AuditEvent[] = [
        {
          id: "1",
          action: "Created",
          created_at: foundEntry.created_at,
          actor_user_id: foundEntry.user_id,
          metadata: { category: "Entry" },
        },
      ];
      setAuditEvents(mockAuditEvents);

      // Fetch all user profiles for display
      const userIds = new Set([foundEntry.user_id]);
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(userIds));
        if (profilesData) {
          const usersMap: Record<string, UserProfile> = {};
          profilesData.forEach((p) => {
            usersMap[p.id] = p;
          });
          setUsers(usersMap);
        }
      }
    } catch (error) {
      console.error("Error fetching expense data:", error);
      toast({
        title: "Error",
        description: "Failed to load expense entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
  const timeTotal = timeEntries.reduce((sum, e) => sum + e.total, 0);
  const expenseTotal = expenseEntries.reduce((sum, e) => sum + e.total, 0);
  const grandTotal = timeTotal + expenseTotal;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const config = getStatusConfig(status);
    const isVoided = status === "voided";
    const isPaid = status === "paid";

    return (
      <Badge
        variant="outline"
        className={`${getStatusColor(status)} ${isVoided ? "line-through" : ""}`}
      >
        {isPaid && <CheckCircle className="h-3 w-3 mr-1" />}
        {getStatusLabel(status)}
      </Badge>
    );
  };

  // Action handlers
  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const table = entryType === "time" ? "time_entries" : "expense_entries";
      
      // Update all related entries
      for (const entry of timeEntries) {
        await supabase.from("time_entries").update({ status: "approved" }).eq("id", entry.id);
      }
      for (const entry of expenseEntries) {
        await supabase.from("expense_entries").update({ status: "approved" }).eq("id", entry.id);
      }

      toast({ title: "Entry approved successfully" });
      fetchExpenseData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve entry", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      setActionLoading(true);
      
      for (const entry of timeEntries) {
        await supabase
          .from("time_entries")
          .update({ status: "declined", notes: declineReason ? `DECLINED: ${declineReason}` : entry.notes })
          .eq("id", entry.id);
      }
      for (const entry of expenseEntries) {
        await supabase
          .from("expense_entries")
          .update({ status: "declined", notes: declineReason ? `DECLINED: ${declineReason}` : entry.notes })
          .eq("id", entry.id);
      }

      toast({ title: "Entry declined" });
      setDeclineDialogOpen(false);
      fetchExpenseData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to decline entry", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      
      for (const entry of timeEntries) {
        await supabase.from("time_entries").delete().eq("id", entry.id);
      }
      for (const entry of expenseEntries) {
        await supabase.from("expense_entries").delete().eq("id", entry.id);
      }

      toast({ title: "Entry deleted" });
      navigate(`/cases/${caseId}?tab=finances`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete entry", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleViewReceipt = async (receiptUrl: string) => {
    try {
      const { data } = await supabase.storage
        .from("case-attachments")
        .createSignedUrl(receiptUrl, 3600);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load receipt", variant: "destructive" });
    }
  };

  const canEdit = overallStatus === "pending" || overallStatus === "declined" || isAdmin;
  const canApprove = (isAdmin || isManager) && overallStatus === "pending";

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{expenseNumber}</h1>
              <StatusBadge status={overallStatus} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {caseInfo?.case_number} - {caseInfo?.title}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canApprove && (
            <>
              <Button
                variant="outline"
                className="text-green-600 hover:bg-green-50 hover:text-green-700"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setDeclineDialogOpen(true)}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(`/cases/${caseId}/updates/new?expenseId=${expenseId}`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Case Update
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => navigate(`/cases/${caseId}/expenses/${expenseId}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="updates">Case Updates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Date and Quick Links */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg font-semibold">
                    {entryDate && format(new Date(entryDate), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    to={`/cases/${caseId}/expenses/new`}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add another entry for this case
                  </Link>
                  <button className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Copy className="h-4 w-4" />
                    Duplicate this entry
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Context Row */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Staff:</span>
                  <span className="font-medium">{staffProfile?.full_name || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Case:</span>
                  <Link to={`/cases/${caseId}`} className="font-medium text-primary hover:underline">
                    {caseInfo?.case_number}
                  </Link>
                  <span className="text-muted-foreground">({caseInfo?.title})</span>
                </div>
                {activity && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Activity:</span>
                    <span className="font-medium">{activity.title}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Time Items Section */}
          <Collapsible open={timeExpanded} onOpenChange={setTimeExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Time Items
                    </CardTitle>
                    {timeExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {timeEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      There were no results found.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Hrs</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.item_type}</TableCell>
                            <TableCell className="text-muted-foreground">{entry.notes || "—"}</TableCell>
                            <TableCell className="text-right font-mono">{entry.hours.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(entry.rate)}</TableCell>
                            <TableCell className="text-right font-mono font-medium">{formatCurrency(entry.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="flex justify-end pt-4 border-t mt-4">
                    <span className="text-sm font-medium">Time Total: {formatCurrency(timeTotal)}</span>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Expense Items Section */}
          <Collapsible open={expenseExpanded} onOpenChange={setExpenseExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Expense Items
                    </CardTitle>
                    {expenseExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {expenseEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      There were no results found.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[60px]">Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.item_type}</TableCell>
                            <TableCell className="text-muted-foreground">{entry.notes || "—"}</TableCell>
                            <TableCell className="text-right font-mono">{entry.quantity}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(entry.rate)}</TableCell>
                            <TableCell className="text-right font-mono font-medium">{formatCurrency(entry.total)}</TableCell>
                            <TableCell>
                              {entry.receipt_url ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewReceipt(entry.receipt_url!)}
                                >
                                  <FileImage className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="flex justify-end pt-4 border-t mt-4">
                    <span className="text-sm font-medium">Expense Total: {formatCurrency(expenseTotal)}</span>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Entry Totals */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Hours</p>
                  <p className="text-lg font-semibold">{totalHours.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Time</p>
                  <p className="text-lg font-semibold">{formatCurrency(timeTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                  <p className="text-lg font-semibold">{formatCurrency(expenseTotal)}</p>
                </div>
                <div className="border-l">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(grandTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle>Notes</CardTitle>
                    {notesExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {primaryEntry?.notes ? (
                    <p className="text-sm">{primaryEntry.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No notes added.</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Receipt Section */}
          <Collapsible open={receiptExpanded} onOpenChange={setReceiptExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileImage className="h-5 w-5" />
                      Receipt
                    </CardTitle>
                    {receiptExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {expenseEntries.some((e) => e.receipt_url) ? (
                    <div className="space-y-2">
                      {expenseEntries
                        .filter((e) => e.receipt_url)
                        .map((entry) => (
                          <Button
                            key={entry.id}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleViewReceipt(entry.receipt_url!)}
                          >
                            <FileImage className="h-4 w-4 mr-2" />
                            View Receipt for {entry.item_type}
                            <ExternalLink className="h-4 w-4 ml-auto" />
                          </Button>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No receipt attached.
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        {/* Case Updates Tab */}
        <TabsContent value="updates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Linked Case Updates</CardTitle>
            </CardHeader>
            <CardContent>
              {linkedUpdates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No case updates found.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate(`/cases/${caseId}/updates/new?expenseId=${expenseId}`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Case Update
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {linkedUpdates.map((update) => (
                    <Card key={update.id} className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{update.update_type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(update.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                            <h4 className="font-medium">{update.title}</h4>
                            {update.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {update.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/cases/${caseId}/updates/${update.id}`)}
                          >
                            View
                            <ExternalLink className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Audit History</CardTitle>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showEdits"
                    checked={showEdits}
                    onCheckedChange={(checked) => setShowEdits(checked === true)}
                  />
                  <Label htmlFor="showEdits" className="text-sm cursor-pointer">
                    Show Edits
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Action By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm">
                        {format(new Date(event.created_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.metadata?.category || "Entry"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.metadata?.details || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {event.actor_user_id && users[event.actor_user_id]
                          ? users[event.actor_user_id].full_name
                          : "System"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {auditEvents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No history available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Decline Dialog */}
      <AlertDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Expense Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for declining this expense entry. The submitter will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for declining..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Decline Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpenseEntryDetail;
