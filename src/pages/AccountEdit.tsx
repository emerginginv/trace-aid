import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface PricingProfile {
  id: string;
  name: string;
  is_default: boolean;
}

const accountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  industry: z.string().max(100).optional(),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip_code: z.string().max(10).optional(),
  notes: z.string().max(1000).optional(),
  default_pricing_profile_id: z.string().optional().nullable(),
});

type AccountFormData = z.infer<typeof accountSchema>;

const AccountEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [pricingProfiles, setPricingProfiles] = useState<PricingProfile[]>([]);

  useSetBreadcrumbs(
    accountName
      ? [
          { label: "Accounts", href: "/accounts" },
          { label: accountName, href: `/accounts/${id}` },
          { label: "Edit" },
        ]
      : []
  );

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      industry: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      notes: "",
      default_pricing_profile_id: null,
    },
  });

  useEffect(() => {
    if (organization?.id) {
      fetchAccount();
      fetchPricingProfiles();
    }
  }, [id, organization?.id]);

  const fetchPricingProfiles = async () => {
    if (!organization?.id) return;
    try {
      const { data, error } = await supabase
        .from("pricing_profiles")
        .select("id, name, is_default")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      setPricingProfiles(data || []);
    } catch (error) {
      console.error("Error fetching pricing profiles:", error);
    }
  };

  const fetchAccount = async () => {
    if (!organization?.id) return;
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single();

      if (error) throw error;

      setAccountName(data.name || "");
      form.reset({
        name: data.name || "",
        industry: data.industry || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip_code: data.zip_code || "",
        notes: data.notes || "",
        default_pricing_profile_id: data.default_pricing_profile_id || null,
      });
    } catch (error) {
      toast.error("Error loading account");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AccountFormData) => {
    try {
      const { error } = await supabase
        .from("accounts")
        .update({
          name: data.name,
          industry: data.industry,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zip_code,
          notes: data.notes,
          default_pricing_profile_id: data.default_pricing_profile_id || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Account updated successfully");
      navigate(`/accounts/${id}`);
    } catch (error) {
      toast.error("Failed to update account");
      console.error(error);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/accounts/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input placeholder="Technology, Healthcare, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Default Pricing Profile */}
              <FormField
                control={form.control}
                name="default_pricing_profile_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Pricing Profile</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Use organization default" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Use organization default</SelectItem>
                        {pricingProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                            {profile.is_default && " (Org Default)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Cases created for this client will use this pricing profile by default
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this account..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/accounts/${id}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountEdit;
