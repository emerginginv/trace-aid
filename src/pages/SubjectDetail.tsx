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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ContactDetailSkeleton } from "@/components/ui/detail-page-skeleton";
import { Subject, SubjectCategory, PERSON_ROLES, VEHICLE_TYPES, LOCATION_TYPES, ITEM_TYPES, US_STATES, SUBJECT_CATEGORY_SINGULAR } from "@/components/case-detail/subjects/types";
import { ProfileImageModal, SubjectDrawer } from "@/components/case-detail/subjects";

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

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
  href?: string;
}

const InfoRow = ({ icon: Icon, label, value, isLink, href }: InfoRowProps) => {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {isLink && href ? (
          <a href={href} className="text-primary hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
};

const SubjectDetail = () => {
  const { caseId, subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [caseInfo, setCaseInfo] = useState<{ title: string; case_number: string } | null>(null);
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
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
      generateSignedUrl(subject.profile_image_url);
    }
  }, [subject?.profile_image_url]);

  const generateSignedUrl = async (filePath: string) => {
    try {
      // Check if it's already a signed URL
      if (filePath.includes('?token=')) {
        setSignedImageUrl(filePath);
        return;
      }
      
      // Extract path from full URL if needed
      let path = filePath;
      if (filePath.includes('/storage/v1/object/')) {
        const match = filePath.match(/\/storage\/v1\/object\/(?:public|sign)\/([^?]+)/);
        if (match) path = match[1];
      }
      
      // Remove bucket prefix if it exists
      if (path.startsWith('subject-profile-images/')) {
        path = path.replace('subject-profile-images/', '');
      }
      
      const { data, error } = await supabase.storage
        .from('subject-profile-images')
        .createSignedUrl(path, 3600);
      
      if (error) throw error;
      setSignedImageUrl(data.signedUrl);
    } catch (error) {
      console.error('Error generating signed URL:', error);
    }
  };

  const fetchSubjectDetails = async () => {
    try {
      if (!caseId || !subjectId) return;

      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from("case_subjects")
        .select("*")
        .eq("id", subjectId)
        .eq("case_id", caseId)
        .single();

      if (subjectError) throw subjectError;
      
      // Cast the details to Record<string, any>
      const typedSubject: Subject = {
        ...subjectData,
        details: (subjectData.details as Record<string, any>) || {},
        subject_type: subjectData.subject_type as SubjectCategory,
        status: subjectData.status as 'active' | 'archived',
      };
      setSubject(typedSubject);

      // Fetch case info
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
          <Button onClick={() => setEditDrawerOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit {SUBJECT_CATEGORY_SINGULAR[subject.subject_type]}
          </Button>
        </div>
      </div>

      {/* Hero Section with Large Image */}
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Hero Background */}
          <div className="h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9ImN1cnJlbnRDb2xvciIgZmlsbC1vcGFjaXR5PSIwLjAzIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTRNNjAgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTRNMTIgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTQiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
          </div>
          
          {/* Profile Image/Icon */}
          <div className="absolute -bottom-16 left-8">
            {subject.subject_type === 'person' && signedImageUrl ? (
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

          {/* Status Badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {subject.is_primary && (
              <Badge className="bg-primary/90 text-primary-foreground">
                Primary
              </Badge>
            )}
            {isArchived && (
              <Badge variant="secondary">
                Archived
              </Badge>
            )}
          </div>
        </div>

        {/* Name & Role Section */}
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
            <div className="text-right text-sm text-muted-foreground">
              <p>Created {format(new Date(subject.created_at), 'MMM d, yyyy')}</p>
              {subject.updated_at !== subject.created_at && (
                <p>Updated {format(new Date(subject.updated_at), 'MMM d, yyyy')}</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {/* Person-specific fields */}
            {subject.subject_type === 'person' && (
              <>
                <InfoRow icon={Calendar} label="Date of Birth" value={details.date_of_birth ? format(new Date(details.date_of_birth), 'MMMM d, yyyy') : null} />
                <InfoRow icon={Ruler} label="Height" value={details.height} />
                <InfoRow icon={Weight} label="Weight" value={details.weight} />
                <InfoRow icon={Palette} label="Hair Color" value={details.hair_color} />
                <InfoRow icon={Palette} label="Eye Color" value={details.eye_color} />
                <InfoRow icon={FileText} label="Identifying Marks" value={details.identifying_marks} />
                {details.aliases && details.aliases.length > 0 && (
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
                )}
              </>
            )}

            {/* Vehicle-specific fields */}
            {subject.subject_type === 'vehicle' && (
              <>
                <InfoRow icon={Calendar} label="Year" value={details.year} />
                <InfoRow icon={Car} label="Make" value={details.make} />
                <InfoRow icon={Car} label="Model" value={details.model} />
                <InfoRow icon={Palette} label="Color" value={details.color} />
                <InfoRow icon={Hash} label="License Plate" value={details.license_plate} />
                <InfoRow icon={MapPin} label="State" value={getStateLabel(details.state)} />
                <InfoRow icon={Hash} label="VIN" value={details.vin} />
              </>
            )}

            {/* Location-specific fields */}
            {subject.subject_type === 'location' && (
              <>
                <InfoRow icon={MapPin} label="Street Address" value={details.street_address} />
                <InfoRow icon={MapPin} label="Address Line 2" value={details.address_line_2} />
                <InfoRow icon={Building2} label="City" value={details.city} />
                <InfoRow icon={MapPin} label="State" value={getStateLabel(details.state)} />
                <InfoRow icon={Hash} label="Zip Code" value={details.zip_code} />
                {details.latitude && details.longitude && (
                  <InfoRow icon={Globe} label="Coordinates" value={`${details.latitude}, ${details.longitude}`} />
                )}
              </>
            )}

            {/* Item-specific fields */}
            {subject.subject_type === 'item' && (
              <>
                <InfoRow icon={Hash} label="Serial Number" value={details.serial_number} />
                <InfoRow icon={Tag} label="Brand" value={details.brand} />
                <InfoRow icon={Tag} label="Model" value={details.model} />
                <InfoRow icon={Palette} label="Color" value={details.color} />
                <InfoRow icon={Ruler} label="Dimensions" value={details.dimensions} />
                <InfoRow icon={FileText} label="Condition" value={details.condition} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Notes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {subject.notes ? (
              <p className="text-foreground whitespace-pre-wrap">{subject.notes}</p>
            ) : (
              <p className="text-muted-foreground italic">No notes added</p>
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
