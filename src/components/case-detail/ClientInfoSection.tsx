import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountCard } from "@/components/shared/AccountCard";
import { ContactCard } from "@/components/shared/ContactCard";
import { Users, Pencil, Plus, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/hooks/use-toast";

interface AccountData {
  id: string;
  name: string;
  status?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface ContactData {
  id: string;
  first_name: string;
  last_name: string;
  status?: string | null;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface ClientInfoSectionProps {
  caseId: string;
  account: AccountData | null;
  contact: ContactData | null;
  accountName?: string | null;
  onUpdate: () => void;
}

interface AccountOption {
  id: string;
  name: string;
  status: string | null;
}

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
  status: string | null;
}

export function ClientInfoSection({ 
  caseId, 
  account, 
  contact, 
  accountName, 
  onUpdate 
}: ClientInfoSectionProps) {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_cases');
  
  // Edit mode states
  const [editingAccount, setEditingAccount] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  
  // Available options
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  
  const hasData = account || contact;

  // Fetch accounts when editing
  useEffect(() => {
    if (editingAccount && organization?.id) {
      fetchAccounts();
    }
  }, [editingAccount, organization?.id]);

  // Fetch contacts when editing (filtered by account if one exists)
  useEffect(() => {
    if (editingContact && organization?.id) {
      fetchContacts();
    }
  }, [editingContact, organization?.id, account?.id]);

  const fetchAccounts = async () => {
    if (!organization?.id) return;
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, status')
        .eq('organization_id', organization.id)
        .order('name');
      
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchContacts = async () => {
    if (!organization?.id) return;
    setLoadingContacts(true);
    try {
      let query = supabase
        .from('contacts')
        .select('id, first_name, last_name, status')
        .eq('organization_id', organization.id);
      
      // Filter by account if one is selected
      if (account?.id) {
        query = query.eq('account_id', account.id);
      }
      
      const { data, error } = await query.order('last_name');
      
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleUpdateAccount = async (accountId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newAccountId = accountId === "none" ? null : accountId;
      const hadContact = !!contact;

      const { error } = await supabase
        .from('cases')
        .update({ 
          account_id: newAccountId,
          // Clear contact when account changes (contact must belong to account)
          contact_id: null 
        })
        .eq('id', caseId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Account updated",
        description: hadContact ? "Contact was cleared as it may not belong to the new account" : undefined
      });
      
      setEditingAccount(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating account:', error);
      toast({
        title: "Error",
        description: "Failed to update account",
        variant: "destructive"
      });
    }
  };

  const handleUpdateContact = async (contactId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newContactId = contactId === "none" ? null : contactId;

      const { error } = await supabase
        .from('cases')
        .update({ contact_id: newContactId })
        .eq('id', caseId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: "Contact updated" });
      setEditingContact(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-5 w-5" />
          Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData && !canEdit ? (
          <EmptyState
            icon={Users}
            title="No Client Information"
            description="Account and contact details will appear here"
            size="sm"
            className="py-6"
          />
        ) : (
          <>
            {/* Account Section */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Account</p>
              {editingAccount ? (
                <div className="flex gap-2">
                  <Select 
                    value={account?.id || "none"} 
                    onValueChange={handleUpdateAccount}
                    disabled={loadingAccounts}
                  >
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder={loadingAccounts ? "Loading..." : "Select account..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">None</span>
                      </SelectItem>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setEditingAccount(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : account ? (
                <div className="relative group">
                  <AccountCard
                    account={account}
                    onClick={() => navigate(`/accounts/${account.id}`)}
                    variant="list-item"
                    showCaseCount={false}
                  />
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAccount(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ) : canEdit ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setEditingAccount(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground/60">No account assigned</p>
              )}
            </div>
            
            {/* Contact Section */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Contact</p>
              {editingContact ? (
                <div className="flex gap-2">
                  <Select 
                    value={contact?.id || "none"} 
                    onValueChange={handleUpdateContact}
                    disabled={loadingContacts}
                  >
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder={loadingContacts ? "Loading..." : "Select contact..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">None</span>
                      </SelectItem>
                      {contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setEditingContact(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : contact ? (
                <div className="relative group">
                  <ContactCard
                    contact={{
                      ...contact,
                      organization_name: accountName || account?.name || null,
                    }}
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                    variant="list-item"
                    showFooter={false}
                  />
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingContact(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ) : canEdit ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setEditingContact(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground/60">No contact assigned</p>
              )}
              
              {/* Helper text when account exists but no contacts available */}
              {editingContact && account && contacts.length === 0 && !loadingContacts && (
                <p className="text-xs text-muted-foreground mt-2">
                  No contacts found for this account. Create a contact for {account.name} first.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
