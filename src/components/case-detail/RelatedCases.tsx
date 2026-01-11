import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Loader2, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { getStatusStyleFromPicklist } from "@/lib/statusUtils";
import { useCaseStatusPicklists } from "@/hooks/use-case-status-picklists";

interface RelatedCase {
  id: string;
  case_number: string;
  title: string;
  status: string;
  instance_number: number;
  created_at: string;
  closed_at: string | null;
}

interface RelatedCasesProps {
  caseId: string;
  currentInstanceNumber: number;
}

export function RelatedCases({ caseId, currentInstanceNumber }: RelatedCasesProps) {
  const { organization } = useOrganization();
  const [relatedCases, setRelatedCases] = useState<RelatedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const { caseStatuses } = useCaseStatusPicklists();

  useEffect(() => {
    fetchRelatedCases();
  }, [caseId, organization?.id]);

  const fetchRelatedCases = async () => {
    try {
      const { data, error } = await supabase.rpc("get_related_cases", {
        case_id: caseId,
      });

      if (error) throw error;

      setRelatedCases(data || []);
    } catch (error) {
      console.error("Error fetching related cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => getStatusStyleFromPicklist(status, caseStatuses);

  // Only show if there are multiple instances
  if (relatedCases.length <= 1) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Related Cases
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {relatedCases.map((relatedCase) => (
              <Link
                key={relatedCase.id}
                to={`/cases/${relatedCase.id}`}
                className={`block rounded-lg border p-4 transition-colors hover:bg-accent ${
                  relatedCase.instance_number === currentInstanceNumber
                    ? "border-primary bg-accent/50"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {relatedCase.case_number}
                      </span>
                      {relatedCase.instance_number === currentInstanceNumber && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {relatedCase.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Created: {format(new Date(relatedCase.created_at), "MMM d, yyyy")}</span>
                      {relatedCase.closed_at && (
                        <span>Closed: {format(new Date(relatedCase.closed_at), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border"
                    style={getStatusStyle(relatedCase.status)}
                  >
                    {relatedCase.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
