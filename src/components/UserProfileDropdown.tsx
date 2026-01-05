import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { User, MessageCircle, Settings, Sun, Moon, Monitor, LogOut, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HelpFeedbackDialog } from "@/components/HelpFeedback";

interface UserProfileDropdownProps {
  userProfile: {
    full_name: string | null;
    email: string;
    role: string;
    avatar_url: string | null;
  } | null;
}

export function UserProfileDropdown({ userProfile }: UserProfileDropdownProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const getThemeIcon = () => {
    if (theme === "dark") return <Moon className="mr-2 h-4 w-4" />;
    if (theme === "light") return <Sun className="mr-2 h-4 w-4" />;
    return <Monitor className="mr-2 h-4 w-4" />;
  };

  if (!userProfile) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-3 p-2 w-full cursor-pointer transition-colors rounded-md hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile.avatar_url || ""} alt={userProfile.full_name || userProfile.email} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(userProfile.full_name, userProfile.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {userProfile.full_name || userProfile.email}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate capitalize">
                {userProfile.role}
              </p>
            </div>
            <ChevronUp className="h-4 w-4 text-sidebar-foreground/60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* My Profile */}
          <DropdownMenuItem onClick={() => navigate("/profile")}>
            <User className="mr-2 h-4 w-4" />
            My Profile
          </DropdownMenuItem>
          
          {/* Help & Feedback */}
          <DropdownMenuItem onClick={() => setHelpDialogOpen(true)}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Help & Feedback
          </DropdownMenuItem>
          
          {/* Settings */}
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Theme Toggle */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {getThemeIcon()}
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          
          <DropdownMenuSeparator />
          
          {/* Log Out */}
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Help & Feedback Dialog (rendered outside dropdown) */}
      <HelpFeedbackDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
    </>
  );
}
