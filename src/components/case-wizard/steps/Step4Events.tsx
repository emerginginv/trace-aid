import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, CalendarIcon, Plus, SkipForward, X, Clock, MapPin, User, Wrench, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WizardNavigation } from "../WizardNavigation";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  isScheduled: z.boolean().default(true),
  start_date: z.date().optional(),
  start_time: z.string().optional(),
  end_date: z.date().optional(),
  end_time: z.string().optional(),
  case_service_instance_id: z.string().optional(),
  assigned_user_id: z.string().optional(),
  address: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Activity {
  id: string;
  title: string;
  due_date: string | null;
  activity_type: string;
  status: string;
  case_service_instance_id: string | null;
  assigned_user_id: string | null;
  address: string | null;
  service_name?: string;
  assigned_user_name?: string;
}

interface CaseServiceInstance {
  id: string;
  case_service: {
    id: string;
    name: string;
  };
}

interface OrganizationMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Step4Props {
  caseId: string;
  organizationId: string;
  onBack: () => void;
  onContinue: (count: number) => void;
}

export function Step4Events({ caseId, organizationId, onBack, onContinue }: Step4Props) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [serviceInstances, setServiceInstances] = useState<CaseServiceInstance[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      isScheduled: true,
      start_date: new Date(),
      start_time: "09:00",
      end_date: undefined,
      end_time: "",
      case_service_instance_id: "",
      assigned_user_id: "",
      address: "",
    },
  });

  const isScheduled = form.watch("isScheduled");

  useEffect(() => {
    fetchActivities();
    fetchServiceInstances();
    fetchOrgMembers();
  }, [caseId, organizationId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("case_activities")
        .select(`
          id, 
          title, 
          due_date, 
          activity_type, 
          status,
          case_service_instance_id,
          assigned_user_id,
          address
        `)
        .eq("case_id", caseId)
        .in("activity_type", ["event", "task"])
        .order("due_date", { ascending: true });

      if (error) throw error;

      // Enrich with service and user names
      const enriched = await Promise.all((data || []).map(async (activity) => {
        let service_name: string | undefined;
        let assigned_user_name: string | undefined;

        if (activity.case_service_instance_id) {
          const { data: instance } = await supabase
            .from("case_service_instances")
            .select("case_service:case_services(name)")
            .eq("id", activity.case_service_instance_id)
            .single();
          service_name = (instance?.case_service as any)?.name;
        }

        if (activity.assigned_user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", activity.assigned_user_id)
            .single();
          assigned_user_name = profile?.full_name || profile?.email || undefined;
        }

        return { ...activity, service_name, assigned_user_name };
      }));

      setActivities(enriched);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const fetchServiceInstances = async () => {
    try {
      const { data, error } = await supabase
        .from("case_service_instances")
        .select("id, case_service:case_services(id, name)")
        .eq("case_id", caseId);

      if (error) throw error;
      setServiceInstances((data || []) as unknown as CaseServiceInstance[]);
    } catch (error) {
      console.error("Error fetching service instances:", error);
    }
  };

  const fetchOrgMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, profiles:user_id(id, full_name, email)")
        .eq("organization_id", organizationId);

      if (error) throw error;
      
      const members = (data || []).map(m => ({
        id: (m.profiles as any)?.id || m.user_id,
        full_name: (m.profiles as any)?.full_name,
        email: (m.profiles as any)?.email,
      }));
      setOrgMembers(members);
    } catch (error) {
      console.error("Error fetching org members:", error);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let dueDate: string | null = null;
      let endDateStr: string | null = null;

      if (data.isScheduled && data.start_date && data.start_time) {
        const [hours, minutes] = data.start_time.split(":");
        const dateTime = new Date(data.start_date);
        dateTime.setHours(parseInt(hours), parseInt(minutes));
        dueDate = dateTime.toISOString();
      }

      if (data.isScheduled && data.end_date) {
        endDateStr = data.end_date.toISOString().split('T')[0];
      }

      const { error } = await supabase.from("case_activities").insert({
        case_id: caseId,
        user_id: user.id,
        organization_id: organizationId,
        activity_type: data.isScheduled ? "event" : "task",
        title: data.title,
        description: data.description || null,
        due_date: dueDate,
        status: data.isScheduled ? "scheduled" : "to_do",
        is_scheduled: data.isScheduled,
        case_service_instance_id: data.case_service_instance_id || null,
        assigned_user_id: data.assigned_user_id || null,
        address: data.address || null,
        start_time: data.isScheduled ? (data.start_time || null) : null,
        end_time: data.isScheduled ? (data.end_time || null) : null,
        end_date: endDateStr,
      });

      if (error) throw error;

      toast.success(data.isScheduled ? "Activity scheduled" : "Task added");
      form.reset({
        title: "",
        description: "",
        isScheduled: true,
        start_date: new Date(),
        start_time: "09:00",
        end_date: undefined,
        end_time: "",
        case_service_instance_id: "",
        assigned_user_id: "",
        address: "",
      });
      fetchActivities();
    } catch (error) {
      console.error("Error adding activity:", error);
      toast.error("Failed to add activity");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from("case_activities")
        .delete()
        .eq("id", activityId);

      if (error) throw error;
      
      setActivities(prev => prev.filter(a => a.id !== activityId));
      toast.success("Activity removed");
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast.error("Failed to remove activity");
    }
  };

  const handleContinue = () => {
    onContinue(activities.length);
  };

  if (!hasStarted && activities.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Would you like to schedule activities?</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Plan field work, surveillance sessions, interviews, and other operational activities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setHasStarted(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Activity
            </Button>
            <Button variant="outline" onClick={handleContinue} className="gap-2">
              <SkipForward className="h-4 w-4" />
              Skip for Now
            </Button>
          </div>
        </div>

        <WizardNavigation
          currentStep={5}
          onBack={onBack}
          onContinue={handleContinue}
          canContinue={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Schedule Activities</h3>
        <p className="text-sm text-muted-foreground">
          Plan field work, surveillance sessions, interviews, and other operational activities.
        </p>
      </div>

      {/* Existing activities */}
      {activities.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Added Activities</p>
          {activities.map(activity => (
            <Card key={activity.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  {activity.activity_type === "event" ? (
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <Badge variant={activity.activity_type === "event" ? "default" : "secondary"} className="text-xs">
                        {activity.activity_type === "event" ? "Scheduled" : "Task"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {activity.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(activity.due_date), "MMM d, yyyy h:mm a")}
                        </span>
                      )}
                      {activity.service_name && (
                        <span className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          {activity.service_name}
                        </span>
                      )}
                      {activity.assigned_user_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {activity.assigned_user_name}
                        </span>
                      )}
                      {activity.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {activity.address.length > 30 ? activity.address.substring(0, 30) + "..." : activity.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteActivity(activity.id)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Activity form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Scheduled toggle */}
              <FormField
                control={form.control}
                name="isScheduled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Schedule Activity</FormLabel>
                      <FormDescription>
                        {field.value 
                          ? "This activity has a specific date and time" 
                          : "This is an unscheduled task"
                        }
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Activity title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date/Time fields - only show if scheduled */}
              {isScheduled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(field.value, "PPP") : "Select date"}
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
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date (Optional)</FormLabel>
                          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(field.value, "PPP") : "Select date"}
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
                        <FormItem>
                          <FormLabel>End Time (Optional)</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Link to Service */}
              {serviceInstances.length > 0 && (
                <FormField
                  control={form.control}
                  name="case_service_instance_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Service (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {serviceInstances.map(instance => (
                            <SelectItem key={instance.id} value={instance.id}>
                              {instance.case_service?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Assign to User */}
              {orgMembers.length > 0 && (
                <FormField
                  control={form.control}
                  name="assigned_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {orgMembers.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.full_name || member.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Location address" {...field} />
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
                        placeholder="Activity details..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} size="sm">
                  {isSubmitting ? "Adding..." : "Add Activity"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <WizardNavigation
        currentStep={5}
        onBack={onBack}
        onContinue={handleContinue}
        canContinue={true}
      />
    </div>
  );
}
