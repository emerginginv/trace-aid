import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { AnalyticsCategory } from "@/lib/analytics/categories";

interface AnalyticsCategoryCardProps {
  category: AnalyticsCategory;
}

export function AnalyticsCategoryCard({ category }: AnalyticsCategoryCardProps) {
  const navigate = useNavigate();
  const Icon = category.icon;

  return (
    <Card className={`group hover-lift border-border/50 bg-gradient-to-br ${category.gradient} backdrop-blur-sm overflow-hidden relative transition-all duration-300`}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-start justify-between">
          <div className={`${category.iconBg} p-3 rounded-xl transition-transform group-hover:scale-110`}>
            <Icon className={`w-6 h-6 ${category.iconColor}`} />
          </div>
        </div>
        <CardTitle className="text-lg font-semibold mt-4">
          {category.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {category.description}
        </p>
        
        <div className="flex flex-wrap gap-2 pt-2">
          {category.links.map((link) => (
            <Button
              key={link.href}
              variant="outline"
              size="sm"
              onClick={() => navigate(link.href)}
              className="group/btn hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
            >
              {link.label}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
