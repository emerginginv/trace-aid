import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, FileSpreadsheet, ArrowRight, ArrowLeft, 
  HelpCircle, Lightbulb, CheckCircle2, ExternalLink
} from "lucide-react";
import { getAllEntitiesSorted, getRequiredColumns } from "@/lib/templateColumnDefinitions";
import { ImportOrderDiagram } from "./ImportOrderDiagram";
import { ColumnGuideModal } from "./ColumnGuideModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MigrationPreparationProps {
  onBack: () => void;
  onContinue: () => void;
}

const CHECKLIST_ITEMS = [
  {
    id: 'exported',
    label: 'I have exported my data from my current system',
    description: 'Export clients, cases, and related data to CSV or spreadsheet format',
  },
  {
    id: 'reviewed',
    label: 'I have reviewed the import templates',
    description: 'Download our templates and understand the required columns',
  },
  {
    id: 'understand-order',
    label: 'I understand records will be imported in order',
    description: 'Clients first, then contacts, then cases, etc.',
  },
  {
    id: 'unique-ids',
    label: 'Each record has a unique ID (external_record_id)',
    description: 'These IDs link your records together during import',
  },
];

const BEST_PRACTICES = [
  {
    title: 'Start with a small test batch',
    description: 'Import a few records first to verify everything works correctly.',
  },
  {
    title: 'Keep your source files',
    description: 'Save your original export files for reference.',
  },
  {
    title: 'Use YYYY-MM-DD for dates',
    description: 'This format (e.g., 2024-01-15) works best and avoids confusion.',
  },
  {
    title: 'Remove currency symbols',
    description: 'Enter amounts as numbers only (e.g., 5000, not $5,000).',
  },
  {
    title: 'Check for special characters',
    description: 'Apostrophes and quotes in names are fine, but avoid control characters.',
  },
];

export function MigrationPreparation({ onBack, onContinue }: MigrationPreparationProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
  const [showBestPractices, setShowBestPractices] = useState(false);
  
  const allEntities = getAllEntitiesSorted();
  const allChecked = checkedItems.size === CHECKLIST_ITEMS.length;

  const handleCheckChange = (id: string, checked: boolean) => {
    const newChecked = new Set(checkedItems);
    if (checked) {
      newChecked.add(id);
    } else {
      newChecked.delete(id);
    }
    setCheckedItems(newChecked);
  };

  const downloadAllTemplates = () => {
    // Open templates directory
    window.open('/import-templates/', '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Prepare Your Data</h2>
        <p className="text-muted-foreground">
          Download our templates and format your data before uploading
        </p>
      </div>

      {/* Template Downloads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Download Import Templates
              </CardTitle>
              <CardDescription className="mt-1">
                Use these official templates to ensure your data matches CaseWyze format
              </CardDescription>
            </div>
            <Button onClick={downloadAllTemplates}>
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allEntities.map((entity) => {
              const requiredCount = getRequiredColumns(entity.entityType).length;
              const totalCount = entity.columns.length;
              
              return (
                <div
                  key={entity.entityType}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {String(entity.importOrder).padStart(2, '0')}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{entity.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {requiredCount} required, {totalCount - requiredCount} optional
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setSelectedEntityType(entity.entityType)}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`/import-templates/${entity.fileName}`} download>
                        <FileSpreadsheet className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="h-4 w-4" />
            <a 
              href="/import-templates/README.md" 
              download 
              className="hover:underline"
            >
              Download complete documentation (README)
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Import Order Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Import Order</CardTitle>
          <CardDescription>
            Records must be imported in this order to maintain proper relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportOrderDiagram />
        </CardContent>
      </Card>

      {/* Preparation Checklist */}
      <Card className={allChecked ? 'border-green-500' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className={`h-5 w-5 ${allChecked ? 'text-green-500' : 'text-muted-foreground'}`} />
            Preparation Checklist
          </CardTitle>
          <CardDescription>
            Complete these steps before continuing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CHECKLIST_ITEMS.map((item) => (
            <div 
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={item.id}
                checked={checkedItems.has(item.id)}
                onCheckedChange={(checked) => handleCheckChange(item.id, checked === true)}
                className="mt-0.5"
              />
              <label htmlFor={item.id} className="cursor-pointer flex-1">
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </label>
            </div>
          ))}
          
          {!allChecked && (
            <Alert>
              <AlertDescription>
                Complete all items above to continue. This helps ensure a successful import.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Collapsible open={showBestPractices} onOpenChange={setShowBestPractices}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Best Practices</CardTitle>
                </div>
                <Badge variant="secondary">
                  {showBestPractices ? 'Hide' : 'Show'} Tips
                </Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid sm:grid-cols-2 gap-4">
                {BEST_PRACTICES.map((practice, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="h-6 w-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-xs font-bold text-yellow-600 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{practice.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{practice.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={!allChecked}>
          I've Prepared My Files
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Column Guide Modal */}
      <ColumnGuideModal
        entityType={selectedEntityType}
        onClose={() => setSelectedEntityType(null)}
      />
    </div>
  );
}
