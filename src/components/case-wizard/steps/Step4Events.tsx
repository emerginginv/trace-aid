import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, CalendarIcon, Plus, SkipForward, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WizardNavigation } from "../WizardNavigation";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  start_date: z.date(),
  start_time: z.string().min(1, "Start time is required"),
});

type FormData = z.infer<typeof formSchema>;

interface Event {
  id: string;
  title: string;
  due_date: string;
}

interface Step4Props {
  caseId: string;
  organizationId: string;
  onBack: () => void;
  onContinue: (count: number) => void;
}

const DEFAULT_EVENT_TYPES = [
  "Surveillance Session",
  "Canvass Attempt",
  "Records Search",
  "Field Activity",
  "Interview Session",
  "Site Visit",
  "Court Attendance",
  "Other",
];

export function Step4Events({ caseId, organizationId, onBack, onContinue }: Step4Props) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [dateOpen, setDateOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      start_date: new Date(),
      start_time: "09:00",
    },
  });

  useEffect(() => {
    fetchEvents();
  }, [caseId, organizationId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("case_activities")
        .select("id, title, due_date")
        .eq("case_id", caseId)
        .eq("activity_type", "event")
        .order("due_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Combine date and time
      const [hours, minutes] = data.start_time.split(":");
      const dateTime = new Date(data.start_date);
      dateTime.setHours(parseInt(hours), parseInt(minutes));

      const { error } = await supabase.from("case_activities").insert({
        case_id: caseId,
        user_id: user.id,
        organization_id: organizationId,
        activity_type: "event",
        title: data.title,
        description: data.description || null,
        due_date: dateTime.toISOString(),
        status: "scheduled",
      });

      if (error) throw error;

      toast.success("Event added");
      form.reset({
        title: "",
        description: "",
        start_date: new Date(),
        start_time: "09:00",
      });
      fetchEvents();
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("case_activities")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
      
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success("Event removed");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to remove event");
    }
  };

  const handleContinue = () => {
    onContinue(events.length);
  };

  if (!hasStarted && events.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Would you like to add any events?</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Events can include surveillance sessions, interviews, site visits, or any scheduled field activity.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setHasStarted(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Events
            </Button>
            <Button variant="outline" onClick={handleContinue} className="gap-2">
              <SkipForward className="h-4 w-4" />
              Skip for Now
            </Button>
          </div>
        </div>

        <WizardNavigation
          currentStep={4}
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
        <h3 className="text-lg font-medium">Schedule Events</h3>
        <p className="text-sm text-muted-foreground">
          Add surveillance sessions, interviews, or other scheduled activities.
        </p>
      </div>

      {/* Existing events */}
      {events.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Scheduled Events</p>
          {events.map(event => (
            <Card key={event.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {event.due_date && (
                        <span>{format(new Date(event.due_date), "MMM d, yyyy h:mm a")}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteEvent(event.id)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Event form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Event title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
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

                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Event details..."
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
                  {isSubmitting ? "Adding..." : "Add Event"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <WizardNavigation
        currentStep={4}
        onBack={onBack}
        onContinue={handleContinue}
        canContinue={true}
      />
    </div>
  );
}
