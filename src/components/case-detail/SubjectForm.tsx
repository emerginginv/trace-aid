import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ProfileImageUpload } from "./ProfileImageUpload";

const formSchema = z.object({
  subject_type: z.enum(["person", "business", "vehicle", "asset", "location", "other"]),
  name: z.string().min(1, "Name is required"),
  notes: z.string().optional(),
  // Person fields
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  // Business fields
  business_name: z.string().optional(),
  registration_number: z.string().optional(),
  contact_person: z.string().optional(),
  website: z.string().optional(),
  // Vehicle fields
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  vin: z.string().optional(),
  license_plate: z.string().optional(),
  // Asset fields
  asset_type: z.string().optional(),
  serial_number: z.string().optional(),
  description: z.string().optional(),
  // Location fields
  location_address: z.string().optional(),
  location_phone: z.string().optional(),
  location_contact_name: z.string().optional(),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject_type: "person",
      name: "",
      notes: "",
      first_name: "",
      last_name: "",
      date_of_birth: "",
      phone: "",
      email: "",
      address: "",
      business_name: "",
      registration_number: "",
      contact_person: "",
      website: "",
      make: "",
      model: "",
      year: "",
      vin: "",
      license_plate: "",
      asset_type: "",
      serial_number: "",
      description: "",
      location_address: "",
      location_phone: "",
      location_contact_name: "",
    },
  });

  const selectedType = form.watch("subject_type");

  useEffect(() => {
    if (editingSubject) {
      const details = editingSubject.details || {};
      form.reset({
        subject_type: editingSubject.subject_type,
        name: editingSubject.name,
        notes: editingSubject.notes || "",
        ...details,
      });
      setProfileImageUrl(editingSubject.profile_image_url || null);
    } else {
      form.reset({
        subject_type: "person",
        name: "",
        notes: "",
        first_name: "",
        last_name: "",
        date_of_birth: "",
        phone: "",
        email: "",
        address: "",
        business_name: "",
        registration_number: "",
        contact_person: "",
        website: "",
        make: "",
        model: "",
        year: "",
        vin: "",
        license_plate: "",
        asset_type: "",
        serial_number: "",
        description: "",
        location_address: "",
        location_phone: "",
        location_contact_name: "",
      });
      setProfileImageUrl(null);
    }
  }, [editingSubject, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build details object based on subject type
      const details: Record<string, any> = {};
      const { subject_type, name, notes, ...otherFields } = values;

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
        .single();

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
      };

      let error;
      if (editingSubject) {
        const result = await supabase
          .from("case_subjects")
          .update(subjectData)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editingSubject ? "Edit" : "Add"} Subject</DialogTitle>
          <DialogDescription>Add a person, vehicle, location, or item related to this case</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pr-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Profile Photo</label>
              <ProfileImageUpload
                currentImageUrl={profileImageUrl || undefined}
                onImageChange={setProfileImageUrl}
                subjectId={editingSubject?.id}
              />
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
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                    <Input placeholder="Enter display name" {...field} />
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Full address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Business-specific fields */}
            {selectedType === "business" && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h3 className="text-sm font-semibold">Business Details</h3>
                <FormField
                  control={form.control}
                  name="business_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Business name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="registration_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Registration number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="Contact person" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="Website URL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Vehicle-specific fields */}
            {selectedType === "vehicle" && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h3 className="text-sm font-semibold">Vehicle Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make</FormLabel>
                        <FormControl>
                          <Input placeholder="Make" {...field} />
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
                          <Input placeholder="Model" {...field} />
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
                          <Input placeholder="Year" {...field} />
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
              </div>
            )}

            {/* Asset-specific fields */}
            {selectedType === "asset" && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h3 className="text-sm font-semibold">Asset Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="asset_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Type of asset" {...field} />
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
                          <Input placeholder="Serial number" {...field} />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Asset description" {...field} />
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
                        <Textarea placeholder="Full address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telephone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location_contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Contact person" {...field} />
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

              <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-background border-t -mx-4 px-4 py-3 mt-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingSubject ? "Updating..." : "Adding...") : (editingSubject ? "Update Subject" : "Add Subject")}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};