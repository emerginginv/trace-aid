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
        
        <div className="pt-4">
          {category.links.map((link) => (
            <Button
              key={link.href}
              variant="outline"
              onClick={() => navigate(link.href)}
              className="w-full justify-between bg-gradient-to-r from-background to-muted/50 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group/btn"
            >
              <span className="font-medium">{link.label}</span>
              <ArrowRight className="w-4 h-4 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
