import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PrintLayoutProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function PrintLayout({ children, title, className }: PrintLayoutProps) {
  return (
    <div className={cn("print-layout", className)}>
      {title && (
        <div className="print-header">
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="text-sm text-muted-foreground">
            Printed: {new Date().toLocaleDateString()}
          </div>
        </div>
      )}
      <div className="print-content">{children}</div>
    </div>
  );
}

// Add print styles to index.css
