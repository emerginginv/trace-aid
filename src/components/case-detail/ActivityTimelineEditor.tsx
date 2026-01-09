import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Clock } from "lucide-react";

export interface TimelineEntry {
  time: string;
  description: string;
}

interface ActivityTimelineEditorProps {
  value: TimelineEntry[];
  onChange: (entries: TimelineEntry[]) => void;
  disabled?: boolean;
}

// Generate time options in 15-minute intervals
const generateTimeOptions = () => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      const value = `${h}:${m}`;
      
      // Format for display (12-hour with AM/PM)
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? "AM" : "PM";
      const label = `${displayHour}:${m} ${ampm}`;
      
      options.push({ value, label });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

export function ActivityTimelineEditor({
  value,
  onChange,
  disabled = false,
}: ActivityTimelineEditorProps) {
  const addEntry = () => {
    onChange([...value, { time: "", description: "" }]);
  };

  const removeEntry = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateEntry = (index: number, field: keyof TimelineEntry, newValue: string) => {
    const updated = value.map((entry, i) =>
      i === index ? { ...entry, [field]: newValue } : entry
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Clock className="h-4 w-4 text-primary" />
        Activity Timeline
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No timeline entries yet. Add entries to record chronological activities.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[120px_1fr_40px] gap-2 text-xs font-medium text-muted-foreground">
            <span>Time</span>
            <span>Description</span>
            <span></span>
          </div>

          {/* Timeline Rows */}
          {value.map((entry, index) => (
            <div
              key={index}
              className="grid grid-cols-[120px_1fr_40px] gap-2 items-start"
            >
              <Select
                value={entry.time}
                onValueChange={(val) => updateEntry(index, "time", val)}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={entry.description}
                onChange={(e) => updateEntry(index, "description", e.target.value)}
                placeholder="Activity description..."
                className="h-9 text-sm"
                disabled={disabled}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => removeEntry(index)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addEntry}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Timeline Entry
      </Button>
    </div>
  );
}
