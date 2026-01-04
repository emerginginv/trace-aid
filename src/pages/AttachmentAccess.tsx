import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileX, Download, Loader2, AlertCircle, Clock, ShieldX } from "lucide-react";

type AccessState = "loading" | "success" | "expired" | "revoked" | "invalid" | "error";

export default function AttachmentAccess() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<AccessState>("loading");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    const fetchAttachment = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("access-attachment", {
          body: { token },
        });

        if (error) {
          console.error("Edge function error:", error);
          setState("error");
          setErrorMessage("Failed to access attachment");
          return;
        }

        if (!data.success) {
          const reason = data.error?.toLowerCase() || "";
          if (reason.includes("expired")) {
            setState("expired");
          } else if (reason.includes("revoked")) {
            setState("revoked");
          } else if (reason.includes("invalid")) {
            setState("invalid");
          } else {
            setState("error");
            setErrorMessage(data.error || "Unknown error");
          }
          return;
        }

        // Success - redirect to download URL
        setFileName(data.file_name);
        setState("success");
        
        // Auto-redirect to download
        window.location.href = data.download_url;
      } catch (err) {
        console.error("Error accessing attachment:", err);
        setState("error");
        setErrorMessage("Failed to access attachment");
      }
    };

    fetchAttachment();
  }, [token]);

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <h2 className="text-xl font-semibold mb-2">Accessing Secure Attachment</h2>
            <p className="text-muted-foreground">Please wait while we verify your access...</p>
          </div>
        );

      case "success":
        return (
          <div className="text-center py-12">
            <Download className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Download Starting</h2>
            <p className="text-muted-foreground mb-4">
              {fileName ? `Downloading "${fileName}"...` : "Your download should begin automatically."}
            </p>
            <p className="text-sm text-muted-foreground">
              If the download doesn't start, check your browser's popup settings.
            </p>
          </div>
        );

      case "expired":
        return (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-xl font-semibold mb-2">Link Expired</h2>
            <p className="text-muted-foreground mb-4">
              This secure access link has expired. Please request a new link from the sender.
            </p>
          </div>
        );

      case "revoked":
        return (
          <div className="text-center py-12">
            <ShieldX className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Access Revoked</h2>
            <p className="text-muted-foreground mb-4">
              This secure access link has been revoked. Please contact the sender for access.
            </p>
          </div>
        );

      case "invalid":
        return (
          <div className="text-center py-12">
            <FileX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground mb-4">
              This link is not valid. Please check the URL or request a new link from the sender.
            </p>
          </div>
        );

      case "error":
      default:
        return (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Access Error</h2>
            <p className="text-muted-foreground mb-4">
              {errorMessage || "An error occurred while accessing this attachment."}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
