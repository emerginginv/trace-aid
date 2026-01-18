import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useNavigationSource } from "@/hooks/useNavigationSource";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowLeft,
  User,
  Car,
  MapPin,
  Package,
  Edit,
  Calendar,
  FileText,
  Hash,
  Tag,
  Ruler,
  Weight,
  Palette,
  Building2,
  Globe,
  Archive,
  ArchiveRestore,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ContactDetailSkeleton } from "@/components/ui/detail-page-skeleton";
import { 
  Subject, 
  SubjectCategory, 
  PERSON_ROLES, 
  VEHICLE_TYPES, 
  LOCATION_TYPES, 
  ITEM_TYPES, 
  US_STATES, 
  SUBJECT_CATEGORY_SINGULAR,
  ProfileImageModal,
  SubjectDrawer,
  SubjectDetailField,
  SocialMediaLinksWidget,
  LinkedEntitiesPanel,
} from "@/components/case-detail/subjects";
import { logSubjectAudit } from "@/lib/subjectAuditLogger";

const getCategoryIcon = (category: SubjectCategory) => {
  switch (category) {
    case 'person':
      return User;
    case 'vehicle':
      return Car;
    case 'location':
      return MapPin;
    case 'item':
      return Package;
  }
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getRoleLabel = (value: string | null | undefined): string => {
  if (!value) return '';
  const role = PERSON_ROLES.find(r => r.value === value);
  return role?.label || value;
};

const getVehicleTypeLabel = (value: string | null | undefined): string => {
  if (!value) return '';
  const type = VEHICLE_TYPES.find(t => t.value === value);
  return type?.label || value;
};

const getLocationTypeLabel = (value: string | null | undefined): string => {
  if (!value) return '';
  const type = LOCATION_TYPES.find(t => t.value === value);
  return type?.label || value;
};

const getItemTypeLabel = (value: string | null | undefined): string => {
  if (!value) return '';
  const type = ITEM_TYPES.find(t => t.value === value);
  return type?.label || value;
};

const getStateLabel = (value: string | null | undefined): string => {
  if (!value) return '';
  const state = US_STATES.find(s => s.value === value);
  return state?.label || value;
};

interface SubjectType {
  id: string;
  name: string;
  category: SubjectCategory;
}

export default function SubjectDetail() {
  const { subjectId, caseId } = useParams<{ subjectId: string; caseId?: string }>();
  const navigate = useNavigate();
  const { getBackPath } = useNavigationSource();
  const setBreadcrumbs = useSetBreadcrumbs();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [subjectType, setSubjectType] = useState<SubjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedProfileUrl, setSignedProfileUrl] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [caseName, setCaseName] = useState<string>("");
  const [caseNumber, setCaseNumber] = useState<string>("");

  useEffect(() => {
    if (subjectId) {
      loadSubject();
    }
  }, [subjectId]);

  useEffect(() => {
    if (subject?.case_id) {
      loadCaseInfo();
    }
  }, [subject?.case_id]);

  useEffect(() => {
    if (subject && caseName) {
      const displayName = getDisplayName();
      setBreadcrumbs([
        { label: "Cases", href: "/cases" },
        { label: caseNumber || caseName, href: `/cases/${subject.case_id}` },
        { label: "Subjects", href: `/cases/${subject.case_id}` },
        { label: displayName },
      ]);
    }
  }, [subject, caseName, caseNumber, setBreadcrumbs]);

  const loadSubject = async () => {
    if (!subjectId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("case_subjects")
        .select("*")
        .eq("id", subjectId)
        .single();

      if (error) throw error;

      setSubject(data);

      // Load subject type info
      if (data.subject_type_id) {
        const { data: typeData } = await supabase
          .from("subject_types")
          .select("id, name, category")
          .eq("id", data.subject_type_id)
          .single();
        
        if (typeData) {
          setSubjectType(typeData);
        }
      }

      // Generate signed URL for profile image
      if (data.profile_image_url) {
        try {
          if (data.profile_image_url.startsWith('data:') || 
              data.profile_image_url.startsWith('http://') || 
              data.profile_image_url.startsWith('https://')) {
            setSignedProfileUrl(data.profile_image_url);
          } else {
            let filePath = data.profile_image_url;
            if (filePath.includes('subject-profile-images/')) {
              filePath = filePath.split('subject-profile-images/').pop() || filePath;
            }
            const { data: signedData } = await supabase.storage
              .from('subject-profile-images')
              .createSignedUrl(filePath, 3600);
            if (signedData?.signedUrl) {
              setSignedProfileUrl(signedData.signedUrl);
            }
          }
        } catch (err) {
          console.error('Error generating signed URL:', err);
        }
      }
    } catch (error) {
      console.error("Error loading subject:", error);
      toast.error("Failed to load subject");
    } finally {
      setLoading(false);
    }
  };

  const loadCaseInfo = async () => {
    if (!subject?.case_id) return;
    
    const { data, error } = await supabase
      .from("cases")
      .select("name, case_number")
      .eq("id", subject.case_id)
      .single();
    
    if (data) {
      setCaseName(data.name);
      setCaseNumber(data.case_number || "");
    }
  };

  const handleArchiveToggle = async () => {
    if (!subject) return;

    const newArchivedState = !subject.archived;

    try {
      const { error } = await supabase
        .from("case_subjects")
        .update({ archived: newArchivedState })
        .eq("id", subject.id);

      if (error) throw error;

      await logSubjectAudit({
        subjectId: subject.id,
        caseId: subject.case_id,
        action: newArchivedState ? 'archive' : 'unarchive',
        fieldName: 'archived',
        oldValue: String(!newArchivedState),
        newValue: String(newArchivedState),
      });

      setSubject({ ...subject, archived: newArchivedState });
      toast.success(newArchivedState ? "Subject archived" : "Subject unarchived");
    } catch (error) {
      console.error("Error toggling archive status:", error);
      toast.error("Failed to update archive status");
    }
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    loadSubject();
  };

  const getDisplayName = (): string => {
    if (!subject) return "Subject";
    const category = subjectType?.category || 'person';

    switch (category) {
      case 'person':
        const nameParts = [subject.first_name, subject.middle_name, subject.last_name].filter(Boolean);
        return nameParts.length > 0 ? nameParts.join(' ') : 'Unnamed Person';
      case 'vehicle':
        const vehicleParts = [subject.vehicle_year, subject.vehicle_make, subject.vehicle_model].filter(Boolean);
        return vehicleParts.length > 0 ? vehicleParts.join(' ') : 'Unnamed Vehicle';
      case 'location':
        return subject.location_name || subject.address1 || 'Unnamed Location';
      case 'item':
        return subject.item_description || 'Unnamed Item';
      default:
        return 'Subject';
    }
  };

  const getQuickInfo = (): string | null => {
    if (!subject) return null;
    const category = subjectType?.category || 'person';
    
    if (category === 'person' && subject.date_of_birth) {
      return format(new Date(subject.date_of_birth), "MMM d, yyyy");
    } else if (category === 'vehicle' && subject.vehicle_license_plate) {
      return subject.vehicle_license_plate;
    } else if (category === 'location') {
      const parts = [subject.city, subject.state].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : null;
    } else if (category === 'item') {
      const parts = [subject.item_brand, subject.item_model].filter(Boolean);
      return parts.length > 0 ? parts.join(" ") : null;
    }
    return null;
  };

  const handleBackClick = () => {
    const backPath = getBackPath();
    if (backPath) {
      navigate(backPath);
    } else if (subject?.case_id) {
      navigate(`/cases/${subject.case_id}`);
    } else {
      navigate("/cases");
    }
  };

  if (loading) {
    return <ContactDetailSkeleton />;
  }

  if (!subject) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Subject not found</h2>
          <p className="text-muted-foreground mb-4">The subject you're looking for doesn't exist or has been removed.</p>
          <Button onClick={handleBackClick}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const category = subjectType?.category || 'person';
  const CategoryIcon = getCategoryIcon(category);
  const displayName = getDisplayName();
  const quickInfo = getQuickInfo();

  const formatAddress = () => {
    const parts = [
      subject.address1,
      subject.address2,
      subject.address3,
      [subject.city, getStateLabel(subject.state)].filter(Boolean).join(", "),
      subject.zip,
      subject.country
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Hero Header - Matching ContactDetail design */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-secondary/5 via-background to-primary/5">
        <div className="absolute inset-0 bg-grid-primary/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative p-6 md:p-8">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={handleBackClick} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveToggle}
                className="gap-2"
              >
                {subject.archived ? (
                  <>
                    <ArchiveRestore className="w-4 h-4" />
                    <span className="hidden sm:inline">Unarchive</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span className="hidden sm:inline">Archive</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDrawerOpen(true)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </div>
          </div>

          {/* Subject Info */}
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <Avatar 
              className="w-16 h-16 md:w-20 md:h-20 ring-4 ring-background shadow-xl cursor-pointer hover:ring-primary/20 transition-all"
              onClick={() => signedProfileUrl && setIsProfileModalOpen(true)}
            >
              {signedProfileUrl ? (
                <AvatarImage src={signedProfileUrl} alt={displayName} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xl md:text-2xl font-semibold">
                {category === 'person' ? (
                  getInitials(displayName) || <User className="w-8 h-8" />
                ) : (
                  <CategoryIcon className="w-8 h-8" />
                )}
              </AvatarFallback>
            </Avatar>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
                  {displayName}
                </h1>
                {subject.is_primary && (
                  <Badge variant="default" className="shrink-0">Primary</Badge>
                )}
                {subject.archived && (
                  <Badge variant="secondary" className="shrink-0">Archived</Badge>
                )}
              </div>

              {/* Quick Info & Badges */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {subjectType && (
                  <Badge variant="outline" className="gap-1 capitalize">
                    <CategoryIcon className="w-3 h-3" />
                    {subjectType.name}
                  </Badge>
                )}
                {category === 'person' && subject.role && (
                  <Badge variant="secondary" className="capitalize">{getRoleLabel(subject.role)}</Badge>
                )}
                {category === 'vehicle' && subject.vehicle_body_style && (
                  <Badge variant="secondary" className="capitalize">{getVehicleTypeLabel(subject.vehicle_body_style)}</Badge>
                )}
                {category === 'location' && subject.location_type && (
                  <Badge variant="secondary" className="capitalize">{getLocationTypeLabel(subject.location_type)}</Badge>
                )}
                {category === 'item' && subject.item_type && (
                  <Badge variant="secondary" className="capitalize">{getItemTypeLabel(subject.item_type)}</Badge>
                )}
                {quickInfo && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {quickInfo}
                  </span>
                )}
              </div>

              {/* Timestamps */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Created: {format(new Date(subject.created_at), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated: {format(new Date(subject.updated_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Case Card */}
      {subject.case_id && caseName && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Associated Case
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link 
              to={`/cases/${subject.case_id}`}
              className="text-primary hover:underline font-medium"
            >
              {caseNumber && `${caseNumber} - `}{caseName}
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CategoryIcon className="w-4 h-4" />
                {category === 'person' ? 'Core Information' : 
                 category === 'vehicle' ? 'Vehicle Information' :
                 category === 'location' ? 'Location Information' : 'Item Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category === 'person' && (
                <>
                  <SubjectDetailField icon={<User className="w-4 h-4" />} label="First Name" value={subject.first_name} />
                  <SubjectDetailField icon={<User className="w-4 h-4" />} label="Middle Name" value={subject.middle_name} />
                  <SubjectDetailField icon={<User className="w-4 h-4" />} label="Last Name" value={subject.last_name} />
                  <SubjectDetailField icon={<Tag className="w-4 h-4" />} label="Alias" value={subject.alias} />
                  <SubjectDetailField icon={<FileText className="w-4 h-4" />} label="Role" value={getRoleLabel(subject.role)} />
                  <SubjectDetailField 
                    icon={<Calendar className="w-4 h-4" />} 
                    label="Date of Birth" 
                    value={subject.date_of_birth ? format(new Date(subject.date_of_birth), "MMM d, yyyy") : null} 
                  />
                  <SubjectDetailField icon={<Hash className="w-4 h-4" />} label="SSN" value={subject.ssn ? `***-**-${subject.ssn.slice(-4)}` : null} />
                  <SubjectDetailField icon={<User className="w-4 h-4" />} label="Sex" value={subject.sex} />
                  <SubjectDetailField icon={<Globe className="w-4 h-4" />} label="Race" value={subject.race} />
                </>
              )}
              
              {category === 'vehicle' && (
                <>
                  <SubjectDetailField icon={<Calendar className="w-4 h-4" />} label="Year" value={subject.vehicle_year} />
                  <SubjectDetailField icon={<Car className="w-4 h-4" />} label="Make" value={subject.vehicle_make} />
                  <SubjectDetailField icon={<Car className="w-4 h-4" />} label="Model" value={subject.vehicle_model} />
                  <SubjectDetailField icon={<Palette className="w-4 h-4" />} label="Color" value={subject.vehicle_color} />
                  <SubjectDetailField icon={<Hash className="w-4 h-4" />} label="License Plate" value={subject.vehicle_license_plate} />
                  <SubjectDetailField icon={<Hash className="w-4 h-4" />} label="VIN" value={subject.vehicle_vin} />
                  <SubjectDetailField icon={<Tag className="w-4 h-4" />} label="Body Style" value={getVehicleTypeLabel(subject.vehicle_body_style)} />
                  <SubjectDetailField icon={<Tag className="w-4 h-4" />} label="Fuel Type" value={subject.vehicle_fuel_type} />
                </>
              )}
              
              {category === 'location' && (
                <>
                  <SubjectDetailField icon={<Building2 className="w-4 h-4" />} label="Name" value={subject.location_name} />
                  <SubjectDetailField icon={<Tag className="w-4 h-4" />} label="Type" value={getLocationTypeLabel(subject.location_type)} />
                  <div className="md:col-span-2">
                    <SubjectDetailField icon={<MapPin className="w-4 h-4" />} label="Address" value={formatAddress()} />
                  </div>
                </>
              )}
              
              {category === 'item' && (
                <>
                  <SubjectDetailField icon={<Package className="w-4 h-4" />} label="Description" value={subject.item_description} />
                  <SubjectDetailField icon={<Tag className="w-4 h-4" />} label="Type" value={getItemTypeLabel(subject.item_type)} />
                  <SubjectDetailField icon={<Tag className="w-4 h-4" />} label="Brand" value={subject.item_brand} />
                  <SubjectDetailField icon={<Tag className="w-4 h-4" />} label="Model" value={subject.item_model} />
                  <SubjectDetailField icon={<Hash className="w-4 h-4" />} label="Serial Number" value={subject.item_serial_number} />
                  <SubjectDetailField icon={<Palette className="w-4 h-4" />} label="Color" value={subject.item_color} />
                  <SubjectDetailField icon={<Tag className="w-4 h-4" />} label="Value" value={subject.item_value ? `$${Number(subject.item_value).toLocaleString()}` : null} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Physical Description - Only for persons */}
          {category === 'person' && (subject.height || subject.weight || subject.eye_color || subject.hair_color || subject.distinguishing_features) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Physical Description
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SubjectDetailField icon={<Ruler className="w-4 h-4" />} label="Height" value={subject.height} />
                <SubjectDetailField icon={<Weight className="w-4 h-4" />} label="Weight" value={subject.weight} />
                <SubjectDetailField icon={<Palette className="w-4 h-4" />} label="Eye Color" value={subject.eye_color} />
                <SubjectDetailField icon={<Palette className="w-4 h-4" />} label="Hair Color" value={subject.hair_color} />
                {subject.distinguishing_features && (
                  <div className="md:col-span-2">
                    <SubjectDetailField icon={<FileText className="w-4 h-4" />} label="Distinguishing Features" value={subject.distinguishing_features} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Information - For persons with address */}
          {category === 'person' && (subject.cell_phone || subject.email || formatAddress()) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SubjectDetailField icon={<Globe className="w-4 h-4" />} label="Phone" value={subject.cell_phone} />
                <SubjectDetailField icon={<Globe className="w-4 h-4" />} label="Email" value={subject.email} />
                {formatAddress() && (
                  <div className="md:col-span-2">
                    <SubjectDetailField icon={<MapPin className="w-4 h-4" />} label="Address" value={formatAddress()} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Social Media */}
          {category === 'person' && (
            <SocialMediaLinksWidget subjectId={subject.id} readOnly />
          )}

          {/* Linked Entities */}
          <LinkedEntitiesPanel subjectId={subject.id} readOnly />
        </div>

        {/* Right Column - Notes */}
        <div className="space-y-6">
          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subject.notes ? (
                <p className="text-sm whitespace-pre-wrap">{subject.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes added</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Drawer */}
      <SubjectDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        caseId={subject.case_id}
        subjectId={subject.id}
      />

      {/* Profile Image Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {signedProfileUrl && (
            <img
              src={signedProfileUrl}
              alt={displayName}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
