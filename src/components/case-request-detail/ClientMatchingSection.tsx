import { useState, useEffect } from "react";
import { AlertCircle, Plus, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountForm } from "@/components/AccountForm";
import { ContactForm } from "@/components/ContactForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Account {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface ClientMatchingSectionProps {
  requestId: string;
  organizationId: string;
  matchedAccountId: string | null;
  matchedContactId: string | null;
  onMatchComplete: (accountId: string, contactId: string | null) => void;
}

export function ClientMatchingSection({
  requestId,
  organizationId,
  matchedAccountId,
  matchedContactId,
  onMatchComplete,
}: ClientMatchingSectionProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(matchedAccountId || '');
  const [selectedContactId, setSelectedContactId] = useState<string>(matchedContactId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [isMatched, setIsMatched] = useState(!!matchedAccountId);

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      const { data } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');
      
      if (data) setAccounts(data);
    };
    fetchAccounts();
  }, [organizationId]);

  // Fetch contacts when account is selected
  useEffect(() => {
    const fetchContacts = async () => {
      if (!selectedAccountId) {
        setContacts([]);
        return;
      }

      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('organization_id', organizationId)
        .eq('account_id', selectedAccountId)
        .order('last_name');
      
      if (data) setContacts(data);
    };
    fetchContacts();
  }, [selectedAccountId, organizationId]);

  const handleAccountCreated = (newAccountId?: string) => {
    setShowCreateAccount(false);
    if (newAccountId) {
      // Refresh accounts and select the new one
      supabase
        .from('accounts')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name')
        .then(({ data }) => {
          if (data) {
            setAccounts(data);
            setSelectedAccountId(newAccountId);
          }
        });
    }
  };

  const handleContactCreated = (newContactId?: string) => {
    setShowCreateContact(false);
    if (newContactId && selectedAccountId) {
      // Refresh contacts and select the new one
      supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('organization_id', organizationId)
        .eq('account_id', selectedAccountId)
        .order('last_name')
        .then(({ data }) => {
          if (data) {
            setContacts(data);
            setSelectedContactId(newContactId);
          }
        });
    }
  };

  const handleMatchClient = async () => {
    if (!selectedAccountId) {
      toast.error('Please select a client');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('case_requests')
        .update({
          matched_account_id: selectedAccountId,
          matched_contact_id: selectedContactId || null,
          client_match_action: 'existing',
        })
        .eq('id', requestId);

      if (error) throw error;

      setIsMatched(true);
      onMatchComplete(selectedAccountId, selectedContactId || null);
      toast.success('Client matched successfully');
    } catch (error) {
      console.error('Error matching client:', error);
      toast.error('Failed to match client');
    } finally {
      setIsLoading(false);
    }
  };

  const formatContactName = (contact: Contact) => {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
    return contact.email ? `${name} (${contact.email})` : name;
  };

  if (isMatched) {
    const matchedAccount = accounts.find(a => a.id === selectedAccountId);
    const matchedContact = contacts.find(c => c.id === selectedContactId);
    
    return (
      <Alert className="bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800">
        <CheckCircle className="h-4 w-4 text-success-600 dark:text-success-400" />
        <AlertDescription className="text-success-800 dark:text-success-300">
          <span className="font-medium">Client matched:</span>{' '}
          {matchedAccount?.name}
          {matchedContact && ` - ${formatContactName(matchedContact)}`}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800">
        <AlertCircle className="h-4 w-4 text-warning-600 dark:text-warning-400" />
        <AlertDescription className="text-warning-800 dark:text-warning-300">
          This request was entered using the public request form, so you'll have to match it to an existing client before you can accept the request.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Selection */}
        <div className="space-y-2">
          <Label htmlFor="client">
            Client <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowCreateAccount(true)}
              title="Create new client"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contact Selection */}
        <div className="space-y-2">
          <Label htmlFor="contact">Primary Contact</Label>
          <div className="flex gap-2">
            <Select 
              value={selectedContactId} 
              onValueChange={setSelectedContactId}
              disabled={!selectedAccountId}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={selectedAccountId ? "Select a contact..." : "Select client first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No contact</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {formatContactName(contact)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowCreateContact(true)}
              disabled={!selectedAccountId}
              title="Create new contact"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Button
        onClick={handleMatchClient}
        disabled={!selectedAccountId || isLoading}
      >
        {isLoading ? 'Matching...' : 'Match Client'}
      </Button>

      {/* Account Creation Dialog */}
      <AccountForm
        open={showCreateAccount}
        onOpenChange={setShowCreateAccount}
        onSuccess={handleAccountCreated}
        organizationId={organizationId}
        navigateAfterCreate={false}
      />

      {/* Contact Creation Dialog */}
      <ContactForm
        open={showCreateContact}
        onOpenChange={setShowCreateContact}
        onSuccess={handleContactCreated}
        organizationId={organizationId}
        defaultAccountId={selectedAccountId || undefined}
      />
    </div>
  );
}
