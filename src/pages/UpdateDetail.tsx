import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const UpdateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchCaseId = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("case_updates")
        .select("case_id")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setCaseId(data.case_id);
      }
      setLoading(false);
    };

    fetchCaseId();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound) {
    return <Navigate to="/updates" replace />;
  }

  // Redirect to the full-featured case-specific route
  return <Navigate to={`/cases/${caseId}/updates/${id}`} replace />;
};

export default UpdateDetail;
