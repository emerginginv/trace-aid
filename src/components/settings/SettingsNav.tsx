import { useState } from "react";
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
  Database,
  ChevronDown,
  Menu,
  HelpCircle,
  KeyRound,
  Scale,
  FileBarChart,
  Plug
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  { value: "authentication", label: "Authentication", icon: KeyRound, roles: ['admin'] },
  { value: "picklists", label: "Picklists", icon: List, roles: ['admin', 'manager'] },
  { value: "templates", label: "Templates", icon: FileText, roles: ['admin', 'manager'] },
  { value: "email", label: "Email", icon: Mail, roles: ['admin', 'manager'] },
  { value: "data-import", label: "Data Import", icon: Upload, roles: ['admin', 'manager'] },
  { value: "help-center", label: "Help Center", icon: HelpCircle, roles: ['admin'] },
  { value: "billing", label: "Billing", icon: CreditCard, roles: ['admin'] },
  { value: "legal", label: "Legal", icon: Scale, roles: ['admin'] },
  { value: "reports", label: "Reports & Exports", icon: FileBarChart, roles: ['admin'] },
  { value: "sla", label: "SLA & Success", icon: Shield, roles: ['admin'] },
  { value: "integrations", label: "Integrations", icon: Plug, roles: ['admin'] },
  { value: "data-compliance", label: "Data & Compliance", icon: Shield, roles: ['admin'] },
  { value: "data-integrity", label: "Data Integrity", icon: Database, roles: ['admin'] },
];

interface SettingsNavProps {
  currentTab: string;
  onTabChange: (value: string) => void;
  userRole: string | null;
  onUsersClick?: () => void;
}

export function SettingsNav({ currentTab, onTabChange, userRole, onUsersClick }: SettingsNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredItems = navItems.filter(item => 
    !userRole || item.roles.includes(userRole)
  );

  const currentItem = filteredItems.find(item => item.value === currentTab);
  const CurrentIcon = currentItem?.icon || User;

  const handleTabClick = (value: string) => {
    onTabChange(value);
    setIsOpen(false); // Close on mobile after selection
    if (value === 'users' && onUsersClick) {
      onUsersClick();
    }
  };

  const navContent = (
    <nav className="flex flex-col space-y-1">
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.value;
        
        return (
          <button
            key={item.value}
            onClick={() => handleTabClick(item.value)}
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

  return (
    <>
      {/* Mobile collapsible navigation */}
      <div className="md:hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-4 py-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Menu className="h-4 w-4 text-muted-foreground" />
                <CurrentIcon className="h-4 w-4" />
                <span className="font-medium">{currentItem?.label || "Settings"}</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 bg-card rounded-lg border border-border p-2">
            {navContent}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop vertical navigation */}
      <div className="hidden md:block">
        {navContent}
      </div>
    </>
  );
}
