import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { US_STATES } from "@/components/case-detail/subjects/types";
import { SubjectData } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig, isFieldVisible } from "@/types/case-request-form-config";
import { Loader2, Building2, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUSINESS_TYPES = [
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'LLC' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
] as const;

interface SubjectType {
  id: string;
  name: string;
  category: string;
}

interface BusinessFormFieldsProps {
  subject: SubjectData;
  subjectTypes?: SubjectType[];
  fieldConfig: CaseRequestFormConfig;
  onSubmit: (data: SubjectData) => void;
  isSubmitting: boolean;
}

const schema = z.object({
  id: z.string(),
  subject_type_id: z.string().nullable(),
  is_primary: z.boolean(),
  photo_url: z.string().nullable(),
  custom_fields: z.object({
    name: z.string().min(1, "Business name is required"),
    business_type: z.string().optional(),
    contact_person: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().or(z.literal('')).optional(),
    website: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    ein: z.string().optional(),
    notes: z.string().optional(),
  }),
});

type BusinessFormData = z.infer<typeof schema>;

export function BusinessFormFields({
  subject,
  subjectTypes,
  fieldConfig,
  onSubmit,
  isSubmitting,
}: BusinessFormFieldsProps) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(subject?.photo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter to only show business types
  const businessSubjectTypes = subjectTypes?.filter(st => st.category === 'business');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BusinessFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: subject.id,
      subject_type_id: subject.subject_type_id,
      is_primary: subject.is_primary,
      photo_url: subject.photo_url,
      custom_fields: {
        name: subject.custom_fields?.name || '',
        business_type: subject.custom_fields?.business_type || '',
        contact_person: subject.custom_fields?.contact_person || '',
        phone: subject.custom_fields?.phone || '',
        email: subject.custom_fields?.email || '',
        website: subject.custom_fields?.website || '',
        street: subject.custom_fields?.street || '',
        city: subject.custom_fields?.city || '',
        state: subject.custom_fields?.state || '',
        zip: subject.custom_fields?.zip || '',
        ein: subject.custom_fields?.ein || '',
        notes: subject.custom_fields?.notes || '',
      },
    },
  });

  const selectedSubjectTypeId = watch("subject_type_id");
  const selectedBusinessType = watch("custom_fields.business_type");
  const selectedState = watch("custom_fields.state");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `subject-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('case-request-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('case-request-files')
        .getPublicUrl(filePath);

      setValue("photo_url", publicUrl);
      setPhotoPreview(publicUrl);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    setValue("photo_url", null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onFormSubmit = (data: BusinessFormData) => {
    const subjectData: SubjectData = {
      ...subject,
      subject_type_id: data.subject_type_id,
      photo_url: data.photo_url,
      custom_fields: data.custom_fields,
    };
    onSubmit(subjectData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Subject Type Selection */}
      {businessSubjectTypes && businessSubjectTypes.length > 0 && (
        <div className="space-y-2">
          <Label>Business Type <span className="text-destructive">*</span></Label>
          <Select
            value={selectedSubjectTypeId || ''}
            onValueChange={(value) => setValue("subject_type_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              {businessSubjectTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Business Name <span className="text-destructive">*</span></Label>
        <Input
          id="name"
          placeholder="e.g., ABC Corporation"
          {...register("custom_fields.name")}
        />
        {errors.custom_fields?.name && (
          <p className="text-xs text-destructive">{errors.custom_fields.name.message}</p>
        )}
      </div>

      {/* Business Category */}
      <div className="space-y-2">
        <Label>Business Category</Label>
        <Select
          value={selectedBusinessType || ''}
          onValueChange={(value) => setValue("custom_fields.business_type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contact Person */}
      <div className="space-y-2">
        <Label htmlFor="contact_person">Contact Person</Label>
        <Input
          id="contact_person"
          placeholder="Primary contact name"
          {...register("custom_fields.contact_person")}
        />
      </div>

      {/* Phone and Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            placeholder="(555) 555-5555"
            {...register("custom_fields.phone")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="contact@business.com"
            {...register("custom_fields.email")}
          />
          {errors.custom_fields?.email && (
            <p className="text-xs text-destructive">{errors.custom_fields.email.message}</p>
          )}
        </div>
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          placeholder="https://www.business.com"
          {...register("custom_fields.website")}
        />
      </div>

      {/* Address */}
      <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
        <h4 className="text-sm font-medium">Address</h4>
        
        <div className="space-y-2">
          <Label htmlFor="street">Street</Label>
          <Input
            id="street"
            placeholder="123 Business Ave"
            {...register("custom_fields.street")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="City"
              {...register("custom_fields.city")}
            />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Select
              value={selectedState || ''}
              onValueChange={(value) => setValue("custom_fields.state", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip">Zip</Label>
            <Input
              id="zip"
              placeholder="12345"
              maxLength={10}
              {...register("custom_fields.zip")}
            />
          </div>
        </div>
      </div>

      {/* EIN */}
      <div className="space-y-2">
        <Label htmlFor="ein">EIN (Optional)</Label>
        <Input
          id="ein"
          placeholder="XX-XXXXXXX"
          {...register("custom_fields.ein")}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes about the business..."
          {...register("custom_fields.notes")}
        />
      </div>

      {/* Photo Upload */}
      {isFieldVisible(fieldConfig, 'subjectInformation', 'subjectPhoto') && (
        <div className="space-y-2">
          <Label>Business Logo/Photo</Label>
          <div className="border-2 border-dashed rounded-lg p-6">
            {photoPreview ? (
              <div className="flex items-center gap-4">
                <img
                  src={photoPreview}
                  alt="Business photo"
                  className="h-24 w-24 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Photo uploaded</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removePhoto}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center relative">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click to upload a logo or photo
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploadingPhoto}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 relative"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Select Photo'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save & Continue"
        )}
      </Button>
    </form>
  );
}
