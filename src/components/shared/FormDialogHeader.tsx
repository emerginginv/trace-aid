import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface FormDialogHeaderProps {
  title: string;
  description?: string;
  caseId?: string;
  caseTitle?: string | null;
  onClose?: () => void;
}

/**
 * Standardized dialog header for form dialogs with optional case navigation.
 */
export function FormDialogHeader({
  title,
  description,
  caseId,
  caseTitle,
  onClose,
}: FormDialogHeaderProps) {
  const navigate = useNavigate();

  const handleCaseClick = () => {
    onClose?.();
    if (caseId) {
      navigate(`/cases/${caseId}`);
    }
  };

  return (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      {description && (
        <DialogDescription>{description}</DialogDescription>
      )}
      {caseTitle && caseId && (
        <button
          type="button"
          onClick={handleCaseClick}
          className="text-sm text-muted-foreground pt-2 hover:text-foreground transition-colors flex items-center gap-1.5 group"
        >
          Case: <span className="font-medium text-foreground">{caseTitle}</span>
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </DialogHeader>
  );
}
