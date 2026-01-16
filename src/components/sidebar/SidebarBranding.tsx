import { Shield } from "lucide-react";
import { OrgSettings } from "./types";

interface SidebarBrandingProps {
  orgSettings: OrgSettings | null;
  isLoading?: boolean;
}

export function SidebarBranding({ orgSettings, isLoading }: SidebarBrandingProps) {
  const logoUrl = orgSettings?.square_logo_url || orgSettings?.logo_url;
  const companyName = orgSettings?.company_name || "Organization";

  // Show skeleton during loading to prevent CaseWyze flash
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-sidebar-accent animate-pulse" />
        <div className="space-y-1">
          <div className="h-4 w-24 bg-sidebar-accent rounded animate-pulse" />
          <div className="h-3 w-20 bg-sidebar-accent/60 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (logoUrl) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={logoUrl}
          alt={companyName}
          className="w-8 h-8 rounded-lg object-contain"
        />
        <div>
          <h2 className="font-medium text-base truncate max-w-[140px] text-neutral-50">
            {companyName}
          </h2>
          <p className="text-xs text-sidebar-foreground/60">Case Management</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
        <Shield className="w-5 h-5 text-white" />
      </div>
      <div>
        <h2 className="text-sky-300 font-medium text-base">CaseWyze</h2>
        <p className="text-xs text-sidebar-foreground/60">Case Management</p>
      </div>
    </div>
  );
}
