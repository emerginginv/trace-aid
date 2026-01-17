import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Eye, Pencil, Archive, ArchiveRestore, User, Car, MapPin, Package, Building2 } from "lucide-react";
import { Subject, SubjectCategory, PERSON_ROLES, VEHICLE_TYPES, LOCATION_TYPES, ITEM_TYPES } from "./types";
import { format } from "date-fns";
import { useSubjectProfileImages } from "@/hooks/use-subject-profile-images";
import { ProfileImageModal } from "./ProfileImageModal";
import { cn } from "@/lib/utils";

interface SubjectListViewProps {
  subjects: Subject[];
  category: SubjectCategory;
  caseId: string;
  onNavigate: (subject: Subject) => void;
  onEdit: (subject: Subject) => void;
  onArchive: (subject: Subject) => void;
  onUnarchive: (subject: Subject) => void;
  canEdit: boolean;
  canArchive: boolean;
  isClosedCase: boolean;
}

export const SubjectListView = ({
  subjects,
  category,
  caseId,
  onNavigate,
  onEdit,
  onArchive,
  onUnarchive,
  canEdit,
  canArchive,
  isClosedCase,
}: SubjectListViewProps) => {
  const { getSignedUrl } = useSubjectProfileImages(subjects);

  // Image modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const handleImageClick = (e: React.MouseEvent, imageUrl: string, alt: string) => {
    e.stopPropagation();
    setSelectedImage({ url: imageUrl, alt });
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

  const getCategoryIcon = (cat: SubjectCategory) => {
    const icons: Record<SubjectCategory, React.ComponentType<{ className?: string }>> = {
      person: User,
      vehicle: Car,
      location: MapPin,
      item: Package,
      business: Building2,
    };
    return icons[cat];
  };

  const getKeyIdentifier = (subject: Subject): string => {
    const details = subject.details || {};
    
    switch (category) {
      case 'person':
        const role = PERSON_ROLES.find(r => r.value === subject.role);
        return role?.label || subject.role || 'Unknown Role';
      case 'vehicle':
        if (details.license_plate) return details.license_plate;
        const parts = [details.year, details.make, details.model].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : 'Unknown Vehicle';
      case 'location':
        const locationType = LOCATION_TYPES.find(t => t.value === details.location_type);
        return locationType?.label || details.location_type || 'Unknown Type';
      case 'item':
        const itemType = ITEM_TYPES.find(t => t.value === details.item_type);
        return itemType?.label || details.item_type || 'Unknown Type';
      default:
        return '';
    }
  };

  const getSecondaryInfo = (subject: Subject): string | null => {
    const details = subject.details || {};
    
    switch (category) {
      case 'person':
        return details.aliases || null;
      case 'vehicle':
        if (details.license_plate) {
          const parts = [details.year, details.make, details.model].filter(Boolean);
          return parts.length > 0 ? parts.join(' ') : null;
        }
        return details.vehicle_color || null;
      case 'location':
        const addressParts = [details.street, details.city, details.state].filter(Boolean);
        return addressParts.length > 0 ? addressParts.join(', ') : null;
      case 'item':
        return details.serial_number || null;
      default:
        return null;
    }
  };

  const Icon = getCategoryIcon(category);

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No subjects found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new subject or adjust your filters
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Name</TableHead>
            <TableHead>{category === 'person' ? 'Role' : category === 'vehicle' ? 'Plate/Details' : category === 'location' ? 'Type' : 'Type'}</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((subject) => {
            const signedUrl = getSignedUrl(subject.id);
            const secondaryInfo = getSecondaryInfo(subject);
            
            return (
              <TableRow 
                key={subject.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onNavigate(subject)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    {category === 'person' ? (
                      <Avatar 
                        className={cn(
                          "h-9 w-9",
                          signedUrl && "cursor-zoom-in hover:ring-2 hover:ring-primary/50 transition-all"
                        )}
                        onClick={signedUrl ? (e) => handleImageClick(e, signedUrl, subject.name) : undefined}
                      >
                        <AvatarImage src={signedUrl || undefined} alt={subject.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(subject.name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{subject.display_name || subject.name}</div>
                      {secondaryInfo && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {secondaryInfo}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {getKeyIdentifier(subject)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={subject.status === 'active' ? 'default' : 'secondary'}
                    className={subject.status === 'active' ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20' : ''}
                  >
                    {subject.status === 'active' ? 'Active' : 'Archived'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(subject.updated_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(subject)}>
                        {canEdit && subject.status === 'active' && !isClosedCase ? (
                          <>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </>
                        )}
                      </DropdownMenuItem>
                      {canArchive && !isClosedCase && (
                        <>
                          {subject.status === 'active' ? (
                            <DropdownMenuItem onClick={() => onArchive(subject)}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onUnarchive(subject)}>
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Unarchive
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Image Modal */}
      <ProfileImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageUrl={selectedImage?.url || null}
        alt={selectedImage?.alt || "Profile image"}
      />
    </div>
  );
};
