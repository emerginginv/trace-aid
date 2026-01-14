import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ReactNode } from "react";

interface AddButtonConfig {
  label: string;
  onClick: () => void;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  titleComponent?: ReactNode;
  showAddButton?: boolean;
  addButtonLabel?: string;
  onAddClick?: () => void;
  addButton?: AddButtonConfig;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  titleComponent,
  showAddButton = false,
  addButtonLabel = "Add",
  onAddClick,
  addButton,
  actions,
}: PageHeaderProps) {
  const shouldShowAddButton = showAddButton || !!addButton;
  const buttonLabel = addButton?.label || addButtonLabel;
  const handleAddClick = addButton?.onClick || onAddClick;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        {titleComponent ?? (
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        )}
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {shouldShowAddButton && (
          <Button onClick={handleAddClick}>
            <Plus className="h-4 w-4 mr-2" />
            {buttonLabel}
          </Button>
        )}
      </div>
    </div>
  );
}