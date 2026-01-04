import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUp, RefreshCw, ArrowLeft, HelpCircle, Lightbulb } from "lucide-react";
import { DelayedTooltip } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

export type ImportType = 'new_migration' | 'incremental';

interface ImportTypeSelectorProps {
  onSelect: (type: ImportType) => void;
  onBack?: () => void;
}

export function ImportTypeSelector({ onSelect, onBack }: ImportTypeSelectorProps) {
  const [showHelp, setShowHelp] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Select Import Type</h2>
        <p className="text-muted-foreground">
          Choose how you want to import data into CaseWyze
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* New Migration */}
        <Card 
          className="cursor-pointer hover:border-primary transition-colors group"
          onClick={() => onSelect('new_migration')}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
              <FileUp className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="flex items-center gap-2">
              New Migration
              <DelayedTooltip content="Best for first-time setup or moving from another system">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </DelayedTooltip>
            </CardTitle>
            <CardDescription>
              Full data migration from an external system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Import clients, cases, subjects, and all related data
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Best for initial setup or system migration
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Supports all 12 entity types
              </li>
            </ul>
            <Button className="w-full mt-4" variant="outline">
              Select New Migration
            </Button>
          </CardContent>
        </Card>

        {/* Incremental Import */}
        <Card 
          className="cursor-pointer hover:border-primary transition-colors group"
          onClick={() => onSelect('incremental')}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center mb-2 group-hover:bg-secondary transition-colors">
              <RefreshCw className="h-6 w-6 text-secondary-foreground" />
            </div>
            <CardTitle className="flex items-center gap-2">
              Incremental Import
              <DelayedTooltip content="Best for adding new records to an existing organization">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </DelayedTooltip>
            </CardTitle>
            <CardDescription>
              Add or update records in existing data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Add new records to existing organization
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Update existing records by external ID
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Best for periodic data syncs
              </li>
            </ul>
            <Button className="w-full mt-4" variant="outline">
              Select Incremental Import
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Collapsible open={showHelp} onOpenChange={setShowHelp}>
        <div className="max-w-4xl mx-auto">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Need help deciding?
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Alert className="mt-3">
              <AlertDescription className="space-y-3">
                <p>
                  <strong>Choose New Migration if:</strong> You're setting up CaseWyze for the first time 
                  or moving all your data from another system. This is a one-time, comprehensive import.
                </p>
                <p>
                  <strong>Choose Incremental Import if:</strong> You already have data in CaseWyze and 
                  want to add new records or update existing ones. This is ideal for periodic syncs.
                </p>
                <p className="text-sm text-muted-foreground">
                  Not sure? Start with a small test batch using New Migration. You can always import more data later.
                </p>
              </AlertDescription>
            </Alert>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Navigation */}
      {onBack && (
        <div className="flex justify-start max-w-4xl mx-auto">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Preparation
          </Button>
        </div>
      )}
    </div>
  );
}
