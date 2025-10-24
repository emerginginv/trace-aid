import { CaseCalendar } from "@/components/case-detail/CaseCalendar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface Case {
  id: string;
  title: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export default function Calendar() {
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterCase, setFilterCase] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [caseSelectionOpen, setCaseSelectionOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [pendingCallback, setPendingCallback] = useState<((caseId: string) => void) | null>(null);

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [casesResult, usersResult] = await Promise.all([
        supabase.from("cases").select("id, title").eq("user_id", user.id),
        supabase.from("profiles").select("id, email, full_name"),
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
      <div className="flex flex-col gap-2 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            View all tasks and events across cases
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
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

        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name || u.email}
              </SelectItem>
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
      </div>

      <CaseCalendar 
        filterCase={filterCase}
        filterUser={filterUser}
        filterStatus={filterStatus}
        onNeedCaseSelection={handleCaseSelection}
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
