import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";
import { X } from "lucide-react";

import { SheetOverlay, SheetPortal } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ViewportSafeRightPanelProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "style"> {
  /** Max width in px for desktop; on mobile it will clamp to 100vw. */
  maxWidthPx?: number;
  /** Optional inline style merge (kept narrow for safety). */
  style?: React.CSSProperties;
}

/**
 * Viewport-safe, fixed right-side panel.
 * - fixed top/right, height 100vh
 * - width min(maxWidthPx, 100vw)
 * - box-border + overflow-x hidden
 *
 * Designed to prevent any child view/content from pushing the panel off-screen.
 */
export const ViewportSafeRightPanel = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ViewportSafeRightPanelProps
>(({ className, children, maxWidthPx = 420, style, ...props }, ref) => {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed top-0 right-0 z-50 h-[100vh] box-border",
          "bg-background border-l border-border shadow-lg",
          "w-full overflow-x-hidden",
          // No slide/translate animations; fade only.
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:duration-200 data-[state=closed]:duration-200",
          className,
        )}
        style={{
          width: `min(${maxWidthPx}px, 100vw)`,
          maxWidth: "100vw",
          ...style,
        }}
        {...props}
      >
        {children}

        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});
ViewportSafeRightPanel.displayName = "ViewportSafeRightPanel";
