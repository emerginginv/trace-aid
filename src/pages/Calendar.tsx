import { CaseCalendar } from "@/components/case-detail/CaseCalendar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View all tasks and events across cases
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCase} onValueChange={setFilterCase}>
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[180px]">
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
      </div>

      <CaseCalendar />
    </div>
  );
}
