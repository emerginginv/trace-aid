import * as React from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Small delay to trigger animation
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 300,
  className 
}: { 
  children: React.ReactNode; 
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "transition-opacity ease-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

export function SlideIn({ 
  children, 
  direction = "up",
  delay = 0,
  className 
}: { 
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const transforms = {
    up: isVisible ? "translate-y-0" : "translate-y-4",
    down: isVisible ? "translate-y-0" : "-translate-y-4",
    left: isVisible ? "translate-x-0" : "translate-x-4",
    right: isVisible ? "translate-x-0" : "-translate-x-4",
  };

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isVisible ? "opacity-100" : "opacity-0",
        transforms[direction],
        className
      )}
    >
      {children}
    </div>
  );
}

export function StaggeredList({
  children,
  staggerDelay = 50,
  className,
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  const childArray = React.Children.toArray(children);

  return (
    <div className={className}>
      {childArray.map((child, index) => (
        <SlideIn key={index} delay={index * staggerDelay} direction="up">
          {child}
        </SlideIn>
      ))}
    </div>
  );
}