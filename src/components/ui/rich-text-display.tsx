import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface RichTextDisplayProps {
  html: string | null | undefined;
  className?: string;
  fallback?: string;
}

export const RichTextDisplay = ({
  html,
  className,
  fallback = "No content provided.",
}: RichTextDisplayProps) => {
  if (!html) {
    return <p className="text-muted-foreground">{fallback}</p>;
  }

  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3",
      "ul", "ol", "li", "a", "blockquote", "code", "pre"
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5",
        "[&_strong]:text-foreground [&_em]:text-foreground",
        "[&_a]:text-primary [&_a]:underline",
        "[&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm",
        "text-muted-foreground",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
