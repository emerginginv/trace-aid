import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { US_STATES } from "@/components/case-detail/subjects/types";
import { SubjectData } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig, isFieldVisible } from "@/types/case-request-form-config";
import { Loader2, User, Upload, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PhoneInput } from "../../PhoneInput";
import { SSNInput } from "../../SSNInput";
import { HelpTooltip } from "@/components/ui/tooltip";

const COUNTRIES = [
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Australia", label: "Australia" },
  { value: "Mexico", label: "Mexico" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Spain", label: "Spain" },
  { value: "Other", label: "Other" },
];

const RACES = [
  { value: "Unknown", label: "Unknown" },
  { value: "White", label: "White/Caucasian" },
  { value: "Black", label: "Black/African American" },
  { value: "Hispanic", label: "Hispanic/Latino" },
  { value: "Asian", label: "Asian" },
  { value: "Native American", label: "Native American" },
  { value: "Pacific Islander", label: "Pacific Islander" },
  { value: "Mixed", label: "Mixed/Multi-racial" },
  { value: "Other", label: "Other" },
];

interface SubjectType {
  id: string;
  name: string;
  category: string;
}

interface PersonFormFieldsProps {
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
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string(),
  last_name: z.string().min(1, "Last name is required"),
  country: z.string(),
  address1: z.string(),
  address2: z.string(),
  address3: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  cell_phone: z.string(),
  alias: z.string(),
  date_of_birth: z.string(),
  age: z.number().nullable(),
  height: z.string(),
  weight: z.string(),
  race: z.string(),
  sex: z.string(),
  ssn: z.string(),
  email: z.string().email().or(z.literal('')),
  photo_url: z.string().nullable(),
  custom_fields: z.record(z.any()),
});

export function PersonFormFields({
  subject,
  subjectTypes,
  fieldConfig,
  onSubmit,
  isSubmitting,
}: PersonFormFieldsProps) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(subject?.photo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubjectData>({
    resolver: zodResolver(schema),
    defaultValues: subject,
  });

  const selectedCountry = watch("country");
  const selectedSex = watch("sex");
  const selectedSubjectTypeId = watch("subject_type_id");
  const watchedDOB = watch("date_of_birth");
  const watchedSSN = watch("ssn");
  const watchedCellPhone = watch("cell_phone");

  // Filter to only show person types
  const personSubjectTypes = subjectTypes?.filter(st => st.category === 'person');

  // Auto-calculate age from DOB
  useEffect(() => {
    if (watchedDOB) {
      const birthDate = new Date(watchedDOB);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age >= 0 && age < 150) {
        setValue("age", age);
      }
    }
  }, [watchedDOB, setValue]);

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Subject Type Selection */}
      {personSubjectTypes && personSubjectTypes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Subject Type <span className="text-destructive">*</span></Label>
            <HelpTooltip content="Categorizes the subject for proper handling" />
          </div>
          <Select
            value={selectedSubjectTypeId || ''}
            onValueChange={(value) => setValue("subject_type_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject type" />
            </SelectTrigger>
            <SelectContent>
              {personSubjectTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the subject category (e.g., Claimant, Insured, Witness).
          </p>
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-2">
        <Label>Full Name <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="First Name"
                className="pl-9"
                {...register("first_name")}
              />
            </div>
            {errors.first_name && (
              <p className="text-xs text-destructive">{errors.first_name.message}</p>
            )}
          </div>
          <Input placeholder="Middle Name" {...register("middle_name")} />
          <div className="space-y-1">
            <Input placeholder="Last Name" {...register("last_name")} />
            {errors.last_name && (
              <p className="text-xs text-destructive">{errors.last_name.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Street Address */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label>Street Address</Label>
          <HelpTooltip content="Last known address of the subject" />
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Enter the most recent known address. Include apartment/unit numbers.
        </p>
        <Select
          value={selectedCountry}
          onValueChange={(value) => setValue("country", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input placeholder="Address 1" {...register("address1")} />
        <Input placeholder="Address 2" {...register("address2")} />
        <Input placeholder="Address 3" {...register("address3")} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="City" {...register("city")} />
          {selectedCountry === "United States" ? (
            <Select
              value={watch("state")}
              onValueChange={(value) => setValue("state", value)}
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
          ) : (
            <Input placeholder="State/Province" {...register("state")} />
          )}
          <Input placeholder="Zip/Postal Code" {...register("zip")} />
        </div>
      </div>

      {/* Contact & Personal Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="cell_phone">Cell Phone</Label>
            <HelpTooltip content="Primary contact number for the subject" />
          </div>
          <PhoneInput
            id="cell_phone"
            value={watchedCellPhone}
            onChange={(value) => setValue("cell_phone", value)}
            placeholder="(555) 555-5555"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="alias">Alias</Label>
            <HelpTooltip content="Other names the subject uses" />
          </div>
          <Input id="alias" placeholder="Known aliases" {...register("alias")} />
          <p className="text-xs text-muted-foreground">
            Include maiden names, nicknames, or known aliases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <HelpTooltip content="Used for identification verification" />
          </div>
          <Input
            id="date_of_birth"
            type="date"
            {...register("date_of_birth")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            placeholder="Auto-calculated"
            readOnly
            className="bg-muted"
            {...register("age", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Auto-calculated from date of birth.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="height">Height</Label>
          <Input id="height" placeholder="e.g., 5'10&quot;" {...register("height")} />
          <p className="text-xs text-muted-foreground">Enter as feet and inches.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <Input id="weight" placeholder="e.g., 180 lbs" {...register("weight")} />
          <p className="text-xs text-muted-foreground">Enter in pounds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="race">Race</Label>
            <HelpTooltip content="For identification purposes only" />
          </div>
          <Select
            value={watch("race")}
            onValueChange={(value) => setValue("race", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select race" />
            </SelectTrigger>
            <SelectContent>
              {RACES.map((race) => (
                <SelectItem key={race.value} value={race.value}>
                  {race.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Sex</Label>
          <RadioGroup
            value={selectedSex}
            onValueChange={(value) => setValue("sex", value)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="sex-male" />
              <Label htmlFor="sex-male" className="cursor-pointer">Male</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="sex-female" />
              <Label htmlFor="sex-female" className="cursor-pointer">Female</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unknown" id="sex-unknown" />
              <Label htmlFor="sex-unknown" className="cursor-pointer">Unknown</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="ssn">Social Security Number</Label>
          <HelpTooltip content="Required for certain investigation types" />
        </div>
        <SSNInput
          id="ssn"
          value={watchedSSN}
          onChange={(value) => setValue("ssn", value)}
        />
        <p className="text-xs text-muted-foreground">
          This field is encrypted and stored securely. Enter if available and required for your case type.
        </p>
      </div>

      {/* Photo Upload */}
      {isFieldVisible(fieldConfig, 'subjectInformation', 'subjectPhoto') && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Photo</Label>
            <HelpTooltip content="Clear, recent photograph of the subject" />
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a clear, recent photo. Accepted formats: JPG, PNG. Maximum 5MB.
          </p>
          <div className="border-2 border-dashed rounded-lg p-6">
            {photoPreview ? (
              <div className="flex items-center gap-4">
                <img
                  src={photoPreview}
                  alt="Subject photo"
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
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
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
