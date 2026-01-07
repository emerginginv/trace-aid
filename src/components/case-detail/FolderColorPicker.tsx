import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
];

interface FolderColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function FolderColorPicker({ value, onChange }: FolderColorPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Folder Color</label>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
              value === color.value
                ? "border-foreground ring-2 ring-offset-2 ring-offset-background ring-primary"
                : "border-transparent"
            )}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
            title="Custom color"
          />
          <div
            className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center bg-gradient-conic from-red-500 via-green-500 to-blue-500",
              !PRESET_COLORS.some((c) => c.value === value)
                ? "border-foreground ring-2 ring-offset-2 ring-offset-background ring-primary"
                : "border-muted-foreground/30"
            )}
            title="Custom color"
          >
            {!PRESET_COLORS.some((c) => c.value === value) && (
              <div
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: value }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { PRESET_COLORS };
