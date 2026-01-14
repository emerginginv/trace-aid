import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { NotificationHelpers } from "@/lib/notificationHelpers";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Paperclip, Link2 } from "lucide-react";
import { AttachmentPicker } from "./AttachmentPicker";
import { ActivityTimelineEditor, TimelineEntry } from "./ActivityTimelineEditor";
import { format } from "date-fns";
import { useUpdateBillingEligibility, UpdateBillingEligibilityResult } from "@/hooks/useUpdateBillingEligibility";
import { useBillingItemCreation } from "@/hooks/useBillingItemCreation";
import { BillingPromptDialog, ConfirmedTimes } from "@/components/billing/BillingPromptDialog";
import { getBudgetForecastWarningMessage } from "@/lib/budgetUtils";

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

interface UpdateFormProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingUpdate?: any;
  organizationId: string;
}

export const UpdateForm = ({ caseId, open, onOpenChange, onSuccess, editingUpdate, organizationId }: UpdateFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateTypes, setUpdateTypes] = useState<string[]>([]);
  const [caseTitle, setCaseTitle] = useState<string>("");
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [existingLinkIds, setExistingLinkIds] = useState<string[]>([]);
  const [includeTimeline, setIncludeTimeline] = useState(false);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [caseActivities, setCaseActivities] = useState<CaseActivity[]>([]);
  const navigate = useNavigate();
  
  // Billing eligibility state (System Prompt 4)
  const [billingPromptOpen, setBillingPromptOpen] = useState(false);
  const [billingEligibility, setBillingEligibility] = useState<UpdateBillingEligibilityResult | null>(null);
  const { evaluate: evaluateBillingEligibility, reset: resetBillingEligibility } = useUpdateBillingEligibility();
  const { createBillingItem, isCreating: isCreatingBillingItem } = useBillingItemCreation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      update_type: "Other",
      linked_activity_id: "",
    },
  });

  useEffect(() => {
    fetchUpdateTypes();
    if (caseId && open) {
      fetchCaseTitle();
      fetchCaseActivities();
    }
    if (editingUpdate && open) {
      fetchExistingLinks();
    }
    if (!open) {
      setSelectedAttachmentIds([]);
      setExistingLinkIds([]);
      setCaseActivities([]);
    }
  }, [caseId, open, editingUpdate]);

  const fetchCaseActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("case_activities")
        .select("id, title, activity_type, due_date, status")
        .eq("case_id", caseId)
        .order("due_date", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setCaseActivities(data || []);
    } catch (error) {
      console.error("Error fetching case activities:", error);
    }
  };

  const fetchExistingLinks = async () => {
    if (!editingUpdate) return;
    try {
      const { data, error } = await supabase
        .from("update_attachment_links")
        .select("attachment_id")
        .eq("update_id", editingUpdate.id);

      if (error) throw error;
      const ids = data?.map((l) => l.attachment_id) || [];
      setExistingLinkIds(ids);
      setSelectedAttachmentIds(ids); // Pre-populate selected
    } catch (error) {
      console.error("Error fetching existing links:", error);
    }
  };

  const fetchCaseTitle = async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("title, case_number")
        .eq("id", caseId)
        .single();

      if (error) throw error;
      if (data) {
        setCaseTitle(`${data.case_number} - ${data.title}`);
      }
    } catch (error) {
      console.error("Error fetching case title:", error);
    }
  };

  useEffect(() => {
    if (editingUpdate) {
      form.reset({
        title: editingUpdate.title,
        description: editingUpdate.description || "",
        update_type: editingUpdate.update_type || "Other",
        linked_activity_id: editingUpdate.linked_activity_id || "",
      });
      // Load existing timeline data
      if (editingUpdate.activity_timeline && Array.isArray(editingUpdate.activity_timeline)) {
        setIncludeTimeline(true);
        setTimelineEntries(editingUpdate.activity_timeline);
      } else {
        setIncludeTimeline(false);
        setTimelineEntries([]);
      }
    } else {
      form.reset({
        title: "",
        description: "",
        update_type: "Other",
        linked_activity_id: "",
      });
      setIncludeTimeline(false);
      setTimelineEntries([]);
    }
  }, [editingUpdate, form]);

  const fetchUpdateTypes = async () => {
    try {
      if (!organizationId) return;

      const { data, error } = await supabase
        .from("picklists")
        .select("value")
        .eq("organization_id", organizationId)
        .eq("type", "update_type")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setUpdateTypes(data.map(item => item.value));
      } else {
        // Default update types if none exist in picklist
        setUpdateTypes([
          "Surveillance",
          "Case Update",
          "Accounting",
          "Client Contact",
          "3rd Party Contact",
          "Review",
          "Other"
        ]);
      }
    } catch (error) {
      console.error("Error fetching update types:", error);
      // Fallback to defaults on error
      setUpdateTypes([
        "Surveillance",
        "Case Update",
        "Accounting",
        "Client Contact",
        "3rd Party Contact",
        "Review",
        "Other"
      ]);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!organizationId) throw new Error("Organization not found");

      // Prepare timeline data - only include if checkbox is checked and has entries
      // TIMELINE CONSTRAINT: This is optional JSON stored inline with the update.
      // It is NOT linked to case_finances, case_activities, or any scheduling/calendar tables.
      // Timelines are read-only evidence in reports and do not affect billing or budgets.
      const timelineData: { time: string; description: string }[] | null = 
        includeTimeline && timelineEntries.length > 0 
          ? timelineEntries.filter(e => e.time && e.description) 
          : null;

      const updateData: Record<string, unknown> = {
        case_id: caseId,
        user_id: user.id,
        organization_id: organizationId,
        title: values.title,
        description: values.description || null,
        update_type: values.update_type,
        activity_timeline: timelineData,
        linked_activity_id: values.linked_activity_id || null,
      };

      let error;
      let newUpdate;
      if (editingUpdate) {
        const result = await supabase
          .from("case_updates")
          .update(updateData as any)
          .eq("id", editingUpdate.id);
        error = result.error;

        // Handle attachment link changes for edits
        if (!error) {
          const toAdd = selectedAttachmentIds.filter(id => !existingLinkIds.includes(id));
          const toRemove = existingLinkIds.filter(id => !selectedAttachmentIds.includes(id));

          // Delete removed links
          if (toRemove.length > 0) {
            await supabase
              .from("update_attachment_links")
              .delete()
              .eq("update_id", editingUpdate.id)
              .in("attachment_id", toRemove);
          }

          // Insert new links
          if (toAdd.length > 0) {
            const newLinks = toAdd.map((attachmentId) => ({
              update_id: editingUpdate.id,
              attachment_id: attachmentId,
              organization_id: organizationId,
              linked_by_user_id: user.id,
            }));

            await supabase
              .from("update_attachment_links")
              .insert(newLinks);
          }
        }
      } else {
        const result = await supabase
          .from("case_updates")
          .insert(updateData as any)
          .select()
          .single();
        error = result.error;
        newUpdate = result.data;
      }

      if (error) throw error;

      // Link selected attachments for new updates
      if (!editingUpdate && newUpdate && selectedAttachmentIds.length > 0) {
        const links = selectedAttachmentIds.map((attachmentId) => ({
          update_id: newUpdate.id,
          attachment_id: attachmentId,
          organization_id: organizationId,
          linked_by_user_id: user.id,
        }));

        const { error: linkError } = await supabase
          .from("update_attachment_links")
          .insert(links);

        if (linkError) {
          console.error("Error linking attachments:", linkError);
        }
      }

      // Send notification for new updates
      if (!editingUpdate && newUpdate) {
        await NotificationHelpers.caseUpdateAdded(
          {
            id: newUpdate.id,
            title: values.title,
            case_id: caseId,
          },
          user.id,
          organizationId
        );
      }

      toast({
        title: "Success",
        description: editingUpdate ? "Update edited successfully" : "Update added successfully",
      });

      // SYSTEM PROMPT 3 & 4: Check billing eligibility only if update is linked to an activity
      // If linked, evaluate billing eligibility; if eligible, show billing prompt
      // If not linked or not eligible, complete normally without prompt
      const linkedActivityId = values.linked_activity_id;
      
      if (linkedActivityId && !editingUpdate) {
        // Only check billing for new updates (not edits) with linked activities
        const eligibilityResult = await evaluateBillingEligibility({ linkedActivityId });
        
        if (eligibilityResult.isEligible) {
          // Store eligibility result and show billing prompt
          setBillingEligibility(eligibilityResult);
          setBillingPromptOpen(true);
          // Don't close the dialog yet - wait for billing decision
          form.reset();
          setSelectedAttachmentIds([]);
          setIncludeTimeline(false);
          setTimelineEntries([]);
          // Keep dialog state but let billing prompt overlay
          return; // Exit early - onSuccess will be called after billing decision
        }
      }

      // No billing prompt needed - complete normally
      form.reset();
      setSelectedAttachmentIds([]);
      setIncludeTimeline(false);
      setTimelineEntries([]);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving update:", error);
      toast({
        title: "Error",
        description: "Failed to save update",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle billing item creation from prompt with confirmed times (SYSTEM PROMPT 6)
  const handleCreateBillingItem = async (confirmedTimes: ConfirmedTimes) => {
    if (!billingEligibility || !billingEligibility.isEligible) return;
    
    // Recalculate quantity based on user-confirmed times for hourly/daily pricing
    let quantity = billingEligibility.quantity!;
    const pricingModel = billingEligibility.pricingModel;
    
    if ((pricingModel === 'hourly' || pricingModel === 'daily') && 
        confirmedTimes.startDate && confirmedTimes.startTime && 
        confirmedTimes.endDate && confirmedTimes.endTime) {
      const start = new Date(`${confirmedTimes.startDate}T${confirmedTimes.startTime}`);
      const end = new Date(`${confirmedTimes.endDate}T${confirmedTimes.endTime}`);
      const diffMs = end.getTime() - start.getTime();
      
      if (diffMs > 0) {
        if (pricingModel === 'hourly') {
          quantity = Math.max(0.25, diffMs / (1000 * 60 * 60));
        } else if (pricingModel === 'daily') {
          quantity = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
      }
    }
    
    const result = await createBillingItem({
      activityId: billingEligibility.activityId!,
      caseServiceInstanceId: billingEligibility.serviceInstanceId!,
      caseId: billingEligibility.caseId!,
      organizationId: billingEligibility.organizationId!,
      accountId: billingEligibility.accountId,
      serviceName: billingEligibility.serviceName!,
      pricingModel: billingEligibility.pricingModel!,
      quantity: quantity,
      rate: billingEligibility.serviceRate!,
      pricingProfileId: billingEligibility.pricingProfileId,
      pricingRuleSnapshot: billingEligibility.pricingRuleSnapshot,
    });

    if (result.success) {
      toast({
        title: "Billing Item Created",
        description: `Pending billing item created for ${billingEligibility.serviceName}`,
      });
      
      // Show budget warning if applicable (SYSTEM PROMPT 9)
      if (result.budgetWarning?.isForecastWarning) {
        toast({
          title: result.budgetWarning.isForecastExceeded ? "Budget Warning" : "Budget Notice",
          description: getBudgetForecastWarningMessage(
            result.budgetWarning.isForecastExceeded,
            result.budgetWarning.hardCap
          ),
          variant: result.budgetWarning.isForecastExceeded ? "destructive" : "default",
        });
      }
    } else {
      toast({
        title: "Billing Error",
        description: result.error || "Failed to create billing item",
        variant: "destructive",
      });
    }

    // Clean up and close
    setBillingPromptOpen(false);
    setBillingEligibility(null);
    resetBillingEligibility();
    onOpenChange(false);
    onSuccess();
  };

  // Handle skipping billing item creation
  const handleSkipBilling = () => {
    setBillingPromptOpen(false);
    setBillingEligibility(null);
    resetBillingEligibility();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingUpdate ? "Edit" : "Add"} Update</DialogTitle>
          <DialogDescription>Add a new progress note or activity log</DialogDescription>
          {caseTitle && (
            <button
              onClick={() => {
                onOpenChange(false);
                navigate(`/cases/${caseId}`);
              }}
              className="text-sm text-muted-foreground pt-2 hover:text-foreground transition-colors flex items-center gap-1.5 group"
            >
              Case: <span className="font-medium text-foreground">{caseTitle}</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Update title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="update_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Update Type</FormLabel>
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

            {/* Linked Activity Selector */}
            <FormField
              control={form.control}
              name="linked_activity_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Related Task/Event (Optional)
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a related task or event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
                  <p className="text-xs text-muted-foreground">
                    Optionally link this update to a specific task or event
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  Add chronological activity entries to this update (e.g., surveillance log)
                </p>
              </div>
            </div>

            {/* Timeline Editor (conditional) */}
            {includeTimeline && (
              <ActivityTimelineEditor
                value={timelineEntries}
                onChange={setTimelineEntries}
                disabled={isSubmitting}
              />
            )}

            {/* Attachment linking section - available for both new and edit */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Link Case Attachments
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Link existing case attachments or upload new files (stored at case level)
              </p>
              <AttachmentPicker
                caseId={caseId}
                selectedIds={selectedAttachmentIds}
                onSelectionChange={setSelectedAttachmentIds}
                excludeIds={[]}
                organizationId={organizationId}
                showUploadOption={true}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (editingUpdate ? "Updating..." : "Adding...") : (editingUpdate ? "Update" : "Add Update")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Billing Prompt Dialog - SYSTEM PROMPT 4 */}
      <BillingPromptDialog
        open={billingPromptOpen}
        onOpenChange={setBillingPromptOpen}
        eligibility={billingEligibility}
        onCreateBillingItem={handleCreateBillingItem}
        onSkip={handleSkipBilling}
      />
    </Dialog>
  );
};