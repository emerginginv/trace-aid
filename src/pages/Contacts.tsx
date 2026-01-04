import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, User, Search, LayoutGrid, List, Edit, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { ContactForm } from "@/components/ContactForm";
import { EmailComposer } from "@/components/EmailComposer";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
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
import { usePermissions } from "@/hooks/usePermissions";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { ColumnVisibility } from "@/components/ui/column-visibility";
import { useColumnVisibility, ColumnDefinition } from "@/hooks/use-column-visibility";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
}

const COLUMNS: ColumnDefinition[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "actions", label: "Actions", hideable: false },
];

const Contacts = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { organization } = useOrganization();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [selectedContactEmail, setSelectedContactEmail] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<string>("first_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { visibility, isVisible, toggleColumn, resetToDefaults } = useColumnVisibility("contacts-columns", COLUMNS);

  useEffect(() => {
    fetchContacts();
  }, [organization?.id]);

  const fetchContacts = async () => {
    try {
      if (!organization?.id) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      toast.error("Error fetching contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contactToDelete) return;

    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactToDelete);

      if (error) throw error;

      toast.success("Contact deleted successfully");
      fetchContacts();
    } catch (error) {
      toast.error("Failed to delete contact");
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredContacts = contacts.filter(contact => {
    return searchQuery === '' || 
      contact.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: string = "";
    let bVal: string = "";
    
    if (sortColumn === "name" || sortColumn === "first_name") {
      aVal = `${a.first_name} ${a.last_name}`;
      bVal = `${b.first_name} ${b.last_name}`;
    } else if (sortColumn === "location") {
      aVal = [a.city, a.state].filter(Boolean).join(", ");
      bVal = [b.city, b.state].filter(Boolean).join(", ");
    } else {
      aVal = (a[sortColumn as keyof Contact] as string) || "";
      bVal = (b[sortColumn as keyof Contact] as string) || "";
    }
    
    return sortDirection === "asc" 
      ? aVal.localeCompare(bVal) 
      : bVal.localeCompare(aVal);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground mt-2">
            Manage individual contacts and clients
          </p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          New Contact
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-[0.625rem] h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <ColumnVisibility
          columns={COLUMNS}
          visibility={visibility}
          onToggle={toggleColumn}
          onReset={resetToDefaults}
        />
        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8 w-8 p-0"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Entry count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedContacts.length} contact{sortedContacts.length !== 1 ? 's' : ''}
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No contacts yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first contact to get started
            </p>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Create First Contact
            </Button>
          </CardContent>
        </Card>
      ) : filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No contacts match your search criteria</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedContacts.map((contact) => (
            <Card 
              key={contact.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/contacts/${contact.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/contacts/${contact.id}`);
                }
              }}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(contact.first_name, contact.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-lg">
                    {contact.first_name} {contact.last_name}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {contact.email && (
                    <p className="text-sm">{contact.email}</p>
                  )}
                  {contact.phone && (
                    <p className="text-sm">{contact.phone}</p>
                  )}
                  {(contact.city || contact.state) && (
                    <p className="text-sm text-muted-foreground">
                      {[contact.city, contact.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  {contact.email && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContactEmail(contact.email);
                        setEmailSubject(`Message for ${contact.first_name} ${contact.last_name}`);
                        setEmailComposerOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                  )}
                  {hasPermission('edit_contacts') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/contacts/${contact.id}/edit`);
                      }}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {hasPermission('delete_contacts') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContactToDelete(contact.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {isVisible("name") && (
                  <SortableTableHead
                    column="first_name"
                    label="Name"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("email") && (
                  <SortableTableHead
                    column="email"
                    label="Email"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("phone") && (
                  <SortableTableHead
                    column="phone"
                    label="Phone"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("location") && (
                  <SortableTableHead
                    column="location"
                    label="Location"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                )}
                {isVisible("actions") && (
                  <SortableTableHead
                    column=""
                    label="Actions"
                    sortColumn=""
                    sortDirection="asc"
                    onSort={() => {}}
                    className="w-[120px]"
                  />
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContacts.map((contact) => (
                <TableRow 
                  key={contact.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/contacts/${contact.id}`);
                    }
                  }}
                >
                  {isVisible("name") && (
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(contact.first_name, contact.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        {contact.first_name} {contact.last_name}
                      </div>
                    </TableCell>
                  )}
                  {isVisible("email") && (
                    <TableCell>{contact.email || '-'}</TableCell>
                  )}
                  {isVisible("phone") && (
                    <TableCell>{contact.phone || '-'}</TableCell>
                  )}
                  {isVisible("location") && (
                    <TableCell>
                      {[contact.city, contact.state].filter(Boolean).join(", ") || '-'}
                    </TableCell>
                  )}
                  {isVisible("actions") && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {contact.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContactEmail(contact.email);
                              setEmailSubject(`Message for ${contact.first_name} ${contact.last_name}`);
                              setEmailComposerOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        {hasPermission('edit_contacts') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contacts/${contact.id}/edit`);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {hasPermission('delete_contacts') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContactToDelete(contact.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ContactForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        onSuccess={fetchContacts} 
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contact and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EmailComposer 
        open={emailComposerOpen} 
        onOpenChange={setEmailComposerOpen}
        defaultTo={selectedContactEmail}
        defaultSubject={emailSubject}
      />

      <ScrollProgress />
    </div>
  );
};

export default Contacts;
