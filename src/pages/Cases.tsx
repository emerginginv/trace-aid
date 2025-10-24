import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Search, LayoutGrid, List, Eye, Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import { CaseForm } from "@/components/CaseForm";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  start_date: string;
  due_date: string;
  created_at: string;
}
const Cases = () => {
  const { isVendor } = useUserRole();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [statusPicklists, setStatusPicklists] = useState<Array<{ id: string; value: string; color: string }>>([]);
  const [priorityPicklists, setPriorityPicklists] = useState<Array<{ id: string; value: string; color: string }>>([]);

  useEffect(() => {
    fetchCases();
    fetchPicklists();
  }, []);
  const fetchPicklists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch status picklists
      const { data: statusData } = await supabase
        .from("picklists")
        .select("id, value, color")
        .eq("user_id", user.id)
        .eq("type", "case_status")
        .eq("is_active", true)
        .order("display_order");
      
      if (statusData) {
        setStatusPicklists(statusData);
      }

      // Fetch priority picklists
      const { data: priorityData } = await supabase
        .from("picklists")
        .select("id, value, color")
        .eq("user_id", user.id)
        .eq("type", "case_priority")
        .eq("is_active", true)
        .order("display_order");
      
      if (priorityData) {
        setPriorityPicklists(priorityData);
      }
    } catch (error) {
      console.error("Error fetching picklists:", error);
    }
  };

  const fetchCases = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      
      // Vendors see only cases they have access to through RLS
      // RLS will automatically filter based on is_vendor_case_accessible function
      const {
        data,
        error
      } = await supabase.from("cases").select("*").order("created_at", {
        ascending: false
      });
      
      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      toast.error("Error fetching cases");
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const statusItem = statusPicklists.find(s => s.value === status);
    if (statusItem?.color) {
      return {
        backgroundColor: `${statusItem.color}20`,
        color: statusItem.color,
        borderColor: `${statusItem.color}40`
      };
    }
    return {};
  };

  const getPriorityStyle = (priority: string) => {
    const priorityItem = priorityPicklists.find(p => p.value === priority);
    if (priorityItem?.color) {
      return {
        backgroundColor: `${priorityItem.color}20`,
        color: priorityItem.color,
        borderColor: `${priorityItem.color}40`
      };
    }
    return {};
  };

  const handleDeleteClick = (caseId: string) => {
    setCaseToDelete(caseId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!caseToDelete) return;
    
    try {
      const { error } = await supabase
        .from("cases")
        .delete()
        .eq("id", caseToDelete);

      if (error) throw error;

      toast.success("Case deleted successfully");
      fetchCases();
    } catch (error) {
      toast.error("Error deleting case");
    } finally {
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
    }
  };
  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = searchQuery === '' || caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) || caseItem.case_number.toLowerCase().includes(searchQuery.toLowerCase()) || caseItem.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || caseItem.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>;
  }
  return <div className="space-y-6">
      {isVendor && (
        <Alert className="bg-muted/50 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            You are viewing cases assigned to you. You can only see and update your assigned work.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isVendor ? 'My Cases' : 'Cases'}</h1>
          <p className="text-muted-foreground mt-2">
            {isVendor ? 'View and update your assigned cases' : 'Manage and track your investigation cases'}
          </p>
        </div>
        {!isVendor && (
          <Button className="gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" />
            New Case
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-[0.625rem] h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search cases by title, number, or description..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-md p-1 h-10">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-7 w-7 p-0">
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-7 w-7 p-0">
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {cases.length === 0 ? <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No cases yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first case
            </p>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Create First Case
            </Button>
          </CardContent>
        </Card> : filteredCases.length === 0 ? <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No cases match your search criteria</p>
          </CardContent>
        </Card> : viewMode === 'grid' ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCases.map(caseItem => <Card key={caseItem.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{caseItem.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Case #{caseItem.case_number}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="border" style={getStatusStyle(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                    <Badge className="border" style={getPriorityStyle(caseItem.priority)}>
                      {caseItem.priority}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {caseItem.description || "No description provided"}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>Started: {new Date(caseItem.start_date).toLocaleDateString()}</span>
                  {caseItem.due_date && <span>Due: {new Date(caseItem.due_date).toLocaleDateString()}</span>}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/cases/${caseItem.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  {!isVendor && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteClick(caseItem.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>)}
        </div> : <>
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-4">
            {filteredCases.map(caseItem => <Card key={caseItem.id} className="p-4">
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold text-sm">{caseItem.case_number}</div>
                    <div className="text-foreground font-medium mt-1">{caseItem.title}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge className="border" style={getStatusStyle(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                    <Badge className="border" style={getPriorityStyle(caseItem.priority)}>
                      {caseItem.priority}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Start: {new Date(caseItem.start_date).toLocaleDateString()}</div>
                    {caseItem.due_date && <div>Due: {new Date(caseItem.due_date).toLocaleDateString()}</div>}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link to={`/cases/${caseItem.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </Button>
                    {!isVendor && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteClick(caseItem.id)}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>)}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map(caseItem => <TableRow key={caseItem.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{caseItem.case_number}</TableCell>
                    <TableCell>{caseItem.title}</TableCell>
                    <TableCell>
                      <Badge className="border" style={getStatusStyle(caseItem.status)}>
                        {caseItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="border" style={getPriorityStyle(caseItem.priority)}>
                        {caseItem.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(caseItem.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {caseItem.due_date ? new Date(caseItem.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/cases/${caseItem.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {!isVendor && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteClick(caseItem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </Card>
        </>}

      <CaseForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchCases} />
      
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Case"
        description="Are you sure you want to delete this case? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>;
};
export default Cases;