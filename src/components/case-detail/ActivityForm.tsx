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
import { CalendarIcon, ExternalLink, Copy, User, MapPin, Link } from "lucide-react";
import { useCaseAvailableServices } from "@/hooks/useCaseAvailableServices";
import { format, formatISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useBillingEligibility, BillingEligibilityResult } from "@/hooks/useBillingEligibility";
import { BillingPromptDialog } from "@/components/billing/BillingPromptDialog";
import { useBillingItemCreation } from "@/hooks/useBillingItemCreation";

const taskSchema = z.object({
  activity_type: z.literal("task"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  due_date: z.date().optional(),
  status: z.enum(["to_do", "in_progress", "blocked", "done", "cancelled"]),
  assigned_user_id: z.string().optional(),
  case_service_id: z.string().optional(), // Service from pricing profile
});

const eventSchema = z.object({
  activity_type: z.literal("event"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  start_date: z.date(),
  start_time: z.string().min(1, "Start time is required"),
  end_date: z.date(),
  end_time: z.string().min(1, "End time is required"),
  status: z.enum(["scheduled", "cancelled", "completed"]),
  assigned_user_id: z.string().optional(),
  address: z.string().optional(),
  case_service_id: z.string().optional(), // Service from pricing profile
});

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
  activityType: "task" | "event";
  users: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingActivity?: any;
  prefilledDate?: Date;
  organizationId: string;
  onDuplicate?: (activityData: any) => void;
}

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
  const [billingPromptOpen, setBillingPromptOpen] = useState(false);
  const [billingEligibility, setBillingEligibility] = useState<BillingEligibilityResult | null>(null);
  const navigate = useNavigate();
  const { evaluate: evaluateBillingEligibility } = useBillingEligibility();
  const { createBillingItem, isCreating: isCreatingBillingItem } = useBillingItemCreation();
  
  // Fetch available services from the case's pricing profile
  const { data: availableServices = [], isLoading: servicesLoading } = useCaseAvailableServices(caseId);
  const schema = activityType === "task" ? taskSchema : eventSchema;
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      activity_type: activityType,
      title: "",
      description: "",
      due_date: activityType === "task" ? prefilledDate || undefined : undefined,
      start_date: activityType === "event" ? prefilledDate || new Date() : undefined,
        start_time: activityType === "event" ? "09:00" : undefined,
        end_date: activityType === "event" ? prefilledDate || new Date() : undefined,
        end_time: activityType === "event" ? "10:00" : undefined,
        status: activityType === "task" ? "to_do" : "scheduled",
      assigned_user_id: undefined,
      case_service_instance_id: undefined,
    } as any,
  });

  useEffect(() => {
    if (caseId && open) {
      fetchCaseTitle();
      if (activityType === "event") {
        fetchSubjectAddresses();
      }
    }
  }, [caseId, open, activityType]);

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
    if (!open) return; // Only reset when dialog is open
    
    const initializeForm = async () => {
      if (editingActivity) {
        // Parse existing due_date - handle timezone correctly
        let dueDate: Date | undefined = undefined;
        if (editingActivity.due_date) {
          const dateStr = editingActivity.due_date;
          // If it's just a date string (YYYY-MM-DD), parse as local date
          if (dateStr.length === 10) {
            const [year, month, day] = dateStr.split('-').map(Number);
            dueDate = new Date(year, month - 1, day);
          } else {
            // It's a full ISO timestamp (for events)
            dueDate = new Date(dateStr);
          }
        }
        
        // Get the case_service_id from the linked instance (if any)
        let caseServiceId: string | undefined = undefined;
        if (editingActivity.case_service_instance_id) {
          // Fetch the service instance to get the case_service_id
          const { data: instanceData } = await supabase
            .from("case_service_instances")
            .select("case_service_id")
            .eq("id", editingActivity.case_service_instance_id)
            .single();
          caseServiceId = instanceData?.case_service_id;
        }

        form.reset({
          activity_type: editingActivity.activity_type,
          title: editingActivity.title,
          description: editingActivity.description || "",
          due_date: editingActivity.activity_type === "task" ? dueDate : undefined,
          start_date: editingActivity.activity_type === "event" ? dueDate : undefined,
          start_time: editingActivity.activity_type === "event" && dueDate ? format(dueDate, "HH:mm") : "09:00",
          end_date: editingActivity.activity_type === "event" ? dueDate : undefined,
          end_time: editingActivity.activity_type === "event" && dueDate ? format(new Date(dueDate.getTime() + 3600000), "HH:mm") : "10:00",
          status: editingActivity.status,
          assigned_user_id: editingActivity.assigned_user_id || undefined,
          address: editingActivity.address || "",
          case_service_id: caseServiceId,
        } as any);
      } else {
        form.reset({
          activity_type: activityType,
          title: "",
          description: "",
          due_date: activityType === "task" ? prefilledDate || undefined : undefined,
          start_date: activityType === "event" ? prefilledDate || new Date() : undefined,
          start_time: activityType === "event" ? "09:00" : undefined,
          end_date: activityType === "event" ? prefilledDate || new Date() : undefined,
          end_time: activityType === "event" ? "10:00" : undefined,
          status: activityType === "task" ? "to_do" : "scheduled",
          assigned_user_id: undefined,
          address: "",
          case_service_id: undefined,
        } as any);
      }
    };
    
    initializeForm();
  }, [open, editingActivity, activityType, prefilledDate, form]);

  const onSubmit = async (values: any) => {
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

      // Combine date and time for events
      let dueDate = null;
      if (values.activity_type === "event") {
        const [startHours, startMinutes] = values.start_time.split(':');
        const startDateTime = new Date(values.start_date);
        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));
        dueDate = formatISO(startDateTime);
      } else if (values.due_date) {
        // Use local date parts to avoid timezone shift
        const d = values.due_date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dueDate = `${year}-${month}-${day}`;
      }

      // If a service is selected, create or find a service instance
      let caseServiceInstanceId: string | null = null;
      const selectedServiceId = values.case_service_id;
      
      if (selectedServiceId && selectedServiceId !== "none") {
        // Check if a service instance already exists for this case and service
        const { data: existingInstance } = await supabase
          .from("case_service_instances")
          .select("id")
          .eq("case_id", caseId)
          .eq("case_service_id", selectedServiceId)
          .maybeSingle();
        
        if (existingInstance) {
          caseServiceInstanceId = existingInstance.id;
        } else {
          // Create a new service instance
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
        activity_type: values.activity_type,
        title: values.title,
        description: values.description || null,
        case_id: caseId,
        user_id: user.id,
        due_date: dueDate,
        status: values.status,
        assigned_user_id: values.assigned_user_id === "unassigned" ? null : (values.assigned_user_id || null),
        completed: values.status === "done" || values.status === "completed",
        case_service_instance_id: caseServiceInstanceId,
      };

      // Add event-specific fields
      if (values.activity_type === "event") {
        activityData.address = values.address || null;
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

      // Create notification for assigned user (only for new tasks)
      if (!editingActivity && insertedActivity && values.assigned_user_id && values.assigned_user_id !== 'unassigned') {
        // Get assigned user's organization_id
        const { data: assignedUserOrg } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', values.assigned_user_id)
          .limit(1)
          .single();

        if (assignedUserOrg) {
          const notificationData = {
            user_id: values.assigned_user_id,
            organization_id: assignedUserOrg.organization_id,
            type: 'task',
            title: values.activity_type === 'task' ? 'New Task Assigned' : 'New Event Scheduled',
            message: `You have been assigned: ${values.title}`,
            related_id: insertedActivity.id,
            related_type: 'case_activity',
            link: `/cases/${caseId}`,
            priority: values.due_date && new Date(values.due_date) < new Date(Date.now() + 86400000 * 3) ? 'high' : 'medium',
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
        description: editingActivity ? `${activityType === "task" ? "Task" : "Event"} updated successfully` : `${activityType === "task" ? "Task" : "Event"} added successfully`,
      });

      // Check billing eligibility if activity was completed and has a service instance
      const isCompleted = values.status === "done" || values.status === "completed";
      const activityIdToCheck = editingActivity?.id || insertedActivity?.id;
      
      if (isCompleted && caseServiceInstanceId && activityIdToCheck) {
        const eligibility = await evaluateBillingEligibility({
          activityId: activityIdToCheck,
          caseServiceInstanceId: caseServiceInstanceId,
        });
        
        if (eligibility.isEligible) {
          setBillingEligibility(eligibility);
          setBillingPromptOpen(true);
          // Don't close the form yet - wait for billing prompt response
          return;
        } else if (eligibility.reason?.includes("flat-fee")) {
          // Show warning toast for flat-fee services that are already billed
          toast({
            title: "Flat-Fee Service Already Billed",
            description: eligibility.reason,
          });
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving activity:", error);
      toast({
        title: "Error",
        description: "Failed to save activity",
        variant: "destructive",
      });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingActivity ? `Edit ${activityType === "task" ? "Task" : "Event"}` : `Add New ${activityType === "task" ? "Task" : "Event"}`}
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activityType === "task" ? (
                        <>
                          <SelectItem value="to_do">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </>
                      )}
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
                    defaultValue={field.value}
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

            {/* Link to Service - for budget tracking and invoicing */}
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
                    Link this {activityType} to a service for budget tracking and invoicing.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {activityType === "task" ? (
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
            ) : (
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
                          <Input type="time" className="w-full h-9" {...field} />
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
                          <Input type="time" className="w-full h-9" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address field for events */}
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
                {editingActivity && activityType === "event" && onDuplicate && (
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
                  {editingActivity ? `Update ${activityType === "task" ? "Task" : "Event"}` : `Add ${activityType === "task" ? "Task" : "Event"}`}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    
    {/* Billing Prompt Dialog - shows after completing an activity with billable service */}
    <BillingPromptDialog
      open={billingPromptOpen}
      onOpenChange={(open) => {
        setBillingPromptOpen(open);
        if (!open) {
          // When dialog closes, close the activity form and trigger success
          onOpenChange(false);
          onSuccess();
        }
      }}
      eligibility={billingEligibility}
      onCreateBillingItem={async () => {
        if (!billingEligibility) return;
        
        const result = await createBillingItem({
          activityId: billingEligibility.activityId!,
          caseServiceInstanceId: billingEligibility.serviceInstanceId!,
          caseId: billingEligibility.caseId!,
          organizationId: billingEligibility.organizationId!,
          serviceName: billingEligibility.serviceName!,
          pricingModel: billingEligibility.pricingModel!,
          quantity: billingEligibility.quantity!,
          rate: billingEligibility.serviceRate!,
          pricingProfileId: billingEligibility.pricingProfileId,
          pricingRuleSnapshot: billingEligibility.pricingRuleSnapshot,
        });
        
        if (result.success) {
          toast({
            title: "Billing Item Created",
            description: `A billing item for "${billingEligibility.serviceName}" is pending review.`,
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create billing item",
            variant: "destructive",
          });
        }
        
        setBillingPromptOpen(false);
        onOpenChange(false);
        onSuccess();
      }}
      onSkip={() => {
        setBillingPromptOpen(false);
        onOpenChange(false);
        onSuccess();
      }}
    />
    </>
  );
}
