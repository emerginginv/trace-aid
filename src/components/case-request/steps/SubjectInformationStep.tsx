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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { US_STATES } from "@/components/case-detail/subjects/types";
import { SubjectData, createEmptySubject } from "@/hooks/useCaseRequestForm";
import { CaseRequestFormConfig, isFieldVisible } from "@/types/case-request-form-config";
import { Loader2, ArrowLeft, User, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COUNTRIES = [
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Australia", label: "Australia" },
  { value: "Other", label: "Other" },
];

const RACES = [
  { value: "", label: "Select Race" },
  { value: "Asian", label: "Asian" },
  { value: "Black", label: "Black/African American" },
  { value: "Hispanic", label: "Hispanic/Latino" },
  { value: "Native American", label: "Native American" },
  { value: "Pacific Islander", label: "Pacific Islander" },
  { value: "White", label: "White/Caucasian" },
  { value: "Mixed", label: "Mixed/Multi-racial" },
  { value: "Other", label: "Other" },
  { value: "Unknown", label: "Unknown" },
];

interface SubjectInformationStepProps {
  fieldConfig: CaseRequestFormConfig;
  organizationId: string;
  subject: SubjectData | null;
  onSubmit: (data: SubjectData) => void;
  onBack: () => void;
  isEditing?: boolean;
}

export function SubjectInformationStep({
  fieldConfig,
  organizationId,
  subject,
  onSubmit,
  onBack,
  isEditing = false,
}: SubjectInformationStepProps) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(subject?.photo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialData = subject || createEmptySubject(true);

  const schema = z.object({
    id: z.string(),
    subject_type_id: z.string().nullable(),
    is_primary: z.boolean(),
    first_name: z.string(),
    middle_name: z.string(),
    last_name: z.string(),
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<SubjectData>({
    resolver: zodResolver(schema),
    defaultValues: initialData,
  });

  const selectedCountry = watch("country");
  const selectedSex = watch("sex");

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

  const showSubjectFields = isFieldVisible(fieldConfig, 'subjectInformation', 'primarySubject');

  if (!showSubjectFields) {
    // Auto-skip if subjects not visible
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Subject information is not required for this form.</p>
          </CardContent>
        </Card>
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => onSubmit(createEmptySubject(true))}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? 'Edit Subject' : 'Subject Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label>Full Name</Label>
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
              </div>
              <Input placeholder="Middle Name" {...register("middle_name")} />
              <Input placeholder="Last Name" {...register("last_name")} />
            </div>
          </div>

          {/* Street Address */}
          <div className="space-y-4">
            <Label>Street Address</Label>
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
              <Label htmlFor="cell_phone">Cell Phone</Label>
              <Input
                id="cell_phone"
                type="tel"
                placeholder="(555) 555-5555"
                {...register("cell_phone")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alias">Alias</Label>
              <Input id="alias" placeholder="Known aliases" {...register("alias")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
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
                placeholder="Age"
                {...register("age", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                {...register("email")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input id="height" placeholder="e.g., 5'10&quot;" {...register("height")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input id="weight" placeholder="e.g., 180 lbs" {...register("weight")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="race">Race</Label>
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
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ssn">Social Security Number</Label>
            <Input
              id="ssn"
              type="password"
              placeholder="XXX-XX-XXXX"
              {...register("ssn")}
            />
            <p className="text-xs text-muted-foreground">This field is encrypted and securely stored.</p>
          </div>

          {/* Photo Upload */}
          {isFieldVisible(fieldConfig, 'subjectInformation', 'subjectPhoto') && (
            <div className="space-y-2">
              <Label>Photo</Label>
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
                  <div className="text-center">
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
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save & Continue"
          )}
        </Button>
      </div>
    </form>
  );
}
