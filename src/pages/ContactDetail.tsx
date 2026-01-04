import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Mail, Phone, MapPin, Edit, Building2 } from "lucide-react";
import { toast } from "sonner";
import { ContactDetailSkeleton } from "@/components/ui/detail-page-skeleton";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Button onClick={() => navigate(`/contacts/${id}/edit`)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Contact
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <User className="w-6 h-6 text-primary" />
            {contact.first_name} {contact.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contact.email && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </h3>
                <a href={`mailto:${contact.email}`} className="text-base text-primary hover:underline">
                  {contact.email}
                </a>
              </div>
            )}

            {contact.phone && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </h3>
                <a href={`tel:${contact.phone}`} className="text-base text-primary hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}

            {account && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Associated Account
                </h3>
                <Link to={`/accounts/${account.id}`} className="text-base text-primary hover:underline">
                  {account.name}
                </Link>
              </div>
            )}

            {(contact.address || contact.city || contact.state || contact.zip_code) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </h3>
                <div className="text-base space-y-1">
                  {contact.address && <p>{contact.address}</p>}
                  {(contact.city || contact.state || contact.zip_code) && (
                    <p>
                      {[contact.city, contact.state, contact.zip_code].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {contact.notes && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Notes</h3>
              <p className="text-base whitespace-pre-wrap bg-muted p-4 rounded-md">{contact.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactDetail;
