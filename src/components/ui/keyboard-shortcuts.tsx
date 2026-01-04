import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Command } from "lucide-react";
import { cn } from "@/lib/utils";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ["⌘", "K"], description: "Open search", category: "Navigation" },
  { keys: ["G", "H"], description: "Go to Dashboard", category: "Navigation" },
  { keys: ["G", "C"], description: "Go to Cases", category: "Navigation" },
  { keys: ["G", "A"], description: "Go to Accounts", category: "Navigation" },
  { keys: ["G", "O"], description: "Go to Contacts", category: "Navigation" },
  { keys: ["G", "F"], description: "Go to Finance", category: "Navigation" },
  { keys: ["⌘", "N"], description: "New item (context-aware)", category: "Actions" },
  { keys: ["⌘", "S"], description: "Save changes", category: "Actions" },
  { keys: ["⌘", "P"], description: "Print / Export PDF", category: "Actions" },
  { keys: ["E"], description: "Edit selected item", category: "Actions" },
  { keys: ["D"], description: "Delete selected item", category: "Actions" },
  { keys: ["/"], description: "Focus search", category: "Actions" },
  { keys: ["?"], description: "Show keyboard shortcuts", category: "Help" },
  { keys: ["Esc"], description: "Close dialog / Cancel", category: "Navigation" },
  { keys: ["Tab"], description: "Next field", category: "Forms" },
  { keys: ["Shift", "Tab"], description: "Previous field", category: "Forms" },
  { keys: ["↑", "↓"], description: "Navigate rows", category: "Tables" },
  { keys: ["Enter"], description: "Open selected item", category: "Tables" },
  { keys: ["Space"], description: "Toggle selection", category: "Tables" },
  { keys: ["⌘", "A"], description: "Select all", category: "Tables" },
  { keys: ["⌘", "Z"], description: "Undo", category: "General" },
  { keys: ["⌘", "Shift", "Z"], description: "Redo", category: "General" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        // Don't trigger if user is typing in an input
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA" &&
          !document.activeElement?.hasAttribute("contenteditable")
        ) {
          e.preventDefault();
          setOpen((open) => !open);
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col glass-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Command className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Boost your productivity with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid md:grid-cols-2 gap-6">
            {categories.map((category) => (
              <div key={category} className="space-y-2">
                <h3 className="shortcuts-section-title text-xs">{category}</h3>
                <div className="space-y-1">
                  {shortcuts
                    .filter((s) => s.category === category)
                    .map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <kbd key={i} className="kbd">
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center">
            Press <kbd className="kbd mx-1">?</kbd> anytime to view these shortcuts
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for registering custom keyboard shortcuts
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options?: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    preventDefault?: boolean;
  }
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { ctrl, meta, shift, alt, preventDefault = true } = options || {};
      
      // Skip if in input/textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.hasAttribute("contenteditable")
      ) {
        return;
      }

      const isCtrl = ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const isMeta = meta ? e.metaKey : !e.metaKey;
      const isShift = shift ? e.shiftKey : !e.shiftKey;
      const isAlt = alt ? e.altKey : !e.altKey;

      if (e.key.toLowerCase() === key.toLowerCase() && isCtrl && isMeta && isShift && isAlt) {
        if (preventDefault) e.preventDefault();
        callback();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, callback, options]);
}

// Keyboard hint component
interface KeyboardHintProps {
  keys: string[];
  className?: string;
}

export function KeyboardHint({ keys, className }: KeyboardHintProps) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {keys.map((key, index) => (
        <span key={index}>
          <kbd className="kbd text-2xs h-5 min-w-[18px] px-1">{key}</kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-2xs mx-0.5">+</span>
          )}
        </span>
      ))}
    </span>
  );
}
