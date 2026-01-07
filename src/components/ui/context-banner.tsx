import { cn } from "@/lib/utils";
import { Layout, FileText, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContextBannerProps {
  variant: 'template' | 'case-letter';
  title: string;
  description: string;
  tips?: string[];
  className?: string;
}

export function ContextBanner({ 
  variant, 
  title, 
  description, 
  tips,
  className 
}: ContextBannerProps) {
  const Icon = variant === 'template' ? Layout : FileText;
  
  return (
    <div className={cn(
      "rounded-lg border p-4",
      variant === 'template' 
        ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800" 
        : "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
      className
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn(
          "h-5 w-5 mt-0.5 shrink-0",
          variant === 'template' 
            ? "text-blue-600 dark:text-blue-400" 
            : "text-green-600 dark:text-green-400"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-medium text-sm",
              variant === 'template' 
                ? "text-blue-900 dark:text-blue-100" 
                : "text-green-900 dark:text-green-100"
            )}>
              {title}
            </h4>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium text-sm">Templates vs. Letters</p>
                <p className="text-xs mt-1">
                  Templates define reusable structure with placeholders. Letters are generated for specific cases using templates, filled with that case's data.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={cn(
            "text-sm mt-1",
            variant === 'template' 
              ? "text-blue-700 dark:text-blue-300" 
              : "text-green-700 dark:text-green-300"
          )}>
            {description}
          </p>
          {tips && tips.length > 0 && (
            <ul className={cn(
              "mt-2 text-xs list-disc pl-4 space-y-1",
              variant === 'template' 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-green-600 dark:text-green-400"
            )}>
              {tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
