import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Shield, 
  User, 
  Building2, 
  Clock, 
  AlertTriangle,
  Play,
  History
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface SearchResult {
  user_id: string;
  email: string;
  full_name: string | null;
  organization_id: string;
  organization_name: string;
  subdomain: string | null;
}

interface ImpersonationHistoryItem {
  id: string;
  target_user_email: string;
  target_user_name: string | null;
  target_organization_name: string;
  reason: string;
  started_at: string;
  ended_at: string | null;
  status: string;
}

export default function SupportConsole() {
  const navigate = useNavigate();
  const { isPlatformStaff, platformRole, isLoading: contextLoading, startImpersonation } = useImpersonation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [reason, setReason] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  // Fetch impersonation history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['impersonation-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('impersonation_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as ImpersonationHistoryItem[];
    },
    enabled: isPlatformStaff
  });

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      toast.error("Please enter at least 2 characters");
      return;
    }

    setIsSearching(true);
    setSelectedUser(null);

    try {
      const { data, error } = await supabase.rpc('support_search_users', {
        p_query: searchQuery.trim(),
        p_limit: 20
      });

      if (error) throw error;

      const result = data as unknown as { results?: SearchResult[]; error?: string };
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setSearchResults(result.results || []);
      
      if ((result.results || []).length === 0) {
        toast.info("No users found matching your search");
      }
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartImpersonation = async () => {
    if (!selectedUser) {
      toast.error("Please select a user first");
      return;
    }

    if (!reason.trim()) {
      toast.error("Reason is required for impersonation");
      return;
    }

    setIsStarting(true);

    try {
      const result = await startImpersonation(
        selectedUser.user_id,
        selectedUser.organization_id,
        reason.trim()
      );

      if (!result.success) {
        toast.error(result.error || "Failed to start impersonation");
        setIsStarting(false);
        return;
      }

      toast.success("Impersonation started");
      // Redirect happens in the context
    } catch (err) {
      console.error("Start error:", err);
      toast.error("Failed to start impersonation");
      setIsStarting(false);
    }
  };

  // Loading state
  if (contextLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Not authorized
  if (!isPlatformStaff) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This page is only accessible to CaseWyze platform staff.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/')} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Support Console
          </h1>
          <p className="text-muted-foreground">
            Impersonate users to assist with support requests
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate('/platform-compliance')}>
            SOC-2 Compliance
          </Button>
          <Button variant="outline" onClick={() => navigate('/platform-resilience')}>
            Disaster Recovery
          </Button>
          <Button variant="outline" onClick={() => navigate('/trust-admin')}>
            Trust Center
          </Button>
          <Badge variant="secondary" className="text-sm">
            {platformRole === 'platform_admin' ? 'Platform Admin' : 'Platform Support'}
          </Badge>
        </div>
      </div>

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Impersonation Guidelines</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>• All impersonation sessions are logged and audited</p>
          <p>• Sessions automatically expire after 30 minutes</p>
          <p>• A clear reason must be provided for each session</p>
          <p>• Do not make changes to billing or credentials while impersonating</p>
        </AlertDescription>
      </Alert>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find User
          </CardTitle>
          <CardDescription>
            Search by email, name, organization name, or subdomain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter search term..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-64 overflow-auto">
              {searchResults.map((result) => (
                <button
                  key={`${result.user_id}-${result.organization_id}`}
                  onClick={() => setSelectedUser(result)}
                  className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                    selectedUser?.user_id === result.user_id && 
                    selectedUser?.organization_id === result.organization_id
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{result.full_name || result.email}</p>
                        <p className="text-sm text-muted-foreground">{result.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{result.organization_name}</span>
                      {result.subdomain && (
                        <Badge variant="outline" className="text-xs">
                          {result.subdomain}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Impersonation */}
      {selectedUser && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Start Impersonation
            </CardTitle>
            <CardDescription>
              You will view the application as this user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">User</Label>
                <p className="font-medium">{selectedUser.full_name || selectedUser.email}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Organization</Label>
                <p className="font-medium">{selectedUser.organization_name}</p>
                {selectedUser.subdomain && (
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.subdomain}.casewyze.com
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for impersonation *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Investigating billing issue reported in ticket #1234"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be logged in the audit trail
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Session will expire in 30 minutes</span>
            </div>

            <Button
              onClick={handleStartImpersonation}
              disabled={isStarting || !reason.trim()}
              className="w-full"
            >
              {isStarting ? "Starting..." : "Start Impersonation"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Sessions
          </CardTitle>
          <CardDescription>
            Your impersonation history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history && history.length > 0 ? (
            <div className="divide-y">
              {history.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {item.target_user_name || item.target_user_email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.target_organization_name} • "{item.reason}"
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={item.status === 'active' ? 'default' : 'secondary'}
                    >
                      {item.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.started_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No impersonation history
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
