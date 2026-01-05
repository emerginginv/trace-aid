import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTimeRangeLabel, type TimeRangePreset } from "@/lib/analytics";

interface TimeRangeSelectorProps {
  value: TimeRangePreset;
  onChange: (value: TimeRangePreset) => void;
}

const TIME_RANGE_OPTIONS: TimeRangePreset[] = [
  "last_7_days",
  "last_30_days",
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "this_year",
  "all_time",
];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeRangePreset)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select time range" />
      </SelectTrigger>
      <SelectContent>
        {TIME_RANGE_OPTIONS.map((preset) => (
          <SelectItem key={preset} value={preset}>
            {getTimeRangeLabel(preset)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
