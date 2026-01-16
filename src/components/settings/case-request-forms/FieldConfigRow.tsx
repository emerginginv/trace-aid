import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldConfig } from "@/types/case-request-form-config";

interface FieldConfigRowProps {
  fieldKey: string;
  defaultLabel: string;
  config: FieldConfig;
  onChange: (config: FieldConfig) => void;
}

export function FieldConfigRow({ fieldKey, defaultLabel, config, onChange }: FieldConfigRowProps) {
  return (
    <div className="grid grid-cols-12 gap-4 items-center py-2 px-3 rounded-lg hover:bg-muted/50">
      {/* Field name */}
      <div className="col-span-3">
        <Label className="text-sm font-medium">{defaultLabel}</Label>
      </div>
      
      {/* Visible toggle */}
      <div className="col-span-2 flex items-center gap-2">
        <Switch
          id={`${fieldKey}-visible`}
          checked={config.visible}
          onCheckedChange={(visible) => onChange({ ...config, visible, required: visible ? config.required : false })}
        />
        <Label htmlFor={`${fieldKey}-visible`} className="text-xs text-muted-foreground">
          Visible
        </Label>
      </div>
      
      {/* Required toggle */}
      <div className="col-span-2 flex items-center gap-2">
        <Switch
          id={`${fieldKey}-required`}
          checked={config.required}
          disabled={!config.visible}
          onCheckedChange={(required) => onChange({ ...config, required })}
        />
        <Label 
          htmlFor={`${fieldKey}-required`} 
          className={`text-xs ${!config.visible ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
        >
          Required
        </Label>
      </div>
      
      {/* Custom label */}
      <div className="col-span-5">
        <Input
          placeholder={defaultLabel}
          value={config.label || ""}
          onChange={(e) => onChange({ ...config, label: e.target.value })}
          className="h-8 text-sm"
          disabled={!config.visible}
        />
      </div>
    </div>
  );
}
