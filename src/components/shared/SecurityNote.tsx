import { Shield, Lock, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type SecurityVariant = 'encrypted' | 'restricted' | 'audit-logged';

interface SecurityNoteProps {
  /** The security message to display */
  message: string;
  /** The type of security note */
  variant?: SecurityVariant;
  /** Additional class name */
  className?: string;
}

const variantConfig: Record<SecurityVariant, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  encrypted: { icon: Shield, color: "text-green-600 dark:text-green-400" },
  restricted: { icon: Lock, color: "text-amber-600 dark:text-amber-400" },
  'audit-logged': { icon: FileCheck, color: "text-blue-600 dark:text-blue-400" },
};

/**
 * SecurityNote - A small inline security reassurance indicator
 * 
 * Use this component to provide subtle security reassurance to users
 * when they're working with sensitive data.
 * 
 * Variants:
 * - encrypted: For data that is encrypted (shows shield icon)
 * - restricted: For access-controlled data (shows lock icon)
 * - audit-logged: For data with audit trail (shows check icon)
 */
export function SecurityNote({
  message,
  variant = 'encrypted',
  className,
}: SecurityNoteProps) {
  const { icon: Icon, color } = variantConfig[variant];

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Icon className={cn("h-3 w-3 shrink-0", color)} />
      <span>{message}</span>
    </div>
  );
}
