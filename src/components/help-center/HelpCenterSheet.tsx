import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  Rocket, 
  Briefcase, 
  Users, 
  Paperclip, 
  Clock, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Settings, 
  Shield,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type HelpCategory = Database["public"]["Tables"]["help_categories"]["Row"];
type HelpArticle = Database["public"]["Tables"]["help_articles"]["Row"];

interface HelpCenterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: Open directly to an article by related_feature */
  initialFeature?: string;
}

type ViewState = 
  | { type: "categories" }
  | { type: "category"; category: HelpCategory }
  | { type: "article"; category: HelpCategory; article: HelpArticle };

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  Briefcase,
  Users,
  Paperclip,
  Clock,
  DollarSign,
  FileText,
  BarChart3,
  Settings,
  Shield,
  BookOpen,
};

export function HelpCenterSheet({ open, onOpenChange, initialFeature }: HelpCenterSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewState, setViewState] = useState<ViewState>({ type: "categories" });
  const [hasNavigatedToFeature, setHasNavigatedToFeature] = useState(false);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["help-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as HelpCategory[];
    },
    enabled: open,
  });

  // Fetch articles
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["help-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as HelpArticle[];
    },
    enabled: open,
  });

  // Navigate to feature article when data is loaded
  useEffect(() => {
    if (
      open &&
      initialFeature &&
      !hasNavigatedToFeature &&
      articles.length > 0 &&
      categories.length > 0
    ) {
      const article = articles.find((a) => a.related_feature === initialFeature);
      if (article) {
        const category = categories.find((c) => c.id === article.category_id);
        if (category) {
          setViewState({ type: "article", category, article });
          setHasNavigatedToFeature(true);
        }
      }
    }
  }, [open, initialFeature, articles, categories, hasNavigatedToFeature]);

  // Reset navigation flag when sheet closes
  useEffect(() => {
    if (!open) {
      setHasNavigatedToFeature(false);
    }
  }, [open]);

  // Group articles by category
  const articlesByCategory = useMemo(() => {
    const map = new Map<string, HelpArticle[]>();
    articles.forEach((article) => {
      if (article.category_id) {
        const existing = map.get(article.category_id) || [];
        map.set(article.category_id, [...existing, article]);
      }
    });
    return map;
  }, [articles]);

  // Enhanced search - matches title, summary, content, and related_feature
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const lowerQuery = searchQuery.toLowerCase();
    
    return articles.filter((article) => {
      const titleMatch = article.title.toLowerCase().includes(lowerQuery);
      const summaryMatch = article.summary.toLowerCase().includes(lowerQuery);
      const contentMatch = article.content.toLowerCase().includes(lowerQuery);
      const featureMatch = article.related_feature?.toLowerCase().includes(lowerQuery);
      
      return titleMatch || summaryMatch || contentMatch || featureMatch;
    });
  }, [searchQuery, articles]);

  const handleCategoryClick = (category: HelpCategory) => {
    setViewState({ type: "category", category });
    setSearchQuery("");
  };

  const handleArticleClick = (category: HelpCategory, article: HelpArticle) => {
    setViewState({ type: "article", category, article });
    setSearchQuery("");
  };

  const handleBack = () => {
    if (viewState.type === "article") {
      setViewState({ type: "category", category: viewState.category });
    } else {
      setViewState({ type: "categories" });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery("");
      setViewState({ type: "categories" });
      setHasNavigatedToFeature(false);
    }
    onOpenChange(newOpen);
  };

  const renderIcon = (iconName: string | null) => {
    const Icon = iconMap[iconName || "BookOpen"] || BookOpen;
    return <Icon className="h-5 w-5" />;
  };

  const getCategoryForArticle = (article: HelpArticle): HelpCategory | undefined => {
    return categories.find((c) => c.id === article.category_id);
  };

  const isLoading = categoriesLoading || articlesLoading;

  const renderCategoriesList = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    if (categories.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">No help content available yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {categories.map((category) => {
          const categoryArticles = articlesByCategory.get(category.id) || [];
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-lg text-left",
                "bg-card hover:bg-accent border border-border",
                "transition-colors duration-150"
              )}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                {renderIcon(category.icon)}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-medium text-foreground text-base truncate">{category.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {category.description || `${categoryArticles.length} articles`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {categoryArticles.length}
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderSearchResults = () => {
    if (!searchResults) return null;

    if (searchResults.length === 0) {
      return (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Try different keywords</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground mb-4">
          {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
        </p>
        {searchResults.map((article) => {
          const category = getCategoryForArticle(article);
          if (!category) return null;
          
          return (
            <button
              key={article.id}
              onClick={() => handleArticleClick(category, article)}
              className={cn(
                "w-full flex items-start gap-3 p-4 rounded-lg text-left",
                "bg-card hover:bg-accent border border-border",
                "transition-colors duration-150"
              )}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center">
                {renderIcon(category.icon)}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h4 className="font-medium text-foreground text-sm truncate">{article.title}</h4>
                <p className="text-sm text-muted-foreground truncate">{article.summary}</p>
                <span className="text-xs text-primary mt-1 inline-block truncate">{category.name}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
            </button>
          );
        })}
      </div>
    );
  };

  const renderCategoryView = () => {
    if (viewState.type !== "category") return null;
    const { category } = viewState;
    const categoryArticles = articlesByCategory.get(category.id) || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {renderIcon(category.icon)}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-base">{category.name}</h3>
            <p className="text-sm text-muted-foreground">{categoryArticles.length} articles</p>
          </div>
        </div>
        
        {categoryArticles.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No articles in this category yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categoryArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => handleArticleClick(category, article)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-lg text-left",
                  "bg-card hover:bg-accent border border-border",
                  "transition-colors duration-150"
                )}
              >
                <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <h4 className="font-medium text-foreground text-sm truncate">{article.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">{article.summary}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Process inline formatting (bold, links)
  const processInlineFormatting = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let partKey = 0;

    while (remaining.length > 0) {
      // Check for bold **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(remaining.slice(0, boldMatch.index));
        }
        parts.push(<strong key={`bold-${partKey++}`}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }

      // Check for links [text](url)
      const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);
      if (linkMatch && linkMatch.index !== undefined) {
        if (linkMatch.index > 0) {
          parts.push(remaining.slice(0, linkMatch.index));
        }
        parts.push(
          <a 
            key={`link-${partKey++}`} 
            href={linkMatch[2]} 
            className="text-primary underline hover:text-primary/80"
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
        continue;
      }

      // No more patterns found, add the rest
      parts.push(remaining);
      break;
    }

    return parts.length === 1 ? parts[0] : parts;
  };

  // Parse and render formatted content (Markdown + outline format)
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentListItems: { text: string; indent: number; type: 'ol' | 'ul' }[] = [];
    let currentListType: 'ol' | 'ul' | null = null;
    let listKey = 0;

    const flushList = () => {
      if (currentListItems.length === 0) return;
      
      const ListTag = currentListType === 'ol' ? 'ol' : 'ul';
      const listClass = currentListType === 'ol' ? 'list-decimal' : 'list-disc';
      
      elements.push(
        <ListTag key={`list-${listKey++}`} className={`${listClass} ml-5 space-y-1 my-3 text-sm text-foreground`}>
          {currentListItems.map((item, idx) => (
            <li 
              key={idx} 
              className={cn(
                "leading-relaxed",
                item.indent > 0 && "ml-4"
              )}
            >
              {processInlineFormatting(item.text)}
            </li>
          ))}
        </ListTag>
      );
      currentListItems = [];
      currentListType = null;
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Empty line - flush list and add spacing
      if (!trimmed) {
        flushList();
        return;
      }

      // Markdown h2: ## Header
      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={`h2-${idx}`} className="text-base font-semibold text-foreground mt-5 mb-2">
            {processInlineFormatting(trimmed.slice(3))}
          </h2>
        );
        return;
      }

      // Markdown h3: ### Header
      if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={`h3-${idx}`} className="text-sm font-semibold text-foreground mt-4 mb-2">
            {processInlineFormatting(trimmed.slice(4))}
          </h3>
        );
        return;
      }

      // Old format #Header (single hash followed by letter, no space)
      if (/^#[A-Z]/.test(trimmed)) {
        flushList();
        elements.push(
          <h4 key={`h4-${idx}`} className="text-sm font-semibold text-foreground mt-4 mb-2">
            {trimmed.slice(1)}
          </h4>
        );
        return;
      }

      // Numbered list item (1., 2., etc.)
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch) {
        if (currentListType !== 'ol') {
          flushList();
          currentListType = 'ol';
        }
        currentListItems.push({ text: numberedMatch[2], indent: 0, type: 'ol' });
        return;
      }

      // Bullet list (-, •, *)
      const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
      if (bulletMatch) {
        if (currentListType !== 'ul') {
          flushList();
          currentListType = 'ul';
        }
        currentListItems.push({ text: bulletMatch[1], indent: 0, type: 'ul' });
        return;
      }

      // Lettered sublist (a., b., etc.)
      const sublistMatch = trimmed.match(/^([a-z])\.\s+(.+)/);
      if (sublistMatch && currentListItems.length > 0) {
        currentListItems.push({ text: sublistMatch[2], indent: 1, type: currentListType || 'ul' });
        return;
      }

      // Section header ending with colon
      if (trimmed.endsWith(':') && trimmed.length < 100 && !trimmed.includes('.')) {
        flushList();
        elements.push(
          <h4 key={`header-${idx}`} className="text-sm font-semibold text-foreground mt-5 mb-2">
            {processInlineFormatting(trimmed)}
          </h4>
        );
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={`para-${idx}`} className="text-sm text-foreground leading-relaxed mb-3">
          {processInlineFormatting(trimmed)}
        </p>
      );
    });

    flushList();
    return elements;
  };

  const renderArticleView = () => {
    if (viewState.type !== "article") return null;
    const { category, article } = viewState;

    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-border">
          <span className="text-xs text-primary font-medium uppercase tracking-wide">
            {category.name}
          </span>
          <h3 className="font-semibold text-xl text-foreground mt-2">{article.title}</h3>
          <p className="text-muted-foreground mt-1">{article.summary}</p>
          <p className="text-xs text-muted-foreground mt-3">
            Last updated: {format(new Date(article.updated_at), "MMMM d, yyyy")}
          </p>
        </div>
        
        {/* Article content - rendered as structured outline */}
        <div className="max-w-none">
          {renderFormattedContent(article.content)}
        </div>
      </div>
    );
  };

  const showBackButton = viewState.type !== "categories";
  const title = 
    viewState.type === "article" 
      ? "Article" 
      : viewState.type === "category" 
        ? viewState.category.name 
        : "Help Center";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="right-2 w-[min(32rem,calc(100%-1rem))] max-w-full p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 -ml-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          </div>
          
          {viewState.type === "categories" && (
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Help"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {searchQuery.trim() 
            ? renderSearchResults()
            : viewState.type === "categories"
              ? renderCategoriesList()
              : viewState.type === "category"
                ? renderCategoryView()
                : renderArticleView()
          }
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
