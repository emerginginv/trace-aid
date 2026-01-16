import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, UserPlus, ArrowRight } from "lucide-react";
import { useAccountsQuery, useAccountQuery } from "@/hooks/queries/useAccountsQuery";
import { useContactsQuery, useContactQuery } from "@/hooks/queries/useContactsQuery";
import { Step1Data } from "@/hooks/useCaseRequestForm";

interface InternalClientSelectorProps {
  organizationId: string;
  clientMode: 'existing' | 'new';
  selectedAccountId: string | null;
  selectedContactId: string | null;
  onClientModeChange: (mode: 'existing' | 'new') => void;
  onClientSelect: (accountId: string | null, contactId: string | null, prefillData: Step1Data | null) => void;
  onContinue: () => void;
}

export function InternalClientSelector({
  organizationId,
  clientMode,
  selectedAccountId,
  selectedContactId,
  onClientModeChange,
  onClientSelect,
  onContinue,
}: InternalClientSelectorProps) {
  // Fetch all accounts
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsQuery({
    enabled: !!organizationId,
  });

  // Fetch contacts filtered by selected account
  const { data: contacts = [], isLoading: contactsLoading } = useContactsQuery({
    accountId: selectedAccountId || undefined,
    enabled: !!organizationId && !!selectedAccountId,
  });

  // Fetch selected account details
  const { data: selectedAccount } = useAccountQuery(selectedAccountId || undefined);

  // Fetch selected contact details
  const { data: selectedContact } = useContactQuery(selectedContactId || undefined);

  // Build prefill data when account/contact is selected
  const prefillData = useMemo((): Step1Data | null => {
    if (!selectedAccount) return null;

    return {
      case_type_id: '',
      submitted_client_name: selectedAccount.name || '',
      submitted_client_country: 'United States',
      submitted_client_address1: selectedAccount.address || '',
      submitted_client_address2: '',
      submitted_client_address3: '',
      submitted_client_city: selectedAccount.city || '',
      submitted_client_state: selectedAccount.state || '',
      submitted_client_zip: selectedAccount.zip_code || '',
      submitted_contact_first_name: selectedContact?.first_name || '',
      submitted_contact_middle_name: '',
      submitted_contact_last_name: selectedContact?.last_name || '',
      submitted_contact_email: selectedContact?.email || selectedAccount.email || '',
      submitted_contact_office_phone: selectedContact?.phone || selectedAccount.phone || '',
      submitted_contact_mobile_phone: '',
      submitted_contact_mobile_carrier: '',
      submitted_contact_home_phone: '',
    };
  }, [selectedAccount, selectedContact]);

  const handleAccountChange = (accountId: string) => {
    if (accountId === 'none') {
      onClientSelect(null, null, null);
    } else {
      // Clear contact when account changes
      onClientSelect(accountId, null, null);
    }
  };

  const handleContactChange = (contactId: string) => {
    if (contactId === 'none') {
      // Keep account, just clear contact
      onClientSelect(selectedAccountId, null, prefillData);
    } else {
      onClientSelect(selectedAccountId, contactId, prefillData);
    }
  };

  // Update prefill data when account or contact is loaded
  useMemo(() => {
    if (clientMode === 'existing' && selectedAccountId && prefillData) {
      onClientSelect(selectedAccountId, selectedContactId, prefillData);
    }
  }, [prefillData, clientMode, selectedAccountId, selectedContactId]);

  const canContinue = clientMode === 'new' || (clientMode === 'existing' && selectedAccountId);

  return (
    <div className="space-y-6">
      {/* Client Type Toggle */}
      <div className="space-y-3">
        <Label>Client Type</Label>
        <ToggleGroup 
          type="single" 
          value={clientMode} 
          onValueChange={(v) => v && onClientModeChange(v as 'existing' | 'new')}
          className="justify-start"
        >
          <ToggleGroupItem value="existing" className="gap-2">
            <Building2 className="h-4 w-4" />
            Existing Client
          </ToggleGroupItem>
          <ToggleGroupItem value="new" className="gap-2">
            <UserPlus className="h-4 w-4" />
            New Client
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Existing Client Dropdowns */}
      {clientMode === 'existing' && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          {/* Account Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="account">Client Account *</Label>
            {accountsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select 
                value={selectedAccountId || 'none'} 
                onValueChange={handleAccountChange}
              >
                <SelectTrigger id="account">
                  <SelectValue placeholder="Select a client account..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a client account...</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Contact Dropdown - only show when account is selected */}
          {selectedAccountId && (
            <div className="space-y-2">
              <Label htmlFor="contact">Contact (Optional)</Label>
              {contactsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select 
                  value={selectedContactId || 'none'} 
                  onValueChange={handleContactChange}
                >
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Select a contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific contact</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                        {contact.email && ` (${contact.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {contacts.length === 0 && !contactsLoading && (
                <p className="text-sm text-muted-foreground">
                  No contacts found for this account.
                </p>
              )}
            </div>
          )}

          {/* Selected Info Preview */}
          {selectedAccount && (
            <div className="mt-4 p-3 bg-background border rounded-md space-y-1">
              <p className="text-sm font-medium">Selected Client:</p>
              <p className="text-sm text-muted-foreground">{selectedAccount.name}</p>
              {selectedAccount.address && (
                <p className="text-xs text-muted-foreground">
                  {[selectedAccount.address, selectedAccount.city, selectedAccount.state, selectedAccount.zip_code]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {selectedContact && (
                <p className="text-sm text-muted-foreground mt-2">
                  Contact: {[selectedContact.first_name, selectedContact.last_name].filter(Boolean).join(' ')}
                  {selectedContact.email && ` • ${selectedContact.email}`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Client Info */}
      {clientMode === 'new' && (
        <div className="p-4 border rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground">
            You'll enter the client information in the next step. A new client record can be created during case request review.
          </p>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={onContinue} disabled={!canContinue}>
          Continue to Case Request
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
