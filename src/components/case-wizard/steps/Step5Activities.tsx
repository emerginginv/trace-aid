import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar, Clock, Trash2, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WizardNavigation } from "../WizardNavigation";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.date({ required_error: "Date is required" }),
  time: z.string().min(1, "Time is required"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Activity {
  id: string;
  title: string;
  due_date: string | null;
  start_time: string | null;
  description: string | null;
}

interface Step4Props {
  caseId: string;
  organizationId: string;
  onBack: () => void;
  onContinue: (count: number) => void;
}

export function Step5Activities({ caseId, organizationId, onBack, onContinue }: Step4Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dateOpen, setDateOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      date: new Date(),
      time: "09:00",
      description: "",
    },
  });

  useEffect(() => {
    if (caseId) {
      fetchActivities();
    }
  }, [caseId]);

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from("case_activities")
      .select("id, title, due_date, start_time, description")
      .eq("case_id", caseId)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error fetching activities:", error);
      return;
    }

    setActivities(data || []);
    if (data && data.length > 0) {
      setShowForm(true);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add activities");
        return;
      }
      // Combine date + time for due_date
      const [hours, minutes] = data.time.split(":");
      const dueDate = new Date(data.date);
      dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase.from("case_activities").insert({
        case_id: caseId,
        user_id: user.id,
        organization_id: organizationId,
        activity_type: "event",
        title: data.title,
        description: data.description || null,
        due_date: dueDate.toISOString(),
        start_time: data.time,
        status: "scheduled",
        is_scheduled: true,
      });

      if (error) throw error;

      toast.success("Activity added successfully");
      form.reset({
        title: "",
        date: new Date(),
        time: "09:00",
        description: "",
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

      setActivities(activities.filter((a) => a.id !== activityId));
      toast.success("Activity deleted");
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast.error("Failed to delete activity");
    }
  };

  const formatActivityDateTime = (dueDate: string | null, time: string | null) => {
    if (!dueDate) return "No date set";
    const date = new Date(dueDate);
    const formattedDate = format(date, "MMM d, yyyy");
    if (time) {
      const [hours, minutes] = time.split(":");
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours), parseInt(minutes));
      return `${formattedDate} at ${format(timeDate, "h:mm a")}`;
    }
    return formattedDate;
  };

  const handleContinue = () => {
    onContinue(activities.length);
  };

  // Initial prompt when no activities exist
  if (!showForm && activities.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <CalendarPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Activities</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Schedule investigative activities such as surveillance, interviews, or canvasses.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              Add Activity
            </Button>
            <Button variant="outline" onClick={handleContinue}>
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
        <h3 className="text-lg font-medium">Activities</h3>
          <p className="text-sm text-muted-foreground">
            Schedule investigative activities such as surveillance, interviews, or canvasses.
          </p>
      </div>

      {/* List of added activities */}
      {activities.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Added Activities</h4>
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatActivityDateTime(activity.due_date, activity.start_time)}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteActivity(activity.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Activity Form */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-4">New Activity</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Subject Surveillance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date *</FormLabel>
                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
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
                                format(field.value, "MMM d, yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setDateOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time */}
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="time" {...field} />
                          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief details about this activity..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Add Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
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
