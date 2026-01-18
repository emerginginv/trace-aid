import { useFirstTimeGuidance } from '@/hooks/use-first-time-guidance';
import { X, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FirstTimeGuidanceProps {
  guidanceKey: string;
  title: string;
  welcome: string;
  whatToDoFirst: string;
  whatNotToWorryAbout?: string;
  className?: string;
}

/**
 * First-time guidance callout shown once per screen, dismissed permanently.
 * Uses localStorage to track dismissal state.
 */
export function FirstTimeGuidance({
  guidanceKey,
  title,
  welcome,
  whatToDoFirst,
  whatNotToWorryAbout,
  className,
}: FirstTimeGuidanceProps) {
  const { shouldShow, dismiss } = useFirstTimeGuidance(guidanceKey);

  if (!shouldShow) return null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-blue-200/50 dark:border-blue-800/50',
        'bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/80',
        'dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-950/30',
        'p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-300',
        className
      )}
      role="region"
      aria-label="First-time guidance"
    >
      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={dismiss}
        aria-label="Dismiss guidance"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3 pr-8">
        <div className="p-2 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 shrink-0">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-foreground">
            Welcome to {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
            {welcome}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2.5 pl-11">
        {/* What to do first */}
        <div className="flex gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Start here
            </span>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {whatToDoFirst}
            </p>
          </div>
        </div>

        {/* What not to worry about */}
        {whatNotToWorryAbout && (
          <div className="flex gap-2.5">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                For later
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {whatNotToWorryAbout}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
