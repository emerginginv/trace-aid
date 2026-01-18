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
import { US_STATES, VEHICLE_TYPES } from "@/components/case-detail/subjects/types";
import { SubjectData } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig, isFieldVisible } from "@/types/case-request-form-config";
import { Loader2, Car, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/ui/tooltip";

interface SubjectType {
  id: string;
  name: string;
  category: string;
}

interface VehicleFormFieldsProps {
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
    vehicle_type: z.string().optional(),
    year: z.string().optional(),
    make: z.string().optional(),
    model: z.string().optional(),
    color: z.string().optional(),
    license_plate: z.string().optional(),
    plate_state: z.string().optional(),
    vin: z.string().optional(),
    registered_owner: z.string().optional(),
    notes: z.string().optional(),
  }),
});

type VehicleFormData = z.infer<typeof schema>;

export function VehicleFormFields({
  subject,
  subjectTypes,
  fieldConfig,
  onSubmit,
  isSubmitting,
}: VehicleFormFieldsProps) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(subject?.photo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter to only show vehicle types
  const vehicleSubjectTypes = subjectTypes?.filter(st => st.category === 'vehicle');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: subject.id,
      subject_type_id: subject.subject_type_id,
      is_primary: subject.is_primary,
      photo_url: subject.photo_url,
      custom_fields: {
        vehicle_type: subject.custom_fields?.vehicle_type || '',
        year: subject.custom_fields?.year || '',
        make: subject.custom_fields?.make || '',
        model: subject.custom_fields?.model || '',
        color: subject.custom_fields?.color || '',
        license_plate: subject.custom_fields?.license_plate || '',
        plate_state: subject.custom_fields?.plate_state || '',
        vin: subject.custom_fields?.vin || '',
        registered_owner: subject.custom_fields?.registered_owner || '',
        notes: subject.custom_fields?.notes || '',
      },
    },
  });

  const selectedSubjectTypeId = watch("subject_type_id");
  const selectedVehicleType = watch("custom_fields.vehicle_type");
  const selectedPlateState = watch("custom_fields.plate_state");

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

  const onFormSubmit = (data: VehicleFormData) => {
    // Convert to SubjectData format
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
      {vehicleSubjectTypes && vehicleSubjectTypes.length > 0 && (
        <div className="space-y-2">
          <Label>Vehicle Type <span className="text-destructive">*</span></Label>
          <Select
            value={selectedSubjectTypeId || ''}
            onValueChange={(value) => setValue("subject_type_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              {vehicleSubjectTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Vehicle Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            placeholder="e.g., 2024"
            {...register("custom_fields.year")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="make">Make</Label>
          <Input
            id="make"
            placeholder="e.g., Toyota"
            {...register("custom_fields.make")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            placeholder="e.g., Camry"
            {...register("custom_fields.model")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            placeholder="e.g., Black"
            {...register("custom_fields.color")}
          />
        </div>
        <div className="space-y-2">
          <Label>Vehicle Category</Label>
          <Select
            value={selectedVehicleType || ''}
            onValueChange={(value) => setValue("custom_fields.vehicle_type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* License Plate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="license_plate">License Plate</Label>
          <Input
            id="license_plate"
            placeholder="e.g., ABC1234"
            {...register("custom_fields.license_plate")}
          />
        </div>
        <div className="space-y-2">
          <Label>Plate State</Label>
          <Select
            value={selectedPlateState || ''}
            onValueChange={(value) => setValue("custom_fields.plate_state", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
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
      </div>

      {/* VIN */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="vin">VIN (Vehicle Identification Number)</Label>
          <HelpTooltip content="17-character vehicle identification number" />
        </div>
        <Input
          id="vin"
          placeholder="e.g., 1HGBH41JXMN109186"
          maxLength={17}
          {...register("custom_fields.vin")}
        />
        <p className="text-xs text-muted-foreground">
          Located on dashboard near windshield or driver's door jamb.
        </p>
      </div>

      {/* Registered Owner */}
      <div className="space-y-2">
        <Label htmlFor="registered_owner">Registered Owner</Label>
        <Input
          id="registered_owner"
          placeholder="Owner name"
          {...register("custom_fields.registered_owner")}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes about the vehicle..."
          {...register("custom_fields.notes")}
        />
      </div>

      {/* Photo Upload */}
      {isFieldVisible(fieldConfig, 'subjectInformation', 'subjectPhoto') && (
        <div className="space-y-2">
          <Label>Vehicle Photo</Label>
          <div className="border-2 border-dashed rounded-lg p-6">
            {photoPreview ? (
              <div className="flex items-center gap-4">
                <img
                  src={photoPreview}
                  alt="Vehicle photo"
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
                <Car className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click to upload a photo
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
