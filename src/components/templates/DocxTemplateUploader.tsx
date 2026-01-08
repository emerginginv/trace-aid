import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { parseDocxTemplate, createDocxTemplate } from "@/lib/docxTemplateEngine";
import { toast } from "sonner";

interface DocxTemplateUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

export function DocxTemplateUploader({ open, onOpenChange, onUploaded }: DocxTemplateUploaderProps) {
  const { organization } = useOrganization();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filenameTemplate, setFilenameTemplate] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseResult, setParseResult] = useState<{
    variables: string[];
    recognizedVariables: string[];
    unrecognizedVariables: string[];
  } | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".docx")) {
      toast.error("Please select a .docx file");
      return;
    }

    setFile(selectedFile);
    setName(selectedFile.name.replace(".docx", ""));
    
    setParsing(true);
    try {
      const result = await parseDocxTemplate(selectedFile);
      setParseResult({
        variables: result.variables,
        recognizedVariables: result.recognizedVariables,
        unrecognizedVariables: result.unrecognizedVariables,
      });
    } catch (error) {
      console.error("Error parsing template:", error);
      toast.error("Failed to parse template");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleSave = async () => {
    if (!file || !name || !organization?.id) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const template = await createDocxTemplate(
        file,
        name,
        description || null,
        organization.id,
        user.id,
        { filenameTemplate: filenameTemplate || undefined }
      );

      if (template) {
        toast.success("Template uploaded successfully");
        onUploaded?.();
        resetForm();
      } else {
        toast.error("Failed to upload template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setName("");
    setDescription("");
    setFilenameTemplate("");
    setParseResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            New Document Template
          </DialogTitle>
          <DialogDescription>
            Upload a Word document (.docx) with placeholder variables like {"{{Case.case_number}}"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Template File</Label>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                className="flex-1"
              />
              {parsing && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {file.name}
              </p>
            )}
          </div>

          {parseResult && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  {parseResult.recognizedVariables.length} recognized variables
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {parseResult.recognizedVariables.slice(0, 10).map((v) => (
                  <Badge key={v} variant="secondary" className="text-xs">
                    {v}
                  </Badge>
                ))}
                {parseResult.recognizedVariables.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{parseResult.recognizedVariables.length - 10} more
                  </Badge>
                )}
              </div>
              
              {parseResult.unrecognizedVariables.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {parseResult.unrecognizedVariables.length} unrecognized variables
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {parseResult.unrecognizedVariables.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs text-amber-600 border-amber-300">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Field Investigation Report"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes about when to use this template..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Filename Template (optional)</Label>
            <Input
              value={filenameTemplate}
              onChange={(e) => setFilenameTemplate(e.target.value)}
              placeholder="e.g., {{Case.case_number}} - Investigation Report"
            />
            <p className="text-xs text-muted-foreground">
              Use variables to customize the generated filename
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!file || !name || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}