import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { ProfileImageUpload } from "./ProfileImageUpload";
import { useUserRole } from "@/hooks/useUserRole";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  subject_type: z.enum(["person", "vehicle", "location", "item"]),
  name: z.string().min(1, "Name is required"),
  notes: z.string().optional(),
  // Person fields
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  aliases: z.string().optional(),
  date_of_birth: z.date().optional().nullable(),
  drivers_license: z.string().optional(),
  ssn: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  physical_description: z.string().optional(),
  employer: z.string().optional(),
  education: z.string().optional(),
  family_relationships: z.string().optional(),
  habits_mannerisms: z.string().optional(),
  // Vehicle fields
  vehicle_color: z.string().optional(),
  year: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  style: z.string().optional(),
  vin: z.string().optional(),
  license_plate: z.string().optional(),
  registered_to: z.string().optional(),
  // Location fields
  location_address: z.string().optional(),
  location_phone: z.string().optional(),
  location_contact_name: z.string().optional(),
  location_description: z.string().optional(),
  // Item fields
  item_type: z.string().optional(),
  item_description: z.string().optional(),
  item_value: z.string().optional(),
  serial_number: z.string().optional(),
});

interface SubjectFormProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingSubject?: any;
}

export const SubjectForm = ({ caseId, open, onOpenChange, onSuccess, editingSubject }: SubjectFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [dobOpen, setDobOpen] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const { isAdmin, isManager } = useUserRole();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject_type: "person",
      name: "",
      notes: "",
      first_name: "",
      last_name: "",
      aliases: "",
      date_of_birth: null,
      drivers_license: "",
      ssn: "",
      phone: "",
      email: "",
      address: "",
      physical_description: "",
      employer: "",
      education: "",
      family_relationships: "",
      habits_mannerisms: "",
      vehicle_color: "",
      year: "",
      make: "",
      model: "",
      style: "",
      vin: "",
      license_plate: "",
      registered_to: "",
      location_address: "",
      location_phone: "",
      location_contact_name: "",
      location_description: "",
      item_type: "",
      item_description: "",
      item_value: "",
      serial_number: "",
    },
  });

  const selectedType = form.watch("subject_type");
  const firstName = form.watch("first_name");
  const lastName = form.watch("last_name");

  // Auto-populate name field for person type
  useEffect(() => {
    if (selectedType === "person" && (firstName || lastName)) {
      const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
      if (displayName) {
        form.setValue("name", displayName);
      }
    }
  }, [firstName, lastName, selectedType, form]);

  useEffect(() => {
    if (editingSubject) {
      const details = editingSubject.details || {};
      // Parse date_of_birth if it exists
      let dob = null;
      if (details.date_of_birth) {
        dob = new Date(details.date_of_birth);
      }
      form.reset({
        subject_type: editingSubject.subject_type,
        name: editingSubject.name,
        notes: editingSubject.notes || "",
        ...details,
        date_of_birth: dob,
      });
      setProfileImageUrl(editingSubject.profile_image_url || null);
      setIsPrimary(editingSubject.is_primary || false);
    } else {
      form.reset({
        subject_type: "person",
        name: "",
        notes: "",
        first_name: "",
        last_name: "",
        aliases: "",
        date_of_birth: null,
        drivers_license: "",
        ssn: "",
        phone: "",
        email: "",
        address: "",
        physical_description: "",
        employer: "",
        education: "",
        family_relationships: "",
        habits_mannerisms: "",
        vehicle_color: "",
        year: "",
        make: "",
        model: "",
        style: "",
        vin: "",
        license_plate: "",
        registered_to: "",
        location_address: "",
        location_phone: "",
        location_contact_name: "",
        location_description: "",
        item_type: "",
        item_description: "",
        item_value: "",
        serial_number: "",
      });
      setProfileImageUrl(null);
      setIsPrimary(false);
    }
  }, [editingSubject, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build details object based on subject type
      const details: Record<string, any> = {};
      const { subject_type, name, notes, date_of_birth, ...otherFields } = values;

      // Handle date_of_birth separately
      if (date_of_birth) {
        details.date_of_birth = format(date_of_birth, "yyyy-MM-dd");
      }

      // Only include non-empty fields in details
      Object.entries(otherFields).forEach(([key, value]) => {
        if (value && value !== "") {
          details[key] = value;
        }
      });

      // Get user's organization_id
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!orgMember?.organization_id) {
        throw new Error("User not in organization");
      }

      const subjectData = {
        case_id: caseId,
        user_id: user.id,
        organization_id: orgMember.organization_id,
        subject_type: values.subject_type,
        name: values.name,
        notes: values.notes || null,
        details,
        profile_image_url: profileImageUrl,
        is_primary: isPrimary,
      };

      let error;
      if (editingSubject) {
        // For updates, exclude case_id, user_id, and organization_id as they shouldn't change
        const { case_id, user_id, organization_id, ...updateData } = subjectData;
        const result = await supabase
          .from("case_subjects")
          .update(updateData)
          .eq("id", editingSubject.id);
        error = result.error;
      } else {
        const result = await supabase.from("case_subjects").insert(subjectData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: editingSubject ? "Subject updated successfully" : "Subject added successfully",
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving subject:", error);
      toast({
        title: "Error",
        description: "Failed to save subject",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canViewSSN = isAdmin || isManager;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{editingSubject ? "Edit" : "Add"} Subject</DialogTitle>
          <DialogDescription>Add a person, vehicle, location, or item related to this case</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Profile Photo</label>
                  <ProfileImageUpload
                    currentImageUrl={profileImageUrl || undefined}
                    onImageChange={setProfileImageUrl}
                    subjectId={editingSubject?.id}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <label htmlFor="is-primary" className="text-sm font-medium">Is Primary?</label>
                  <Switch
                    id="is-primary"
                    checked={isPrimary}
                    onCheckedChange={setIsPrimary}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="subject_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="person">Person</SelectItem>
                        <SelectItem value="vehicle">Vehicle</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="item">Item</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={selectedType === "person" ? "Auto-populated from first and last name" : "Enter display name"} 
                        {...field}
                        readOnly={selectedType === "person"}
                        className={selectedType === "person" ? "bg-muted" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Person-specific fields */}
              {selectedType === "person" && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <h3 className="text-sm font-semibold">Person Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="aliases"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alias(s)</FormLabel>
                        <FormControl>
                          <Input placeholder="Known aliases, nicknames" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date of Birth</FormLabel>
                          <Popover open={dobOpen} onOpenChange={setDobOpen}>
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
                                selected={field.value || undefined}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setDobOpen(false);
                                }}
                                disabled={(date) => date > new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="drivers_license"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver's License #</FormLabel>
                          <FormControl>
                            <Input placeholder="License number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="ssn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SSN</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={canViewSSN ? "Social Security Number" : "Admin access required"}
                            {...field} 
                            disabled={!canViewSSN}
                            className={!canViewSSN ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                            type={canViewSSN ? "text" : "password"}
                          />
                        </FormControl>
                        {!canViewSSN && (
                          <p className="text-xs text-muted-foreground">Only admins and managers can view/edit SSN</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="(555) 555-5555" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Full address (will be clickable to open maps)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="physical_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Physical Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Height, weight, hair color, distinguishing features, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="employer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employer</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Employment information" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="education"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Education</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Educational background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="family_relationships"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family & Relationships</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Known family members and relationships" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="habits_mannerisms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Habits and Mannerisms</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Known habits, routines, mannerisms" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Vehicle-specific fields */}
              {selectedType === "vehicle" && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <h3 className="text-sm font-semibold">Vehicle Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicle_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input placeholder="Vehicle color" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input placeholder="2024" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make</FormLabel>
                          <FormControl>
                            <Input placeholder="Toyota" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="Camry" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="style"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Style</FormLabel>
                          <FormControl>
                            <Input placeholder="Sedan, SUV, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VIN</FormLabel>
                          <FormControl>
                            <Input placeholder="Vehicle Identification Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="license_plate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Plate</FormLabel>
                          <FormControl>
                            <Input placeholder="License plate number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="registered_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registered To</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Registered owner information" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Location-specific fields */}
              {selectedType === "location" && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <h3 className="text-sm font-semibold">Location Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="location_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Full address (will show map preview and be clickable)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location_contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact for Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact person" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telephone</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="(555) 555-5555" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="location_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Description of the location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Item-specific fields */}
              {selectedType === "item" && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <h3 className="text-sm font-semibold">Item Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="item_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Type of item (e.g., Electronics, Jewelry)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="item_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Detailed item description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="item_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value ($)</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Serial or model number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        
        <div className="flex justify-end gap-2 border-t px-6 py-4 bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
            {isSubmitting ? (editingSubject ? "Updating..." : "Adding...") : (editingSubject ? "Update Subject" : "Add Subject")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
