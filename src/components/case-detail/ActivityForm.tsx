import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, ExternalLink, Copy, User, MapPin, Link, Clock } from "lucide-react";
import { useCaseAvailableServices } from "@/hooks/useCaseAvailableServices";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
// Note: Billing CTAs removed - billing now initiated only from Update Details page
import { getBudgetForecastWarningMessage } from "@/lib/budgetUtils";
import { useBudgetConsumption } from "@/hooks/useBudgetConsumption";
import { BudgetBlockedDialog } from "./BudgetBlockedDialog";

// Unified status values for all activity types
// Tasks: to_do, in_progress, completed, cancelled
// Scheduled: scheduled, completed, cancelled
const UNIFIED_STATUSES = [
  "to_do", 
  "scheduled", 
  "in_progress", 
  "completed", 
  "cancelled"
] as const;

// Unified schema that handles both scheduled and unscheduled activities
const unifiedActivitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(UNIFIED_STATUSES),
  assigned_user_id: z.string().optional(),
  case_service_id: z.string().optional(),
  // Date/time fields - optional based on isScheduled toggle
  due_date: z.date().optional(),
  start_date: z.date().optional(),
  start_time: z.string().optional(),
  end_date: z.date().optional(),
  end_time: z.string().optional(),
  address: z.string().optional(),
}).refine((data) => {
  // If any time field is set, require all time fields
  const hasAnyScheduledField = data.start_date || data.start_time || data.end_date || data.end_time;
  if (hasAnyScheduledField) {
    return data.start_date && data.start_time && data.end_date && data.end_time;
  }
  return true;
}, {
  message: "If scheduling, all date/time fields are required",
  path: ["start_time"],
});

type UnifiedActivityFormValues = z.infer<typeof unifiedActivitySchema>;

interface SubjectAddress {
  id: string;
  name: string;
  address: string;
  type: 'person' | 'location';
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface ActivityFormProps {
  caseId: string;
  activityType: "task" | "event"; // Used as initial hint for scheduling toggle
  users: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingActivity?: any;
  prefilledDate?: Date;
  organizationId: string;
  onDuplicate?: (activityData: any) => void;
}

// Helper to get status options based on whether activity is scheduled
// Tasks: to_do, in_progress, completed, cancelled
// Scheduled: scheduled, completed, cancelled
const getStatusOptions = (isScheduled: boolean) => {
  if (isScheduled) {
    // Scheduled activities - only 3 statuses
    return [
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ];
  } else {
    // Tasks - only 4 statuses
    return [
      { value: 'to_do', label: 'To Do' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ];
  }
};

export function ActivityForm({
  caseId,
  activityType,
  users,
  open,
  onOpenChange,
  onSuccess,
  editingActivity,
  prefilledDate,
  organizationId,
  onDuplicate,
}: ActivityFormProps) {
  const [caseTitle, setCaseTitle] = useState<string>("");
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [subjectAddresses, setSubjectAddresses] = useState<SubjectAddress[]>([]);
  // Note: Billing CTAs removed - billing now initiated only from Update Details page
  const [budgetBlockedDialogOpen, setBudgetBlockedDialogOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any | null>(null);
  
  // Phase 2: Unified form toggle - determines if activity has scheduled times
  const [isScheduled, setIsScheduled] = useState(activityType === "event");
  
  const navigate = useNavigate();
  const { consumption } = useBudgetConsumption(caseId);
  
  // Fetch available services from the case's pricing profile
  const { data: availableServices = [], isLoading: servicesLoading } = useCaseAvailableServices(caseId);
  
  const form = useForm<UnifiedActivityFormValues>({
    resolver: zodResolver(unifiedActivitySchema),
    defaultValues: {
      title: "",
      description: "",
      status: activityType === "event" ? "scheduled" : "to_do",
      assigned_user_id: undefined,
      case_service_id: undefined,
      due_date: prefilledDate || undefined,
      start_date: activityType === "event" ? prefilledDate || new Date() : undefined,
      start_time: activityType === "event" ? "09:00" : undefined,
      end_date: activityType === "event" ? prefilledDate || new Date() : undefined,
      end_time: activityType === "event" ? "10:00" : undefined,
      address: "",
    },
  });

  // Derive activity_type from isScheduled toggle
  const derivedActivityType = isScheduled ? "event" : "task";

  useEffect(() => {
    if (caseId && open) {
      fetchCaseTitle();
      fetchSubjectAddresses(); // Always fetch for potential scheduling
    }
  }, [caseId, open]);

  const fetchSubjectAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from("case_subjects")
        .select("id, name, subject_type, details")
        .eq("case_id", caseId)
        .in("subject_type", ["person", "location"]);

      if (error) throw error;

      if (data) {
        const addresses: SubjectAddress[] = data
          .filter(s => {
            const details = s.details as Record<string, any> | null;
            if (!details) return false;
            const addr = s.subject_type === 'person' 
              ? details.address 
              : details.location_address;
            return !!addr;
          })
          .map(s => {
            const details = s.details as Record<string, any>;
            return {
              id: s.id,
              name: s.name,
              address: s.subject_type === 'person' 
                ? details.address 
                : details.location_address,
              type: s.subject_type as 'person' | 'location',
            };
          });
        setSubjectAddresses(addresses);
      }
    } catch (error) {
      console.error("Error fetching subject addresses:", error);
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
    if (!open) return;
    
    const initializeForm = async () => {
      if (editingActivity) {
        // Determine if this is a scheduled activity based on existing data
        const hasScheduledTimes = !!(editingActivity.start_time && editingActivity.due_date);
        setIsScheduled(hasScheduledTimes || editingActivity.activity_type === "event");
        
        // Parse existing due_date - handle timezone correctly
        let dueDate: Date | undefined = undefined;
        if (editingActivity.due_date) {
          const dateStr = editingActivity.due_date;
          if (dateStr.length === 10) {
            const [year, month, day] = dateStr.split('-').map(Number);
            dueDate = new Date(year, month - 1, day);
          } else {
            dueDate = new Date(dateStr);
          }
        }
        
        // Get the case_service_id from the linked instance (if any)
        let caseServiceId: string | undefined = undefined;
        if (editingActivity.case_service_instance_id) {
          const { data: instanceData } = await supabase
            .from("case_service_instances")
            .select("case_service_id")
            .eq("id", editingActivity.case_service_instance_id)
            .single();
          caseServiceId = instanceData?.case_service_id;
        }

        // Parse end_date if it exists
        let endDate: Date | undefined = undefined;
        if (editingActivity.end_date) {
          const endDateStr = editingActivity.end_date;
          if (endDateStr.length === 10) {
            const [year, month, day] = endDateStr.split('-').map(Number);
            endDate = new Date(year, month - 1, day);
          } else {
            endDate = new Date(endDateStr);
          }
        }

        form.reset({
          title: editingActivity.title,
          description: editingActivity.description || "",
          status: editingActivity.status,
          assigned_user_id: editingActivity.assigned_user_id || undefined,
          case_service_id: caseServiceId,
          due_date: dueDate,
          start_date: hasScheduledTimes ? dueDate : undefined,
          start_time: hasScheduledTimes 
            ? ((editingActivity.start_time ? String(editingActivity.start_time).slice(0, 5) : null) || "09:00") 
            : undefined,
          end_date: hasScheduledTimes ? (endDate || dueDate) : undefined,
          end_time: hasScheduledTimes 
            ? ((editingActivity.end_time ? String(editingActivity.end_time).slice(0, 5) : null) || "10:00") 
            : undefined,
          address: editingActivity.address || "",
        });
      } else {
        // New activity - use activityType prop as initial hint
        const shouldSchedule = activityType === "event";
        setIsScheduled(shouldSchedule);
        
        form.reset({
          title: "",
          description: "",
          status: shouldSchedule ? "scheduled" : "to_do",
          assigned_user_id: undefined,
          case_service_id: undefined,
          due_date: prefilledDate || undefined,
          start_date: shouldSchedule ? prefilledDate || new Date() : undefined,
          start_time: shouldSchedule ? "09:00" : undefined,
          end_date: shouldSchedule ? prefilledDate || new Date() : undefined,
          end_time: shouldSchedule ? "10:00" : undefined,
          address: "",
        });
      }
    };
    
    initializeForm();
  }, [open, editingActivity, activityType, prefilledDate, form]);

  // Handle scheduling toggle change
  const handleScheduleToggle = (checked: boolean) => {
    setIsScheduled(checked);
    
    const currentValues = form.getValues();
    
    if (checked) {
      // Switching to scheduled - set default times if not already set
      const baseDate = currentValues.due_date || prefilledDate || new Date();
      form.setValue("start_date", baseDate);
      form.setValue("start_time", currentValues.start_time || "09:00");
      form.setValue("end_date", baseDate);
      form.setValue("end_time", currentValues.end_time || "10:00");
      
      // Update status to scheduled if currently to_do
      if (currentValues.status === "to_do") {
        form.setValue("status", "scheduled");
      }
    } else {
      // Switching to unscheduled - clear time fields
      form.setValue("start_date", undefined);
      form.setValue("start_time", undefined);
      form.setValue("end_date", undefined);
      form.setValue("end_time", undefined);
      form.setValue("address", "");
      
      // Update status to to_do if currently scheduled
      if (currentValues.status === "scheduled") {
        form.setValue("status", "to_do");
      }
    }
  };

  // Core save function that handles the actual database operations
  const saveActivityData = async (values: UnifiedActivityFormValues, forceNonBillable: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to perform this action",
          variant: "destructive",
        });
        return;
      }

      // If forceNonBillable, clear the service selection
      const effectiveValues = forceNonBillable 
        ? { ...values, case_service_id: undefined } 
        : values;

      // Format date and time for saving
      let dueDate = null;
      let startTime = null;
      let endTime = null;
      let endDate = null;
      
      if (isScheduled && effectiveValues.start_date) {
        // Save start date as date-only string
        const d = effectiveValues.start_date;
        dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        // Save times in HH:mm format (TIME column)
        startTime = effectiveValues.start_time;
        endTime = effectiveValues.end_time;
        
        // Save end date as date-only string
        if (effectiveValues.end_date) {
          const ed = effectiveValues.end_date;
          endDate = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`;
        }
      } else if (effectiveValues.due_date) {
        // Use local date parts to avoid timezone shift
        const d = effectiveValues.due_date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dueDate = `${year}-${month}-${day}`;
      }

      // If a service is selected, create or find a service instance
      let caseServiceInstanceId: string | null = null;
      const selectedServiceId = effectiveValues.case_service_id;
      
      if (selectedServiceId && selectedServiceId !== "none") {
        const { data: existingInstance } = await supabase
          .from("case_service_instances")
          .select("id")
          .eq("case_id", caseId)
          .eq("case_service_id", selectedServiceId)
          .maybeSingle();
        
        if (existingInstance) {
          caseServiceInstanceId = existingInstance.id;
        } else {
          const { data: newInstance, error: instanceError } = await supabase
            .from("case_service_instances")
            .insert({
              case_id: caseId,
              case_service_id: selectedServiceId,
              organization_id: organizationId,
              status: "scheduled",
              created_by: user.id,
            })
            .select("id")
            .single();
          
          if (instanceError) {
            console.error("Error creating service instance:", instanceError);
            throw instanceError;
          }
          caseServiceInstanceId = newInstance.id;
        }
      }

      const activityData: any = {
        activity_type: derivedActivityType, // Derived from isScheduled toggle
        title: effectiveValues.title,
        description: effectiveValues.description || null,
        case_id: caseId,
        user_id: user.id,
        due_date: dueDate,
        status: effectiveValues.status,
        assigned_user_id: effectiveValues.assigned_user_id === "unassigned" ? null : (effectiveValues.assigned_user_id || null),
        completed: effectiveValues.status === "completed",
        case_service_instance_id: caseServiceInstanceId,
      };

      // Add scheduled activity fields
      if (isScheduled) {
        activityData.address = effectiveValues.address || null;
        activityData.start_time = startTime;
        activityData.end_time = endTime;
        activityData.end_date = endDate;
      } else {
        // Clear scheduled fields for unscheduled activities
        activityData.address = null;
        activityData.start_time = null;
        activityData.end_time = null;
        activityData.end_date = null;
      }

      let error;
      let insertedActivity;
      if (editingActivity) {
        const { error: updateError } = await supabase
          .from("case_activities")
          .update(activityData)
          .eq("id", editingActivity.id);
        error = updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("case_activities")
          .insert(activityData)
          .select()
          .single();
        error = insertError;
        insertedActivity = data;
      }

      if (error) throw error;

      // Update case_service_instances with scheduled times (for planning purposes only)
      const serviceInstanceId = editingActivity?.case_service_instance_id || caseServiceInstanceId;
      if (serviceInstanceId && isScheduled && effectiveValues.start_time && effectiveValues.end_time) {
        const parseTimeParts = (t: string) => {
          const [hh, mm, ss] = String(t).split(":");
          return {
            h: Number(hh) || 0,
            m: Number(mm) || 0,
            s: Number(ss) || 0,
          };
        };

        const startParts = parseTimeParts(effectiveValues.start_time);
        const endParts = parseTimeParts(effectiveValues.end_time);

        const startDt = new Date(effectiveValues.start_date!);
        startDt.setHours(startParts.h, startParts.m, startParts.s, 0);

        const endDt = new Date(effectiveValues.end_date!);
        endDt.setHours(endParts.h, endParts.m, endParts.s, 0);

        const scheduledStart = startDt.toISOString();
        const scheduledEnd = endDt.toISOString();

        const { error: serviceUpdateError } = await supabase
          .from("case_service_instances")
          .update({
            scheduled_start: scheduledStart,
            scheduled_end: scheduledEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", serviceInstanceId);

        if (serviceUpdateError) {
          console.error("Error updating service instance times:", serviceUpdateError);
        }
      }

      // Create notification for assigned user (only for new activities)
      if (!editingActivity && insertedActivity && effectiveValues.assigned_user_id && effectiveValues.assigned_user_id !== 'unassigned') {
        const { data: assignedUserOrg } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', effectiveValues.assigned_user_id)
          .limit(1)
          .single();

        if (assignedUserOrg) {
          const notificationData = {
            user_id: effectiveValues.assigned_user_id,
            organization_id: assignedUserOrg.organization_id,
            type: 'task',
            title: isScheduled ? 'New Event Scheduled' : 'New Task Assigned',
            message: `You have been assigned: ${effectiveValues.title}`,
            related_id: insertedActivity.id,
            related_type: 'case_activity',
            link: `/cases/${caseId}`,
            priority: effectiveValues.due_date && new Date(effectiveValues.due_date) < new Date(Date.now() + 86400000 * 3) ? 'high' : 'medium',
            read: false,
          };

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notificationData);

          if (notifError) {
            console.error('Error creating notification:', notifError);
          }
        }
      }

      toast({
        title: "Success",
        description: editingActivity 
          ? `${isScheduled ? "Event" : "Task"} updated successfully` 
          : `${isScheduled ? "Event" : "Task"} added successfully`,
      });

      // Note: Billing prompts removed - billing now initiated only from Update Details page

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving activity:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isBudgetError = errorMessage.toLowerCase().includes('budget exceeded') || 
                           errorMessage.toLowerCase().includes('hard budget cap') ||
                           errorMessage.toLowerCase().includes('hard cap');
      
      if (isBudgetError) {
        toast({
          title: "Budget hard cap reached",
          description: "This case is over its hard cap. To save, leave the Service field empty (non-billable), or increase the case budget.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage || "Failed to save activity",
          variant: "destructive",
        });
      }
    }
  };

  // Handle saving as non-billable when budget is blocked
  const handleSaveAsNonBillable = async () => {
    if (!pendingSubmitData) return;
    
    setBudgetBlockedDialogOpen(false);
    await saveActivityData(pendingSubmitData, true);
    
    toast({
      title: "Saved as non-billable",
      description: "The activity was saved without a billing service.",
    });
    
    setPendingSubmitData(null);
  };

  // Main submit handler - checks for budget blocks before saving
  const onSubmit = async (values: UnifiedActivityFormValues) => {
    const hasService = values.case_service_id && values.case_service_id !== "none";
    
    if (hasService && consumption?.isBlocked) {
      setPendingSubmitData(values);
      setBudgetBlockedDialogOpen(true);
      return;
    }
    
    await saveActivityData(values, false);
  };

  const statusOptions = getStatusOptions(isScheduled);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingActivity ? `Edit Activity` : `Add New Activity`}
          </DialogTitle>
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
                    <Input placeholder="Enter title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Schedule Toggle - Phase 2 Unified Form */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  Schedule this activity
                </div>
                <p className="text-xs text-muted-foreground">
                  {isScheduled 
                    ? "This activity will appear on the calendar" 
                    : "Add specific date/time to show on calendar"}
                </p>
              </div>
              <Switch
                checked={isScheduled}
                onCheckedChange={handleScheduleToggle}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="assigned_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Selection - available for all activities now */}
            {!isScheduled ? (
              <FormField
                control={form.control}
                name="case_service_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Service (Optional)
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "none"}
                      disabled={servicesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={servicesLoading ? "Loading services..." : "Select a service"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No service</SelectItem>
                        {availableServices.length === 0 && !servicesLoading && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No services configured in pricing profile
                          </div>
                        )}
                        {availableServices.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{service.name}</span>
                              {service.code && (
                                <span className="text-muted-foreground text-xs">({service.code})</span>
                              )}
                              {service.is_billable && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  Billable
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Link this task to a service for budget tracking and invoicing.
                      {availableServices.length > 0 && availableServices.length < 10 && (
                        <span className="ml-1 text-muted-foreground/70">
                          ({availableServices.length} service{availableServices.length !== 1 ? 's' : ''} available for this Case Type)
                        </span>
                      )}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="rounded-lg border border-muted bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Link className="h-4 w-4 shrink-0" />
                  <span>Costs for scheduled activities are derived from updates. Create an update after this activity to log time and expenses.</span>
                </p>
              </div>
            )}

            {/* Due Date - shown when NOT scheduled */}
            {!isScheduled && (
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setDueDateOpen(false);
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Scheduled Date/Time Fields - shown when scheduled */}
            {isScheduled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel>Start Date</FormLabel>
                        <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal h-9",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setStartDateOpen(false);
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" className="w-full h-9" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel>End Date</FormLabel>
                        <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal h-9",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setEndDateOpen(false);
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" className="w-full h-9" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address field for scheduled activities */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <div className="space-y-2">
                        {subjectAddresses.length > 0 && (
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                            }}
                            value={subjectAddresses.some(s => s.address === field.value) ? field.value : undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select from case subjects" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subjectAddresses.map((subject) => (
                                <SelectItem key={subject.id} value={subject.address}>
                                  <div className="flex items-center gap-2">
                                    {subject.type === 'person' ? (
                                      <User className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="font-medium">{subject.name}</span>
                                    <span className="text-muted-foreground truncate max-w-[200px]">— {subject.address}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FormControl>
                          <Textarea
                            placeholder="Enter address or select from above"
                            {...field}
                            className="min-h-[60px]"
                          />
                        </FormControl>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        If connected to a case, any existing location or subject address will be available above.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {editingActivity && isScheduled && onDuplicate && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const formValues = form.getValues();
                      onDuplicate({
                        ...editingActivity,
                        ...formValues,
                        id: undefined,
                        title: `${formValues.title} (Copy)`,
                      });
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </Button>
                )}
                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
                  {editingActivity 
                    ? `Update ${isScheduled ? "Event" : "Task"}` 
                    : `Add ${isScheduled ? "Event" : "Task"}`}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    
    {/* Note: Billing Prompt Dialog removed - billing now initiated only from Update Details page */}
    
    {/* Budget blocked dialog for smart handling */}
    {consumption && (
      <BudgetBlockedDialog
        open={budgetBlockedDialogOpen}
        onOpenChange={(open) => {
          setBudgetBlockedDialogOpen(open);
          if (!open) {
            setPendingSubmitData(null);
          }
        }}
        consumption={consumption}
        onSaveAsNonBillable={handleSaveAsNonBillable}
        activityTitle={pendingSubmitData?.title}
      />
    )}
    </>
  );
}
