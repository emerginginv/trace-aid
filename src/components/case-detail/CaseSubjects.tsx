import { useEffect, useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { CaseTabSkeleton } from "./CaseTabSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Car, MapPin, Package, Pencil, Trash2, Search, ExternalLink, Phone, Mail, Calendar, DollarSign, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SubjectForm } from "./SubjectForm";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileImageModal } from "./ProfileImageModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { useSubjectProfileImages } from "@/hooks/use-subject-profile-images";

interface Subject {
  id: string;
  subject_type: string;
  name: string;
  details: any;
  notes: string | null;
  created_at: string;
  profile_image_url: string | null;
}

export const CaseSubjects = ({ caseId, isClosedCase = false }: { caseId: string; isClosedCase?: boolean }) => {
  const { organization } = useOrganization();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; subjectId: string } | null>(null);
  const { isAdmin, isManager } = useUserRole();

  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canViewSubjects = hasPermission("view_subjects");
  const canAddSubjects = hasPermission("add_subjects");
  const canEditSubjects = hasPermission("edit_subjects");
  const canDeleteSubjects = hasPermission("delete_subjects");
  
  // Use signed URLs for private subject profile images
  const { getSignedUrl } = useSubjectProfileImages(subjects);

  useEffect(() => {
    fetchSubjects();
  }, [caseId]);

  const fetchSubjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("case_subjects")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast({
        title: "Error",
        description: "Failed to load subjects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    const icons = {
      person: User,
      vehicle: Car,
      location: MapPin,
      item: Package,
    };
    const Icon = icons[type as keyof typeof icons] || Package;
    return <Icon className="h-4 w-4" />;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      person: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      vehicle: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      location: "bg-green-500/10 text-green-500 border-green-500/20",
      item: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };
    return colors[type] || "bg-muted";
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormOpen(true);
  };

  const handleDelete = async (id: string, subjectName: string) => {
    // Check if subject is linked to multiple cases
    const { data: linkedCases } = await supabase
      .from("case_subjects")
      .select("case_id")
      .eq("id", id);
    
    const linkedCount = (linkedCases?.length || 1) - 1;
    
    let confirmMessage = `Remove "${subjectName}" from this case?\n\nThis subject and their linked evidence will be removed from this case.`;
    
    if (linkedCount > 0) {
      confirmMessage += `\n\nNote: The subject profile remains in the system as they are linked to ${linkedCount} other case${linkedCount > 1 ? 's' : ''}.`;
    }
    
    confirmMessage += `\n\nIf this subject was added in error, deletion is appropriate. For inactive subjects, consider marking as 'No longer relevant' instead.`;
    
    if (!confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from("case_subjects")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subject removed from case",
      });
      fetchSubjects();
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast({
        title: "Error",
        description: "Failed to delete subject",
        variant: "destructive",
      });
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingSubject(null);
  };

  const handleImageClick = (imageUrl: string, subjectId: string) => {
    setSelectedImage({ url: imageUrl, subjectId });
    setImageModalOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const openGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const canViewSSN = isAdmin || isManager;

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = searchQuery === '' || 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || subject.subject_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const renderPersonDetails = (details: any) => (
    <div className="space-y-3">
      {details.aliases && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Aliases:</span>{" "}
          <span>{details.aliases}</span>
        </div>
      )}
      {details.date_of_birth && (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-muted-foreground">DOB:</span>{" "}
          <span>{formatDate(details.date_of_birth)}</span>
        </div>
      )}
      {details.drivers_license && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">DL#:</span>{" "}
          <span>{details.drivers_license}</span>
        </div>
      )}
      {details.ssn && canViewSSN && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">SSN:</span>{" "}
          <span className="font-mono">{details.ssn}</span>
          <span className="ml-1 text-xs text-muted-foreground">(Admin/Manager only)</span>
        </div>
      )}
      {details.ssn && !canViewSSN && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">SSN:</span>{" "}
          <span className="text-muted-foreground italic flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Hidden - Admin/Manager only
          </span>
        </div>
      )}
      {details.phone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <a href={`tel:${details.phone}`} className="text-primary hover:underline">{details.phone}</a>
        </div>
      )}
      {details.email && (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <a href={`mailto:${details.email}`} className="text-primary hover:underline">{details.email}</a>
        </div>
      )}
      {details.address && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Address:</span>{" "}
          <button 
            onClick={() => openGoogleMaps(details.address)} 
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {details.address}
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      )}
      {details.physical_description && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Physical Description:</span>
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{details.physical_description}</p>
        </div>
      )}
      {details.employer && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Employer:</span>
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{details.employer}</p>
        </div>
      )}
      {details.education && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Education:</span>
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{details.education}</p>
        </div>
      )}
      {details.family_relationships && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Family & Relationships:</span>
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{details.family_relationships}</p>
        </div>
      )}
      {details.habits_mannerisms && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Habits & Mannerisms:</span>
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{details.habits_mannerisms}</p>
        </div>
      )}
    </div>
  );

  const renderVehicleDetails = (details: any) => (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-sm">
        {details.vehicle_color && (
          <div>
            <span className="font-medium text-muted-foreground">Color:</span>{" "}
            <span>{details.vehicle_color}</span>
          </div>
        )}
        {details.year && (
          <div>
            <span className="font-medium text-muted-foreground">Year:</span>{" "}
            <span>{details.year}</span>
          </div>
        )}
        {details.make && (
          <div>
            <span className="font-medium text-muted-foreground">Make:</span>{" "}
            <span>{details.make}</span>
          </div>
        )}
        {details.model && (
          <div>
            <span className="font-medium text-muted-foreground">Model:</span>{" "}
            <span>{details.model}</span>
          </div>
        )}
        {details.style && (
          <div>
            <span className="font-medium text-muted-foreground">Style:</span>{" "}
            <span>{details.style}</span>
          </div>
        )}
        {details.vin && (
          <div className="col-span-2">
            <span className="font-medium text-muted-foreground">VIN:</span>{" "}
            <span className="font-mono text-xs">{details.vin}</span>
          </div>
        )}
        {details.license_plate && (
          <div>
            <span className="font-medium text-muted-foreground">License Plate:</span>{" "}
            <span className="font-mono">{details.license_plate}</span>
          </div>
        )}
      </div>
      {details.registered_to && (
        <div className="text-sm mt-2">
          <span className="font-medium text-muted-foreground">Registered To:</span>
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{details.registered_to}</p>
        </div>
      )}
    </div>
  );

  const renderLocationDetails = (details: any) => (
    <div className="space-y-3">
      {details.location_address && (
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Address:</span>{" "}
            <button 
              onClick={() => openGoogleMaps(details.location_address)} 
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {details.location_address}
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
          {/* Small map preview using Google Maps embed */}
          <div 
            className="w-full h-32 rounded-lg border bg-muted overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => openGoogleMaps(details.location_address)}
          >
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(details.location_address)}&zoom=15`}
              title="Location Map"
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {details.location_contact_name && (
          <div>
            <span className="font-medium text-muted-foreground">Contact:</span>{" "}
            <span>{details.location_contact_name}</span>
          </div>
        )}
        {details.location_phone && (
          <div className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <a href={`tel:${details.location_phone}`} className="text-primary hover:underline">{details.location_phone}</a>
          </div>
        )}
      </div>
      {details.location_description && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Description:</span>
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{details.location_description}</p>
        </div>
      )}
    </div>
  );

  const renderItemDetails = (details: any) => (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-sm">
        {details.item_type && (
          <div>
            <span className="font-medium text-muted-foreground">Type:</span>{" "}
            <span>{details.item_type}</span>
          </div>
        )}
        {details.item_value && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Value:</span>{" "}
            <span>{formatCurrency(details.item_value)}</span>
          </div>
        )}
        {details.serial_number && (
          <div className="col-span-2">
            <span className="font-medium text-muted-foreground">Serial #:</span>{" "}
            <span className="font-mono">{details.serial_number}</span>
          </div>
        )}
      </div>
      {details.item_description && (
        <div className="text-sm">
          <span className="font-medium text-muted-foreground">Description:</span>
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{details.item_description}</p>
        </div>
      )}
    </div>
  );

  const renderSubjectDetails = (subject: Subject) => {
    const details = subject.details || {};
    
    switch (subject.subject_type) {
      case "person":
        return renderPersonDetails(details);
      case "vehicle":
        return renderVehicleDetails(details);
      case "location":
        return renderLocationDetails(details);
      case "item":
        return renderItemDetails(details);
      default:
        return Object.keys(details).length > 0 && (
          <div className="space-y-1">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                <span className="text-muted-foreground">{String(value)}</span>
              </div>
            ))}
          </div>
        );
    }
  };

  if (permissionsLoading || loading) {
    return <CaseTabSkeleton title="Subjects" subtitle="Loading subjects..." showCards rows={6} />;
  }

  if (!canViewSubjects) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          
          <p className="text-muted-foreground mb-4 max-w-md">
            Subject information is restricted to protect personal data. Your role does not include subject access for this case.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 mb-4 max-w-md">
            <div className="flex items-start gap-2 text-sm text-left">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Why?</span>
                <p className="text-muted-foreground mt-1">
                  Subject profiles may contain sensitive information like SSNs, addresses, and personal identifiers that require controlled access.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground max-w-md">
            Contact your administrator if you believe you need access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Subjects</h2>
          <p className="text-muted-foreground">People, vehicles, locations, and items related to this case</p>
        </div>
        <Button 
          onClick={() => setFormOpen(true)}
          disabled={!canAddSubjects || isClosedCase}
        >
          <Plus className="h-4 w-4" />
          Add Subject
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="person">Person</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="item">Item</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No subjects added yet</p>
            {canAddSubjects && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" />
                Add First Subject
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredSubjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No subjects match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSubjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const signedUrl = getSignedUrl(subject.id);
                        if (signedUrl) {
                          handleImageClick(signedUrl, subject.id);
                        }
                      }}
                    >
                      <AvatarImage src={getSignedUrl(subject.id) || undefined} />
                      <AvatarFallback>{getInitials(subject.name)}</AvatarFallback>
                    </Avatar>
                    {getIcon(subject.subject_type)}
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(subject.subject_type)}>
                      {subject.subject_type}
                    </Badge>
                    {canEditSubjects && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(subject)}
                        disabled={isClosedCase}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteSubjects && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(subject.id, subject.name)}
                        disabled={isClosedCase}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {renderSubjectDetails(subject)}
                {subject.notes && (
                  <div className="text-sm pt-2 border-t">
                    <span className="font-medium text-muted-foreground">Notes:</span>
                    <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{subject.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SubjectForm
        caseId={caseId}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={fetchSubjects}
        editingSubject={editingSubject}
        organizationId={organization?.id || ""}
      />

      {selectedImage && (
        <ProfileImageModal
          open={imageModalOpen}
          onOpenChange={setImageModalOpen}
          imageUrl={selectedImage.url}
          subjectId={selectedImage.subjectId}
          onImageUpdated={fetchSubjects}
        />
      )}
    </>
  );
};