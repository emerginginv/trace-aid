import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Archive, ArchiveRestore, Eye, Edit, User, Car, MapPin, Package, MoreHorizontal, Building2 } from "lucide-react";
import { Subject, SubjectCategory, SUBJECT_CATEGORY_SINGULAR } from "./types";
import { useSubjectProfileImages } from "@/hooks/use-subject-profile-images";
import { cn } from "@/lib/utils";
import { ProfileImageModal } from "./ProfileImageModal";
import { SocialLinkIcon, getPlatformConfig, SocialPlatform } from "./SocialPlatformIcons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Global TooltipProvider in App.tsx

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
    case 'business':
      return Building2;
    default:
      // Fallback for any unknown category - prevents undefined icon crash
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
    profile_image_url: s.profile_image_url || null,
    cover_image_url: s.cover_image_url || null
  }));
  const { signedUrls, signedCoverUrls } = useSubjectProfileImages(subjectsForImages);
  const Icon = getCategoryIcon(category);

  // Fetch social links for person subjects
  const personSubjectIds = category === 'person' 
    ? subjects.map(s => s.id) 
    : [];
  
  const { data: socialLinks = [] } = useQuery({
    queryKey: ['subject-social-links-cards', personSubjectIds],
    queryFn: async () => {
      if (personSubjectIds.length === 0) return [];
      const { data, error } = await supabase
        .from('subject_social_links')
        .select('*')
        .in('subject_id', personSubjectIds);
      if (error) throw error;
      return data || [];
    },
    enabled: personSubjectIds.length > 0,
  });

  // Group social links by subject id
  const socialLinksBySubject = socialLinks.reduce((acc, link) => {
    if (!acc[link.subject_id]) {
      acc[link.subject_id] = [];
    }
    acc[link.subject_id].push(link);
    return acc;
  }, {} as Record<string, typeof socialLinks>);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {subjects.map((subject) => {
        const imageUrl = subject.profile_image_url ? signedUrls[subject.id] : null;
        const subtitle = getSubjectSubtitle(subject);
        const isArchived = subject.status === 'archived';
        const subjectLinks = socialLinksBySubject[subject.id] || [];

        return (
          <Card
            key={subject.id}
            className={cn(
              "p-4 hover:shadow-md transition-shadow cursor-pointer",
              isArchived && "opacity-70"
            )}
            onClick={() => onNavigate(subject)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigate(subject);
              }
            }}
          >
            {/* Header: Avatar + Name + Status */}
            <div className="flex items-start gap-3 mb-3">
              {/* Avatar/Icon */}
              {imageUrl ? (
                <Avatar 
                  className="h-10 w-10 flex-shrink-0 cursor-zoom-in hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={(e) => handleImageClick(e, imageUrl, subject.display_name || subject.name)}
                >
                  <AvatarImage src={imageUrl} alt={subject.display_name || subject.name} />
                  <AvatarFallback className="text-sm bg-muted">
                    {category === 'person' ? getInitials(subject.display_name || subject.name) : <Icon className="h-5 w-5 text-muted-foreground" />}
                  </AvatarFallback>
                </Avatar>
              ) : category === 'person' ? (
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                    {getInitials(subject.display_name || subject.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              {/* Name + Badge */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-base leading-tight truncate">
                    {subject.display_name || subject.name}
                  </h3>
                  {/* Status Badge */}
                  {isArchived ? (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Archived
                    </Badge>
                  ) : subject.is_primary ? (
                    <Badge className="text-xs bg-primary text-white shrink-0">
                      Primary
                    </Badge>
                  ) : null}
                </div>
              </div>

              {/* Action Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
            </div>

            {/* Subtitle (Role/Type) */}
            {subtitle && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{subtitle}</span>
              </div>
            )}

            {/* Date of Birth (People only) */}
            {category === 'person' && (() => {
              const dob = subject.details?.date_of_birth;
              if (!dob) return null;
              try {
                const formattedDob = format(new Date(dob), "MMM d, yyyy");
                return (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                    <User className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>DOB: {formattedDob}</span>
                  </div>
                );
              } catch {
                return null;
              }
            })()}

            {/* Notes */}
            {subject.notes && (
              <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-2">
                {subject.notes}
              </p>
            )}

            {/* Social Media Icons (People only) - Footer */}
            {category === 'person' && subjectLinks.length > 0 && (
              <div 
                className="flex items-center gap-1 pt-2 border-t mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                {subjectLinks.slice(0, 5).map((link) => (
                  <SocialLinkIcon
                    key={link.id}
                    platform={link.platform as SocialPlatform}
                    url={link.url}
                    label={link.label || undefined}
                    size="sm"
                  />
                ))}
                {subjectLinks.length > 5 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        +{subjectLinks.length - 5}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{subjectLinks.length - 5} more link{subjectLinks.length - 5 > 1 ? 's' : ''}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
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
