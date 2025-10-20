import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNav({ items, className }: BreadcrumbNavProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      <ol className="flex items-center gap-2">
        <li>
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground transition-colors focus-ring rounded"
            aria-label="Home"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors focus-ring rounded"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn("font-medium", isLast ? "text-foreground" : "text-muted-foreground")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
