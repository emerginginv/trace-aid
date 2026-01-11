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
import { MoreVertical, Archive, ArchiveRestore, Eye, Edit, User, Car, MapPin, Package, MoreHorizontal } from "lucide-react";
import { Subject, SubjectCategory, SUBJECT_CATEGORY_SINGULAR } from "./types";
import { useSubjectProfileImages } from "@/hooks/use-subject-profile-images";
import { cn } from "@/lib/utils";
import { ProfileImageModal } from "./ProfileImageModal";
import { SocialLinkIcon, getPlatformConfig, SocialPlatform } from "./SocialPlatformIcons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject) => {
        const imageUrl = subject.profile_image_url ? signedUrls[subject.id] : null;
        const coverUrl = subject.cover_image_url ? signedCoverUrls[subject.id] : null;
        const subtitle = getSubjectSubtitle(subject);
        const isArchived = subject.status === 'archived';

        return (
          <Card
            key={subject.id}
            className={cn(
              "relative overflow-hidden transition-shadow hover:shadow-md cursor-pointer group",
              isArchived && "opacity-70"
            )}
            onClick={() => onNavigate(subject)}
          >
            {/* Cover Image Section */}
            <div className="h-20 relative">
              {coverUrl ? (
                <img 
                  src={coverUrl} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-muted" />
              )}
            </div>

            {/* Status Badge */}
            {isArchived && (
              <Badge 
                variant="secondary" 
                className="absolute top-2 right-2 text-xs z-10"
              >
                Archived
              </Badge>
            )}

            {/* Primary Badge */}
            {subject.is_primary && !isArchived && (
              <Badge 
                className="absolute top-2 right-2 text-xs bg-primary text-white z-10"
              >
                Primary
              </Badge>
            )}

            {/* Overlapping Avatar/Icon - positioned to overlap cover */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
              {imageUrl ? (
                <Avatar 
                  className={cn(
                    "h-24 w-24 border-4 border-card shadow-md cursor-zoom-in hover:ring-2 hover:ring-primary/50 transition-all"
                  )}
                  onClick={(e) => handleImageClick(e, imageUrl, subject.display_name || subject.name)}
                >
                  <AvatarImage src={imageUrl} alt={subject.display_name || subject.name} />
                  <AvatarFallback className="text-xl bg-muted">
                    {category === 'person' ? getInitials(subject.display_name || subject.name) : <Icon className="h-10 w-10 text-muted-foreground" />}
                  </AvatarFallback>
                </Avatar>
              ) : category === 'person' ? (
                <Avatar className="h-24 w-24 border-4 border-card shadow-md">
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

            <CardContent className="pt-14 flex flex-col items-center text-center">
              {/* Name */}
              <h3 className="font-semibold text-foreground truncate w-full">
                {subject.display_name || subject.name}
              </h3>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate w-full">
                  {subtitle}
                </p>
              )}

              {/* Date of Birth (People only) */}
              {category === 'person' && (() => {
                const dob = subject.details?.date_of_birth;
                if (!dob) return null;
                try {
                  const formattedDob = format(new Date(dob), "MMM d, yyyy");
                  return (
                    <p className="text-xs text-muted-foreground mt-1">
                      DOB: {formattedDob}
                    </p>
                  );
                } catch {
                  return null;
                }
              })()}

              {/* Social Media Icons (People only) */}
              {category === 'person' && (() => {
                const subjectLinks = socialLinksBySubject[subject.id] || [];
                if (subjectLinks.length === 0) return null;
                
                const displayedLinks = subjectLinks.slice(0, 5);
                const overflowCount = subjectLinks.length - 5;
                
                return (
                  <div 
                    className="flex items-center justify-center gap-1 mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TooltipProvider>
                      {displayedLinks.map((link) => (
                        <SocialLinkIcon
                          key={link.id}
                          platform={link.platform as SocialPlatform}
                          url={link.url}
                          label={link.label || undefined}
                          size="sm"
                        />
                      ))}
                      {overflowCount > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              +{overflowCount}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{overflowCount} more link{overflowCount > 1 ? 's' : ''}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                  </div>
                );
              })()}

              {/* Notes */}
              {subject.notes && (
                <p className="text-sm text-muted-foreground/80 mt-3 line-clamp-3 text-center w-full">
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
