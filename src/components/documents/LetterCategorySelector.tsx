import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LETTER_CATEGORIES, LetterCategory } from "@/lib/letterCategories";
import { ContextBanner } from "@/components/ui/context-banner";

interface LetterCategorySelectorProps {
  onSelectCategory: (category: LetterCategory) => void;
  onBack: () => void;
}

export function LetterCategorySelector({ onSelectCategory, onBack }: LetterCategorySelectorProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-semibold">Create New Document Template</h2>
          <p className="text-muted-foreground">
            Select a category to build a reusable template structure
          </p>
        </div>
      </div>

      <ContextBanner
        variant="template"
        title="Creating a template structure"
        description="You're creating a reusable template. It will contain placeholders that get filled with case-specific data when you generate letters."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LETTER_CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
              onClick={() => onSelectCategory(category.id)}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${category.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {category.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
