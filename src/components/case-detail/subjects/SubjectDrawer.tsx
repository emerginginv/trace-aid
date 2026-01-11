import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Subject, SubjectCategory, SUBJECT_CATEGORY_SINGULAR } from "./types";
import { PersonForm, PersonFormValues } from "./forms/PersonForm";
import { VehicleForm, VehicleFormValues } from "./forms/VehicleForm";
import { LocationForm, LocationFormValues } from "./forms/LocationForm";
import { ItemForm, ItemFormValues } from "./forms/ItemForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SubjectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  category: SubjectCategory;
  caseId: string;
  organizationId: string;
  onSuccess: () => void;
  readOnly?: boolean;
}

export const SubjectDrawer = ({
  open,
  onOpenChange,
  subject,
  category,
  caseId,
  organizationId,
  onSuccess,
  readOnly = false,
}: SubjectDrawerProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePersonSubmit = async (values: PersonFormValues, profileImageUrl: string | null) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const details: Record<string, any> = {};
      if (values.date_of_birth) {
        details.date_of_birth = format(values.date_of_birth, "yyyy-MM-dd");
      }
      if (values.height) details.height = values.height;
      if (values.weight) details.weight = values.weight;
      if (values.hair_color) details.hair_color = values.hair_color;
      if (values.eye_color) details.eye_color = values.eye_color;
      if (values.identifying_marks) details.identifying_marks = values.identifying_marks;
      if (values.aliases && values.aliases.length > 0) details.aliases = values.aliases;

      const subjectData = {
        case_id: caseId,
        organization_id: organizationId,
        user_id: user.id,
        subject_type: 'person' as const,
        name: values.name,
        display_name: values.name,
        role: values.role,
        notes: values.notes || null,
        details,
        profile_image_url: profileImageUrl,
        status: 'active' as const,
      };

      if (subject) {
        const { error } = await supabase
          .from("case_subjects")
          .update({
            name: subjectData.name,
            display_name: subjectData.display_name,
            role: subjectData.role,
            notes: subjectData.notes,
            details: subjectData.details,
            profile_image_url: subjectData.profile_image_url,
          })
          .eq("id", subject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("case_subjects").insert(subjectData);
        if (error) throw error;
      }

      toast({ title: "Success", description: subject ? "Person updated" : "Person added" });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving person:", error);
      toast({ title: "Error", description: "Failed to save person", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVehicleSubmit = async (values: VehicleFormValues, profileImageUrl: string | null) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const details: Record<string, any> = {
        vehicle_type: values.vehicle_type,
        year: values.year,
        make: values.make,
        model: values.model,
        vehicle_color: values.color,
        license_plate: values.license_plate,
        plate_state: values.plate_state,
        vin: values.vin,
        registered_to: values.registered_owner,
      };

      // Remove empty values
      Object.keys(details).forEach(key => {
        if (!details[key]) delete details[key];
      });

      const subjectData = {
        case_id: caseId,
        organization_id: organizationId,
        user_id: user.id,
        subject_type: 'vehicle' as const,
        name: values.name || "Unknown Vehicle",
        display_name: values.name || "Unknown Vehicle",
        notes: values.notes || null,
        details,
        profile_image_url: profileImageUrl,
        status: 'active' as const,
      };

      if (subject) {
        const { error } = await supabase
          .from("case_subjects")
          .update({
            name: subjectData.name,
            display_name: subjectData.display_name,
            notes: subjectData.notes,
            details: subjectData.details,
            profile_image_url: subjectData.profile_image_url,
          })
          .eq("id", subject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("case_subjects").insert(subjectData);
        if (error) throw error;
      }

      toast({ title: "Success", description: subject ? "Vehicle updated" : "Vehicle added" });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast({ title: "Error", description: "Failed to save vehicle", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSubmit = async (values: LocationFormValues, profileImageUrl: string | null) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const details: Record<string, any> = {
        location_type: values.location_type,
        street: values.street,
        city: values.city,
        state: values.state,
        zip: values.zip,
      };

      // Remove empty values
      Object.keys(details).forEach(key => {
        if (!details[key]) delete details[key];
      });

      const subjectData = {
        case_id: caseId,
        organization_id: organizationId,
        user_id: user.id,
        subject_type: 'location' as const,
        name: values.name,
        display_name: values.name,
        notes: values.notes || null,
        details,
        profile_image_url: profileImageUrl,
        status: 'active' as const,
      };

      if (subject) {
        const { error } = await supabase
          .from("case_subjects")
          .update({
            name: subjectData.name,
            display_name: subjectData.display_name,
            notes: subjectData.notes,
            details: subjectData.details,
            profile_image_url: subjectData.profile_image_url,
          })
          .eq("id", subject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("case_subjects").insert(subjectData);
        if (error) throw error;
      }

      toast({ title: "Success", description: subject ? "Location updated" : "Location added" });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving location:", error);
      toast({ title: "Error", description: "Failed to save location", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemSubmit = async (values: ItemFormValues, profileImageUrl: string | null) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const details: Record<string, any> = {
        item_type: values.item_type,
        item_description: values.description,
        serial_number: values.serial_number,
        evidence_reference: values.evidence_reference,
      };

      // Remove empty values
      Object.keys(details).forEach(key => {
        if (!details[key]) delete details[key];
      });

      const subjectData = {
        case_id: caseId,
        organization_id: organizationId,
        user_id: user.id,
        subject_type: 'item' as const,
        name: values.name,
        display_name: values.name,
        notes: values.notes || null,
        details,
        profile_image_url: profileImageUrl,
        status: 'active' as const,
      };

      if (subject) {
        const { error } = await supabase
          .from("case_subjects")
          .update({
            name: subjectData.name,
            display_name: subjectData.display_name,
            notes: subjectData.notes,
            details: subjectData.details,
            profile_image_url: subjectData.profile_image_url,
          })
          .eq("id", subject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("case_subjects").insert(subjectData);
        if (error) throw error;
      }

      toast({ title: "Success", description: subject ? "Item updated" : "Item added" });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving item:", error);
      toast({ title: "Error", description: "Failed to save item", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = () => {
    switch (category) {
      case 'person':
        return (
          <PersonForm
            subject={subject || undefined}
            onSubmit={handlePersonSubmit}
            isSubmitting={isSubmitting}
            readOnly={readOnly}
          />
        );
      case 'vehicle':
        return (
          <VehicleForm
            subject={subject || undefined}
            onSubmit={handleVehicleSubmit}
            isSubmitting={isSubmitting}
            readOnly={readOnly}
          />
        );
      case 'location':
        return (
          <LocationForm
            subject={subject || undefined}
            onSubmit={handleLocationSubmit}
            isSubmitting={isSubmitting}
            readOnly={readOnly}
          />
        );
      case 'item':
        return (
          <ItemForm
            subject={subject || undefined}
            onSubmit={handleItemSubmit}
            isSubmitting={isSubmitting}
            readOnly={readOnly}
          />
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>
            {subject ? (readOnly ? 'View' : 'Edit') : 'Add'} {SUBJECT_CATEGORY_SINGULAR[category]}
          </SheetTitle>
          <SheetDescription>
            {subject 
              ? (readOnly ? `Viewing ${SUBJECT_CATEGORY_SINGULAR[category].toLowerCase()} details` : `Update ${SUBJECT_CATEGORY_SINGULAR[category].toLowerCase()} information`)
              : `Add a new ${SUBJECT_CATEGORY_SINGULAR[category].toLowerCase()} to this case`
            }
          </SheetDescription>
        </SheetHeader>
        {renderForm()}
      </SheetContent>
    </Sheet>
  );
};
