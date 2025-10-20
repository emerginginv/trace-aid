import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Edit, Users } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountDetails();
  }, [id]);

  const fetchAccountDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (accountError) throw accountError;
      setAccount(accountData);

      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone")
        .eq("account_id", id)
        .eq("user_id", user.id);

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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/accounts")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Button onClick={() => navigate(`/accounts/${id}/edit`)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Building2 className="w-6 h-6 text-primary" />
            {account.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {account.industry && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Industry</h3>
                <p className="text-base">{account.industry}</p>
              </div>
            )}

            {account.email && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </h3>
                <a href={`mailto:${account.email}`} className="text-base text-primary hover:underline">
                  {account.email}
                </a>
              </div>
            )}

            {account.phone && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </h3>
                <a href={`tel:${account.phone}`} className="text-base text-primary hover:underline">
                  {account.phone}
                </a>
              </div>
            )}

            {(account.address || account.city || account.state || account.zip_code) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </h3>
                <div className="text-base space-y-1">
                  {account.address && <p>{account.address}</p>}
                  {(account.city || account.state || account.zip_code) && (
                    <p>
                      {[account.city, account.state, account.zip_code].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {account.notes && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Notes</h3>
              <p className="text-base whitespace-pre-wrap bg-muted p-4 rounded-md">{account.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Related Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No contacts associated with this account</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {contact.first_name} {contact.last_name}
                    </TableCell>
                    <TableCell>{contact.email || '-'}</TableCell>
                    <TableCell>{contact.phone || '-'}</TableCell>
                    <TableCell>
                      <Link to={`/contacts/${contact.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
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

export default AccountDetail;
