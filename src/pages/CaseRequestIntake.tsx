import { useParams } from "react-router-dom";
import { useCaseRequestFormBySlug } from "@/hooks/queries/useCaseRequestFormBySlug";
import { CaseRequestHeader } from "@/components/case-request/CaseRequestHeader";
import { CaseRequestWizard } from "@/components/case-request/CaseRequestWizard";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function CaseRequestIntake() {
  const { slug } = useParams<{ slug: string }>();
  const { data: form, isLoading, error } = useCaseRequestFormBySlug(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The form you're looking for doesn't exist or is no longer available.
            </p>
            <Button asChild>
              <Link to="/auth">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CaseRequestHeader form={form} />
      <CaseRequestWizard form={form} />
    </div>
  );
}
