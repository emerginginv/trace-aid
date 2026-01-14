import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Briefcase, 
  Clock, 
  Users, 
  FilePenLine, 
  ClipboardList, 
  Calendar, 
  DollarSign, 
  Paperclip,
  ChevronDown,
  Menu,
  History
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CaseDetailNavItem {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  vendorVisible: boolean;
  requiresPermission?: string;
}

const navItems: CaseDetailNavItem[] = [
  { value: "info", label: "Info", icon: Briefcase, vendorVisible: false },
  { value: "budget", label: "Budget", icon: Clock, vendorVisible: false },
  { value: "subjects", label: "Subjects", icon: Users, vendorVisible: false },
  { value: "updates", label: "Updates", icon: FilePenLine, vendorVisible: true },
  { value: "activities", label: "Activities", icon: ClipboardList, vendorVisible: false },
  { value: "calendar", label: "Calendar", icon: Calendar, vendorVisible: false },
  { value: "finances", label: "Finances", icon: DollarSign, vendorVisible: false },
  { value: "attachments", label: "Attachments", icon: Paperclip, vendorVisible: true },
  { value: "timeline", label: "Timeline", icon: History, vendorVisible: false },
  { value: "reports", label: "Reports", icon: FilePenLine, vendorVisible: false, requiresPermission: 'view_reports' },
];

interface CaseDetailNavProps {
  currentTab: string;
  onTabChange: (value: string) => void;
  isVendor: boolean;
  hasReportsPermission: boolean;
}

export function CaseDetailNav({ 
  currentTab, 
  onTabChange, 
  isVendor,
  hasReportsPermission 
}: CaseDetailNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredItems = navItems.filter(item => {
    if (isVendor && !item.vendorVisible) return false;
    if (item.requiresPermission === 'view_reports' && !hasReportsPermission) return false;
    return true;
  });

  const currentItem = filteredItems.find(item => item.value === currentTab);
  const CurrentIcon = currentItem?.icon || Briefcase;

  const handleTabClick = (value: string) => {
    onTabChange(value);
    setIsOpen(false);
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
                <span className="font-medium">{currentItem?.label || "Info"}</span>
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
