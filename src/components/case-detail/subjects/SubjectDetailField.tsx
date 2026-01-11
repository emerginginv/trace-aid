import React from "react";
import { cn } from "@/lib/utils";

interface SubjectDetailFieldProps {
  icon?: React.ElementType;
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
  href?: string;
  className?: string;
  emptyText?: string;
}

/**
 * A display component that ALWAYS shows fields, even when empty.
 * Shows field label and value with consistent styling.
 * Displays em-dash for empty/null values.
 */
export const SubjectDetailField = ({ 
  icon: Icon, 
  label, 
  value, 
  isLink, 
  href,
  className,
  emptyText = "—"
}: SubjectDetailFieldProps) => {
  const displayValue = value || emptyText;
  const isEmpty = !value;
  
  return (
    <div className={cn("flex items-start gap-3 py-3", className)}>
      {Icon && (
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {isLink && href && !isEmpty ? (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {displayValue}
          </a>
        ) : (
          <p className={cn(
            "text-foreground",
            isEmpty && "text-muted-foreground/60 italic"
          )}>
            {displayValue}
          </p>
        )}
      </div>
    </div>
  );
};
