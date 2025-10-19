import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Account {
  id: string;
  name: string;
  industry: string;
  email: string;
  phone: string;
  city: string;
  state: string;
}

const Accounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      toast.error("Error fetching accounts");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage business accounts and organizations
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No accounts yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start by adding your first business account
            </p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <Card key={account.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {account.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {account.industry && (
                  <p className="text-sm text-muted-foreground">{account.industry}</p>
                )}
                {account.email && (
                  <p className="text-sm">{account.email}</p>
                )}
                {account.phone && (
                  <p className="text-sm">{account.phone}</p>
                )}
                {(account.city || account.state) && (
                  <p className="text-sm text-muted-foreground">
                    {[account.city, account.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Accounts;