import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollProgressProps {
  threshold?: number;
}

export function ScrollProgress({ threshold = 200 }: ScrollProgressProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const calculateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      
      setScrollProgress(Math.min(progress, 100));
      setIsVisible(scrollTop > threshold);
    };

    calculateProgress();
    window.addEventListener("scroll", calculateProgress, { passive: true });
    window.addEventListener("resize", calculateProgress, { passive: true });

    return () => {
      window.removeEventListener("scroll", calculateProgress);
      window.removeEventListener("resize", calculateProgress);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate SVG circle properties
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 flex flex-col items-center gap-2 z-50 transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      {/* Scroll to top button */}
      <Button
        variant="outline"
        size="icon"
        onClick={scrollToTop}
        className="h-10 w-10 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border-border/50 hover:bg-muted"
        aria-label="Scroll to top"
      >
        <ChevronUp className="h-5 w-5" />
      </Button>

      {/* Circular progress indicator */}
      <div className="relative h-12 w-12 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-primary transition-all duration-150"
          />
        </svg>
        {/* Percentage text */}
        <span className="absolute text-xs font-medium text-muted-foreground">
          {Math.round(scrollProgress)}%
        </span>
      </div>
    </div>
  );
}
