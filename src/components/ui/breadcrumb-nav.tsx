import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
  maxItems?: number;
  showHome?: boolean;
}

export function BreadcrumbNav({ 
  items, 
  className, 
  maxItems = 4,
  showHome = true 
}: BreadcrumbNavProps) {
  const navigate = useNavigate();
  
  // Handle collapsing for long breadcrumb trails
  const shouldCollapse = items.length > maxItems;
  const collapsedItems = shouldCollapse ? items.slice(1, items.length - 2) : [];
  const visibleItems = shouldCollapse 
    ? [items[0], ...items.slice(items.length - 2)]
    : items;

  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number, isLast: boolean, keyPrefix = "") => {
    return (
      <li key={`${keyPrefix}${index}`} className="flex items-center gap-2">
        <ChevronRight 
          className="w-4 h-4 text-muted-foreground flex-shrink-0" 
          aria-hidden="true" 
        />
        {item.href && !isLast ? (
          <Link
            to={item.href}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm",
              "flex items-center gap-1.5 min-w-0"
            )}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span className="truncate max-w-[150px]">{item.label}</span>
          </Link>
        ) : (
          <span
            className={cn(
              "font-medium flex items-center gap-1.5 min-w-0",
              isLast ? "text-foreground" : "text-muted-foreground"
            )}
            aria-current={isLast ? "page" : undefined}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span className="truncate max-w-[200px]">{item.label}</span>
          </span>
        )}
      </li>
    );
  };

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {/* Home Link */}
        {showHome && (
          <li>
            <Link
              to="/"
              className={cn(
                "text-muted-foreground hover:text-foreground",
                "transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm",
                "flex items-center p-1 -m-1"
              )}
              aria-label="Home"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
            </Link>
          </li>
        )}

        {/* First item if collapsing */}
        {shouldCollapse && visibleItems[0] && 
          renderBreadcrumbItem(visibleItems[0], 0, false, "first-")}

        {/* Collapsed items dropdown */}
        {shouldCollapse && collapsedItems.length > 0 && (
          <li className="flex items-center gap-2">
            <ChevronRight 
              className="w-4 h-4 text-muted-foreground flex-shrink-0" 
              aria-hidden="true" 
            />
            <DropdownMenu>
              <DropdownMenuTrigger 
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-md",
                  "text-muted-foreground hover:text-foreground hover:bg-muted",
                  "transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                aria-label={`${collapsedItems.length} more pages`}
              >
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[150px]">
                {collapsedItems.map((item, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => item.href && navigate(item.href)}
                    className="cursor-pointer"
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        )}

        {/* Remaining visible items */}
        {(shouldCollapse ? visibleItems.slice(1) : visibleItems).map((item, index) => {
          const actualIndex = shouldCollapse ? index + 1 : index;
          const isLast = actualIndex === (shouldCollapse ? visibleItems.length - 1 : items.length - 1);
          return renderBreadcrumbItem(item, index, isLast, "visible-");
        })}
      </ol>
    </nav>
  );
}

// Keyboard-navigable back button
interface BackButtonProps {
  label?: string;
  fallbackPath?: string;
  className?: string;
}

export function BackButton({ 
  label = "Back", 
  fallbackPath = "/",
  className 
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        "inline-flex items-center gap-2 text-sm text-muted-foreground",
        "hover:text-foreground transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
        className
      )}
      aria-label={label}
    >
      <ChevronRight className="w-4 h-4 rotate-180" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
