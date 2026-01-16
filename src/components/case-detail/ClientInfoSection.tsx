import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountCard } from "@/components/shared/AccountCard";
import { ContactCard } from "@/components/shared/ContactCard";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigate } from "react-router-dom";

interface ClientInfoSectionProps {
  account: {
    id: string;
    name: string;
    status?: string | null;
    industry?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  contact: {
    id: string;
    first_name: string;
    last_name: string;
    status?: string | null;
    role?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  accountName?: string | null;
}

export function ClientInfoSection({ account, contact, accountName }: ClientInfoSectionProps) {
  const navigate = useNavigate();
  
  const hasData = account || contact;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-5 w-5" />
          Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <EmptyState
            icon={Users}
            title="No Client Information"
            description="Account and contact details will appear here"
            size="sm"
            className="py-6"
          />
        ) : (
          <>
            {/* Account */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Account</p>
              {account ? (
                <AccountCard
                  account={account}
                  onClick={() => navigate(`/accounts/${account.id}`)}
                  variant="list-item"
                  showCaseCount={false}
                />
              ) : (
                <p className="text-sm text-muted-foreground/60">No account assigned</p>
              )}
            </div>
            
            {/* Contact */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Contact</p>
              {contact ? (
                <ContactCard
                  contact={{
                    ...contact,
                    organization_name: accountName || account?.name || null,
                  }}
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                  variant="list-item"
                  showFooter={false}
                />
              ) : (
                <p className="text-sm text-muted-foreground/60">No contact assigned</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
