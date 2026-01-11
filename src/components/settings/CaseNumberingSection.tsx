import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Info, AlertTriangle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  AVAILABLE_VARIABLES,
  validateFormatTemplate,
  generatePreview,
  FORMAT_PRESETS,
  DEFAULT_FORMAT,
} from "@/lib/caseNumberGenerator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CaseNumberingSectionProps {
  organizationId: string | null;
  currentUserId: string | null;
}

export function CaseNumberingSection({ organizationId, currentUserId }: CaseNumberingSectionProps) {
  const [format, setFormat] = useState(DEFAULT_FORMAT);
  const [originalFormat, setOriginalFormat] = useState(DEFAULT_FORMAT);
  const [seriesCounter, setSeriesCounter] = useState(0);
  const [originalSeriesCounter, setOriginalSeriesCounter] = useState(0);
  const [padding, setPadding] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maxSeriesNumber, setMaxSeriesNumber] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const validation = validateFormatTemplate(format);
  const preview = generatePreview(format, { 
    seriesNumber: Math.max(seriesCounter, 1), 
    padding 
  });

  useEffect(() => {
    if (organizationId) {
      fetchSettings();
    }
  }, [organizationId]);

  const fetchSettings = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Fetch organization settings
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("case_number_format, case_series_counter, case_series_padding")
        .eq("id", organizationId)
        .single();

      if (orgError) throw orgError;

      if (org) {
        const currentFormat = org.case_number_format || DEFAULT_FORMAT;
        setFormat(currentFormat);
        setOriginalFormat(currentFormat);
        setSeriesCounter(org.case_series_counter || 0);
        setOriginalSeriesCounter(org.case_series_counter || 0);
        setPadding(org.case_series_padding || 5);
      }

      // Get max series number from existing cases
      const { data: maxCase } = await supabase
        .from("cases")
        .select("series_number")
        .eq("organization_id", organizationId)
        .order("series_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxCase?.series_number) {
        setMaxSeriesNumber(maxCase.series_number);
      }
    } catch (error) {
      console.error("Error fetching case numbering settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId || !currentUserId) return;
    if (!validation.valid) {
      toast.error("Please fix format errors before saving");
      return;
    }

    // Warn if series counter is lower than max
    if (seriesCounter < maxSeriesNumber) {
      toast.warning(`Series counter cannot be lower than ${maxSeriesNumber}. Using ${maxSeriesNumber} instead.`);
      setSeriesCounter(maxSeriesNumber);
    }

    setSaving(true);
    try {
      const effectiveCounter = Math.max(seriesCounter, maxSeriesNumber);

      // Update organization settings
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          case_number_format: format,
          case_series_counter: effectiveCounter,
          case_series_padding: padding,
        })
        .eq("id", organizationId);

      if (updateError) throw updateError;

      // Log the change
      if (format !== originalFormat || effectiveCounter !== originalSeriesCounter) {
        await supabase.from("case_number_format_audit_log").insert({
          organization_id: organizationId,
          user_id: currentUserId,
          action: format !== originalFormat ? "format_changed" : "series_reset",
          previous_value: {
            format: originalFormat,
            counter: originalSeriesCounter,
          },
          new_value: {
            format: format,
            counter: effectiveCounter,
          },
        });
      }

      setOriginalFormat(format);
      setOriginalSeriesCounter(effectiveCounter);
      setSeriesCounter(effectiveCounter);
      toast.success("Case numbering settings saved");
    } catch (error) {
      console.error("Error saving case numbering settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const copyVariable = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const applyPreset = (presetFormat: string) => {
    setFormat(presetFormat);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasChanges = format !== originalFormat || seriesCounter !== originalSeriesCounter;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs uppercase">Case</Badge>
          <CardTitle className="text-lg">Case Numbering</CardTitle>
        </div>
        <CardDescription>
          Configure how case numbers are automatically generated. Changes only affect new cases.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="format" className="text-sm font-medium">
              Case Number Format <span className="text-destructive">*</span>
            </Label>
            <Select onValueChange={applyPreset}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Use preset..." />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_PRESETS.map((preset) => (
                  <SelectItem key={preset.name} value={preset.format}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            placeholder="{{Case.series_number}}-{{Case.series_instance}}"
            className={!validation.valid ? "border-destructive" : ""}
          />
          {validation.errors.length > 0 && (
            <div className="space-y-1">
              {validation.errors.map((error, i) => (
                <p key={i} className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {error}
                </p>
              ))}
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="space-y-1">
              {validation.warnings.map((warning, i) => (
                <p key={i} className="text-xs text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {warning}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Available Variables */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Available Variables</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {AVAILABLE_VARIABLES.map((variable) => (
              <div
                key={variable.token}
                className="flex items-center justify-between p-2 rounded-md border bg-muted/50 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <code className="text-xs font-mono text-primary break-all">
                    {variable.token}
                  </code>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {variable.label}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 ml-2"
                  onClick={() => copyVariable(variable.token)}
                >
                  {copied === variable.token ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Live Preview */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Preview</Label>
          <div className="p-4 rounded-lg bg-muted border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Example case number</p>
              <p className="text-xl font-mono font-semibold">{preview}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Using: Series #{Math.max(seriesCounter, 1)}, Instance #1, Tag "SRV"
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Series Counter */}
        <div className="space-y-3">
          <Label htmlFor="seriesCounter" className="text-sm font-medium">
            Next Case Series Number
          </Label>
          <Input
            id="seriesCounter"
            type="number"
            min={maxSeriesNumber}
            value={seriesCounter || ""}
            onChange={(e) => setSeriesCounter(parseInt(e.target.value) || 0)}
          />
          {maxSeriesNumber > 0 && seriesCounter < maxSeriesNumber && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Value is lower than the current maximum ({maxSeriesNumber}) and will be ignored.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">
            Current highest series number: {maxSeriesNumber || "None"}
          </p>
        </div>

        {/* Padding */}
        <div className="space-y-3">
          <Label htmlFor="padding" className="text-sm font-medium">
            Number Padding (digits)
          </Label>
          <Select value={String(padding)} onValueChange={(v) => setPadding(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 digits</SelectItem>
              <SelectItem value="4">4 digits</SelectItem>
              <SelectItem value="5">5 digits</SelectItem>
              <SelectItem value="6">6 digits</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Series number 1 will display as: {String(1).padStart(padding, "0")}
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Important:</strong> Format changes only affect new cases. Existing case numbers 
            will not be modified. Case numbers cannot be manually edited after creation.
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !validation.valid || !hasChanges}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
