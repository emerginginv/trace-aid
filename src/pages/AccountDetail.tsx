import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Edit, Users, AlertCircle, ExternalLink, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { AccountDetailSkeleton } from "@/components/ui/detail-page-skeleton";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import { RelatedCasesWidget } from "@/components/shared/RelatedCasesWidget";
import { RelatedInvoicesWidget } from "@/components/shared/RelatedInvoicesWidget";
import { EntityActivityWidget } from "@/components/shared/EntityActivityWidget";
import { AccountBillingRatesTab } from "@/components/accounts/AccountBillingRatesTab";
import { useAccountPricingStatus } from "@/hooks/useAccountPricingStatus";

interface Account {
  id: string;
  name: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

const AccountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { organization } = useOrganization();
  const { isAdmin, isManager } = useUserRole();
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isSetupMode = searchParams.get('setup') === 'pricing';
  
  const { data: pricingStatus } = useAccountPricingStatus(
    (isAdmin || isManager) ? id || null : null
  );

  useSetBreadcrumbs(
    account
      ? [
          { label: "Accounts", href: "/accounts" },
          { label: account.name },
        ]
      : []
  );

  useEffect(() => {
    if (organization?.id) {
      fetchAccountDetails();
    }
  }, [id, organization?.id]);

  const fetchAccountDetails = async () => {
    if (!organization?.id) return;

    try {
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single();

      if (accountError) throw accountError;
      setAccount(accountData);

      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone")
        .eq("account_id", id)
        .eq("organization_id", organization.id);

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
    } catch (error) {
      toast.error("Error loading account details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AccountDetailSkeleton />;
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/accounts")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Accounts
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Account not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAddress = account.address || account.city || account.state || account.zip_code;
  const formattedAddress = [account.city, account.state, account.zip_code].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {(isAdmin || isManager) && pricingStatus && pricingStatus.unconfigured > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Client Pricing</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {pricingStatus.unconfigured} of {pricingStatus.total} billing items have no rate configured.
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4 whitespace-nowrap"
              onClick={() => {
                const element = document.getElementById('billing-rates-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Configure Rates →
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {isSetupMode && pricingStatus && pricingStatus.unconfigured === 0 && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
          <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-200">Pricing Configured</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            All billing items have rates configured. This account is ready for invoicing.
          </AlertDescription>
        </Alert>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="absolute inset-0 bg-grid-primary/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative p-6 md:p-8">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/accounts")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Accounts</span>
            </Button>
            <Button onClick={() => navigate(`/accounts/${id}/edit`)} className="gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </div>
          
          {/* Account Info */}
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar/Icon */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 flex items-center justify-center ring-4 ring-background shadow-lg">
                <Building2 className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
            </div>
            
            {/* Details */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
                  {account.name}
                </h1>
                {account.industry && (
                  <Badge variant="secondary" className="mt-2">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {account.industry}
                  </Badge>
                )}
              </div>
              
              {/* Quick Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {account.email && (
                  <a 
                    href={`mailto:${account.email}`} 
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="truncate max-w-[200px]">{account.email}</span>
                  </a>
                )}
                {account.phone && (
                  <a 
                    href={`tel:${account.phone}`} 
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{account.phone}</span>
                  </a>
                )}
                {hasAddress && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate max-w-[250px]">{formattedAddress || account.address}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{contacts.length}</div>
                <div className="text-xs text-muted-foreground">Contacts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details Card */}
          {(account.email || account.phone || hasAddress) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {account.email && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                        <a 
                          href={`mailto:${account.email}`} 
                          className="text-sm font-medium text-primary hover:underline truncate block"
                        >
                          {account.email}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {account.phone && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                        <a 
                          href={`tel:${account.phone}`} 
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {account.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {hasAddress && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors sm:col-span-2">
                      <div className="p-2 rounded-md bg-primary/10">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                        <div className="text-sm font-medium">
                          {account.address && <p>{account.address}</p>}
                          {formattedAddress && <p className="text-muted-foreground">{formattedAddress}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Card */}
          {account.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {account.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Activity Widget */}
          <EntityActivityWidget entityType="account" entityId={account.id} />
        </div>

        {/* Right Column - Related */}
        <div className="space-y-6">
          {/* Contacts Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Contacts
                </CardTitle>
                <Badge variant="secondary">{contacts.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No contacts associated
                </p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <Link
                      key={contact.id}
                      to={`/contacts/${contact.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                        {contact.first_name?.[0]}{contact.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.email || contact.phone || 'No contact info'}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cases & Invoices */}
          <RelatedCasesWidget entityType="account" entityId={account.id} />
          <RelatedInvoicesWidget entityType="account" entityId={account.id} />
        </div>
      </div>

      {/* Billing Rates - Full Width */}
      {(isAdmin || isManager) && id && (
        <div id="billing-rates-section">
          <AccountBillingRatesTab
            accountId={id}
            accountName={account.name}
            canEdit={isAdmin || isManager}
          />
        </div>
      )}
    </div>
  );
};

export default AccountDetail;
