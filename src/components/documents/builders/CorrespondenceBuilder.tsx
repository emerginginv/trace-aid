import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, FileText, Users, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CORRESPONDENCE_TYPES, LETTER_TONES } from "@/lib/letterCategories";
import { generateCorrespondenceLetter } from "@/lib/letterGenerators";

interface CorrespondenceBuilderProps {
  organizationId: string;
  onSave: () => void;
  onCancel: () => void;
}

interface BodySection {
  id: string;
  content: string;
}

export function CorrespondenceBuilder({ organizationId, onSave, onCancel }: CorrespondenceBuilderProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    templateName: '',
    recipientType: 'client',
    recipientName: '',
    recipientTitle: '',
    recipientAddress: '',
    subject: '',
    salutation: 'formal',
    tone: 'professional',
    closingLine: '',
  });
  const [bodySections, setBodySections] = useState<BodySection[]>([
    { id: '1', content: '' }
  ]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSectionChange = (id: string, content: string) => {
    setBodySections(prev => prev.map(s => s.id === id ? { ...s, content } : s));
  };

  const addSection = () => {
    setBodySections(prev => [...prev, { id: Date.now().toString(), content: '' }]);
  };

  const removeSection = (id: string) => {
    if (bodySections.length > 1) {
      setBodySections(prev => prev.filter(s => s.id !== id));
    }
  };

  const getSalutation = () => {
    if (formData.salutation === 'formal') {
      return `Dear ${formData.recipientTitle ? formData.recipientTitle + ' ' : ''}${formData.recipientName || '{{recipient_name}}'}`;
    }
    return `Hello ${formData.recipientName || '{{recipient_name}}'}`;
  };

  const handleSaveTemplate = async () => {
    if (!formData.templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const letterBody = generateCorrespondenceLetter(formData, bodySections);

      const { error } = await supabase
        .from('document_templates')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          name: formData.templateName,
          description: `${CORRESPONDENCE_TYPES.find(t => t.value === formData.recipientType)?.label || 'General'} correspondence template`,
          document_type: 'letter',
          letter_category: 'correspondence',
          body: letterBody,
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
                placeholder="e.g., Client Status Update Letter"
                value={formData.templateName}
                onChange={(e) => handleChange('templateName', e.target.value)}
              />
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
                <Label>Salutation Style</Label>
                <Select 
                  value={formData.salutation} 
                  onValueChange={(v) => handleChange('salutation', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal (Dear Mr./Ms.)</SelectItem>
                    <SelectItem value="informal">Informal (Hello)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recipient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Type</Label>
              <Select 
                value={formData.recipientType} 
                onValueChange={(v) => handleChange('recipientType', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CORRESPONDENCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient Name</Label>
                <Input
                  id="recipientName"
                  placeholder="John Smith"
                  value={formData.recipientName}
                  onChange={(e) => handleChange('recipientName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientTitle">Title (Optional)</Label>
                <Input
                  id="recipientTitle"
                  placeholder="Mr., Ms., Esq., etc."
                  value={formData.recipientTitle}
                  onChange={(e) => handleChange('recipientTitle', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientAddress">Recipient Address</Label>
              <Textarea
                id="recipientAddress"
                placeholder="Full mailing address..."
                value={formData.recipientAddress}
                onChange={(e) => handleChange('recipientAddress', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Letter Subject / RE:</Label>
              <Input
                id="subject"
                placeholder="Case Update - Smith Investigation"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Use {"{{case_title}}"} or {"{{case_number}}"} for dynamic values</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Letter Body</CardTitle>
            <Button variant="outline" size="sm" onClick={addSection}>
              <Plus className="h-4 w-4 mr-1" />
              Add Paragraph
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {bodySections.map((section, index) => (
              <div key={section.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Paragraph {index + 1}</Label>
                  {bodySections.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSection(section.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder="Write your paragraph content here..."
                  value={section.content}
                  onChange={(e) => handleSectionChange(section.id, e.target.value)}
                  rows={4}
                />
              </div>
            ))}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="closingLine">Closing Line (Optional)</Label>
              <Input
                id="closingLine"
                placeholder="Please do not hesitate to contact me with any questions."
                value={formData.closingLine}
                onChange={(e) => handleChange('closingLine', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveTemplate} disabled={saving}>
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
              <div className="space-y-4">
                <p className="text-right">{"{{current_date}}"}</p>
                
                <div>
                  <p>{formData.recipientTitle && formData.recipientTitle + ' '}{formData.recipientName || "{{recipient_name}}"}</p>
                  <p className="whitespace-pre-line">{formData.recipientAddress || "{{recipient_address}}"}</p>
                </div>

                {formData.subject && (
                  <p><strong>RE: {formData.subject}</strong></p>
                )}

                <p>{getSalutation()},</p>

                {bodySections.map((section, index) => (
                  <p key={section.id}>
                    {section.content || `{{paragraph_${index + 1}}}`}
                  </p>
                ))}

                {formData.closingLine && (
                  <p>{formData.closingLine}</p>
                )}

                <div className="pt-4">
                  <p>Sincerely,</p>
                  <p className="pt-4">{"{{signature_name}}"}</p>
                  <p>{"{{signature_title}}"}</p>
                  <p>{"{{company_name}}"}</p>
                  <p>{"{{company_phone}}"}</p>
                  <p>{"{{company_email}}"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
