import { useOrganization } from "@/contexts/OrganizationContext";
import { Building2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function OrganizationSwitcher() {
  const { organization, organizations, switchOrganization, loading } = useOrganization();

  // Don't show switcher if user only has one organization
  if (loading || organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-[140px]">
          {organization?.name || "No Organization"}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between gap-2 px-2 py-1.5 h-auto font-normal hover:bg-sidebar-accent"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">
              {organization?.name || "Select Organization"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org.id)}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate">{org.name}</span>
            {org.id === organization?.id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
