import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Update {
  id: string;
  title: string;
  description: string;
  created_at: string;
  update_type: string;
  user_id: string;
  case_id: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

const UpdateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [update, setUpdate] = useState<Update | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdate();
  }, [id]);

  const fetchUpdate = async () => {
    try {
      setLoading(true);
      
      const { data: updateData, error: updateError } = await supabase
        .from("case_updates")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (updateError) throw updateError;

      if (!updateData) {
        toast({
          title: "Update not found",
          description: "The requested update could not be found.",
          variant: "destructive",
        });
        navigate("/cases");
        return;
      }

      setUpdate(updateData);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", updateData.user_id)
        .maybeSingle();

      if (profileData) {
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error("Error fetching update:", error);
      toast({
        title: "Error",
        description: "Failed to load update details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!update) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/cases/${update.case_id}`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Case
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{update.title}</CardTitle>
              <Badge variant="outline">{update.update_type}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(update.created_at), "PPP 'at' p")}
              </span>
            </div>

            {userProfile && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  Created by {userProfile.full_name || userProfile.email}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4" />
              Description
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {update.description || "No description provided."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateDetail;
