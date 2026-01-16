import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SourceRequestCardProps {
  sourceRequestId: string;
}

interface SourceRequest {
  id: string;
  request_number: string | null;
  submitted_at: string;
  status: string;
}

export function SourceRequestCard({ sourceRequestId }: SourceRequestCardProps) {
  const [sourceRequest, setSourceRequest] = useState<SourceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSourceRequest = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('case_requests')
          .select('id, request_number, submitted_at, status')
          .eq('id', sourceRequestId)
          .single();

        if (error) throw error;
        setSourceRequest(data);
      } catch (error) {
        console.error('Error fetching source request:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSourceRequest();
  }, [sourceRequestId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Source Request
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!sourceRequest) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Source Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          This case was created from a request
        </p>
        
        <div className="flex flex-col gap-1">
          <span className="text-sm font-mono font-medium">
            {sourceRequest.request_number || `REQ-${sourceRequest.id.slice(0, 8)}`}
          </span>
          <span className="text-xs text-muted-foreground">
            Submitted {format(new Date(sourceRequest.submitted_at), 'MMM d, yyyy')}
          </span>
        </div>

        <Link 
          to={`/cases/requests/${sourceRequest.id}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View Request
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}