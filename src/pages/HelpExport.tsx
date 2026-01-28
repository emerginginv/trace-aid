import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface HelpCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  category_name?: string;
  summary: string | null;
  content: string | null;
  related_feature: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape double quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function HelpExport() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catResult, artResult] = await Promise.all([
        supabase.from("help_categories").select("*").order("display_order"),
        supabase.from("help_articles").select("*, help_categories(name)").order("display_order"),
      ]);

      if (catResult.data) setCategories(catResult.data);
      if (artResult.data) {
        const mapped = artResult.data.map((a: any) => ({
          ...a,
          category_name: a.help_categories?.name || "",
        }));
        setArticles(mapped);
      }
    } catch (err) {
      console.error("Error fetching help data:", err);
      toast.error("Failed to load help data");
    } finally {
      setLoading(false);
    }
  };

  const downloadCategories = () => {
    const headers = ["id", "name", "slug", "description", "icon", "display_order", "is_active", "created_at", "updated_at"];
    const rows = categories.map((c) =>
      [c.id, c.name, c.slug, c.description, c.icon, c.display_order, c.is_active, c.created_at, c.updated_at]
        .map(escapeCsvValue)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    downloadCsv("help_categories.csv", csv);
    toast.success("Categories downloaded!");
  };

  const downloadArticles = () => {
    const headers = ["id", "title", "slug", "category_name", "summary", "content", "related_feature", "is_active", "display_order", "created_at", "updated_at"];
    const rows = articles.map((a) =>
      [a.id, a.title, a.slug, a.category_name, a.summary, a.content, a.related_feature, a.is_active, a.display_order, a.created_at, a.updated_at]
        .map(escapeCsvValue)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    downloadCsv("help_articles.csv", csv);
    toast.success("Articles downloaded!");
  };

  const downloadAll = () => {
    downloadCategories();
    setTimeout(() => downloadArticles(), 500);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Help Section Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading data...</span>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Found <strong>{categories.length}</strong> categories and <strong>{articles.length}</strong> articles.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={downloadCategories} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Categories
                  </Button>
                  <Button onClick={downloadArticles} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Articles
                  </Button>
                  <Button onClick={downloadAll}>
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
