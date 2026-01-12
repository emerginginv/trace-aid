import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function VendorAlert() {
  return (
    <div className="px-4 pt-2 pb-4">
      <Alert className="bg-muted/50 border-primary/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Limited Access - Vendor Account
        </AlertDescription>
      </Alert>
    </div>
  );
}
