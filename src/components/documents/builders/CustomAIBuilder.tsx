import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, FileText, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LETTER_TONES } from "@/lib/letterCategories";

interface CustomAIBuilderProps {
  organizationId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function CustomAIBuilder({ organizationId, onSave, onCancel }: CustomAIBuilderProps) {
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    templateName: '',
    letterType: '',
    recipientDescription: '',
    keyPoints: '',
    tone: 'professional',
    length: 'standard',
    additionalInstructions: '',
  });
  const [generatedContent, setGeneratedContent] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!formData.letterType.trim()) {
      toast.error('Please describe the type of letter you need');
      return;
    }

    setGenerating(true);
    try {
      // For now, generate a placeholder template
      // In production, this would call an AI edge function
      const template = generateAITemplate(formData);
      setGeneratedContent(template);
      toast.success('Letter generated successfully!');
    } catch (error: any) {
      console.error('Error generating letter:', error);
      toast.error('Failed to generate letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!generatedContent.trim()) {
      toast.error('Please generate a letter first');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('document_templates')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          name: formData.templateName,
          description: `AI-generated ${formData.letterType} template`,
          document_type: 'letter',
          letter_category: 'custom_ai',
          body: generatedContent,
        });

      if (error) throw error;

      toast.success('Template saved successfully');
      onSave();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Section */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                placeholder="e.g., Custom Investigation Letter"
                value={formData.templateName}
                onChange={(e) => handleChange('templateName', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              AI Letter Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="letterType">What type of letter do you need? *</Label>
              <Input
                id="letterType"
                placeholder="e.g., Follow-up letter after investigation, Demand letter, etc."
                value={formData.letterType}
                onChange={(e) => handleChange('letterType', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientDescription">Who is this letter for?</Label>
              <Input
                id="recipientDescription"
                placeholder="e.g., Insurance claims adjuster, Defense attorney, Client"
                value={formData.recipientDescription}
                onChange={(e) => handleChange('recipientDescription', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyPoints">Key points to include</Label>
              <Textarea
                id="keyPoints"
                placeholder="• Main finding from investigation&#10;• Recommended action&#10;• Timeline of events"
                value={formData.keyPoints}
                onChange={(e) => handleChange('keyPoints', e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use bullet points or separate lines for each point
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select 
                  value={formData.tone} 
                  onValueChange={(v) => handleChange('tone', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LETTER_TONES.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Length</Label>
                <Select 
                  value={formData.length} 
                  onValueChange={(v) => handleChange('length', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">Brief (1 paragraph)</SelectItem>
                    <SelectItem value="standard">Standard (2-3 paragraphs)</SelectItem>
                    <SelectItem value="detailed">Detailed (4+ paragraphs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalInstructions">Additional Instructions (Optional)</Label>
              <Textarea
                id="additionalInstructions"
                placeholder="Any specific requirements, formatting preferences, or context..."
                value={formData.additionalInstructions}
                onChange={(e) => handleChange('additionalInstructions', e.target.value)}
                rows={2}
              />
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={generating}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Letter
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {generatedContent && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Edit Generated Content</CardTitle>
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveTemplate} disabled={saving || !generatedContent}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-6 min-h-[400px] font-serif text-sm">
              {generatedContent ? (
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: generatedContent.replace(/\n/g, '<br />') }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-center">
                    Fill in the form and click "Generate Letter" to see your AI-generated content here.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to generate a template (placeholder for AI)
function generateAITemplate(formData: {
  letterType: string;
  recipientDescription: string;
  keyPoints: string;
  tone: string;
  length: string;
  additionalInstructions: string;
}): string {
  const toneStyles: Record<string, string> = {
    formal: 'I am writing to',
    professional: 'I am reaching out to',
    friendly: 'I wanted to connect with you regarding',
    urgent: 'This matter requires immediate attention regarding',
  };

  const opening = toneStyles[formData.tone] || toneStyles.professional;
  const keyPointsList = formData.keyPoints
    .split('\n')
    .filter(p => p.trim())
    .map(p => p.replace(/^[•\-\*]\s*/, '').trim());

  let body = `{{current_date}}\n\n`;
  body += `{{recipient_name}}\n{{recipient_address}}\n\n`;
  body += `RE: ${formData.letterType}\n\n`;
  body += `Dear {{recipient_name}},\n\n`;
  body += `${opening} ${formData.letterType.toLowerCase()}.\n\n`;

  if (keyPointsList.length > 0) {
    if (formData.length === 'brief') {
      body += `Key points: ${keyPointsList.join('; ')}.\n\n`;
    } else {
      body += `The following points are relevant to this matter:\n\n`;
      keyPointsList.forEach(point => {
        body += `• ${point}\n`;
      });
      body += `\n`;
    }
  }

  if (formData.length === 'detailed') {
    body += `Please review the enclosed documentation carefully. Should you require any additional information or clarification, please do not hesitate to contact our office.\n\n`;
    body += `We appreciate your prompt attention to this matter and look forward to your response.\n\n`;
  }

  body += `Please contact me if you have any questions.\n\n`;
  body += `Sincerely,\n\n`;
  body += `{{signature_name}}\n`;
  body += `{{signature_title}}\n`;
  body += `{{company_name}}\n`;
  body += `{{company_phone}}\n`;
  body += `{{company_email}}`;

  return body;
}
