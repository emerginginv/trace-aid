import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, RefreshCw, Download, ExternalLink } from "lucide-react";

export type ImportType = 'new_migration' | 'incremental';

interface ImportTypeSelectorProps {
  onSelect: (type: ImportType) => void;
}

export function ImportTypeSelector({ onSelect }: ImportTypeSelectorProps) {
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
            <CardTitle>New Migration</CardTitle>
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
            <CardTitle>Incremental Import</CardTitle>
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

      {/* Templates Download Section */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Import Templates
          </CardTitle>
          <CardDescription>
            CaseWyze is the source of truth. Use these official templates to format your data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="/import-templates/README.md" download>
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentation
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/import-templates/02_Clients.csv" download>
                Clients Template
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/import-templates/03_Contacts.csv" download>
                Contacts Template
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/import-templates/04_Cases.csv" download>
                Cases Template
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/import-templates/05_Subjects.csv" download>
                Subjects Template
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            All templates available in <code className="bg-muted px-1 rounded">/import-templates/</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
