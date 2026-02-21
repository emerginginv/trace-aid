import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { NotificationHelpers } from "@/lib/notificationHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AttachmentPicker } from "@/components/case-detail/AttachmentPicker";
import { ActivityTimelineEditor, TimelineEntry } from "@/components/case-detail/ActivityTimelineEditor";
import { TimeExpensesPanel } from "@/components/case-detail/TimeExpensesPanel";
import {
  ArrowLeft,
  Link2,
  Paperclip,
  Receipt,
  Save,
  Info,
} from "lucide-react";
import { format } from "date-fns";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  update_type: z.string().min(1, "Update type is required"),
  linked_activity_id: z.string().optional(),
});

interface CaseActivity {
  id: string;
  title: string;
  activity_type: string;
  due_date: string | null;
  status: string;
}

interface CaseInfo {
  id: string;
  case_number: string;
  title: string;
  organization_id: string;
}

const NewCaseUpdate = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();

  // URL params
  const linkExpenseParam = searchParams.get("linkExpense");
  const activityIdParam = searchParams.get("activityId");
  const expenseEntryIds = linkExpenseParam ? linkExpenseParam.split(",") : [];
  const isLinkingExpense = expenseEntryIds.length > 0;

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateTypes, setUpdateTypes] = useState<string[]>([]);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [caseActivities, setCaseActivities] = useState<CaseActivity[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [includeTimeline, setIncludeTimeline] = useState(false);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [addTimeExpensesAfterSave, setAddTimeExpensesAfterSave] = useState(true);
  const [loading, setLoading] = useState(true);

  // Cancel confirmation dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Time & Expenses Panel state
  const [showTimeExpensesPanel, setShowTimeExpensesPanel] = useState(false);
  const [savedUpdateId, setSavedUpdateId] = useState<string | null>(null);

  // Expense linking info
  const [expenseNumber, setExpenseNumber] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      update_type: "Other",
      linked_activity_id: activityIdParam || "",
    },
  });

  useSetBreadcrumbs([
    { label: "Cases", href: "/cases" },
    { label: caseInfo?.case_number || "Case", href: `/cases/${caseId}` },
    { label: "New Update" },
  ]);

  useEffect(() => {
    if (caseId && organization?.id) {
      fetchInitialData();
    }
  }, [caseId, organization?.id]);

  // Generate expense number from first entry ID
  useEffect(() => {
    if (expenseEntryIds.length > 0) {
      setExpenseNumber(`EXP-${expenseEntryIds[0].slice(0, 5).toUpperCase()}`);
    }
  }, [expenseEntryIds]);

  // Pre-fill activity from URL param
  useEffect(() => {
    if (activityIdParam) {
      form.setValue("linked_activity_id", activityIdParam);
    }
  }, [activityIdParam, form]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch case info
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("id, case_number, title, organization_id")
        .eq("id", caseId)
        .single();

      if (caseError) throw caseError;
      setCaseInfo(caseData);

      // Fetch update types
      const { data: picklistData } = await supabase
        .from("picklists")
        .select("value")
        .eq("organization_id", organization?.id)
        .eq("type", "update_type")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (picklistData && picklistData.length > 0) {
        setUpdateTypes(picklistData.map((item) => item.value));
      } else {
        setUpdateTypes([
          "Surveillance",
          "Case Update",
          "Accounting",
          "Client Contact",
          "3rd Party Contact",
          "Review",
          "Other",
        ]);
      }

      // Fetch case activities
      const { data: activitiesData } = await supabase
        .from("case_activities")
        .select("id, title, activity_type, due_date, status")
        .eq("case_id", caseId)
        .order("due_date", { ascending: false, nullsFirst: false });

      if (activitiesData) {
        setCaseActivities(activitiesData);
      }

      // If linking expense, fetch activity from expense entry
      if (expenseEntryIds.length > 0 && !activityIdParam) {
        const { data: entryData } = await supabase
          .from("expense_entries")
          .select("event_id")
          .eq("id", expenseEntryIds[0])
          .single();

        if (entryData?.event_id) {
          form.setValue("linked_activity_id", entryData.event_id);
        }
      }
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!organization?.id) throw new Error("Organization not found");

      // Prepare timeline data
      const timelineData: { time: string; description: string }[] | null =
        includeTimeline && timelineEntries.length > 0
          ? timelineEntries.filter((e) => e.time && e.description)
          : null;

      const updateData = {
        case_id: caseId,
        user_id: user.id,
        organization_id: organization.id,
        title: values.title,
        description: values.description || null,
        update_type: values.update_type,
        activity_timeline: timelineData,
        linked_activity_id: values.linked_activity_id || null,
      };

      // Insert the update
      const { data: newUpdate, error } = await supabase
        .from("case_updates")
        .insert(updateData)
        .select()
        .single();

      if (error) throw error;

      // Link attachments if selected
      if (newUpdate && selectedAttachmentIds.length > 0) {
        const links = selectedAttachmentIds.map((attachmentId) => ({
          update_id: newUpdate.id,
          attachment_id: attachmentId,
          organization_id: organization.id,
          linked_by_user_id: user.id,
        }));

        await supabase.from("update_attachment_links").insert(links);
      }

      // If linking expense entries, update them with the new update_id
      if (isLinkingExpense && newUpdate) {
        // Update expense_entries
        const { error: expenseError } = await supabase
          .from("expense_entries")
          .update({ update_id: newUpdate.id })
          .in("id", expenseEntryIds);

        if (expenseError) {
          console.error("Error linking expense entries:", expenseError);
        }

        // Also check for time_entries with same IDs (in case they were saved together)
        const { error: timeError } = await supabase
          .from("time_entries")
          .update({ update_id: newUpdate.id })
          .in("id", expenseEntryIds);

        // This might fail if IDs don't exist in time_entries, which is fine
        if (timeError && !timeError.message.includes("0 rows")) {
          console.error("Error linking time entries:", timeError);
        }
      }

      // Send notification
      if (newUpdate) {
        await NotificationHelpers.caseUpdateAdded(
          {
            id: newUpdate.id,
            title: values.title,
            case_id: caseId!,
          },
          user.id,
          organization.id
        );
      }

      toast({
        title: "Success",
        description: "Update created successfully",
      });

      // Handle post-save navigation
      if (addTimeExpensesAfterSave && newUpdate) {
        setSavedUpdateId(newUpdate.id);
        setShowTimeExpensesPanel(true);
      } else {
        // Navigate to update detail page
        navigate(`/cases/${caseId}/updates/${newUpdate?.id}`);
      }
    } catch (error) {
      console.error("Error saving update:", error);
      toast({
        title: "Error",
        description: "Failed to create update",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isLinkingExpense) {
      setShowCancelDialog(true);
    } else {
      navigate(`/cases/${caseId}`);
    }
  };

  const handleConfirmCancel = () => {
    // Navigate to expense entry detail
    navigate(`/cases/${caseId}/expenses/${expenseEntryIds[0]}`);
  };

  const handleTimeExpensesPanelClose = () => {
    setShowTimeExpensesPanel(false);
    if (savedUpdateId) {
      navigate(`/cases/${caseId}/updates/${savedUpdateId}`);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Case Update</h1>
            <p className="text-sm text-muted-foreground">
              Case: {caseInfo?.case_number} - {caseInfo?.title}
            </p>
          </div>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? "Saving..." : "Save Update"}
        </Button>
      </div>

      {/* Expense Linking Banner */}
      {isLinkingExpense && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <Receipt className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            This update will be linked to expense entry{" "}
            <strong>{expenseNumber}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Update title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="update_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Update Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select update type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {updateTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linked_activity_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Related Task/Event
                      </FormLabel>
                      <Select
                        onValueChange={(val) =>
                          field.onChange(val === "none" ? "" : val)
                        }
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a related task or event" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {caseActivities.map((activity) => (
                            <SelectItem key={activity.id} value={activity.id}>
                              <span className="flex items-center gap-2">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {activity.activity_type}
                                </span>
                                <span>{activity.title}</span>
                                {activity.due_date && (
                                  <span className="text-xs text-muted-foreground">
                                    ({format(new Date(activity.due_date), "MMM d")})
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Update details"
                        className="min-h-[150px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Include Activity Timeline Toggle */}
              <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-muted/30">
                <Checkbox
                  id="include-timeline"
                  checked={includeTimeline}
                  onCheckedChange={(checked) => {
                    setIncludeTimeline(!!checked);
                    if (!checked) setTimelineEntries([]);
                  }}
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="include-timeline"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Include activity timeline
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add chronological activity entries to this update (e.g.,
                    surveillance log)
                  </p>
                </div>
              </div>

              {includeTimeline && (
                <ActivityTimelineEditor
                  value={timelineEntries}
                  onChange={setTimelineEntries}
                  disabled={isSubmitting}
                />
              )}

              {/* Attachment linking section */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Link Case Attachments
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Link existing case attachments or upload new files
                </p>
                <AttachmentPicker
                  caseId={caseId!}
                  selectedIds={selectedAttachmentIds}
                  onSelectionChange={setSelectedAttachmentIds}
                  excludeIds={[]}
                  organizationId={organization?.id || ""}
                  showUploadOption={true}
                />
              </div>

              {/* Add Time & Expenses After Saving checkbox - hidden when linking expense */}
              {!isLinkingExpense && (
                <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-muted/30">
                  <Checkbox
                    id="add-time-expenses"
                    checked={addTimeExpensesAfterSave}
                    onCheckedChange={(checked) =>
                      setAddTimeExpensesAfterSave(!!checked)
                    }
                  />
                  <div className="space-y-1 leading-none">
                    <Label
                      htmlFor="add-time-expenses"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Add time & expenses after saving
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Opens the time & expense entry panel after this update is
                      saved
                    </p>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Update"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip creating an update?</AlertDialogTitle>
            <AlertDialogDescription>
              The expense entry <strong>{expenseNumber}</strong> was saved
              successfully. Would you like to skip creating a linked update?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, continue editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              Yes, view expense entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time & Expenses Panel */}
      {savedUpdateId && (
        <TimeExpensesPanel
          open={showTimeExpensesPanel}
          onOpenChange={setShowTimeExpensesPanel}
          updateId={savedUpdateId}
          caseId={caseId!}
          organizationId={organization?.id || ""}
          onSaveComplete={handleTimeExpensesPanelClose}
        />
      )}
    </div>
  );
};

export default NewCaseUpdate;
