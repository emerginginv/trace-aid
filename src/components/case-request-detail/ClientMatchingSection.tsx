import { useState, useEffect, useMemo } from "react";
import { AlertCircle, Plus, CheckCircle, Search, ChevronsUpDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountForm } from "@/components/AccountForm";
import { NewContactModal } from "./NewContactModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface SubmittedContactData {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
  officePhone?: string | null;
  mobilePhone?: string | null;
  homePhone?: string | null;
}

interface MatchData {
  accountId: string;
  contactId: string | null;
  clientAction: "existing" | "new";
  contactAction: "existing" | "new" | null;
}

interface ClientMatchingSectionProps {
  requestId: string;
  organizationId: string;
  matchedAccountId: string | null;
  matchedContactId: string | null;
  submittedContactData?: SubmittedContactData;
  onMatchComplete: (data: MatchData) => void;
}

export function ClientMatchingSection({
  requestId,
  organizationId,
  matchedAccountId,
  matchedContactId,
  submittedContactData,
  onMatchComplete,
}: ClientMatchingSectionProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(matchedAccountId || "");
  const [selectedContactId, setSelectedContactId] = useState<string>(matchedContactId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [isMatched, setIsMatched] = useState(!!matchedAccountId);
  
  // Track whether client/contact was new or existing
  const [clientAction, setClientAction] = useState<"existing" | "new">("existing");
  const [contactAction, setContactAction] = useState<"existing" | "new" | null>(null);
  
  // Searchable dropdown state
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      const { data } = await supabase
        .from("accounts")
        .select("id, name, city, state")
        .eq("organization_id", organizationId)
        .order("name");

      if (data) setAccounts(data);
    };
    fetchAccounts();
  }, [organizationId]);

  // Fetch contacts when account is selected
  useEffect(() => {
    const fetchContacts = async () => {
      if (!selectedClientId) {
        setContacts([]);
        return;
      }

      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email")
        .eq("organization_id", organizationId)
        .eq("account_id", selectedClientId)
        .order("last_name");

      if (data) setContacts(data);
    };
    fetchContacts();
  }, [selectedClientId, organizationId]);

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!clientSearchTerm) return accounts;
    const term = clientSearchTerm.toLowerCase();
    return accounts.filter(
      (account) =>
        account.name.toLowerCase().includes(term) ||
        account.city?.toLowerCase().includes(term) ||
        account.state?.toLowerCase().includes(term)
    );
  }, [accounts, clientSearchTerm]);

  const handleAccountCreated = (newAccountId?: string) => {
    setShowCreateAccount(false);
    if (newAccountId) {
      setClientAction("new");
      // Refresh accounts and select the new one
      supabase
        .from("accounts")
        .select("id, name, city, state")
        .eq("organization_id", organizationId)
        .order("name")
        .then(({ data }) => {
          if (data) {
            setAccounts(data);
            setSelectedClientId(newAccountId);
            // Reset contact selection when client changes
            setSelectedContactId("");
            setContactAction(null);
          }
        });
    }
  };

  const handleContactCreated = (newContactId: string) => {
    setShowCreateContact(false);
    setContactAction("new");
    // Refresh contacts and select the new one
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email")
      .eq("organization_id", organizationId)
      .eq("account_id", selectedClientId)
      .order("last_name")
      .then(({ data }) => {
        if (data) {
          setContacts(data);
          setSelectedContactId(newContactId);
        }
      });
  };

  const handleClientSelect = (accountId: string) => {
    setSelectedClientId(accountId);
    setClientAction("existing");
    // Reset contact selection when client changes
    setSelectedContactId("");
    setContactAction(null);
    setClientPopoverOpen(false);
  };

  const handleContactSelect = (contactId: string) => {
    if (contactId === "none") {
      setSelectedContactId("");
      setContactAction(null);
    } else {
      setSelectedContactId(contactId);
      setContactAction("existing");
    }
  };

  const handleMatchClient = async () => {
    if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("case_requests")
        .update({
          matched_account_id: selectedClientId,
          matched_contact_id: selectedContactId || null,
          client_match_action: clientAction,
          contact_match_action: contactAction,
        })
        .eq("id", requestId);

      if (error) throw error;

      setIsMatched(true);
      onMatchComplete({
        accountId: selectedClientId,
        contactId: selectedContactId || null,
        clientAction,
        contactAction,
      });
      toast.success("Client matched successfully");
    } catch (error) {
      console.error("Error matching client:", error);
      toast.error("Failed to match client");
    } finally {
      setIsLoading(false);
    }
  };

  const formatContactName = (contact: Contact) => {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
    return contact.email ? `${name} (${contact.email})` : name;
  };

  const formatAccountLocation = (account: Account) => {
    const location = [account.city, account.state].filter(Boolean).join(", ");
    return location ? ` • ${location}` : "";
  };

  const selectedAccount = accounts.find((a) => a.id === selectedClientId);
  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  if (isMatched) {
    return (
      <Alert className="bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800">
        <CheckCircle className="h-4 w-4 text-success-600 dark:text-success-400" />
        <AlertDescription className="text-success-800 dark:text-success-300">
          <span className="font-medium">Client matched:</span> {selectedAccount?.name}
          {selectedContact && ` - ${formatContactName(selectedContact)}`}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800">
        <AlertCircle className="h-4 w-4 text-warning-600 dark:text-warning-400" />
        <AlertDescription className="text-warning-800 dark:text-warning-300">
          This request was entered using the public request form, so you'll have to
          match it to an existing client before you can accept the request.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Selection with Searchable Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="client">
            Client <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPopoverOpen}
                  className="flex-1 justify-between font-normal"
                >
                  {selectedAccount ? (
                    <span className="truncate">
                      {selectedAccount.name}
                      <span className="text-muted-foreground">
                        {formatAccountLocation(selectedAccount)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Search clients...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search clients..."
                    value={clientSearchTerm}
                    onValueChange={setClientSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>No clients found.</CommandEmpty>
                    <CommandGroup>
                      {filteredAccounts.map((account) => (
                        <CommandItem
                          key={account.id}
                          value={account.id}
                          onSelect={() => handleClientSelect(account.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{account.name}</span>
                            {(account.city || account.state) && (
                              <span className="text-xs text-muted-foreground">
                                {[account.city, account.state].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
              onValueChange={handleContactSelect}
              disabled={!selectedClientId}
            >
              <SelectTrigger className="flex-1">
                <SelectValue
                  placeholder={
                    selectedClientId ? "Select a contact..." : "Select client first"
                  }
                />
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
              disabled={!selectedClientId}
              title="Create new contact"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Button onClick={handleMatchClient} disabled={!selectedClientId || isLoading}>
        {isLoading ? "Matching..." : "Match Client"}
      </Button>

      {/* Account Creation Dialog */}
      <AccountForm
        open={showCreateAccount}
        onOpenChange={setShowCreateAccount}
        onSuccess={handleAccountCreated}
        organizationId={organizationId}
        navigateAfterCreate={false}
      />

      {/* Contact Creation Modal */}
      <NewContactModal
        open={showCreateContact}
        onOpenChange={setShowCreateContact}
        onContactCreated={handleContactCreated}
        organizationId={organizationId}
        accountId={selectedClientId}
        defaultValues={submittedContactData}
      />
    </div>
  );
}