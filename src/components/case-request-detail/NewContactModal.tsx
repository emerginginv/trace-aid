import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  title: z.string().optional(),
  role: z.string().optional(),
  access_level: z.enum(["disabled", "limited", "location", "full"]).default("full"),
  email: z.string().email().optional().or(z.literal("")),
  office_phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  home_phone: z.string().optional(),
  fax: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface NewContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactCreated: (contactId: string) => void;
  organizationId: string;
  accountId: string;
  defaultValues?: {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    email?: string | null;
    officePhone?: string | null;
    mobilePhone?: string | null;
    homePhone?: string | null;
  };
}

const roleOptions = [
  { value: "primary", label: "Primary Contact" },
  { value: "billing", label: "Billing Contact" },
  { value: "claims", label: "Claims Adjuster" },
  { value: "manager", label: "Manager" },
  { value: "other", label: "Other" },
];

export function NewContactModal({
  open,
  onOpenChange,
  onContactCreated,
  organizationId,
  accountId,
  defaultValues,
}: NewContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: defaultValues?.firstName || "",
      middle_name: defaultValues?.middleName || "",
      last_name: defaultValues?.lastName || "",
      title: "",
      role: "",
      access_level: "full",
      email: defaultValues?.email || "",
      office_phone: defaultValues?.officePhone || "",
      mobile_phone: defaultValues?.mobilePhone || "",
      home_phone: defaultValues?.homePhone || "",
      fax: "",
    },
  });

  const accessLevel = watch("access_level");
  const role = watch("role");

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: newContact, error } = await supabase
        .from("contacts")
        .insert([
          {
            organization_id: organizationId,
            account_id: accountId,
            user_id: user.id,
            first_name: data.first_name,
            middle_name: data.middle_name || null,
            last_name: data.last_name,
            title: data.title || null,
            role: data.role || null,
            access_level: data.access_level,
            email: data.email || null,
            office_phone: data.office_phone || null,
            mobile_phone: data.mobile_phone || null,
            home_phone: data.home_phone || null,
            fax: data.fax || null,
            status: "active",
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Contact created successfully");
      reset();
      onContactCreated(newContact.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating contact:", error);
      toast.error("Failed to create contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Contact</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Name</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-xs text-muted-foreground">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  {...register("first_name")}
                  placeholder="First"
                />
                {errors.first_name && (
                  <p className="text-xs text-destructive">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle_name" className="text-xs text-muted-foreground">
                  Middle Name
                </Label>
                <Input
                  id="middle_name"
                  {...register("middle_name")}
                  placeholder="Middle"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-xs text-muted-foreground">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  placeholder="Last"
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Title and Role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="e.g., Claims Adjuster"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setValue("role", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Access Level */}
          <div className="space-y-3">
            <Label>Access Level</Label>
            <RadioGroup
              value={accessLevel}
              onValueChange={(value) => setValue("access_level", value as ContactFormData["access_level"])}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="disabled" id="disabled" />
                <Label htmlFor="disabled" className="font-normal cursor-pointer">
                  Disabled
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="limited" id="limited" />
                <Label htmlFor="limited" className="font-normal cursor-pointer">
                  Limited
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="location" id="location" />
                <Label htmlFor="location" className="font-normal cursor-pointer">
                  Location
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Full
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Contact Information</Label>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="office_phone" className="text-xs text-muted-foreground">
                  Office Phone
                </Label>
                <Input
                  id="office_phone"
                  {...register("office_phone")}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile_phone" className="text-xs text-muted-foreground">
                  Mobile Phone
                </Label>
                <Input
                  id="mobile_phone"
                  {...register("mobile_phone")}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="home_phone" className="text-xs text-muted-foreground">
                  Home Phone
                </Label>
                <Input
                  id="home_phone"
                  {...register("home_phone")}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fax" className="text-xs text-muted-foreground">
                Fax
              </Label>
              <Input
                id="fax"
                {...register("fax")}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}