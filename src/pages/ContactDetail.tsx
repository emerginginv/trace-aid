import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, MapPin, Edit, Building2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ContactDetailSkeleton } from "@/components/ui/detail-page-skeleton";
import { RelatedCasesWidget } from "@/components/shared/RelatedCasesWidget";
import { RelatedInvoicesWidget } from "@/components/shared/RelatedInvoicesWidget";
import { EntityActivityWidget } from "@/components/shared/EntityActivityWidget";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
  account_id: string;
}

interface Account {
  id: string;
  name: string;
}

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useSetBreadcrumbs(
    contact
      ? [
          { label: "Contacts", href: "/contacts" },
          { label: `${contact.first_name} ${contact.last_name}` },
        ]
      : []
  );

  useEffect(() => {
    fetchContactDetails();
  }, [id]);

  const fetchContactDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: contactData, error: contactError } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (contactError) throw contactError;
      setContact(contactData);

      if (contactData.account_id) {
        const { data: accountData, error: accountError } = await supabase
          .from("accounts")
          .select("id, name")
          .eq("id", contactData.account_id)
          .single();

        if (accountError) throw accountError;
        setAccount(accountData);
      }
    } catch (error) {
      toast.error("Error loading contact details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ContactDetailSkeleton />;
  }

  if (!contact) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contacts
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Contact not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = `${contact.first_name} ${contact.last_name}`;
  const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`;
  const hasAddress = contact.address || contact.city || contact.state || contact.zip_code;
  const formattedAddress = [contact.city, contact.state, contact.zip_code].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-secondary/5 via-background to-primary/5">
        <div className="absolute inset-0 bg-grid-primary/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative p-6 md:p-8">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/contacts")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Contacts</span>
            </Button>
            <Button onClick={() => navigate(`/contacts/${id}/edit`)} className="gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </div>
          
          {/* Contact Info */}
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center ring-4 ring-background shadow-lg">
                <span className="text-xl md:text-2xl font-bold text-primary-foreground">
                  {initials}
                </span>
              </div>
            </div>
            
            {/* Details */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
                  {fullName}
                </h1>
                {account && (
                  <Link 
                    to={`/accounts/${account.id}`}
                    className="inline-flex items-center gap-1.5 mt-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>{account.name}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
              
              {/* Quick Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {contact.email && (
                  <a 
                    href={`mailto:${contact.email}`} 
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="truncate max-w-[200px]">{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a 
                    href={`tel:${contact.phone}`} 
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{contact.phone}</span>
                  </a>
                )}
                {hasAddress && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate max-w-[250px]">{formattedAddress || contact.address}</span>
                  </span>
                )}
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
          {(contact.email || contact.phone || hasAddress || account) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {contact.email && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                        <a 
                          href={`mailto:${contact.email}`} 
                          className="text-sm font-medium text-primary hover:underline truncate block"
                        >
                          {contact.email}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {contact.phone && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                        <a 
                          href={`tel:${contact.phone}`} 
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {account && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account</p>
                        <Link 
                          to={`/accounts/${account.id}`} 
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {account.name}
                        </Link>
                      </div>
                    </div>
                  )}
                  
                  {hasAddress && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="p-2 rounded-md bg-primary/10">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                        <div className="text-sm font-medium">
                          {contact.address && <p>{contact.address}</p>}
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
          {contact.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {contact.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Activity Widget */}
          <EntityActivityWidget entityType="contact" entityId={contact.id} />
        </div>

        {/* Right Column - Related */}
        <div className="space-y-6">
          <RelatedCasesWidget entityType="contact" entityId={contact.id} />
          <RelatedInvoicesWidget entityType="contact" entityId={contact.id} />
        </div>
      </div>
    </div>
  );
};

export default ContactDetail;
