import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, 
  ArrowRight, RefreshCw, FileDown, TrendingUp,
  Database, FileWarning, History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { format, formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface BatchSummary {
  id: string;
  status: string;
  source_system_name: string | null;
  total_records: number;
  processed_records: number;
  failed_records: number;
  created_at: string;
  completed_at: string | null;
}

interface DashboardStats {
  totalBatches: number;
  completedBatches: number;
  failedBatches: number;
  pendingBatches: number;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  pendingCorrections: number;
}

interface MigrationDashboardProps {
  onStartNew?: () => void;
}

export function MigrationDashboard({ onStartNew }: MigrationDashboardProps) {
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBatches, setRecentBatches] = useState<BatchSummary[]>([]);
  const [pendingErrors, setPendingErrors] = useState<number>(0);

  useEffect(() => {
    if (organization?.id) {
      loadDashboardData();
    }
  }, [organization?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all import batches
      const { data: batches, error: batchError } = await supabase
        .from('import_batches')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false });

      if (batchError) throw batchError;

      // Fetch pending error records (records that can be corrected)
      const { count: errorCount } = await supabase
        .from('import_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'error');

      // Calculate stats
      const completedBatches = batches?.filter(b => b.status === 'completed') || [];
      const failedBatches = batches?.filter(b => b.status === 'failed' || b.status === 'rolled_back') || [];
      const pendingBatches = batches?.filter(b => b.status === 'pending' || b.status === 'processing') || [];

      const totalRecords = batches?.reduce((sum, b) => sum + (b.total_records || 0), 0) || 0;
      const successfulRecords = batches?.reduce((sum, b) => sum + (b.processed_records || 0), 0) || 0;
      const failedRecords = batches?.reduce((sum, b) => sum + (b.failed_records || 0), 0) || 0;

      setStats({
        totalBatches: batches?.length || 0,
        completedBatches: completedBatches.length,
        failedBatches: failedBatches.length,
        pendingBatches: pendingBatches.length,
        totalRecords,
        successfulRecords,
        failedRecords,
        pendingCorrections: errorCount || 0
      });

      setRecentBatches(batches?.slice(0, 5) || []);
      setPendingErrors(errorCount || 0);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case 'failed':
      case 'rolled_back':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Processing</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const successRate = stats && stats.totalRecords > 0 
    ? Math.round((stats.successfulRecords / stats.totalRecords) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Imports</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBatches || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalRecords.toLocaleString()} total records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.completedBatches || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.successfulRecords.toLocaleString()} records imported
            </p>
          </CardContent>
        </Card>

        <Card className={cn(
          pendingErrors > 0 && "border-yellow-500/50 bg-yellow-500/5"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Corrections</CardTitle>
            <FileWarning className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingErrors}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.failedRecords.toLocaleString()} failed records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onStartNew}>
          <FileDown className="h-4 w-4 mr-2" />
          New Import
        </Button>
        {pendingErrors > 0 && (
          <Button variant="outline" onClick={() => navigate('/import/review')}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Review Corrections ({pendingErrors})
          </Button>
        )}
        <Button variant="ghost" onClick={loadDashboardData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Recent Imports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Imports
              </CardTitle>
              <CardDescription>
                Your latest import batches and their status
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/import/review')}>
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentBatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No imports yet</p>
              <p className="text-sm">Start your first migration to see activity here</p>
              <Button className="mt-4" onClick={onStartNew}>
                Start Migration
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/import/review?batch=${batch.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      batch.status === 'completed' && "bg-green-500/10",
                      batch.status === 'failed' && "bg-destructive/10",
                      batch.status === 'processing' && "bg-blue-500/10",
                      batch.status === 'pending' && "bg-muted"
                    )}>
                      {batch.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                      {batch.status === 'failed' && <XCircle className="h-5 w-5 text-destructive" />}
                      {batch.status === 'processing' && <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />}
                      {batch.status === 'pending' && <Clock className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium">
                        {batch.source_system_name || 'Import Batch'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(batch.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {batch.processed_records.toLocaleString()} / {batch.total_records.toLocaleString()}
                      </p>
                      {batch.failed_records > 0 && (
                        <p className="text-xs text-destructive">
                          {batch.failed_records} failed
                        </p>
                      )}
                    </div>
                    {getStatusBadge(batch.status)}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Summary by Entity */}
      {stats && stats.totalBatches > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Overview</CardTitle>
            <CardDescription>
              Summary of all migration activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{stats.completedBatches}</p>
                <p className="text-sm text-muted-foreground">Successful Imports</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{stats.failedBatches}</p>
                <p className="text-sm text-muted-foreground">Failed Imports</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{stats.successfulRecords.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Records Imported</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{stats.pendingCorrections}</p>
                <p className="text-sm text-muted-foreground">Awaiting Correction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
