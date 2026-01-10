import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, Search, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { HelpArticleForm } from "./HelpArticleForm";
import { Database } from "@/integrations/supabase/types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type HelpArticle = Database["public"]["Tables"]["help_articles"]["Row"];
type HelpCategory = Database["public"]["Tables"]["help_categories"]["Row"];

export function HelpCenterAdmin() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<HelpArticle | null>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["help-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as HelpCategory[];
    },
  });

  // Fetch articles with category info
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["help-articles-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*, help_categories(name)")
        .order("display_order");
      if (error) throw error;
      return data as (HelpArticle & { help_categories: { name: string } | null })[];
    },
  });

  // Create article mutation
  const createMutation = useMutation({
    mutationFn: async (values: Omit<HelpArticle, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("help_articles")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-articles-admin"] });
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
      toast.success("Article created successfully");
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create article: ${error.message}`);
    },
  });

  // Update article mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: Partial<HelpArticle> & { id: string }) => {
      const { data, error } = await supabase
        .from("help_articles")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-articles-admin"] });
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
      toast.success("Article updated successfully");
      setIsFormOpen(false);
      setEditingArticle(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update article: ${error.message}`);
    },
  });

  // Delete article mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("help_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-articles-admin"] });
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
      toast.success("Article deleted successfully");
      setDeleteConfirm(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete article: ${error.message}`);
    },
  });

  // Toggle active status
  const toggleActive = async (article: HelpArticle) => {
    updateMutation.mutate({ id: article.id, is_active: !article.is_active });
  };

  const handleSubmit = (values: any) => {
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (article: HelpArticle) => {
    setEditingArticle(article);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingArticle(null);
  };

  const filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryName = (article: HelpArticle & { help_categories: { name: string } | null }) => {
    return article.help_categories?.name || "Uncategorized";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Help Center Articles
            </CardTitle>
            <CardDescription>
              Manage help documentation for users
            </CardDescription>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading articles...
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">No articles found</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsFormOpen(true)}>
              Create your first article
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{article.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {article.summary}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getCategoryName(article)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(article.updated_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={article.is_active ?? true}
                        onCheckedChange={() => toggleActive(article)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(article)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirm(article)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Article Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingArticle ? "Edit Article" : "Create New Article"}
              </DialogTitle>
              <DialogDescription>
                {editingArticle
                  ? "Update the help article content"
                  : "Add a new help article to the Help Center"}
              </DialogDescription>
            </DialogHeader>
            <HelpArticleForm
              article={editingArticle}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={handleCloseForm}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmationDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          title="Delete Article"
          description={`Are you sure you want to delete "${deleteConfirm?.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
          variant="destructive"
        />
      </CardContent>
    </Card>
  );
}
