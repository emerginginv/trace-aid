import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Upload,
  Clock,
  Receipt,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenseBillingItemCreation";

/**
 * INVARIANT 2: Pay rates come from User Profile (employee_price_list)
 *
 * Time/Expense entries track INTERNAL COSTS only:
 * - "Pay Rate" = rate paid to investigator (internal compensation)
 * - "Pay" = total internal cost (hours/qty × pay rate)
 *
 * Client billing happens separately in CaseBillingTab using
 * Account Client Pricing (client_price_list) - see INVARIANT 1.
 *
 * Investigators should NOT see billing rates in this interface.
 */

// Types
interface TimeEntry {
  id: string;
  itemId: string;
  itemName: string;
  financeItemId: string | null;
  notes: string;
  hours: number;
  rate: number;
}

interface ExpenseEntry {
  id: string;
  category: string;
  financeItemId: string | null;
  notes: string;
  quantity: number;
  rate: number;
  receiptFile?: File;
}

interface RateScheduleItem {
  id: string;
  name: string;
  rate: number;
  rateType: string;
  financeItemId: string;
}

interface CaseActivity {
  id: string;
  title: string;
  activity_type: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface CaseInfo {
  id: string;
  case_number: string;
  title: string;
  organization_id: string;
}

const NewExpenseEntry = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();

  // Form state
  const [createUpdateAfterSave, setCreateUpdateAfterSave] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedActivityId, setSelectedActivityId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Data state
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);
  const [activities, setActivities] = useState<CaseActivity[]>([]);
  const [rateScheduleItems, setRateScheduleItems] = useState<RateScheduleItem[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Sections state
  const [timeExpanded, setTimeExpanded] = useState(true);
  const [expenseExpanded, setExpenseExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [receiptExpanded, setReceiptExpanded] = useState(false);

  // Entry data
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useSetBreadcrumbs([
    { label: "Cases", href: "/cases" },
    { label: caseInfo?.case_number || "Case", href: `/cases/${caseId}` },
    { label: "New Expense Entry" },
  ]);

  // Fetch initial data
  useEffect(() => {
    if (caseId && organization?.id) {
      fetchInitialData();
    }
  }, [caseId, organization?.id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch current user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setCurrentUser(profileData);
        setSelectedStaffId(profileData.id);
      }

      // Fetch case info
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("id, case_number, title, organization_id")
        .eq("id", caseId)
        .single();

      if (caseError) throw caseError;
      setCaseInfo(caseData);

      // Fetch staff members in organization
      const { data: membersData } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization?.id);

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map((m) => m.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesData) {
          setStaffMembers(profilesData);
        }
      }

      // Fetch case activities (tasks and events)
      const { data: activitiesData } = await supabase
        .from("case_activities")
        .select("id, title, activity_type")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (activitiesData) {
        setActivities(activitiesData);
      }

      // Fetch rate schedule items
      await fetchRateSchedule();
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load page data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRateSchedule = async () => {
    try {
      // Fetch finance items that are expense items for this organization
      const { data: financeItems, error } = await supabase
        .from("finance_items")
        .select("*")
        .eq("organization_id", organization?.id)
        .eq("is_expense_item", true)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching finance items:", error);
        setRateScheduleItems([
          { id: "hourly_default", name: "Hourly Rate", rate: 75, rateType: "hourly", financeItemId: "" },
        ]);
        return;
      }

      if (financeItems && financeItems.length > 0) {
        const items: RateScheduleItem[] = financeItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          rate: item.default_expense_rate || 0,
          rateType: item.rate_type || "hourly",
          financeItemId: item.id,
        }));
        setRateScheduleItems(items);
      } else {
        // Fallback to default
        setRateScheduleItems([
          { id: "hourly_default", name: "Hourly Rate", rate: 75, rateType: "hourly", financeItemId: "" },
        ]);
      }
    } catch (error) {
      console.error("Error fetching rate schedule:", error);
      setRateScheduleItems([
        { id: "hourly_default", name: "Hourly Rate", rate: 75, rateType: "hourly", financeItemId: "" },
      ]);
    }
  };

  // Time entry handlers
  const addTimeEntry = () => {
    const defaultItem = rateScheduleItems[0];
    setTimeEntries([
      ...timeEntries,
      {
        id: crypto.randomUUID(),
        itemId: defaultItem?.id || "",
        itemName: defaultItem?.name || "",
        financeItemId: defaultItem?.financeItemId || null,
        notes: "",
        hours: 0,
        rate: defaultItem?.rate || 0,
      },
    ]);
  };

  const removeTimeEntry = (id: string) => {
    setTimeEntries(timeEntries.filter((e) => e.id !== id));
  };

  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
    setTimeEntries(
      timeEntries.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const handleTimeItemChange = (entryId: string, itemId: string) => {
    const item = rateScheduleItems.find((i) => i.id === itemId);
    if (item) {
      updateTimeEntry(entryId, {
        itemId: item.id,
        itemName: item.name,
        financeItemId: item.financeItemId,
        rate: item.rate,
      });
    }
  };

  // Expense entry handlers
  const addExpenseEntry = () => {
    const defaultCategory = EXPENSE_CATEGORIES[0];
    setExpenseEntries([
      ...expenseEntries,
      {
        id: crypto.randomUUID(),
        category: defaultCategory.value,
        financeItemId: null,
        notes: "",
        quantity: 1,
        rate: defaultCategory.defaultRate || 0,
      },
    ]);
  };

  const removeExpenseEntry = (id: string) => {
    setExpenseEntries(expenseEntries.filter((e) => e.id !== id));
  };

  const updateExpenseEntry = (id: string, updates: Partial<ExpenseEntry>) => {
    setExpenseEntries(
      expenseEntries.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const handleExpenseCategoryChange = (entryId: string, category: string) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.value === category);
    updateExpenseEntry(entryId, {
      category,
      rate: cat?.defaultRate || 0,
    });
  };

  // Calculate totals
  const timeSubtotal = timeEntries.reduce((sum, e) => sum + e.hours * e.rate, 0);
  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
  const expenseSubtotal = expenseEntries.reduce(
    (sum, e) => sum + e.quantity * e.rate,
    0
  );
  const grandTotal = timeSubtotal + expenseSubtotal;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  // Save handler
  const handleSave = async () => {
    if (!caseId || !organization?.id || !selectedStaffId) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }

    const hasTimeEntries = timeEntries.some((e) => e.hours > 0);
    const hasExpenseEntries = expenseEntries.some((e) => e.quantity > 0);

    if (!hasTimeEntries && !hasExpenseEntries) {
      toast({
        title: "No entries",
        description: "Please add at least one time or expense entry",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const errors: string[] = [];
      const savedTimeEntryIds: string[] = [];
      const savedExpenseEntryIds: string[] = [];

      const activityId = selectedActivityId !== "none" ? selectedActivityId : null;

      // Save time entries
      for (const entry of timeEntries.filter((e) => e.hours > 0)) {
        const { data, error } = await supabase
          .from("time_entries")
          .insert({
            case_id: caseId,
            organization_id: organization.id,
            user_id: selectedStaffId,
            event_id: activityId,
            finance_item_id: entry.financeItemId || null,
            item_type: entry.itemName,
            notes: entry.notes || null,
            hours: entry.hours,
            rate: entry.rate,
            status: "pending",
          })
          .select("id")
          .single();

        if (error) {
          console.error("Error saving time entry:", error);
          errors.push(`Time entry "${entry.itemName}": ${error.message}`);
        } else if (data) {
          savedTimeEntryIds.push(data.id);
        }
      }

      // Save expense entries
      for (const entry of expenseEntries.filter((e) => e.quantity > 0)) {
        const categoryLabel =
          EXPENSE_CATEGORIES.find((c) => c.value === entry.category)?.label ||
          entry.category;

        // Handle receipt upload if present
        let entryReceiptUrl: string | null = null;
        if (entry.receiptFile) {
          try {
            const fileExt = entry.receiptFile.name.split(".").pop();
            const filePath = `${selectedStaffId}/${caseId}/receipts/${crypto.randomUUID()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from("case-attachments")
              .upload(filePath, entry.receiptFile);

            if (!uploadError) {
              entryReceiptUrl = filePath;
            }
          } catch (uploadError) {
            console.error("Error uploading receipt:", uploadError);
          }
        }

        const { data, error } = await supabase
          .from("expense_entries")
          .insert({
            case_id: caseId,
            organization_id: organization.id,
            user_id: selectedStaffId,
            event_id: activityId,
            finance_item_id: entry.financeItemId || null,
            item_type: categoryLabel,
            notes: entry.notes || null,
            quantity: entry.quantity,
            rate: entry.rate,
            receipt_url: entryReceiptUrl,
            status: "pending",
          })
          .select("id")
          .single();

        if (error) {
          console.error("Error saving expense entry:", error);
          errors.push(`Expense "${categoryLabel}": ${error.message}`);
        } else if (data) {
          savedExpenseEntryIds.push(data.id);
        }
      }

      // Handle global receipt upload if provided
      if (receiptFile && savedExpenseEntryIds.length > 0) {
        // Attach to the first expense entry
        try {
          const fileExt = receiptFile.name.split(".").pop();
          const filePath = `${selectedStaffId}/${caseId}/receipts/${crypto.randomUUID()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("case-attachments")
            .upload(filePath, receiptFile);

          if (!uploadError) {
            // Update first expense entry with receipt
            await supabase
              .from("expense_entries")
              .update({ receipt_url: filePath })
              .eq("id", savedExpenseEntryIds[0]);
          }
        } catch (uploadError) {
          console.error("Error uploading global receipt:", uploadError);
        }
      }

      if (errors.length > 0) {
        toast({
          title: "Some entries failed to save",
          description: errors.join("; "),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Expense entry saved successfully",
        });

        // Post-save navigation
        if (createUpdateAfterSave) {
          // Collect all saved entry IDs
          const allEntryIds = [...savedTimeEntryIds, ...savedExpenseEntryIds];
          
          // Navigate to new update form with expense linking
          const params = new URLSearchParams();
          if (allEntryIds.length > 0) {
            params.set("linkExpense", allEntryIds.join(","));
          }
          if (activityId) {
            params.set("activityId", activityId);
          }
          navigate(`/cases/${caseId}/updates/new?${params.toString()}`);
        } else {
          // Navigate to expense entry detail page (using first saved ID)
          const primaryId = savedExpenseEntryIds[0] || savedTimeEntryIds[0];
          if (primaryId) {
            navigate(`/cases/${caseId}/expenses/${primaryId}`);
          } else {
            navigate(`/cases/${caseId}?tab=finances`);
          }
        }
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Failed to save expense entry",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Expense Entry</h1>
            <p className="text-sm text-muted-foreground">
              {caseInfo?.case_number} - {caseInfo?.title}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Expense Entry"}
        </Button>
      </div>

      {/* Create Update Checkbox */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="createUpdate"
              checked={createUpdateAfterSave}
              onCheckedChange={(checked) =>
                setCreateUpdateAfterSave(checked === true)
              }
            />
            <div className="space-y-1">
              <Label htmlFor="createUpdate" className="font-medium cursor-pointer">
                Create case update after save
              </Label>
              <p className="text-sm text-muted-foreground">
                Opens the update form after saving this expense entry
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Staff */}
            <div className="space-y-2">
              <Label htmlFor="staff">Staff *</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Note: Requires "Submit Expenses for Others" permission to change
              </p>
            </div>

            {/* Case */}
            <div className="space-y-2">
              <Label>Case *</Label>
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                <span className="text-sm">
                  {caseInfo?.case_number} - {caseInfo?.title}
                </span>
                <Link
                  to="/cases"
                  className="text-xs text-primary hover:underline ml-auto"
                >
                  (change)
                </Link>
              </div>
            </div>

            {/* Expense Date */}
            <div className="space-y-2">
              <Label htmlFor="expenseDate">Expense Date *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>

            {/* Activity */}
            <div className="space-y-2">
              <Label htmlFor="activity">Activity</Label>
              <Select
                value={selectedActivityId}
                onValueChange={setSelectedActivityId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      [{activity.activity_type}] {activity.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                {timeExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {timeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No time entries added
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Item</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[80px] text-right">Hrs</TableHead>
                      <TableHead className="w-[100px] text-right">Pay Rate</TableHead>
                      <TableHead className="w-[100px] text-right">Pay</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Select
                            value={entry.itemId}
                            onValueChange={(v) => handleTimeItemChange(entry.id, v)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {rateScheduleItems
                                .filter((i) => i.rateType === "hourly")
                                .map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            placeholder="Notes..."
                            value={entry.notes}
                            onChange={(e) =>
                              updateTimeEntry(entry.id, { notes: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-right"
                            type="number"
                            step="0.25"
                            min="0"
                            value={entry.hours || ""}
                            onChange={(e) =>
                              updateTimeEntry(entry.id, {
                                hours: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-right"
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.rate || ""}
                            onChange={(e) =>
                              updateTimeEntry(entry.id, {
                                rate: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(entry.hours * entry.rate)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeTimeEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={addTimeEntry}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add More Time
                </Button>
                <div className="text-sm font-medium">
                  Time Pay: {formatCurrency(timeSubtotal)}
                </div>
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
                {expenseExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {expenseEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No expense entries added
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Item</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[80px] text-right">Qty</TableHead>
                      <TableHead className="w-[100px] text-right">Pay Rate</TableHead>
                      <TableHead className="w-[100px] text-right">Pay</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Select
                            value={entry.category}
                            onValueChange={(v) =>
                              handleExpenseCategoryChange(entry.id, v)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EXPENSE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            placeholder="Notes..."
                            value={entry.notes}
                            onChange={(e) =>
                              updateExpenseEntry(entry.id, { notes: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-right"
                            type="number"
                            step="1"
                            min="0"
                            value={entry.quantity || ""}
                            onChange={(e) =>
                              updateExpenseEntry(entry.id, {
                                quantity: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-right"
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.rate || ""}
                            onChange={(e) =>
                              updateExpenseEntry(entry.id, {
                                rate: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(entry.quantity * entry.rate)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeExpenseEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={addExpenseEntry}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add More Expenses
                </Button>
                <div className="text-sm font-medium">
                  Expense Pay: {formatCurrency(expenseSubtotal)}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Entry Totals Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Hours</p>
              <p className="text-lg font-semibold">{totalHours.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Time Cost</p>
              <p className="text-lg font-semibold">{formatCurrency(timeSubtotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Expense Cost</p>
              <p className="text-lg font-semibold">
                {formatCurrency(expenseSubtotal)}
              </p>
            </div>
            <div className="border-l">
              <p className="text-xs text-muted-foreground mb-1">Total Internal Cost</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(grandTotal)}
              </p>
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
                {notesExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Textarea
                placeholder="Add notes about this expense entry..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
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
                  <Upload className="h-5 w-5" />
                  Receipt
                </CardTitle>
                {receiptExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {receiptFile ? (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                  <span className="text-sm">{receiptFile.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setReceiptFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    No receipt attached.
                  </p>
                  <Label
                    htmlFor="receiptUpload"
                    className="cursor-pointer text-primary hover:underline"
                  >
                    Upload receipt image or PDF
                  </Label>
                  <Input
                    id="receiptUpload"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setReceiptFile(file);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Expense Entry"}
        </Button>
      </div>
    </div>
  );
};

export default NewExpenseEntry;
