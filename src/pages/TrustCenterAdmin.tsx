import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Shield, Edit, Eye, EyeOff, ExternalLink, RefreshCw, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface TrustSection {
  id: string;
  section: string;
  title: string;
  content_markdown: string;
  display_order: number;
  is_visible: boolean;
  last_reviewed_at: string | null;
  reviewed_by_name: string | null;
  updated_at: string;
}

export default function TrustCenterAdmin() {
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<TrustSection | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content_markdown: '', is_visible: true });

  // Check platform staff status
  const { data: isPlatformStaff, isLoading: staffLoading } = useQuery({
    queryKey: ['is-platform-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_platform_staff', { 
        p_user_id: (await supabase.auth.getUser()).data.user?.id 
      });
      if (error) return false;
      return data as boolean;
    }
  });

  // Fetch all sections (including hidden)
  const { data: sections, isLoading } = useQuery({
    queryKey: ['trust-center-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trust_center_admin');
      if (error) throw error;
      return data as TrustSection[];
    },
    enabled: isPlatformStaff === true
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { section: string; title: string; content_markdown: string; is_visible: boolean }) => {
      const { error } = await supabase.rpc('update_trust_center_section', {
        p_section: data.section,
        p_title: data.title,
        p_content_markdown: data.content_markdown,
        p_is_visible: data.is_visible
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Section updated successfully');
      queryClient.invalidateQueries({ queryKey: ['trust-center-admin'] });
      queryClient.invalidateQueries({ queryKey: ['trust-center-public'] });
      setEditingSection(null);
    },
    onError: (error) => toast.error('Failed to update: ' + error.message)
  });

  const handleEdit = (section: TrustSection) => {
    setEditingSection(section);
    setEditForm({
      title: section.title,
      content_markdown: section.content_markdown,
      is_visible: section.is_visible
    });
  };

  const handleSave = () => {
    if (!editingSection) return;
    updateMutation.mutate({
      section: editingSection.section,
      ...editForm
    });
  };

  if (staffLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPlatformStaff) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Trust Center administration is only accessible to platform staff.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Trust Center Admin
          </h1>
          <p className="text-muted-foreground">
            Manage public-facing security and compliance content
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/trust" target="_blank">
            <Eye className="h-4 w-4 mr-2" />
            View Public Page
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Sections</CardTitle>
          <CardDescription>
            Edit content displayed on the public Trust Center. All changes are logged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Last Reviewed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections?.map((section) => (
                <TableRow key={section.id}>
                  <TableCell className="font-mono text-sm">{section.section}</TableCell>
                  <TableCell className="font-medium">{section.title}</TableCell>
                  <TableCell>
                    <Badge variant={section.is_visible ? 'default' : 'secondary'}>
                      {section.is_visible ? (
                        <><Eye className="h-3 w-3 mr-1" />Visible</>
                      ) : (
                        <><EyeOff className="h-3 w-3 mr-1" />Hidden</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {section.last_reviewed_at ? (
                      <div className="text-sm">
                        <div>{format(new Date(section.last_reviewed_at), 'MMM d, yyyy')}</div>
                        <div className="text-muted-foreground text-xs">
                          by {section.reviewed_by_name || 'Unknown'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(section)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit: {editingSection?.title}</DialogTitle>
            <DialogDescription>
              Update the content for this Trust Center section. Markdown is supported.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="edit" className="flex-1 overflow-hidden flex flex-col">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="flex-1 overflow-auto space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Content (Markdown)</Label>
                <Textarea
                  value={editForm.content_markdown}
                  onChange={(e) => setEditForm({ ...editForm, content_markdown: e.target.value })}
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.is_visible}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_visible: checked })}
                />
                <Label>Visible on public Trust Center</Label>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {editForm.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm">{editForm.content_markdown}</pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
