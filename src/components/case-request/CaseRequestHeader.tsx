import { Link } from "react-router-dom";
import { Phone, Globe, LogIn } from "lucide-react";
import { CaseRequestForm } from "@/hooks/queries/useCaseRequestFormBySlug";

interface CaseRequestHeaderProps {
  form: CaseRequestForm;
}

export function CaseRequestHeader({ form }: CaseRequestHeaderProps) {
  // Use form-specific values with fallbacks to organization settings
  const effectiveLogoUrl = form.logo_url || form.org_settings?.logo_url;
  const effectiveDisplayName = form.organization_display_name || form.org_settings?.company_name;
  const effectivePhone = form.organization_phone || form.org_settings?.phone;
  const effectiveWebsite = form.organization_website || form.org_settings?.website_url;

  return (
    <header className="bg-card border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            {effectiveLogoUrl ? (
              <img
                src={effectiveLogoUrl}
                alt={effectiveDisplayName || 'Organization Logo'}
                className="h-12 max-w-[200px] object-contain"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">
                  {effectiveDisplayName?.charAt(0) || 'O'}
                </span>
              </div>
            )}
          </div>

          {/* Center/Right: Organization info */}
          <div className="flex flex-col items-end gap-1">
            <Link
              to="/auth"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <LogIn className="h-3 w-3" />
              Already have an account? Log In
            </Link>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {effectiveDisplayName && (
                <span className="font-medium text-foreground">
                  {effectiveDisplayName}
                </span>
              )}
              {effectivePhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {effectivePhone}
                </span>
              )}
              {effectiveWebsite && (
                <a
                  href={effectiveWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Globe className="h-3 w-3" />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Header instructions */}
        {form.header_instructions && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">{form.header_instructions}</p>
          </div>
        )}
      </div>
    </header>
  );
}
