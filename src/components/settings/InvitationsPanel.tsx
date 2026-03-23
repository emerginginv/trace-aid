import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Mail, Clock, Trash2, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  invited_by_name: string | null;
}

interface InvitationsPanelProps {
  isAdmin: boolean;
}

const inviteSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  role: z.enum(["admin", "manager", "investigator", "vendor", "owner", "member"]),
});

export function InvitationsPanel({ isAdmin }: InvitationsPanelProps) {
  const { organization } = useOrganization();
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeConfirm, setRevokeConfirm] = useState<PendingInvite | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "investigator",
    },
  });

  const fetchPendingInvites = async () => {
    if (!organization?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_pending_invites', {
        p_organization_id: organization.id
      });

      if (error) throw error;
      setPendingInvites(data || []);
    } catch (err) {
      console.error("Error fetching pending invites:", err);
      toast.error("Failed to load pending invitations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingInvites();
  }, [organization?.id]);

  const handleSendInvite = async (values: z.infer<typeof inviteSchema>) => {
    if (!organization?.id) {
      toast.error("Organization not found");
      return;
    }

    try {
      setSending(true);
      const { data, session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-user-invite', {
        body: {
          email: values.email,
          role: values.role,
          organizationId: organization.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send invite');
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success(`Invitation sent to ${values.email}`);
      setInviteDialogOpen(false);
      form.reset();
      fetchPendingInvites();
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };



  const handleRevokeInvite = async () => {
    if (!revokeConfirm) return;

    try {
      setRevoking(true);
      
      const { data, error } = await supabase.rpc('revoke_invitation', {
        p_invite_id: revokeConfirm.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        toast.error(result.error || "Failed to revoke invitation");
        return;
      }

      toast.success("Invitation revoked");
      setRevokeConfirm(null);
      fetchPendingInvites();

    } catch (err: any) {
      console.error("Error revoking invite:", err);
      toast.error("Failed to revoke invitation");
    } finally {
      setRevoking(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'owner': return 'destructive';
      case 'manager': return 'default';
      case 'investigator': return 'secondary';
      case 'member': return 'outline';
      default: return 'outline';
    }
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const hoursLeft = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursLeft < 24;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Manage invitations sent to new team members
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Send className="h-4 w-4" />
                    Send Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Invitation</DialogTitle>
                    <DialogDescription>
                      Send an email invitation to a new team member. They'll receive a link to accept the invite.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSendInvite)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="colleague@example.com" 
                                type="email"
                                {...field}
                                disabled={sending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              disabled={sending}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Case Manager</SelectItem>
                                <SelectItem value="investigator">Investigator</SelectItem>
                                <SelectItem value="vendor">Vendor</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setInviteDialogOpen(false)}
                          disabled={sending}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={sending}>
                          {sending ? 'Sending...' : 'Send Invitation'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingInvites}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading invitations...</div>
        ) : pendingInvites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending invitations
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Expires</TableHead>
                {isAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(invite.role)} className="capitalize">
                      {invite.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invite.invited_by_name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isExpiringSoon(invite.expires_at) && (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                      <span className={isExpiringSoon(invite.expires_at) ? 'text-amber-600' : 'text-muted-foreground'}>
                        {format(new Date(invite.expires_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevokeConfirm(invite)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeConfirm} onOpenChange={() => setRevokeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the invitation sent to <strong>{revokeConfirm?.email}</strong>. 
              They will no longer be able to join using this invitation link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevokeInvite}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? 'Revoking...' : 'Revoke Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}