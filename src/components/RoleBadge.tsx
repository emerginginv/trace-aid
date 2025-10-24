import { Badge } from "@/components/ui/badge";
import { Shield, UserCog, Search } from "lucide-react";

type AppRole = 'admin' | 'manager' | 'investigator';

interface RoleBadgeProps {
  role: AppRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const roleConfig = {
    admin: {
      label: 'Admin',
      icon: Shield,
      variant: 'default' as const,
    },
    manager: {
      label: 'Case Manager',
      icon: UserCog,
      variant: 'secondary' as const,
    },
    investigator: {
      label: 'Investigator',
      icon: Search,
      variant: 'outline' as const,
    },
  };

  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
