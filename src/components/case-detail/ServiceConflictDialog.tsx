import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConflictingService {
  id: string;
  name: string;
  code?: string | null;
}

interface ServiceConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  conflictingServices: ConflictingService[];
  newCaseTypeName: string;
}

export function ServiceConflictDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  conflictingServices,
  newCaseTypeName,
}: ServiceConflictDialogProps) {
  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>Service Compatibility Warning</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Changing to <strong>{newCaseTypeName}</strong> will affect the following 
                services that are not allowed by this Case Type:
              </p>
              
              <div className="rounded-md border p-3 bg-muted/50">
                <ul className="space-y-1.5">
                  {conflictingServices.map((service) => (
                    <li key={service.id} className="flex items-center gap-2 text-sm">
                      <span className="text-foreground font-medium">{service.name}</span>
                      {service.code && (
                        <Badge variant="outline" className="text-xs">
                          {service.code}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <p className="text-amber-600 dark:text-amber-400 text-sm">
                These services will be removed from the case if you continue.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
