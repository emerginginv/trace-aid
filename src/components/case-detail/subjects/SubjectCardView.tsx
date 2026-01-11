import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Archive, ArchiveRestore, Eye, Edit, User, Car, MapPin, Package } from "lucide-react";
import { Subject, SubjectCategory, SUBJECT_CATEGORY_SINGULAR } from "./types";
import { useSubjectProfileImages } from "@/hooks/use-subject-profile-images";
import { cn } from "@/lib/utils";
import { ProfileImageModal } from "./ProfileImageModal";

interface SubjectCardViewProps {
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

const getSubjectSubtitle = (subject: Subject): string => {
  const details = subject.details || {};
  
  switch (subject.subject_type) {
    case 'person':
      return subject.role || details.occupation || '';
    case 'vehicle':
      const parts = [details.year, details.make, details.model].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : (details.license_plate || '');
    case 'location':
      return details.location_type || details.city || '';
    case 'item':
      return details.item_type || details.serial_number || '';
    default:
      return '';
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

export const SubjectCardView = ({
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
}: SubjectCardViewProps) => {
  const subjectsForImages = subjects.map(s => ({ 
    id: s.id, 
    profile_image_url: s.profile_image_url || null 
  }));
  const { signedUrls } = useSubjectProfileImages(subjectsForImages);
  const Icon = getCategoryIcon(category);

  // Image modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const handleImageClick = (e: React.MouseEvent, imageUrl: string, alt: string) => {
    e.stopPropagation();
    setSelectedImage({ url: imageUrl, alt });
    setImageModalOpen(true);
  };

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">
          No {SUBJECT_CATEGORY_SINGULAR[category].toLowerCase()}s found
        </h3>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Add a {SUBJECT_CATEGORY_SINGULAR[category].toLowerCase()} to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject) => {
        const imageUrl = subject.profile_image_url ? signedUrls[subject.id] : null;
        const subtitle = getSubjectSubtitle(subject);
        const isArchived = subject.status === 'archived';

        return (
          <Card
            key={subject.id}
            className={cn(
              "relative pt-14 transition-shadow hover:shadow-md cursor-pointer group",
              isArchived && "opacity-70"
            )}
            onClick={() => onNavigate(subject)}
          >
            {/* Status Badge */}
            {isArchived && (
              <Badge 
                variant="secondary" 
                className="absolute top-3 right-3 text-xs"
              >
                Archived
              </Badge>
            )}

            {/* Primary Badge */}
            {subject.is_primary && !isArchived && (
              <Badge 
                className="absolute top-3 right-3 text-xs bg-primary/10 text-primary border-primary/20"
              >
                Primary
              </Badge>
            )}

            {/* Overlapping Avatar/Icon */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              {category === 'person' ? (
                <Avatar 
                  className={cn(
                    "h-24 w-24 border-4 border-card shadow-md",
                    imageUrl && "cursor-zoom-in hover:ring-2 hover:ring-primary/50 transition-all"
                  )}
                  onClick={imageUrl ? (e) => handleImageClick(e, imageUrl, subject.display_name || subject.name) : undefined}
                >
                  <AvatarImage src={imageUrl || undefined} alt={subject.display_name || subject.name} />
                  <AvatarFallback className="text-xl bg-muted">
                    {getInitials(subject.display_name || subject.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-24 w-24 rounded-full bg-muted border-4 border-card shadow-md flex items-center justify-center">
                  <Icon className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Action Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 left-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onEdit(subject)}>
                  {canEdit && !isClosedCase && !isArchived ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
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
                    {isArchived ? (
                      <DropdownMenuItem onClick={() => onUnarchive(subject)}>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Unarchive
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onArchive(subject)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <CardContent className="pt-0 text-center">
              {/* Name */}
              <h3 className="font-semibold text-foreground truncate">
                {subject.display_name || subject.name}
              </h3>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {subtitle}
                </p>
              )}

              {/* Notes */}
              {subject.notes && (
                <p className="text-sm text-muted-foreground/80 mt-3 line-clamp-3 text-left">
                  {subject.notes}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

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
