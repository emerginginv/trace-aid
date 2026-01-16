import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientAccountCard } from "./ClientAccountCard";
import { ClientContactCard } from "./ClientContactCard";
import { Users, Plus, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "@/hooks/use-toast";
import { useConfirmation } from "@/components/ui/confirmation-dialog";

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
  onUpdate 
}: ClientInfoSectionProps) {
  const { organization } = useOrganization();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_cases');
  const { confirm, ConfirmDialog } = useConfirmation();
  
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
      let clearContact = false;

      // If there's a contact and account is changing, check if we need to prompt
      if (contact && newAccountId !== account?.id) {
        if (newAccountId) {
          // Changing to a different account - check if contact belongs to it
          const { data: contactData } = await supabase
            .from('contacts')
            .select('account_id')
            .eq('id', contact.id)
            .single();
          
          const belongsToNewAccount = contactData?.account_id === newAccountId || 
                                      !contactData?.account_id; // Standalone contact
          
          if (!belongsToNewAccount) {
            clearContact = await confirm({
              title: "Contact belongs to a different account",
              description: `"${contact.first_name} ${contact.last_name}" is associated with a different account. Would you like to clear this contact, or keep them anyway?`,
              confirmLabel: "Clear Contact",
              cancelLabel: "Keep Contact",
              variant: "warning",
            });
          }
        } else {
          // Removing account - ask about keeping standalone contact
          clearContact = await confirm({
            title: "Keep the primary contact?",
            description: `You're removing the client account. Would you like to also clear "${contact.first_name} ${contact.last_name}", or keep them as a standalone contact?`,
            confirmLabel: "Clear Contact",
            cancelLabel: "Keep Contact",
            variant: "warning",
          });
        }
      }

      const updateData: { account_id: string | null; contact_id?: null } = {
        account_id: newAccountId,
      };
      
      if (clearContact) {
        updateData.contact_id = null;
      }

      const { error } = await supabase
        .from('cases')
        .update(updateData)
        .eq('id', caseId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Account updated",
        description: clearContact ? "Contact was also cleared" : undefined
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

  const handleRemoveAccount = async () => {
    const confirmed = await confirm({
      title: "Remove Client Account",
      description: contact 
        ? "This will remove the account and its associated contact from this case. The account and contact records will not be deleted."
        : "This will remove the account from this case. The account record will not be deleted.",
      variant: "destructive",
    });
    
    if (confirmed) {
      handleUpdateAccount("none");
    }
  };

  const handleRemoveContact = async () => {
    const confirmed = await confirm({
      title: "Remove Client Contact",
      description: "This will remove the contact from this case. The contact record will not be deleted.",
      variant: "destructive",
    });
    
    if (confirmed) {
      handleUpdateContact("none");
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
                <ClientAccountCard
                  account={account}
                  onChangeClick={() => setEditingAccount(true)}
                  onRemove={handleRemoveAccount}
                  canEdit={canEdit}
                />
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
              ) : null}
            </div>
            
            {/* Contact Section */}
            <div>
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
                <ClientContactCard
                  contact={contact}
                  onChangeClick={() => setEditingContact(true)}
                  onRemove={handleRemoveContact}
                  canEdit={canEdit}
                />
              ) : canEdit ? (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setEditingContact(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                  {account && (
                    <p className="text-xs text-muted-foreground px-1">
                      Add a contact from {account.name}
                    </p>
                  )}
                </div>
              ) : account && !contact ? (
                <p className="text-xs text-muted-foreground py-2">
                  No contact assigned
                </p>
              ) : null}
              
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
      <ConfirmDialog />
    </Card>
  );
}
