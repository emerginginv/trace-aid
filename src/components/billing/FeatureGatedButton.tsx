import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Lock, Crown } from "lucide-react";
import { useEntitlements, EntitlementAction } from "@/hooks/use-entitlements";
import { cn } from "@/lib/utils";

interface FeatureGatedButtonProps {
  action: EntitlementAction;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  showUpgradeIcon?: boolean;
}

export function FeatureGatedButton({
  action,
  children,
  onClick,
  className,
  variant = "default",
  size = "default",
  disabled = false,
  showUpgradeIcon = true
}: FeatureGatedButtonProps) {
  const { checkLimits } = useEntitlements();
  
  const { allowed, message } = checkLimits(action);
  const isDisabled = disabled || !allowed;

  if (!allowed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={cn("cursor-not-allowed", className)}
              disabled
            >
              {showUpgradeIcon && <Lock className="h-4 w-4 mr-2" />}
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="flex items-start gap-2">
              <Crown className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Upgrade Required</p>
                <p className="text-xs text-muted-foreground">{message}</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
      disabled={isDisabled}
    >
      {children}
    </Button>
  );
}

export default FeatureGatedButton;
