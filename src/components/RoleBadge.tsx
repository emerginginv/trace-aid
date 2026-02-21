import { Badge } from "@/components/ui/badge";
import { Shield, UserCog, Search, Briefcase, Crown, User } from "lucide-react";
type AppRole = 'admin' | 'manager' | 'investigator' | 'vendor' | 'owner' | 'member';
interface RoleBadgeProps {
  role: AppRole;
  className?: string;
}
export function RoleBadge({
  role,
  className
}: RoleBadgeProps) {
  const roleConfig = {
    admin: {
      label: 'Admin',
      icon: Shield,
      variant: 'default' as const
    },
    manager: {
      label: 'Case Manager',
      icon: UserCog,
      variant: 'secondary' as const
    },
    investigator: {
      label: 'Investigator',
      icon: Search,
      variant: 'outline' as const
    },
    vendor: {
      label: 'Vendor',
      icon: Briefcase,
      variant: 'outline' as const
    },
    owner: {
      label: 'Owner',
      icon: Crown,
      variant: 'default' as const
    },
    member: {
      label: 'Member',
      icon: User,
      variant: 'outline' as const
    }
  };


  const config = roleConfig[role];

  if (!config) {
    console.warn(`[RoleBadge] Unknown role encountered: ${role}`);
    return null;
  }

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}