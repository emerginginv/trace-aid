import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import { Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import { SlaManagement, AddSlaButton } from "./SlaManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

interface Sla {
  id: string;
  metric: string;
  target_value: number;
  measurement_window: string;
  enabled: boolean;
  created_at: string;
}

const metricLabels: Record<string, string> = {
  availability: "System Availability",
  response_time: "Response Time",
  support_response: "Support Response Time",
};

export function SlaList() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [editingSla, setEditingSla] = useState<Sla | null>(null);
  const [deletingSla, setDeletingSla] = useState<Sla | null>(null);

  const { data: slas, isLoading } = useQuery({
    queryKey: ["slas", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("slas")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Sla[];
    },
    enabled: !!organization?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (slaId: string) => {
      const { error } = await supabase.from("slas").delete().eq("id", slaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("SLA deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["slas", organization?.id] });
      queryClient.invalidateQueries({ queryKey: ["sla-summary", organization?.id] });
      setDeletingSla(null);
    },
    onError: (error) => {
      console.error("Failed to delete SLA:", error);
      toast.error("Failed to delete SLA");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            SLA Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              SLA Configuration
            </CardTitle>
            <CardDescription>
              Manage your organization's Service Level Agreements
            </CardDescription>
          </div>
          <AddSlaButton />
        </div>
      </CardHeader>
      <CardContent>
        {!slas || slas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No SLAs configured yet.</p>
            <p className="text-sm mt-1">Click "Add SLA" to create your first SLA.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slas.map((sla) => (
                <TableRow key={sla.id}>
                  <TableCell className="font-medium">
                    {metricLabels[sla.metric] || sla.metric}
                  </TableCell>
                  <TableCell>{sla.target_value}%</TableCell>
                  <TableCell className="capitalize">{sla.measurement_window}</TableCell>
                  <TableCell>
                    <Badge variant={sla.enabled ? "default" : "secondary"}>
                      {sla.enabled ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Disabled
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingSla(sla)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingSla(sla)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      {editingSla && (
        <SlaManagement
          existingSla={editingSla}
          open={!!editingSla}
          onOpenChange={(open) => !open && setEditingSla(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSla} onOpenChange={(open) => !open && setDeletingSla(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SLA</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{metricLabels[deletingSla?.metric || ""] || deletingSla?.metric}" SLA? 
              This action cannot be undone and will remove all associated measurements and breach records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSla && deleteMutation.mutate(deletingSla.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
