import { cn } from "@/lib/utils";
import { 
  User, 
  Building2, 
  Shield, 
  Users, 
  List, 
  FileText, 
  Mail, 
  CreditCard, 
  Upload,
  Database
} from "lucide-react";

interface SettingsNavItem {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: SettingsNavItem[] = [
  { value: "preferences", label: "Preferences", icon: User, roles: ['admin', 'manager', 'investigator', 'vendor'] },
  { value: "organization", label: "Organization", icon: Building2, roles: ['admin', 'manager'] },
  { value: "permissions", label: "Permissions", icon: Shield, roles: ['admin', 'manager'] },
  { value: "users", label: "Users", icon: Users, roles: ['admin', 'manager'] },
  { value: "picklists", label: "Picklists", icon: List, roles: ['admin', 'manager'] },
  { value: "templates", label: "Templates", icon: FileText, roles: ['admin', 'manager'] },
  { value: "email", label: "Email", icon: Mail, roles: ['admin', 'manager'] },
  { value: "data-import", label: "Data Import", icon: Upload, roles: ['admin', 'manager'] },
  { value: "billing", label: "Billing", icon: CreditCard, roles: ['admin'] },
  { value: "data-integrity", label: "Data Integrity", icon: Database, roles: ['admin'] },
];

interface SettingsNavProps {
  currentTab: string;
  onTabChange: (value: string) => void;
  userRole: string | null;
  onUsersClick?: () => void;
}

export function SettingsNav({ currentTab, onTabChange, userRole, onUsersClick }: SettingsNavProps) {
  const filteredItems = navItems.filter(item => 
    !userRole || item.roles.includes(userRole)
  );

  return (
    <nav className="flex flex-col space-y-1">
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.value;
        
        return (
          <button
            key={item.value}
            onClick={() => {
              onTabChange(item.value);
              if (item.value === 'users' && onUsersClick) {
                onUsersClick();
              }
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left w-full",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
