import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { CoverImageUpload } from "@/components/case-detail/subjects/CoverImageUpload";

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

const SubjectDetail = () => {
  const { caseId, subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [caseInfo, setCaseInfo] = useState<{ title: string; case_number: string } | null>(null);
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
  const [signedCoverUrl, setSignedCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  useSetBreadcrumbs(
    subject && caseInfo
      ? [
          { label: "Cases", href: "/cases" },
          { label: caseInfo.case_number, href: `/cases/${caseId}` },
          { label: "Subjects", href: `/cases/${caseId}?tab=subjects` },
          { label: subject.display_name || subject.name },
        ]
      : []
  );

  useEffect(() => {
    fetchSubjectDetails();
  }, [subjectId, caseId]);

  useEffect(() => {
    if (subject?.profile_image_url) {
      generateSignedUrl(subject.profile_image_url, 'profile');
    }
    if (subject?.cover_image_url) {
      generateSignedUrl(subject.cover_image_url, 'cover');
    }
  }, [subject?.profile_image_url, subject?.cover_image_url]);

  const generateSignedUrl = async (filePath: string, type: 'profile' | 'cover') => {
    try {
      if (filePath.includes('?token=')) {
        if (type === 'profile') {
          setSignedImageUrl(filePath);
        } else {
          setSignedCoverUrl(filePath);
        }
        return;
      }
      
      let path = filePath;
      if (filePath.includes('/storage/v1/object/')) {
        const match = filePath.match(/\/storage\/v1\/object\/(?:public|sign)\/([^?]+)/);
        if (match) path = match[1];
      }
      
      if (path.startsWith('subject-profile-images/')) {
        path = path.replace('subject-profile-images/', '');
      }
      
      const { data, error } = await supabase.storage
        .from('subject-profile-images')
        .createSignedUrl(path, 3600);
      
      if (error) throw error;
      
      if (type === 'profile') {
        setSignedImageUrl(data.signedUrl);
      } else {
        setSignedCoverUrl(data.signedUrl);
      }
    } catch (error) {
      console.error(`Error generating signed URL for ${type}:`, error);
    }
  };

  const fetchSubjectDetails = async () => {
    try {
      if (!caseId || !subjectId) return;

      const { data: subjectData, error: subjectError } = await supabase
        .from("case_subjects")
        .select("*")
        .eq("id", subjectId)
        .eq("case_id", caseId)
        .single();

      if (subjectError) throw subjectError;
      
      const typedSubject: Subject = {
        ...subjectData,
        details: (subjectData.details as Record<string, any>) || {},
        subject_type: subjectData.subject_type as SubjectCategory,
        status: subjectData.status as 'active' | 'archived',
      };
      setSubject(typedSubject);

      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("title, case_number")
        .eq("id", caseId)
        .single();

      if (caseError) throw caseError;
      setCaseInfo(caseData);
    } catch (error) {
      toast.error("Error loading subject details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!subject) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('case_subjects')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        })
        .eq('id', subject.id);

      if (error) throw error;
      toast.success('Subject archived');
      fetchSubjectDetails();
    } catch (error) {
      toast.error('Failed to archive subject');
      console.error(error);
    }
  };

  const handleUnarchive = async () => {
    if (!subject) return;
    try {
      const { error } = await supabase
        .from('case_subjects')
        .update({
          status: 'active',
          archived_at: null,
          archived_by: null,
        })
        .eq('id', subject.id);

      if (error) throw error;
      toast.success('Subject unarchived');
      fetchSubjectDetails();
    } catch (error) {
      toast.error('Failed to unarchive subject');
      console.error(error);
    }
  };

  if (loading) {
    return <ContactDetailSkeleton />;
  }

  if (!subject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${caseId}?tab=subjects`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Subjects
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Subject not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = getCategoryIcon(subject.subject_type);
  const isArchived = subject.status === 'archived';
  const details = subject.details || {};

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${caseId}?tab=subjects`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Subjects
        </Button>
        <div className="flex items-center gap-2">
          {isArchived ? (
            <Button variant="outline" onClick={handleUnarchive}>
              <ArchiveRestore className="w-4 h-4 mr-2" />
              Unarchive
            </Button>
          ) : (
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          )}
          {!isArchived && (
            <Button onClick={() => setEditDrawerOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit {SUBJECT_CATEGORY_SINGULAR[subject.subject_type]}
            </Button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="h-48 relative overflow-hidden">
            <CoverImageUpload
              subjectId={subject.id}
              currentCoverUrl={subject.cover_image_url}
              signedCoverUrl={signedCoverUrl}
              onCoverChange={(url) => {
                setSubject(prev => prev ? { ...prev, cover_image_url: url } : null);
                if (url) {
                  generateSignedUrl(url, 'cover');
                } else {
                  setSignedCoverUrl(null);
                }
              }}
              readOnly={isArchived}
            />
          </div>
          
          <div className="absolute -bottom-16 left-8">
            {signedImageUrl ? (
              <div 
                className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-card shadow-xl bg-card cursor-zoom-in hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => setImageModalOpen(true)}
              >
                <img
                  src={signedImageUrl}
                  alt={subject.display_name || subject.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : subject.subject_type === 'person' ? (
              <div className="w-32 h-32 rounded-2xl border-4 border-card shadow-xl bg-muted flex items-center justify-center">
                <span className="text-3xl font-bold text-muted-foreground">
                  {getInitials(subject.display_name || subject.name)}
                </span>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-2xl border-4 border-card shadow-xl bg-muted flex items-center justify-center">
                <Icon className="h-14 w-14 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">
              {SUBJECT_CATEGORY_SINGULAR[subject.subject_type]}
            </Badge>
            {subject.is_primary && (
              <Badge className="bg-primary/90 text-primary-foreground">
                Primary
              </Badge>
            )}
            {isArchived && (
              <Badge variant="destructive">
                Archived
              </Badge>
            )}
          </div>
        </div>

        <div className="pt-20 pb-6 px-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {subject.display_name || subject.name}
              </h1>
              {subject.subject_type === 'person' && subject.role && (
                <Badge variant="outline" className="mt-2">
                  {getRoleLabel(subject.role)}
                </Badge>
              )}
              {subject.subject_type === 'vehicle' && details.vehicle_type && (
                <Badge variant="outline" className="mt-2">
                  {getVehicleTypeLabel(details.vehicle_type)}
                </Badge>
              )}
              {subject.subject_type === 'location' && details.location_type && (
                <Badge variant="outline" className="mt-2">
                  {getLocationTypeLabel(details.location_type)}
                </Badge>
              )}
              {subject.subject_type === 'item' && details.item_type && (
                <Badge variant="outline" className="mt-2">
                  {getItemTypeLabel(details.item_type)}
                </Badge>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground space-y-1">
              <p className="flex items-center gap-1 justify-end">
                <Calendar className="h-3.5 w-3.5" />
                Created {format(new Date(subject.created_at), 'MMM d, yyyy')}
              </p>
              <p className="flex items-center gap-1 justify-end">
                <Clock className="h-3.5 w-3.5" />
                Updated {format(new Date(subject.updated_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PERSON Details */}
        {subject.subject_type === 'person' && (
          <>
            {/* Core Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Core Information</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SubjectDetailField icon={User} label="Full Name" value={subject.display_name || subject.name} />
                <SubjectDetailField icon={Tag} label="Role" value={getRoleLabel(subject.role)} />
                <SubjectDetailField icon={Calendar} label="Date of Birth" value={details.date_of_birth ? format(new Date(details.date_of_birth), 'MMMM d, yyyy') : null} />
                {details.aliases && details.aliases.length > 0 ? (
                  <div className="flex items-start gap-3 py-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Tag className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Aliases</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {details.aliases.map((alias: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {alias}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <SubjectDetailField icon={Tag} label="Aliases" value={null} />
                )}
              </CardContent>
            </Card>

            {/* Physical Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Physical Description</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SubjectDetailField icon={Ruler} label="Height" value={details.height} />
                <SubjectDetailField icon={Weight} label="Weight" value={details.weight} />
                <SubjectDetailField icon={Palette} label="Hair Color" value={details.hair_color} />
                <SubjectDetailField icon={Palette} label="Eye Color" value={details.eye_color} />
                <SubjectDetailField icon={FileText} label="Identifying Marks" value={details.identifying_marks} />
              </CardContent>
            </Card>

            {/* Social Media Links */}
            <SocialMediaLinksWidget
              subjectId={subject.id}
              organizationId={subject.organization_id}
              readOnly={isArchived}
            />

            {/* Linked Entities */}
            <LinkedEntitiesPanel
              subjectId={subject.id}
              caseId={caseId!}
              organizationId={subject.organization_id}
              subjectType={subject.subject_type}
            />
          </>
        )}

        {/* VEHICLE Details */}
        {subject.subject_type === 'vehicle' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SubjectDetailField icon={Car} label="Vehicle Type" value={getVehicleTypeLabel(details.vehicle_type)} />
                <SubjectDetailField icon={Calendar} label="Year" value={details.year} />
                <SubjectDetailField icon={Car} label="Make" value={details.make} />
                <SubjectDetailField icon={Car} label="Model" value={details.model} />
                <SubjectDetailField icon={Palette} label="Color" value={details.color} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registration</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SubjectDetailField icon={Hash} label="License Plate" value={details.license_plate} />
                <SubjectDetailField icon={MapPin} label="State" value={getStateLabel(details.state)} />
                <SubjectDetailField icon={Hash} label="VIN" value={details.vin} />
                <SubjectDetailField icon={User} label="Registered Owner" value={details.registered_owner} />
              </CardContent>
            </Card>

            <LinkedEntitiesPanel
              subjectId={subject.id}
              caseId={caseId!}
              organizationId={subject.organization_id}
              subjectType={subject.subject_type}
            />
          </>
        )}

        {/* LOCATION Details */}
        {subject.subject_type === 'location' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location Information</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SubjectDetailField icon={MapPin} label="Location Name" value={subject.display_name || subject.name} />
                <SubjectDetailField icon={Tag} label="Location Type" value={getLocationTypeLabel(details.location_type)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Address</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SubjectDetailField icon={MapPin} label="Street" value={details.street} />
                <SubjectDetailField icon={Building2} label="City" value={details.city} />
                <SubjectDetailField icon={MapPin} label="State" value={getStateLabel(details.state)} />
                <SubjectDetailField icon={Hash} label="Zip Code" value={details.zip} />
                {(details.latitude || details.longitude) && (
                  <SubjectDetailField 
                    icon={Globe} 
                    label="Coordinates" 
                    value={details.latitude && details.longitude ? `${details.latitude}, ${details.longitude}` : null} 
                  />
                )}
              </CardContent>
            </Card>

            <LinkedEntitiesPanel
              subjectId={subject.id}
              caseId={caseId!}
              organizationId={subject.organization_id}
              subjectType={subject.subject_type}
            />
          </>
        )}

        {/* ITEM Details */}
        {subject.subject_type === 'item' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Item Information</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SubjectDetailField icon={Package} label="Item Name" value={subject.display_name || subject.name} />
                <SubjectDetailField icon={Tag} label="Item Type" value={getItemTypeLabel(details.item_type)} />
                <SubjectDetailField icon={FileText} label="Description" value={details.description} />
                <SubjectDetailField icon={Tag} label="Brand" value={details.brand} />
                <SubjectDetailField icon={Tag} label="Model" value={details.model} />
                <SubjectDetailField icon={Palette} label="Color" value={details.color} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Identifiers</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <SubjectDetailField icon={Hash} label="Serial Number" value={details.serial_number} />
                <SubjectDetailField icon={Ruler} label="Dimensions" value={details.dimensions} />
                <SubjectDetailField icon={FileText} label="Condition" value={details.condition} />
                <SubjectDetailField 
                  icon={FileText} 
                  label="Evidence Reference" 
                  value={details.evidence_reference}
                  isLink={!!details.evidence_reference}
                  href={details.evidence_reference}
                />
              </CardContent>
            </Card>

            <LinkedEntitiesPanel
              subjectId={subject.id}
              caseId={caseId!}
              organizationId={subject.organization_id}
              subjectType={subject.subject_type}
            />
          </>
        )}

        {/* Notes Card - All types */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {subject.notes ? (
              <p className="text-foreground whitespace-pre-wrap">{subject.notes}</p>
            ) : (
              <p className="text-muted-foreground/60 italic">No notes added</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Case Info Card */}
      {caseInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Associated Case</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to={`/cases/${caseId}`}
              className="flex items-center gap-3 text-primary hover:underline"
            >
              <FileText className="h-5 w-5" />
              <div>
                <p className="font-medium">{caseInfo.case_number}</p>
                <p className="text-sm text-muted-foreground">{caseInfo.title}</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Image Modal */}
      <ProfileImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageUrl={signedImageUrl}
        alt={subject?.display_name || subject?.name || "Profile image"}
      />

      {/* Edit Drawer */}
      {subject && caseId && (
        <SubjectDrawer
          open={editDrawerOpen}
          onOpenChange={setEditDrawerOpen}
          subject={subject}
          category={subject.subject_type}
          caseId={caseId}
          organizationId={subject.organization_id}
          onSuccess={fetchSubjectDetails}
        />
      )}
    </div>
  );
};

export default SubjectDetail;
