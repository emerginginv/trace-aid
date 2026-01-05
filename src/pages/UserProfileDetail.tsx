import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Shield, User, Calendar } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { format } from "date-fns";

const UserProfileDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [userProfile, setUserProfile] = useState<{
    full_name: string | null;
    email: string;
    role: string;
    created_at: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useSetBreadcrumbs(
    userProfile
      ? [
          { label: "Users", href: "/users" },
          { label: userProfile.full_name || userProfile.email },
        ]
      : []
  );

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!id) {
        navigate("/users");
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, email, created_at")
          .eq("id", id)
          .maybeSingle();

        const { data: userRole, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          navigate("/users");
          return;
        }

        if (!profile) {
          console.error("Profile not found for user:", id);
          navigate("/users");
          return;
        }

        setUserProfile({
          full_name: profile.full_name || null,
          email: profile.email || "",
          role: userRole?.role || "member",
          created_at: profile.created_at || new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        navigate("/users");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [id, navigate]);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role.toLowerCase()) {
      case "admin":
        return "default";
      case "moderator":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!userProfile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Unable to load profile</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/users")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-heading-1">User Profile</h1>
              <p className="text-muted-foreground mt-1">
                View user information
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-32 w-32 border-4 border-primary/10">
                  <AvatarImage src="" alt={userProfile.full_name || userProfile.email} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                    {getInitials(userProfile.full_name, userProfile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 w-full">
                  <h2 className="text-xl font-semibold">
                    {userProfile.full_name || "User"}
                  </h2>
                  <Badge variant={getRoleBadgeVariant(userProfile.role)} className="capitalize">
                    {userProfile.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Full Name
                    </p>
                    <p className="text-base font-semibold truncate">
                      {userProfile.full_name || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Email Address
                    </p>
                    <p className="text-base font-semibold truncate">
                      {userProfile.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Role
                    </p>
                    <p className="text-base font-semibold capitalize">
                      {userProfile.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Member Since
                    </p>
                    <p className="text-base font-semibold">
                      {format(new Date(userProfile.created_at), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserProfileDetail;
