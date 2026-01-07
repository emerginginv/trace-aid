import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LetterCategory, getCategoryConfig } from "@/lib/letterCategories";
import { UnifiedRecordsRequestBuilder } from "./builders/UnifiedRecordsRequestBuilder";
import { NDABuilder } from "./builders/NDABuilder";
import { CorrespondenceBuilder } from "./builders/CorrespondenceBuilder";
import { CustomAIBuilder } from "./builders/CustomAIBuilder";
import { ContextBanner } from "@/components/ui/context-banner";

interface GuidedLetterBuilderProps {
  category: LetterCategory;
  organizationId: string;
  onBack: () => void;
  onSave: () => void;
}

export function GuidedLetterBuilder({ 
  category, 
  organizationId,
  onBack, 
  onSave 
}: GuidedLetterBuilderProps) {
  const config = getCategoryConfig(category);
  
  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unknown category selected.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const Icon = config.icon;

  const builderProps = {
    organizationId,
    onSave,
    onCancel: onBack,
  };

  const renderBuilder = () => {
    // Route all FOIA/Public Records categories to the unified builder
    switch (category) {
      case 'public_records':
      case 'state_pra':
      case 'foia_federal':
        return <UnifiedRecordsRequestBuilder {...builderProps} />;
      case 'nda':
        return <NDABuilder {...builderProps} />;
      case 'correspondence':
        return <CorrespondenceBuilder {...builderProps} />;
      case 'custom_ai':
        return <CustomAIBuilder {...builderProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{config.name} Template</h2>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>

      <ContextBanner
        variant="template"
        title="Building a reusable template"
        description="Configure the structure and options for this template. When used, placeholders will be filled with actual case data."
      />

      {renderBuilder()}
    </div>
  );
}
