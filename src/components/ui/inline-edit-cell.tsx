import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface InlineEditOption {
  value: string;
  label: string;
  color?: string;
}

interface InlineEditCellProps {
  value: string;
  options?: InlineEditOption[];
  type?: "select" | "text";
  onSave: (newValue: string) => Promise<boolean>;
  disabled?: boolean;
  className?: string;
  displayAs?: "badge" | "text";
  badgeStyle?: React.CSSProperties;
}

export function InlineEditCell({
  value,
  options = [],
  type = "select",
  onSave,
  disabled = false,
  className,
  displayAs = "text",
  badgeStyle,
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  React.useEffect(() => {
    if (isEditing && type === "text" && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, type]);

  const handleClick = () => {
    if (disabled || isSaving) return;
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const success = await onSave(editValue);
    setIsSaving(false);

    if (success) {
      setIsEditing(false);
    } else {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleSelectChange = async (newValue: string) => {
    setEditValue(newValue);
    setIsSaving(true);
    const success = await onSave(newValue);
    setIsSaving(false);
    setIsEditing(false);
    if (!success) {
      setEditValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    if (type === "select") {
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Select
            value={editValue}
            onValueChange={handleSelectChange}
            disabled={isSaving}
          >
            <SelectTrigger className="h-7 min-w-[120px] text-sm">
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <SelectValue />
              )}
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span
                    className="flex items-center gap-2"
                    style={option.color ? { color: option.color } : undefined}
                  >
                    {option.color && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 min-w-[100px] text-sm"
          disabled={isSaving}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // Helper to capitalize text for display
  const formatDisplayValue = (val: string) => {
    if (!val) return val;
    return val
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const displayContent =
    displayAs === "badge" ? (
      <Badge
        className={cn("border cursor-pointer transition-all hover:ring-2 hover:ring-primary/20", className)}
        style={badgeStyle}
      >
        {formatDisplayValue(value)}
      </Badge>
    ) : (
      <span
        className={cn(
          "cursor-pointer px-2 py-1 -mx-2 -my-1 rounded transition-all hover:bg-muted/50",
          disabled && "cursor-default hover:bg-transparent",
          className
        )}
      >
        {value}
      </span>
    );

  return (
    <div
      onClick={handleClick}
      className={cn("inline-flex items-center", disabled && "pointer-events-none")}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      {displayContent}
    </div>
  );
}
