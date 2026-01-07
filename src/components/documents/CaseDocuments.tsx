import { useState, useEffect } from "react";
import { FileText, Plus, Eye, Trash2, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  DocumentInstance,
  getCaseDocumentInstances,
  deleteDocumentInstance,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/documentTemplates";
import { CaseVariables } from "@/lib/caseVariables";
import { GenerateDocumentDialog } from "./GenerateDocumentDialog";
import { DocumentInstanceViewer } from "./DocumentInstanceViewer";
import { ContextBanner } from "@/components/ui/context-banner";

interface CaseDocumentsProps {
  caseId: string;
  caseData: CaseVariables;
}

export function CaseDocuments({ caseId, caseData }: CaseDocumentsProps) {
  const [documents, setDocuments] = useState<DocumentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentInstance | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentInstance | null>(null);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const loadDocuments = async () => {
    setLoading(true);
    const data = await getCaseDocumentInstances(caseId);
    setDocuments(data);
    
    // Load user profiles for document creators
    const userIds = [...new Set(data.map(d => d.userId))];
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);
      
      if (profilesData) {
        const profileMap: Record<string, string> = {};
        profilesData.forEach(p => {
          profileMap[p.id] = p.full_name || p.username;
        });
        setProfiles(profileMap);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, [caseId]);

  const handleDelete = async () => {
    if (!documentToDelete) return;
    
    const success = await deleteDocumentInstance(documentToDelete.id);
    if (success) {
      toast.success("Document deleted");
      loadDocuments();
    } else {
      toast.error("Failed to delete document");
    }
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  if (viewingDocument) {
    return (
      <DocumentInstanceViewer
        document={viewingDocument}
        onBack={() => setViewingDocument(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Case Letters & Documents</h3>
          <p className="text-sm text-muted-foreground">
            Generate and manage letters for this specific case
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate Document
        </Button>
      </div>

      <ContextBanner
        variant="case-letter"
        title="Customize letters for this case"
        description="Documents here are specific to this case. They use templates as a starting point but are filled with this case's data, justifications, and settings."
        tips={[
          "Fee waiver and expedited sections appear based on case settings",
          "AI-drafted justifications from the case form are inserted automatically",
          "Generated letters are unique to this case—editing templates won't change them"
        ]}
      />

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No case letters yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Generate letters and documents customized with this case's data.
            </p>
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate First Letter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(doc.generatedAt), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {profiles[doc.userId] || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800">
                      Case Letter
                    </Badge>
                    <Badge variant="secondary">
                      {DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof DOCUMENT_TYPE_LABELS] || doc.documentType}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingDocument(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDocumentToDelete(doc);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GenerateDocumentDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        caseId={caseId}
        caseData={caseData}
        onGenerated={loadDocuments}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
