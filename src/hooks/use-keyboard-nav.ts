import * as React from "react";

interface UseKeyboardNavOptions {
  items: HTMLElement[];
  orientation?: "vertical" | "horizontal" | "both";
  loop?: boolean;
  onSelect?: (index: number) => void;
}

export function useKeyboardNav({
  items,
  orientation = "vertical",
  loop = true,
  onSelect,
}: UseKeyboardNavOptions) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      const count = items.length;
      if (count === 0) return;

      let newIndex = activeIndex;

      switch (event.key) {
        case "ArrowDown":
          if (orientation === "vertical" || orientation === "both") {
            event.preventDefault();
            newIndex = loop ? (activeIndex + 1) % count : Math.min(activeIndex + 1, count - 1);
          }
          break;
        case "ArrowUp":
          if (orientation === "vertical" || orientation === "both") {
            event.preventDefault();
            newIndex = loop ? (activeIndex - 1 + count) % count : Math.max(activeIndex - 1, 0);
          }
          break;
        case "ArrowRight":
          if (orientation === "horizontal" || orientation === "both") {
            event.preventDefault();
            newIndex = loop ? (activeIndex + 1) % count : Math.min(activeIndex + 1, count - 1);
          }
          break;
        case "ArrowLeft":
          if (orientation === "horizontal" || orientation === "both") {
            event.preventDefault();
            newIndex = loop ? (activeIndex - 1 + count) % count : Math.max(activeIndex - 1, 0);
          }
          break;
        case "Home":
          event.preventDefault();
          newIndex = 0;
          break;
        case "End":
          event.preventDefault();
          newIndex = count - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          onSelect?.(activeIndex);
          return;
        default:
          return;
      }

      setActiveIndex(newIndex);
      items[newIndex]?.focus();
    },
    [activeIndex, items, loop, onSelect, orientation]
  );

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    activeIndex,
    setActiveIndex,
  };
}

/**
 * Hook to trap focus within a container (for modals, dialogs)
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    firstElement?.focus();

    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef]);
}

/**
 * Hook to restore focus when component unmounts
 */
export function useRestoreFocus() {
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;

    return () => {
      previousActiveElement.current?.focus();
    };
  }, []);
}

/**
 * Hook for skip-to-content functionality
 */
export function useSkipToContent(targetId: string = "main-content") {
  const skipToContent = React.useCallback(() => {
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  }, [targetId]);

  return { skipToContent };
}