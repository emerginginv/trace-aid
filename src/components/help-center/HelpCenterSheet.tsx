import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { helpCategories, searchHelpContent, HelpCategory, HelpArticle } from "./helpCenterData";
import { cn } from "@/lib/utils";

interface HelpCenterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
};

export function HelpCenterSheet({ open, onOpenChange }: HelpCenterSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewState, setViewState] = useState<ViewState>({ type: "categories" });

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchHelpContent(searchQuery);
  }, [searchQuery]);

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
      // Reset state when closing
      setSearchQuery("");
      setViewState({ type: "categories" });
    }
    onOpenChange(newOpen);
  };

  const renderIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || BookOpen;
    return <Icon className="h-5 w-5" />;
  };

  const renderCategoriesList = () => (
    <div className="space-y-2">
      {helpCategories.map((category) => (
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
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground">{category.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{category.description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </button>
      ))}
    </div>
  );

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
        {searchResults.map(({ category, article }) => (
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
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground">{article.title}</h4>
              <p className="text-sm text-muted-foreground truncate">{article.summary}</p>
              <span className="text-xs text-primary mt-1 inline-block">{category.title}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          </button>
        ))}
      </div>
    );
  };

  const renderCategoryView = () => {
    if (viewState.type !== "category") return null;
    const { category } = viewState;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            {renderIcon(category.icon)}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{category.title}</h3>
            <p className="text-sm text-muted-foreground">{category.articles.length} articles</p>
          </div>
        </div>
        <div className="space-y-2">
          {category.articles.map((article) => (
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
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground">{article.title}</h4>
                <p className="text-sm text-muted-foreground truncate">{article.summary}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderArticleView = () => {
    if (viewState.type !== "article") return null;
    const { category, article } = viewState;

    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-border">
          <span className="text-xs text-primary font-medium uppercase tracking-wide">
            {category.title}
          </span>
          <h3 className="font-semibold text-xl text-foreground mt-2">{article.title}</h3>
          <p className="text-muted-foreground mt-1">{article.summary}</p>
        </div>
        
        {/* Placeholder for article content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Article content will be displayed here.
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Content is loaded dynamically from the help system.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const showBackButton = viewState.type !== "categories";
  const title = 
    viewState.type === "article" 
      ? "Article" 
      : viewState.type === "category" 
        ? viewState.category.title 
        : "Help Center";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
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
