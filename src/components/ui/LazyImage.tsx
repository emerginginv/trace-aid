import * as React from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Fallback content to show while loading */
  fallback?: React.ReactNode;
  /** Whether to use native lazy loading (default: true) */
  lazy?: boolean;
  /** Aspect ratio for placeholder (e.g., "16/9", "1/1", "4/3") */
  aspectRatio?: string;
}

/**
 * Optimized image component with lazy loading and loading state.
 * Uses native lazy loading with a fallback placeholder.
 */
export function LazyImage({
  src,
  alt,
  className,
  fallback,
  lazy = true,
  aspectRatio,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const handleLoad = React.useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = React.useCallback(() => {
    setHasError(true);
  }, []);

  // Reset state when src changes
  React.useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const containerStyle = aspectRatio
    ? { aspectRatio }
    : undefined;

  if (hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        style={containerStyle}
      >
        {fallback || (
          <span className="text-xs">Failed to load</span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={containerStyle}
    >
      {/* Loading placeholder */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center"
        >
          {fallback}
        </div>
      )}
      
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </div>
  );
}

/**
 * Background image component with lazy loading.
 */
interface LazyBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  /** Additional styles for the background */
  backgroundSize?: "cover" | "contain" | "auto";
  backgroundPosition?: string;
}

export function LazyBackground({
  src,
  className,
  children,
  backgroundSize = "cover",
  backgroundPosition = "center",
  style,
  ...props
}: LazyBackgroundProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    imgRef.current = img;

    return () => {
      if (imgRef.current) {
        imgRef.current.onload = null;
      }
    };
  }, [src]);

  return (
    <div
      className={cn(
        "transition-opacity duration-300",
        isLoaded ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        backgroundImage: isLoaded ? `url(${src})` : undefined,
        backgroundSize,
        backgroundPosition,
        backgroundColor: isLoaded ? undefined : "hsl(var(--muted))",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
