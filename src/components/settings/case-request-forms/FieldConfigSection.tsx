import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FieldConfigRow } from "./FieldConfigRow";
import { FieldConfig } from "@/types/case-request-form-config";
import { useState } from "react";

interface FieldDefinition {
  key: string;
  defaultLabel: string;
}

interface FieldConfigSectionProps {
  title: string;
  icon: React.ReactNode;
  fields: FieldDefinition[];
  configs: Record<string, FieldConfig>;
  onChange: (key: string, config: FieldConfig) => void;
  defaultOpen?: boolean;
}

export function FieldConfigSection({ 
  title, 
  icon, 
  fields, 
  configs, 
  onChange,
  defaultOpen = true 
}: FieldConfigSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">
            ({fields.filter(f => configs[f.key]?.visible).length}/{fields.length} visible)
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-1 border rounded-lg p-2">
          <div className="grid grid-cols-12 gap-4 py-1 px-3 text-xs text-muted-foreground font-medium border-b mb-2">
            <div className="col-span-3">Field</div>
            <div className="col-span-2">Show</div>
            <div className="col-span-2">Required</div>
            <div className="col-span-5">Custom Label</div>
          </div>
          {fields.map((field) => (
            <FieldConfigRow
              key={field.key}
              fieldKey={field.key}
              defaultLabel={field.defaultLabel}
              config={configs[field.key] || { visible: true, required: false }}
              onChange={(config) => onChange(field.key, config)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
