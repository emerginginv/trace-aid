import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { 
  ArrowLeft, Calendar, Database, AlertTriangle, CheckCircle2, 
  XCircle, RotateCcw, FileText, Clock, User, Filter
} from "lucide-react";
import { ImportBatchSummary } from "@/components/import/ImportBatchSummary";
import { ImportBatchList } from "@/components/import/ImportBatchList";
import { ImportErrorReview } from "@/components/import/ImportErrorReview";
import { ImportRecordCorrection } from "@/components/import/ImportRecordCorrection";
import type { ImportBatch } from "@/types/import";
import { format } from "date-fns";

export default function ImportReview() {
  const { organization } = useOrganization();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  
  const batchId = searchParams.get("batch");
  
  // Fetch import batches
  useEffect(() => {
    if (!organization?.id) return;
    
    const fetchBatches = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("import_batches")
          .select(`
            *,
            profiles:user_id (full_name, email)
          `)
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setBatches(data || []);
        
        // If batch ID in URL, select it
        if (batchId && data) {
          const batch = data.find(b => b.id === batchId);
          if (batch) {
            setSelectedBatch(batch);
          }
        }
      } catch (err) {
        console.error("Failed to fetch batches:", err);
        toast.error("Failed to load import history");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBatches();
  }, [organization?.id, batchId]);
  
  const handleSelectBatch = (batch: any) => {
    setSelectedBatch(batch);
    setSearchParams({ batch: batch.id });
    setActiveTab("summary");
  };
  
  const handleBackToList = () => {
    setSelectedBatch(null);
    setSearchParams({});
  };
  
  const handleReimportComplete = () => {
    // Refresh batches after re-import
    if (organization?.id) {
      supabase
        .from("import_batches")
        .select(`*, profiles:user_id (full_name, email)`)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setBatches(data);
        });
    }
  };
  
  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedBatch && (
            <Button variant="ghost" size="sm" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {selectedBatch ? "Import Review" : "Import History"}
            </h1>
            <p className="text-muted-foreground">
              {selectedBatch 
                ? `Review and correct failed records from batch ${selectedBatch.id.slice(0, 8)}`
                : "View past imports and review failed records"
              }
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/import">New Import</Link>
        </Button>
      </div>
      
      {/* Batch List or Detail View */}
      {!selectedBatch ? (
        <ImportBatchList 
          batches={batches}
          onSelectBatch={handleSelectBatch}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Errors & Warnings
            </TabsTrigger>
            <TabsTrigger value="correct" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Correct & Re-import
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-4 mt-4">
            <ImportBatchSummary batch={selectedBatch} />
          </TabsContent>
          
          <TabsContent value="errors" className="space-y-4 mt-4">
            <ImportErrorReview batchId={selectedBatch.id} />
          </TabsContent>
          
          <TabsContent value="correct" className="space-y-4 mt-4">
            <ImportRecordCorrection 
              batchId={selectedBatch.id}
              originalBatch={selectedBatch}
              onReimportComplete={handleReimportComplete}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
