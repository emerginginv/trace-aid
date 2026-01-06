import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Footprints } from "lucide-react";
import { HeaderFooterConfig } from "@/lib/reportTemplates";

interface HeaderFooterConfigEditorProps {
  config: HeaderFooterConfig;
  onChange: (config: HeaderFooterConfig) => void;
}

export function HeaderFooterConfigEditor({
  config,
  onChange,
}: HeaderFooterConfigEditorProps) {
  const updateConfig = (updates: Partial<HeaderFooterConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <>
      {/* Header Configuration */}
      <Card className="mb-3 border-border/60 shadow-sm">
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Running Header
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 px-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="headerShowLogo" className="text-sm cursor-pointer leading-tight">
              Organization Logo
            </Label>
            <Switch
              id="headerShowLogo"
              checked={config.headerShowLogo}
              onCheckedChange={(checked) => updateConfig({ headerShowLogo: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="headerShowOrgName" className="text-sm cursor-pointer leading-tight">
              Organization Name
            </Label>
            <Switch
              id="headerShowOrgName"
              checked={config.headerShowOrgName}
              onCheckedChange={(checked) => updateConfig({ headerShowOrgName: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="headerShowOrgAddress" className="text-sm cursor-pointer leading-tight">
              Organization Address
            </Label>
            <Switch
              id="headerShowOrgAddress"
              checked={config.headerShowOrgAddress}
              onCheckedChange={(checked) => updateConfig({ headerShowOrgAddress: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="headerShowOrgPhone" className="text-sm cursor-pointer leading-tight">
              Organization Phone
            </Label>
            <Switch
              id="headerShowOrgPhone"
              checked={config.headerShowOrgPhone}
              onCheckedChange={(checked) => updateConfig({ headerShowOrgPhone: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="headerShowOrgEmail" className="text-sm cursor-pointer leading-tight">
              Organization Email
            </Label>
            <Switch
              id="headerShowOrgEmail"
              checked={config.headerShowOrgEmail}
              onCheckedChange={(checked) => updateConfig({ headerShowOrgEmail: checked })}
            />
          </div>
          <div className="border-t border-border/40 pt-2.5 mt-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="headerShowReportTitle" className="text-sm cursor-pointer leading-tight">
                Report Title
              </Label>
              <Switch
                id="headerShowReportTitle"
                checked={config.headerShowReportTitle}
                onCheckedChange={(checked) => updateConfig({ headerShowReportTitle: checked })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="headerShowCaseNumber" className="text-sm cursor-pointer leading-tight">
              Case Number
            </Label>
            <Switch
              id="headerShowCaseNumber"
              checked={config.headerShowCaseNumber}
              onCheckedChange={(checked) => updateConfig({ headerShowCaseNumber: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="headerShowReportDate" className="text-sm cursor-pointer leading-tight">
              Report Date
            </Label>
            <Switch
              id="headerShowReportDate"
              checked={config.headerShowReportDate}
              onCheckedChange={(checked) => updateConfig({ headerShowReportDate: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Configuration */}
      <Card className="mb-3 border-border/60 shadow-sm">
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
            <Footprints className="h-3.5 w-3.5" />
            Running Footer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 px-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="footerShowOrgName" className="text-sm cursor-pointer leading-tight">
              Organization Name
            </Label>
            <Switch
              id="footerShowOrgName"
              checked={config.footerShowOrgName}
              onCheckedChange={(checked) => updateConfig({ footerShowOrgName: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="footerShowPageNumber" className="text-sm cursor-pointer leading-tight">
              Page Number
            </Label>
            <Switch
              id="footerShowPageNumber"
              checked={config.footerShowPageNumber}
              onCheckedChange={(checked) => updateConfig({ footerShowPageNumber: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="footerShowConfidentiality" className="text-sm cursor-pointer leading-tight">
              Confidentiality Notice
            </Label>
            <Switch
              id="footerShowConfidentiality"
              checked={config.footerShowConfidentiality}
              onCheckedChange={(checked) => updateConfig({ footerShowConfidentiality: checked })}
            />
          </div>
          {config.footerShowConfidentiality && (
            <div className="pl-1">
              <Textarea
                id="footerConfidentialityText"
                value={config.footerConfidentialityText}
                onChange={(e) => updateConfig({ footerConfidentialityText: e.target.value })}
                placeholder="Confidentiality notice text..."
                className="text-xs h-16 resize-none"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="footerShowWebsite" className="text-sm cursor-pointer leading-tight">
              Website URL
            </Label>
            <Switch
              id="footerShowWebsite"
              checked={config.footerShowWebsite}
              onCheckedChange={(checked) => updateConfig({ footerShowWebsite: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="footerShowPhone" className="text-sm cursor-pointer leading-tight">
              Phone Number
            </Label>
            <Switch
              id="footerShowPhone"
              checked={config.footerShowPhone}
              onCheckedChange={(checked) => updateConfig({ footerShowPhone: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="footerShowGeneratedDate" className="text-sm cursor-pointer leading-tight">
              Generated Date
            </Label>
            <Switch
              id="footerShowGeneratedDate"
              checked={config.footerShowGeneratedDate}
              onCheckedChange={(checked) => updateConfig({ footerShowGeneratedDate: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
