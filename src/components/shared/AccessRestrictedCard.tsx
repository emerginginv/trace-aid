import { ShieldAlert, Lock, Eye, AlertTriangle, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AccessRestrictedCardProps {
  /** Icon to display (defaults to ShieldAlert) */
  icon?: LucideIcon;
  /** Main title */
  title?: string;
  /** Short description of what's restricted */
  description: string;
  /** Explanation of why access is restricted */
  reason?: string;
  /** Message about how to get access */
  contactMessage?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional class name */
  className?: string;
}

/**
 * AccessRestrictedCard - Enhanced access denied component with explanations
 * 
 * Use this component when users don't have permission to access a feature.
 * It provides clear explanations about why access is restricted and what
 * users can do about it.
 */
export function AccessRestrictedCard({
  icon: Icon = ShieldAlert,
  title = "Access Restricted",
  description,
  reason,
  contactMessage = "Contact your administrator if you believe you need access.",
  action,
  className,
}: AccessRestrictedCardProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        
        <p className="text-muted-foreground mb-4 max-w-md">
          {description}
        </p>
        
        {reason && (
          <div className="bg-muted/50 rounded-lg p-4 mb-4 max-w-md">
            <div className="flex items-start gap-2 text-sm text-left">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Why?</span>
                <p className="text-muted-foreground mt-1">{reason}</p>
              </div>
            </div>
          </div>
        )}
        
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {contactMessage}
        </p>
        
        {action && (
          <Button variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Preset configurations for common access restriction scenarios
 */
export const AccessRestrictedPresets = {
  subjects: {
    description: "Subject information is restricted to protect personal data. Your role does not include subject access for this case.",
    reason: "Subject profiles may contain sensitive information like SSNs, addresses, and personal identifiers that require controlled access.",
  },
  finances: {
    description: "Financial data is restricted based on your role and case assignment.",
    reason: "Billing rates, client invoices, and expense details require management oversight. This protects both client confidentiality and internal pricing.",
    contactMessage: "Investigators can view their own time entries on the My Time page.",
  },
  attachments: {
    description: "Attachment access is controlled to protect case evidence and documentation.",
    reason: "Case files may contain sensitive evidence, legal documents, or privileged communications. Access is granted based on case assignment and role.",
    contactMessage: "If you need access to specific files, contact your case manager.",
  },
  reports: {
    description: "Report generation is restricted based on your role.",
    reason: "Reports are client-facing deliverables that require quality review before distribution.",
  },
  users: {
    description: "User management is restricted to administrators.",
    reason: "User account creation, role changes, and password resets require administrative privileges to maintain security.",
  },
  settings: {
    description: "Organization settings are restricted to administrators.",
    reason: "System configuration changes can affect all users and require administrative oversight.",
  },
};
