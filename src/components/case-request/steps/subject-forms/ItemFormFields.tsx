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
import { ITEM_TYPES, ITEM_CONDITIONS } from "@/components/case-detail/subjects/types";
import { SubjectData } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig, isFieldVisible } from "@/types/case-request-form-config";
import { Loader2, Package, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubjectType {
  id: string;
  name: string;
  category: string;
}

interface ItemFormFieldsProps {
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
    name: z.string().min(1, "Item name is required"),
    item_type: z.string().optional(),
    description: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    color: z.string().optional(),
    serial_number: z.string().optional(),
    condition: z.string().optional(),
    evidence_reference: z.string().optional(),
    notes: z.string().optional(),
  }),
});

type ItemFormData = z.infer<typeof schema>;

export function ItemFormFields({
  subject,
  subjectTypes,
  fieldConfig,
  onSubmit,
  isSubmitting,
}: ItemFormFieldsProps) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(subject?.photo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter to only show item types
  const itemSubjectTypes = subjectTypes?.filter(st => st.category === 'item');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: subject.id,
      subject_type_id: subject.subject_type_id,
      is_primary: subject.is_primary,
      photo_url: subject.photo_url,
      custom_fields: {
        name: subject.custom_fields?.name || '',
        item_type: subject.custom_fields?.item_type || '',
        description: subject.custom_fields?.description || '',
        brand: subject.custom_fields?.brand || '',
        model: subject.custom_fields?.model || '',
        color: subject.custom_fields?.color || '',
        serial_number: subject.custom_fields?.serial_number || '',
        condition: subject.custom_fields?.condition || '',
        evidence_reference: subject.custom_fields?.evidence_reference || '',
        notes: subject.custom_fields?.notes || '',
      },
    },
  });

  const selectedSubjectTypeId = watch("subject_type_id");
  const selectedItemType = watch("custom_fields.item_type");
  const selectedCondition = watch("custom_fields.condition");

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

  const onFormSubmit = (data: ItemFormData) => {
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
      {itemSubjectTypes && itemSubjectTypes.length > 0 && (
        <div className="space-y-2">
          <Label>Item Type <span className="text-destructive">*</span></Label>
          <Select
            value={selectedSubjectTypeId || ''}
            onValueChange={(value) => setValue("subject_type_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select item type" />
            </SelectTrigger>
            <SelectContent>
              {itemSubjectTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Item Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Item Name <span className="text-destructive">*</span></Label>
        <Input
          id="name"
          placeholder="e.g., iPhone 15, Louis Vuitton Bag"
          {...register("custom_fields.name")}
        />
        {errors.custom_fields?.name && (
          <p className="text-xs text-destructive">{errors.custom_fields.name.message}</p>
        )}
      </div>

      {/* Item Category */}
      <div className="space-y-2">
        <Label>Item Category</Label>
        <Select
          value={selectedItemType || ''}
          onValueChange={(value) => setValue("custom_fields.item_type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {ITEM_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Detailed description of the item..."
          {...register("custom_fields.description")}
        />
      </div>

      {/* Brand and Model */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            placeholder="e.g., Apple, Samsung"
            {...register("custom_fields.brand")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            placeholder="e.g., iPhone 15 Pro"
            {...register("custom_fields.model")}
          />
        </div>
      </div>

      {/* Color and Condition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            placeholder="e.g., Black, Silver"
            {...register("custom_fields.color")}
          />
        </div>
        <div className="space-y-2">
          <Label>Condition</Label>
          <Select
            value={selectedCondition || ''}
            onValueChange={(value) => setValue("custom_fields.condition", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {ITEM_CONDITIONS.map((condition) => (
                <SelectItem key={condition.value} value={condition.value}>
                  {condition.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Serial Number */}
      <div className="space-y-2">
        <Label htmlFor="serial_number">Serial Number</Label>
        <Input
          id="serial_number"
          placeholder="Serial or identifying number"
          {...register("custom_fields.serial_number")}
        />
      </div>

      {/* Evidence Reference */}
      <div className="space-y-2">
        <Label htmlFor="evidence_reference">Evidence Reference</Label>
        <Input
          id="evidence_reference"
          placeholder="Evidence tag or reference number"
          {...register("custom_fields.evidence_reference")}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes about the item..."
          {...register("custom_fields.notes")}
        />
      </div>

      {/* Photo Upload */}
      {isFieldVisible(fieldConfig, 'subjectInformation', 'subjectPhoto') && (
        <div className="space-y-2">
          <Label>Item Photo</Label>
          <div className="border-2 border-dashed rounded-lg p-6">
            {photoPreview ? (
              <div className="flex items-center gap-4">
                <img
                  src={photoPreview}
                  alt="Item photo"
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
                <Package className="mx-auto h-8 w-8 text-muted-foreground" />
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
