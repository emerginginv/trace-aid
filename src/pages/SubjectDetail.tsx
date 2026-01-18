import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBreadcrumbs } from "@/contexts/BreadcrumbContext";
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
  SubjectCategory, 
  PERSON_ROLES, 
  VEHICLE_TYPES, 
  LOCATION_TYPES, 
  ITEM_TYPES, 
  US_STATES, 
  SubjectDrawer,
  SubjectDetailField,
  SocialMediaLinksWidget,
  LinkedEntitiesPanel,
} from "@/components/case-detail/subjects";
import { logSubjectAudit } from "@/lib/subjectAuditLogger";
import { Database } from "@/integrations/supabase/types";

// Use the database row type directly
type CaseSubjectRow = Database['public']['Tables']['case_subjects']['Row'];

interface SubjectTypeInfo {
  id: string;
  name: string;
  category: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'person':
      return User;
    case 'vehicle':
      return Car;
    case 'location':
      return MapPin;
    case 'item':
      return Package;
    default:
      return User;
  }
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
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

export default function SubjectDetail() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { getBackRoute } = useNavigationSource();
  const { setItems: setBreadcrumbs } = useBreadcrumbs();

  const [subject, setSubject] = useState<CaseSubjectRow | null>(null);
  const [subjectType, setSubjectType] = useState<SubjectTypeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedProfileUrl, setSignedProfileUrl] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [caseName, setCaseName] = useState<string>("");
  const [caseNumber, setCaseNumber] = useState<string>("");

  // Helper to safely get details fields
  const getDetail = useCallback((key: string): any => {
    if (!subject?.details) return null;
    const details = subject.details as Record<string, any>;
    return details[key] ?? null;
  }, [subject?.details]);

  // Convert DB row to Subject type for drawer
  const convertToSubject = useCallback(() => {
    if (!subject) return null;
    return {
      id: subject.id,
      case_id: subject.case_id,
      organization_id: subject.organization_id,
      subject_type: (subjectType?.category || subject.subject_type || 'person') as SubjectCategory,
      name: subject.name,
      display_name: subject.display_name,
      details: (subject.details || {}) as Record<string, any>,
      notes: subject.notes,
      status: subject.status as 'active' | 'archived',
      role: subject.role,
      profile_image_url: subject.profile_image_url,
      cover_image_url: subject.cover_image_url,
      is_primary: subject.is_primary,
      created_at: subject.created_at,
      updated_at: subject.updated_at,
      archived_at: subject.archived_at,
      archived_by: subject.archived_by,
    };
  }, [subject, subjectType]);

  const getDisplayName = useCallback((): string => {
    if (!subject) return "Subject";
    const category = subjectType?.category || subject.subject_type || 'person';

    switch (category) {
      case 'person':
        const firstName = getDetail('first_name');
        const middleName = getDetail('middle_name');
        const lastName = getDetail('last_name');
        const nameParts = [firstName, middleName, lastName].filter(Boolean);
        return nameParts.length > 0 ? nameParts.join(' ') : (subject.display_name || subject.name || 'Unnamed Person');
      case 'vehicle':
        const year = getDetail('vehicle_year');
        const make = getDetail('vehicle_make');
        const model = getDetail('vehicle_model');
        const vehicleParts = [year, make, model].filter(Boolean);
        return vehicleParts.length > 0 ? vehicleParts.join(' ') : (subject.display_name || subject.name || 'Unnamed Vehicle');
      case 'location':
        return getDetail('location_name') || getDetail('address1') || subject.display_name || subject.name || 'Unnamed Location';
      case 'item':
        return getDetail('item_description') || subject.display_name || subject.name || 'Unnamed Item';
      default:
        return subject.display_name || subject.name || 'Subject';
    }
  }, [subject, subjectType, getDetail]);

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
      const name = getDisplayName();
      setBreadcrumbs([
        { label: "Cases", href: "/cases" },
        { label: caseNumber || caseName, href: `/cases/${subject.case_id}` },
        { label: "Subjects", href: `/cases/${subject.case_id}` },
        { label: name },
      ]);
    }
  }, [subject, caseName, caseNumber, setBreadcrumbs, getDisplayName]);

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
          setSubjectType(typeData as SubjectTypeInfo);
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
    
    const { data } = await supabase
      .from("cases")
      .select("case_number")
      .eq("id", subject.case_id)
      .single();
    
    if (data) {
      setCaseName(data.case_number || "Case");
      setCaseNumber(data.case_number || "");
    }
  };

  const isArchived = subject?.status === 'archived' || !!subject?.archived_at;

  const handleArchiveToggle = async () => {
    if (!subject) return;

    const newStatus = isArchived ? 'active' : 'archived';
    const now = new Date().toISOString();

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const updateData: any = {
        status: newStatus,
        archived_at: newStatus === 'archived' ? now : null,
        archived_by: newStatus === 'archived' ? userId : null,
      };

      const { error } = await supabase
        .from("case_subjects")
        .update(updateData)
        .eq("id", subject.id);

      if (error) throw error;

      await logSubjectAudit({
        subject_id: subject.id,
        case_id: subject.case_id,
        organization_id: subject.organization_id,
        action: isArchived ? 'restored' : 'archived',
        previous_values: { status: subject.status },
        new_values: { status: newStatus },
      });

      setSubject({ 
        ...subject, 
        status: newStatus,
        archived_at: updateData.archived_at,
        archived_by: updateData.archived_by,
      });
      toast.success(isArchived ? "Subject unarchived" : "Subject archived");
    } catch (error) {
      console.error("Error toggling archive status:", error);
      toast.error("Failed to update archive status");
    }
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    loadSubject();
  };

  const getQuickInfo = (): string | null => {
    if (!subject) return null;
    const category = subjectType?.category || subject.subject_type || 'person';
    
    if (category === 'person') {
      const dob = getDetail('date_of_birth');
      if (dob) return format(new Date(dob), "MMM d, yyyy");
    } else if (category === 'vehicle') {
      return getDetail('vehicle_license_plate') || null;
    } else if (category === 'location') {
      const parts = [getDetail('city'), getDetail('state')].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : null;
    } else if (category === 'item') {
      const parts = [getDetail('item_brand'), getDetail('item_model')].filter(Boolean);
      return parts.length > 0 ? parts.join(" ") : null;
    }
    return null;
  };

  const handleBackClick = () => {
    const backRoute = getBackRoute(subject?.case_id ? `/cases/${subject.case_id}` : "/cases");
    navigate(backRoute);
  };

  const formatAddress = (): string | null => {
    if (!subject) return null;
    const parts = [
      getDetail('address1'),
      getDetail('address2'),
      getDetail('address3'),
      [getDetail('city'), getStateLabel(getDetail('state'))].filter(Boolean).join(", "),
      getDetail('zip'),
      getDetail('country')
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
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

  const category = subjectType?.category || subject.subject_type || 'person';
  const CategoryIcon = getCategoryIcon(category);
  const displayName = getDisplayName();
  const quickInfo = getQuickInfo();

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
                {isArchived ? (
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
                {isArchived && (
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
                {category === 'vehicle' && getDetail('vehicle_body_style') && (
                  <Badge variant="secondary" className="capitalize">{getVehicleTypeLabel(getDetail('vehicle_body_style'))}</Badge>
                )}
                {category === 'location' && getDetail('location_type') && (
                  <Badge variant="secondary" className="capitalize">{getLocationTypeLabel(getDetail('location_type'))}</Badge>
                )}
                {category === 'item' && getDetail('item_type') && (
                  <Badge variant="secondary" className="capitalize">{getItemTypeLabel(getDetail('item_type'))}</Badge>
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
                  <SubjectDetailField icon={User} label="First Name" value={getDetail('first_name')} />
                  <SubjectDetailField icon={User} label="Middle Name" value={getDetail('middle_name')} />
                  <SubjectDetailField icon={User} label="Last Name" value={getDetail('last_name')} />
                  <SubjectDetailField icon={Tag} label="Alias" value={getDetail('alias')} />
                  <SubjectDetailField icon={FileText} label="Role" value={getRoleLabel(subject.role)} />
                  <SubjectDetailField 
                    icon={Calendar} 
                    label="Date of Birth" 
                    value={getDetail('date_of_birth') ? format(new Date(getDetail('date_of_birth')), "MMM d, yyyy") : null} 
                  />
                  <SubjectDetailField icon={Hash} label="SSN" value={getDetail('ssn') ? `***-**-${getDetail('ssn').slice(-4)}` : null} />
                  <SubjectDetailField icon={User} label="Sex" value={getDetail('sex')} />
                  <SubjectDetailField icon={Globe} label="Race" value={getDetail('race')} />
                </>
              )}
              
              {category === 'vehicle' && (
                <>
                  <SubjectDetailField icon={Calendar} label="Year" value={getDetail('vehicle_year')} />
                  <SubjectDetailField icon={Car} label="Make" value={getDetail('vehicle_make')} />
                  <SubjectDetailField icon={Car} label="Model" value={getDetail('vehicle_model')} />
                  <SubjectDetailField icon={Palette} label="Color" value={getDetail('vehicle_color')} />
                  <SubjectDetailField icon={Hash} label="License Plate" value={getDetail('vehicle_license_plate')} />
                  <SubjectDetailField icon={Hash} label="VIN" value={getDetail('vehicle_vin')} />
                  <SubjectDetailField icon={Tag} label="Body Style" value={getVehicleTypeLabel(getDetail('vehicle_body_style'))} />
                  <SubjectDetailField icon={Tag} label="Fuel Type" value={getDetail('vehicle_fuel_type')} />
                </>
              )}
              
              {category === 'location' && (
                <>
                  <SubjectDetailField icon={Building2} label="Name" value={getDetail('location_name')} />
                  <SubjectDetailField icon={Tag} label="Type" value={getLocationTypeLabel(getDetail('location_type'))} />
                  <div className="md:col-span-2">
                    <SubjectDetailField icon={MapPin} label="Address" value={formatAddress()} />
                  </div>
                </>
              )}
              
              {category === 'item' && (
                <>
                  <SubjectDetailField icon={Package} label="Description" value={getDetail('item_description')} />
                  <SubjectDetailField icon={Tag} label="Type" value={getItemTypeLabel(getDetail('item_type'))} />
                  <SubjectDetailField icon={Tag} label="Brand" value={getDetail('item_brand')} />
                  <SubjectDetailField icon={Tag} label="Model" value={getDetail('item_model')} />
                  <SubjectDetailField icon={Hash} label="Serial Number" value={getDetail('item_serial_number')} />
                  <SubjectDetailField icon={Palette} label="Color" value={getDetail('item_color')} />
                  <SubjectDetailField icon={Tag} label="Value" value={getDetail('item_value') ? `$${Number(getDetail('item_value')).toLocaleString()}` : null} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Physical Description - Only for persons */}
          {category === 'person' && (getDetail('height') || getDetail('weight') || getDetail('eye_color') || getDetail('hair_color') || getDetail('distinguishing_features')) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Physical Description
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SubjectDetailField icon={Ruler} label="Height" value={getDetail('height')} />
                <SubjectDetailField icon={Weight} label="Weight" value={getDetail('weight')} />
                <SubjectDetailField icon={Palette} label="Eye Color" value={getDetail('eye_color')} />
                <SubjectDetailField icon={Palette} label="Hair Color" value={getDetail('hair_color')} />
                {getDetail('distinguishing_features') && (
                  <div className="md:col-span-2">
                    <SubjectDetailField icon={FileText} label="Distinguishing Features" value={getDetail('distinguishing_features')} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Information - For persons with address */}
          {category === 'person' && (getDetail('cell_phone') || getDetail('email') || formatAddress()) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SubjectDetailField icon={Globe} label="Phone" value={getDetail('cell_phone')} />
                <SubjectDetailField icon={Globe} label="Email" value={getDetail('email')} />
                {formatAddress() && (
                  <div className="md:col-span-2">
                    <SubjectDetailField icon={MapPin} label="Address" value={formatAddress()} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Social Media */}
          {category === 'person' && (
            <SocialMediaLinksWidget subjectId={subject.id} organizationId={subject.organization_id} readOnly />
          )}

          {/* Linked Entities */}
          <LinkedEntitiesPanel subjectId={subject.id} caseId={subject.case_id} organizationId={subject.organization_id} subjectType={category as SubjectCategory} />
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
        open={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) handleDrawerClose();
          else setIsDrawerOpen(true);
        }}
        subject={convertToSubject()}
        category={(subjectType?.category || subject.subject_type || 'person') as SubjectCategory}
        caseId={subject.case_id}
        organizationId={subject.organization_id}
        onSuccess={handleDrawerClose}
        signedProfileImageUrl={signedProfileUrl}
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
