import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  MapPin,
  Mail,
  MessageSquare,
  Users,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { EntityActivityForm } from "./EntityActivityForm";
import { ActivityPhotoViewer } from "./ActivityPhotoViewer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EntityActivityWidgetProps {
  entityType: "account" | "contact";
  entityId: string;
}

interface ActivityItem {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  activity_date: string;
  user_id: string;
  created_at: string;
  photos: ActivityPhoto[];
  user_name?: string;
}

interface ActivityPhoto {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
}

const ACTIVITY_TYPE_ICONS: Record<string, React.ElementType> = {
  "Phone Call": Phone,
  Visit: MapPin,
  Email: Mail,
  "Text Message": MessageSquare,
  Meeting: Users,
  Other: FileText,
};

const ACTIVITY_TYPES = ["Phone Call", "Visit", "Email", "Text Message", "Meeting", "Other"];

export function EntityActivityWidget({ entityType, entityId }: EntityActivityWidgetProps) {
  const { organization } = useOrganization();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<{ url: string; name: string }[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    if (organization?.id && entityId) {
      fetchActivities();
    }
  }, [organization?.id, entityId]);

  const fetchActivities = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("entity_activities")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("organization_id", organization.id)
        .order("activity_date", { ascending: false });

      if (activitiesError) throw activitiesError;

      // Fetch photos for all activities
      const activityIds = activitiesData?.map((a) => a.id) || [];
      let photosMap: Record<string, ActivityPhoto[]> = {};

      if (activityIds.length > 0) {
        const { data: photosData, error: photosError } = await supabase
          .from("entity_activity_photos")
          .select("*")
          .in("activity_id", activityIds);

        if (photosError) throw photosError;

        photosMap = (photosData || []).reduce((acc, photo) => {
          if (!acc[photo.activity_id]) {
            acc[photo.activity_id] = [];
          }
          acc[photo.activity_id].push(photo);
          return acc;
        }, {} as Record<string, ActivityPhoto[]>);
      }

      // Fetch user names
      const userIds = [...new Set(activitiesData?.map((a) => a.user_id) || [])];
      let userMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        userMap = (usersData || []).reduce((acc, user) => {
          acc[user.id] = user.full_name || "Unknown User";
          return acc;
        }, {} as Record<string, string>);
      }

      setActivities(
        (activitiesData || []).map((activity) => ({
          ...activity,
          photos: photosMap[activity.id] || [],
          user_name: userMap[activity.user_id],
        }))
      );
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEdit = (activity: ActivityItem) => {
    setEditingActivity(activity);
    setIsFormOpen(true);
  };

  const handleDelete = (activityId: string) => {
    setDeletingActivityId(activityId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingActivityId) return;

    try {
      // First delete photos from storage
      const activity = activities.find((a) => a.id === deletingActivityId);
      if (activity?.photos.length) {
        const filePaths = activity.photos.map((p) => p.file_path);
        await supabase.storage.from("entity-activity-photos").remove(filePaths);
      }

      // Delete activity (cascade will delete photo records)
      const { error } = await supabase
        .from("entity_activities")
        .delete()
        .eq("id", deletingActivityId);

      if (error) throw error;

      toast.success("Activity deleted");
      fetchActivities();
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast.error("Failed to delete activity");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingActivityId(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingActivity(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchActivities();
  };

  const openPhotoViewer = async (photos: ActivityPhoto[], index: number) => {
    const urls = await Promise.all(
      photos.map(async (photo) => {
        const { data } = await supabase.storage
          .from("entity-activity-photos")
          .createSignedUrl(photo.file_path, 3600);
        return { url: data?.signedUrl || "", name: photo.file_name };
      })
    );
    setViewerPhotos(urls);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const getActivityIcon = (type: string) => {
    const IconComponent = ACTIVITY_TYPE_ICONS[type] || FileText;
    return <IconComponent className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Log
            <Badge variant="secondary" className="ml-2">
              {activities.length}
            </Badge>
          </CardTitle>
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Activity
          </Button>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No activities recorded for this {entityType} yet.
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const isExpanded = expandedIds.has(activity.id);
                return (
                  <div
                    key={activity.id}
                    className="border rounded-lg p-4 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
                          {getActivityIcon(activity.activity_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {activity.activity_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(activity.activity_date), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          <h4 className="font-medium mt-1 truncate">{activity.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            by {activity.user_name}
                          </p>

                          {activity.photos.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <ImageIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {activity.photos.length} photo(s)
                              </span>
                            </div>
                          )}

                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              {activity.description && (
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {activity.description}
                                </p>
                              )}
                              {activity.photos.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {activity.photos.map((photo, idx) => (
                                    <PhotoThumbnail
                                      key={photo.id}
                                      photo={photo}
                                      onClick={() => openPhotoViewer(activity.photos, idx)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(activity)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(activity.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleExpand(activity.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EntityActivityForm
        open={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        entityType={entityType}
        entityId={entityId}
        activityTypes={ACTIVITY_TYPES}
        editingActivity={editingActivity}
      />

      <ActivityPhotoViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        photos={viewerPhotos}
        initialIndex={viewerIndex}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This will also delete any attached
              photos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PhotoThumbnail({
  photo,
  onClick,
}: {
  photo: ActivityPhoto;
  onClick: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadUrl = async () => {
      const { data } = await supabase.storage
        .from("entity-activity-photos")
        .createSignedUrl(photo.file_path, 3600);
      setUrl(data?.signedUrl || null);
    };
    loadUrl();
  }, [photo.file_path]);

  if (!url) {
    return <Skeleton className="w-16 h-16 rounded" />;
  }

  return (
    <button
      onClick={onClick}
      className="w-16 h-16 rounded overflow-hidden border hover:ring-2 ring-primary transition-all"
    >
      <img src={url} alt={photo.file_name} className="w-full h-full object-cover" />
    </button>
  );
}
