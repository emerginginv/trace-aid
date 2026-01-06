import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, RefreshCw, Pencil, Check, X, Lock, Save, Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LETTER_TONES, RECIPIENT_TYPES, LETTER_LENGTHS } from "@/lib/letterCategories";

interface CustomAIBuilderProps {
  organizationId: string;
  onSave: () => void;
  onCancel: () => void;
}

interface LetterSection {
  id: string;
  type: 'salutation' | 'opening' | 'body' | 'closing' | 'signature';
  content: string;
  userEdited?: boolean;
}

export function CustomAIBuilder({ organizationId, onSave, onCancel }: CustomAIBuilderProps) {
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  
  // Form state
  const [purpose, setPurpose] = useState('');
  const [recipientType, setRecipientType] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('standard');
  const [keyPoints, setKeyPoints] = useState<string[]>(['']);
  const [additionalContext, setAdditionalContext] = useState('');
  const [templateName, setTemplateName] = useState('');
  
  // Generated content
  const [sections, setSections] = useState<LetterSection[]>([]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const addKeyPoint = () => {
    setKeyPoints([...keyPoints, '']);
  };

  const removeKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  const updateKeyPoint = (index: number, value: string) => {
    const newPoints = [...keyPoints];
    newPoints[index] = value;
    setKeyPoints(newPoints);
  };

  const handleGenerate = async () => {
    if (!purpose.trim()) {
      toast.error('Please describe what the letter is for');
      return;
    }
    if (!recipientType) {
      toast.error('Please select who the letter is addressed to');
      return;
    }

    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-custom-letter', {
        body: {
          purpose,
          recipient: {
            type: recipientType,
            name: recipientName || undefined,
            organization: recipientOrg || undefined,
          },
          tone,
          keyPoints: keyPoints.filter(p => p.trim()),
          additionalContext: additionalContext || undefined,
          length,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate letter');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (response.data?.sections) {
        setSections(response.data.sections.map((s: LetterSection) => ({
          ...s,
          userEdited: false,
        })));
        toast.success('Letter generated successfully');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateSection = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    if (section.userEdited) {
      const confirmed = window.confirm('This section has been manually edited. Regenerate anyway?');
      if (!confirmed) return;
    }

    setRegeneratingSection(sectionId);
    try {
      const response = await supabase.functions.invoke('generate-custom-letter', {
        body: {
          purpose,
          recipient: {
            type: recipientType,
            name: recipientName || undefined,
            organization: recipientOrg || undefined,
          },
          tone,
          keyPoints: keyPoints.filter(p => p.trim()),
          additionalContext: additionalContext || undefined,
          length,
          regenerateSection: {
            sectionId,
            currentSections: sections.map(s => ({
              id: s.id,
              type: s.type,
              content: s.content,
            })),
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to regenerate section');
      }

      if (response.data?.section) {
        setSections(prev => prev.map(s => 
          s.id === sectionId 
            ? { ...response.data.section, userEdited: false }
            : s
        ));
        toast.success('Section regenerated');
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate section');
    } finally {
      setRegeneratingSection(null);
    }
  };

  const startEditing = (section: LetterSection) => {
    setEditingSection(section.id);
    // Convert HTML to plain text for editing
    const div = document.createElement('div');
    div.innerHTML = section.content;
    setEditContent(div.textContent || div.innerText || '');
  };

  const saveEdit = (sectionId: string) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId 
        ? { ...s, content: `<p>${editContent.replace(/\n/g, '</p><p>')}</p>`, userEdited: true }
        : s
    ));
    setEditingSection(null);
    setEditContent('');
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditContent('');
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (sections.length === 0) {
      toast.error('Please generate a letter first');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Combine sections into full HTML
      const fullHtml = `
        <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto;">
          <div style="text-align: right; margin-bottom: 40px;">
            <p>{{current_date}}</p>
          </div>
          ${sections.map(s => s.content).join('\n')}
        </div>
      `;

      const { error } = await supabase.from('document_templates').insert({
        name: templateName,
        description: `AI-generated letter: ${purpose.substring(0, 100)}`,
        document_type: 'letter',
        letter_category: 'custom_ai',
        body: fullHtml,
        organization_id: organizationId,
        user_id: user.id,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Template saved successfully');
      onSave();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const getSectionLabel = (type: string) => {
    const labels: Record<string, string> = {
      salutation: 'Salutation',
      opening: 'Opening',
      body: 'Body',
      closing: 'Closing',
      signature: 'Signature',
    };
    return labels[type] || type;
  };

  const isProtectedSection = (type: string) => {
    return ['salutation', 'signature'].includes(type);
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                Describe Your Letter
              </CardTitle>
              <CardDescription>
                Answer a few questions and AI will generate a structured letter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Purpose */}
              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-base font-medium">
                  What is this letter for? *
                </Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="E.g., Request a meeting to discuss investigation findings, follow up on unpaid invoice, confirm interview appointment..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Recipient */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Who is it addressed to? *</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Recipient name (optional)"
                  />
                  <Input
                    value={recipientOrg}
                    onChange={(e) => setRecipientOrg(e.target.value)}
                    placeholder="Organization (optional)"
                  />
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-3">
                <Label className="text-base font-medium">What tone should it have?</Label>
                <RadioGroup value={tone} onValueChange={setTone} className="grid grid-cols-2 gap-2">
                  {LETTER_TONES.map((t) => (
                    <div key={t.value} className="flex items-start space-x-2">
                      <RadioGroupItem value={t.value} id={`tone-${t.value}`} className="mt-1" />
                      <Label htmlFor={`tone-${t.value}`} className="cursor-pointer">
                        <span className="font-medium">{t.label}</span>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Length */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Letter Length</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LETTER_LENGTHS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        <span>{l.label}</span>
                        <span className="text-muted-foreground text-xs ml-2">- {l.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Key Points */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Key points to include</Label>
                <div className="space-y-2">
                  {keyPoints.map((point, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={point}
                        onChange={(e) => updateKeyPoint(index, e.target.value)}
                        placeholder={`Point ${index + 1}`}
                      />
                      {keyPoints.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeKeyPoint(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addKeyPoint}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Point
                  </Button>
                </div>
              </div>

              {/* Additional Context */}
              <div className="space-y-2">
                <Label htmlFor="context">Additional context (optional)</Label>
                <Textarea
                  id="context"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Any background information the AI should know..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || !purpose.trim() || !recipientType}
                className="w-full"
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
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card className="min-h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Letter Preview
              </CardTitle>
              <CardDescription>
                {sections.length > 0 
                  ? 'Click on any section to edit or regenerate'
                  : 'Generated letter will appear here'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p>Fill in the form and click "Generate Letter"</p>
                  <p className="text-sm">AI will create a structured letter for you</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className={`border rounded-lg p-3 ${
                        section.userEdited ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isProtectedSection(section.type) && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-xs font-medium text-muted-foreground uppercase">
                            {getSectionLabel(section.type)}
                          </span>
                          {section.userEdited && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              (edited)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {editingSection !== section.id && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRegenerateSection(section.id)}
                                disabled={regeneratingSection === section.id}
                              >
                                {regeneratingSection === section.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(section)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {editingSection === section.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(section.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Template */}
          {sections.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="E.g., Client Follow-up Letter"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveTemplate}
                      disabled={saving || !templateName.trim()}
                      className="flex-1"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save as Template
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
