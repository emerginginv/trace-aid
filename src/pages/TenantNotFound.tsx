import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface TenantNotFoundProps {
  subdomain?: string | null;
}

const TenantNotFound = ({ subdomain }: TenantNotFoundProps) => {
  const rootDomain = "https://caseinformation.app";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-muted/50">
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-destructive" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Account Not Found
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This account does not exist or is inactive.
            </p>
          </div>

          {/* Subdomain info */}
          {subdomain && (
            <div className="bg-muted/50 rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Requested account:
              </p>
              <p className="text-sm font-mono font-medium text-foreground mt-1">
                {subdomain}
              </p>
            </div>
          )}

          {/* Help text */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Please check the URL and try again, or contact your administrator.</p>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <Button
              variant="default"
              className="w-full"
              onClick={() => window.location.href = rootDomain}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to caseinformation.app
            </Button>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground/70">
            If you believe this is an error, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantNotFound;
