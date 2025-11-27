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
import { CalendarIcon, ExternalLink } from "lucide-react";
import { format, formatISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const taskSchema = z.object({
  activity_type: z.literal("task"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  due_date: z.date().optional(),
  status: z.enum(["to_do", "in_progress", "blocked", "done", "cancelled"]),
  assigned_user_id: z.string().optional(),
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
});

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
}: ActivityFormProps) {
  const [caseTitle, setCaseTitle] = useState<string>("");
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const navigate = useNavigate();
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
    } as any,
  });

  useEffect(() => {
    if (caseId && open) {
      fetchCaseTitle();
    }
  }, [caseId, open]);

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
    if (editingActivity) {
      // Parse existing due_date for events that have start/end times stored
      const dueDate = editingActivity.due_date ? new Date(editingActivity.due_date) : undefined;
      
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
      } as any);
    }
  }, [editingActivity, activityType, prefilledDate, form]);

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
        dueDate = format(values.due_date, "yyyy-MM-dd");
      }

      const activityData = {
        activity_type: values.activity_type,
        title: values.title,
        description: values.description || null,
        case_id: caseId,
        user_id: user.id,
        due_date: dueDate,
        status: values.status,
        assigned_user_id: values.assigned_user_id || null,
        completed: values.status === "done" || values.status === "completed",
      };

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
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
                {editingActivity ? `Update ${activityType === "task" ? "Task" : "Event"}` : `Add ${activityType === "task" ? "Task" : "Event"}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
