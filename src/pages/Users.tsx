import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Search, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { z } from "zod";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
}

const inviteSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  role: z.enum(["admin", "member"]),
});

// Mock Users Data
const MOCK_USERS: User[] = [
  {
    id: "1",
    email: "sarah.martinez@lawfirm.com",
    full_name: "Sarah Martinez",
    created_at: "2024-01-15T10:30:00Z",
    roles: ["admin"],
  },
  {
    id: "2",
    email: "michael.chen@lawfirm.com",
    full_name: "Michael Chen",
    created_at: "2024-02-20T14:20:00Z",
    roles: ["member"],
  },
  {
    id: "3",
    email: "jessica.wong@lawfirm.com",
    full_name: "Jessica Wong",
    created_at: "2024-03-10T09:15:00Z",
    roles: ["member"],
  },
  {
    id: "4",
    email: "david.johnson@lawfirm.com",
    full_name: "David Johnson",
    created_at: "2024-04-05T11:45:00Z",
    roles: ["admin"],
  },
  {
    id: "5",
    email: "emily.rodriguez@lawfirm.com",
    full_name: "Emily Rodriguez",
    created_at: "2024-05-12T16:00:00Z",
    roles: ["member"],
  },
];

const Users = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>("admin");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);

  const handleInviteUser = async () => {
    try {
      // Validate input
      const validation = inviteSchema.safeParse({
        email: inviteEmail,
        role: inviteRole,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setInviting(true);

      // Note: In a production app, you'd want to use an edge function with admin privileges
      // For now, we'll show a message that this requires backend implementation
      toast.info("User invitation requires backend setup. Please use Supabase dashboard to invite users.");
      
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error("Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: "admin" | "member") => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, roles: [newRole] }
        : user
    ));
    toast.success("Role updated successfully");
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesRole =
      roleFilter === "all" ||
      user.roles.includes(roleFilter);

    return matchesSearch && matchesRole;
  });

  const isAdmin = currentUserRole === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage team members and their roles
          </p>
        </div>
        {isAdmin && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value: "admin" | "member") => setInviteRole(value)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInviteUser} disabled={inviting} className="w-full">
                  {inviting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Widget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{users.length}</div>
          <p className="text-xs text-muted-foreground">
            {users.filter((u) => u.roles.includes("admin")).length} admin{users.filter((u) => u.roles.includes("admin")).length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>All users with access to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-[0.625rem] h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No matching users found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || "N/A"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select
                          value={user.roles[0] || "member"}
                          onValueChange={(value: "admin" | "member") =>
                            handleRoleChange(user.id, value)
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">
                              <Badge variant="secondary">Member</Badge>
                            </SelectItem>
                            <SelectItem value="admin">
                              <Badge variant="default">Admin</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.roles.includes("admin") ? "default" : "secondary"}>
                          {user.roles[0] || "Member"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
