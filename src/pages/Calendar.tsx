import { CaseCalendar } from "@/components/case-detail/CaseCalendar";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Filter, Plus, CheckSquare, Calendar as CalendarIcon, PanelRightClose, PanelRightOpen, ListTodo } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePanelVisibility } from "@/hooks/use-panel-visibility";

interface Case {
  id: string;
  title: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  color: string | null;
}

export default function Calendar() {
  const { organization } = useOrganization();
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterCase, setFilterCase] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [caseSelectionOpen, setCaseSelectionOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [pendingCallback, setPendingCallback] = useState<((caseId: string) => void) | null>(null);
  const calendarRef = useRef<{ triggerAddTask: () => void; triggerAddEvent: () => void } | null>(null);
  
  const { isVisible: showTaskList, toggle: toggleTaskList } = usePanelVisibility(
    "calendar-task-list",
    true
  );

  // Refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      fetchFilters();
    }
  }, [organization?.id]);

  const fetchFilters = async () => {
    if (!organization?.id) return;

    try {
      const orgId = organization.id;

      // Get organization members
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", orgId);
      
      const orgUserIds = orgMembers?.map(m => m.user_id) || [];

      const [casesResult, usersResult] = await Promise.all([
        supabase.from("cases").select("id, title").eq("organization_id", orgId),
        orgUserIds.length > 0 
          ? supabase.from("profiles").select("id, email, full_name, color").in("id", orgUserIds)
          : Promise.resolve({ data: [] }),
      ]);

      if (casesResult.data) setCases(casesResult.data);
      if (usersResult.data) setUsers(usersResult.data);
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  const handleCaseSelection = (callback: (caseId: string) => void) => {
    setPendingCallback(() => callback);
    setCaseSelectionOpen(true);
  };

  const confirmCaseSelection = () => {
    if (selectedCaseId && pendingCallback) {
      pendingCallback(selectedCaseId);
      setCaseSelectionOpen(false);
      setSelectedCaseId("");
      setPendingCallback(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            View all tasks and events across cases
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => calendarRef.current?.triggerAddTask()}
            className="gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            Add Task
          </Button>
          <Button 
            onClick={() => calendarRef.current?.triggerAddEvent()}
            className="gap-2"
            variant="outline"
          >
            <CalendarIcon className="h-4 w-4" />
            Add Event
          </Button>
          <Button
            variant="outline"
            onClick={toggleTaskList}
            className="gap-2"
            title={showTaskList ? "Hide task list" : "Show task list"}
          >
            {showTaskList ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Tasks</span>
          </Button>
        </div>
      </div>

      {/* Filters - All on one row */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 sm:gap-3">
        <Select value={filterCase} onValueChange={setFilterCase}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Cases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cases</SelectItem>
            {cases.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="to_do">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        {/* Separator */}
        <div className="hidden sm:block h-6 w-px bg-border" />

        {/* Team Filter Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">Team:</span>
          
          <Button
            variant={selectedUsers.size === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedUsers(new Set())}
            className="h-8"
          >
            All
          </Button>
          
          {users.map(user => (
            <Button
              key={user.id}
              variant={selectedUsers.has(user.id) ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedUsers(prev => {
                  const next = new Set(prev);
                  if (next.has(user.id)) {
                    next.delete(user.id);
                  } else {
                    next.add(user.id);
                  }
                  return next;
                });
              }}
              className="h-8 gap-2"
            >
              <span 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: user.color || '#6366f1' }}
              />
              {user.full_name || user.email?.split('@')[0]}
            </Button>
          ))}
        </div>
      </div>

      <CaseCalendar 
        ref={calendarRef}
        filterCase={filterCase}
        filterUsers={selectedUsers}
        filterStatus={filterStatus}
        onNeedCaseSelection={handleCaseSelection}
        showTaskList={showTaskList}
        onToggleTaskList={toggleTaskList}
      />

      {/* Case Selection Dialog */}
      <Dialog open={caseSelectionOpen} onOpenChange={setCaseSelectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Case</DialogTitle>
            <DialogDescription>
              Choose which case this activity belongs to
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {cases.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No cases available. Please create a case first.
              </p>
            ) : (
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setCaseSelectionOpen(false);
                setSelectedCaseId("");
                setPendingCallback(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmCaseSelection}
              disabled={!selectedCaseId || cases.length === 0}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
