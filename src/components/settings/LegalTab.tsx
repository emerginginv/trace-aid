import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useEntitlements } from "@/hooks/use-entitlements";
import { isEnterprisePlan } from "@/lib/planDetection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  FileText, 
  Plus, 
  Upload, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Shield,
  Lock,
  Download,
  Pencil,
  Building2,
  User,
  Eye,
  X
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type ContractType = Database["public"]["Enums"]["contract_type"];
type ContractStatus = Database["public"]["Enums"]["contract_status"];

interface Contract {
  id: string;
  contract_type: ContractType;
  title: string;
  description: string | null;
  status: ContractStatus;
  version: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  auto_renews: boolean;
  renewal_term_days: number | null;
  signed_at: string | null;
  signed_by: string | null;
  signer_email: string | null;
  file_path: string | null;
  created_at: string;
  days_until_expiration: number | null;
  account_id: string | null;
  account_name: string | null;
  contact_id: string | null;
  contact_name: string | null;
}

interface Account {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  account_id: string | null;
}

const contractTypeLabels: Record<ContractType, string> = {
  msa: "Master Service Agreement",
  sow: "Statement of Work",
  order_form: "Order Form",
  dpa: "Data Processing Agreement",
  nda: "Non-Disclosure Agreement",
  other: "Other"
};

const statusConfig: Record<ContractStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800", icon: Clock },
  pending_signature: { label: "Pending Signature", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  signed: { label: "Signed", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  active: { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  expired: { label: "Expired", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  terminated: { label: "Terminated", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  superseded: { label: "Superseded", color: "bg-gray-100 text-gray-800", icon: FileText }
};

export function LegalTab() {
  const { organization } = useOrganization();
  const { entitlements } = useEntitlements();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newContractOpen, setNewContractOpen] = useState(false);
  const [signContractOpen, setSignContractOpen] = useState(false);
  const [viewContractOpen, setViewContractOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // Form state
  const [contractType, setContractType] = useState<ContractType>("msa");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [autoRenews, setAutoRenews] = useState(false);
  const [renewalTermDays, setRenewalTermDays] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Sign form state
  const [signedBy, setSignedBy] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerTitle, setSignerTitle] = useState("");

  // Check enterprise status via entitlements (includes trial awareness) or fallback to org tier
  const isEnterprise = isEnterprisePlan(
    entitlements?.subscription_tier,
    entitlements?.subscription_product_id
  ) || isEnterprisePlan(organization?.subscription_tier, organization?.subscription_product_id);

  // Fetch contracts
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['organization-contracts', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase.rpc('get_organization_contracts', {
        p_organization_id: organization.id
      });
      if (error) throw error;
      return (data as unknown as Contract[]) || [];
    },
    enabled: !!organization?.id && isEnterprise
  });

  // Fetch accounts for dropdown
  const { data: accounts } = useQuery({
    queryKey: ['organization-accounts', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('organization_id', organization.id)
        .order('name');
      if (error) throw error;
      return (data as Account[]) || [];
    },
    enabled: !!organization?.id && isEnterprise
  });

  // Fetch contacts for dropdown (filtered by account if selected)
  const { data: allContacts } = useQuery({
    queryKey: ['organization-contacts', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, account_id')
        .eq('organization_id', organization.id)
        .order('last_name');
      if (error) throw error;
      return (data as Contact[]) || [];
    },
    enabled: !!organization?.id && isEnterprise
  });

  // Filter contacts by selected account
  const filteredContacts = selectedAccountId 
    ? allContacts?.filter(c => c.account_id === selectedAccountId) 
    : allContacts;

  // Upload file to storage
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!organization?.id) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${organization.id}/${crypto.randomUUID()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('contracts')
      .upload(fileName, file);
    
    if (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload file');
    }
    
    return fileName;
  };

  // Download file from storage
  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('contracts')
        .createSignedUrl(filePath, 60);
      
      if (error) throw error;
      
      // Open in new tab or download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");
      
      setIsUploading(true);
      let filePath: string | null = null;
      
      try {
        // Upload file if selected
        if (selectedFile) {
          filePath = await uploadFile(selectedFile);
        }
        
        const { data, error } = await supabase.rpc('create_contract', {
          p_organization_id: organization.id,
          p_contract_type: contractType,
          p_title: title,
          p_description: description || null,
          p_version: version || null,
          p_effective_date: effectiveDate || null,
          p_expiration_date: expirationDate || null,
          p_auto_renews: autoRenews,
          p_renewal_term_days: renewalTermDays ? parseInt(renewalTermDays) : null,
          p_file_path: filePath,
          p_account_id: selectedAccountId || null,
          p_contact_id: selectedContactId || null
        });
        if (error) throw error;
        return data;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-contracts'] });
      toast.success("Agreement created successfully");
      setNewContractOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create agreement");
    }
  });

  // Sign contract mutation
  const signContractMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContract) throw new Error("No contract selected");
      const { error } = await supabase.rpc('sign_contract', {
        p_contract_id: selectedContract.id,
        p_signed_by: signedBy,
        p_signer_email: signerEmail || null,
        p_signer_title: signerTitle || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-contracts'] });
      toast.success("Agreement marked as signed");
      setSignContractOpen(false);
      setSelectedContract(null);
      setSignedBy("");
      setSignerEmail("");
      setSignerTitle("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to sign agreement");
    }
  });

  const resetForm = () => {
    setContractType("msa");
    setTitle("");
    setDescription("");
    setVersion("");
    setEffectiveDate("");
    setExpirationDate("");
    setAutoRenews(false);
    setRenewalTermDays("");
    setSelectedAccountId("");
    setSelectedContactId("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Check for DPA
  const hasDpa = contracts?.some(c => 
    c.contract_type === 'dpa' && 
    ['signed', 'active'].includes(c.status)
  );

  // Get active and expiring contracts
  const activeContracts = contracts?.filter(c => ['signed', 'active'].includes(c.status)) || [];
  const expiringContracts = activeContracts.filter(c => 
    c.days_until_expiration !== null && c.days_until_expiration <= 90
  );

  if (!isEnterprise) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Enterprise Feature</h3>
              <p className="text-muted-foreground mt-1">
                Contract management and DPAs are available on Enterprise plans
              </p>
            </div>
            <Button>Upgrade to Enterprise</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* DPA Status Banner */}
      {!hasDpa && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No Data Processing Agreement on file. Enterprise features may require a signed DPA.
          </AlertDescription>
        </Alert>
      )}

      {/* Expiring Contracts Warning */}
      {expiringContracts.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            {expiringContracts.length} agreement(s) expiring within 90 days
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Legal Agreements</h2>
          <p className="text-sm text-muted-foreground">
            Manage contracts, DPAs, and legal documents with vendors
          </p>
        </div>
        <Dialog open={newContractOpen} onOpenChange={setNewContractOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Agreement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Legal Agreement</DialogTitle>
              <DialogDescription>
                Create a new contract or agreement record and attach documents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Vendor Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vendor Account</Label>
                  <Select value={selectedAccountId} onValueChange={(v) => {
                    setSelectedAccountId(v);
                    setSelectedContactId(""); // Reset contact when account changes
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {accounts?.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vendor Contact</Label>
                  <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {filteredContacts?.map(contact => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Agreement Type</Label>
                  <Select value={contractType} onValueChange={(v) => setContractType(v as ContractType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="msa">Master Service Agreement</SelectItem>
                      <SelectItem value="dpa">Data Processing Agreement</SelectItem>
                      <SelectItem value="sow">Statement of Work</SelectItem>
                      <SelectItem value="order_form">Order Form</SelectItem>
                      <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Version</Label>
                  <Input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g., v1.0"
                  />
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Agreement title"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>

              {/* File Upload */}
              <div>
                <Label>Upload Document</Label>
                <div className="mt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                    id="contract-file"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {selectedFile ? "Change File" : "Select File"}
                    </Button>
                    {selectedFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts PDF, Word documents. Max 10MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Expiration Date</Label>
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoRenews"
                    checked={autoRenews}
                    onChange={(e) => setAutoRenews(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="autoRenews" className="text-sm">Auto-renews</Label>
                </div>
                {autoRenews && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">for</Label>
                    <Input
                      type="number"
                      value={renewalTermDays}
                      onChange={(e) => setRenewalTermDays(e.target.value)}
                      placeholder="365"
                      className="w-20"
                    />
                    <Label className="text-sm">days</Label>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewContractOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createContractMutation.mutate()}
                disabled={!title || createContractMutation.isPending || isUploading}
              >
                {isUploading ? "Uploading..." : createContractMutation.isPending ? "Creating..." : "Create Agreement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contracts by Type */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({contracts?.length || 0})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeContracts.length})</TabsTrigger>
          <TabsTrigger value="dpa">DPAs</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ContractsList 
            contracts={contracts || []} 
            isLoading={isLoading}
            onSign={(contract) => {
              setSelectedContract(contract);
              setSignContractOpen(true);
            }}
            onView={(contract) => {
              setSelectedContract(contract);
              setViewContractOpen(true);
            }}
            onDownload={(contract) => {
              if (contract.file_path) {
                downloadFile(contract.file_path, `${contract.title}.pdf`);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <ContractsList 
            contracts={activeContracts} 
            isLoading={isLoading}
            onSign={(contract) => {
              setSelectedContract(contract);
              setSignContractOpen(true);
            }}
            onView={(contract) => {
              setSelectedContract(contract);
              setViewContractOpen(true);
            }}
            onDownload={(contract) => {
              if (contract.file_path) {
                downloadFile(contract.file_path, `${contract.title}.pdf`);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="dpa" className="mt-4">
          <ContractsList 
            contracts={contracts?.filter(c => c.contract_type === 'dpa') || []} 
            isLoading={isLoading}
            onSign={(contract) => {
              setSelectedContract(contract);
              setSignContractOpen(true);
            }}
            onView={(contract) => {
              setSelectedContract(contract);
              setViewContractOpen(true);
            }}
            onDownload={(contract) => {
              if (contract.file_path) {
                downloadFile(contract.file_path, `${contract.title}.pdf`);
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Sign Contract Dialog */}
      <Dialog open={signContractOpen} onOpenChange={setSignContractOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Signed</DialogTitle>
            <DialogDescription>
              Record signature details for: {selectedContract?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Signed By (Name) *</Label>
              <Input
                value={signedBy}
                onChange={(e) => setSignedBy(e.target.value)}
                placeholder="Full name of signer"
              />
            </div>
            <div>
              <Label>Signer Email</Label>
              <Input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>Signer Title</Label>
              <Input
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder="e.g., CEO, General Counsel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignContractOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => signContractMutation.mutate()}
              disabled={!signedBy || signContractMutation.isPending}
            >
              {signContractMutation.isPending ? "Saving..." : "Confirm Signature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={viewContractOpen} onOpenChange={setViewContractOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedContract?.title}</DialogTitle>
            <DialogDescription>
              Agreement details and metadata
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Type</Label>
                  <p className="font-medium">{contractTypeLabels[selectedContract.contract_type]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <Badge className={statusConfig[selectedContract.status].color}>
                    {statusConfig[selectedContract.status].label}
                  </Badge>
                </div>
              </div>

              {(selectedContract.account_name || selectedContract.contact_name) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedContract.account_name && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Vendor Account</Label>
                      <p className="font-medium flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {selectedContract.account_name}
                      </p>
                    </div>
                  )}
                  {selectedContract.contact_name && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Vendor Contact</Label>
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {selectedContract.contact_name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedContract.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p>{selectedContract.description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                {selectedContract.version && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Version</Label>
                    <p>{selectedContract.version}</p>
                  </div>
                )}
                {selectedContract.effective_date && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Effective Date</Label>
                    <p>{format(new Date(selectedContract.effective_date), "PP")}</p>
                  </div>
                )}
                {selectedContract.expiration_date && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Expiration Date</Label>
                    <p>{format(new Date(selectedContract.expiration_date), "PP")}</p>
                  </div>
                )}
              </div>

              {selectedContract.signed_by && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Signature Information</Label>
                  <p className="font-medium">{selectedContract.signed_by}</p>
                  {selectedContract.signer_email && (
                    <p className="text-sm text-muted-foreground">{selectedContract.signer_email}</p>
                  )}
                  {selectedContract.signed_at && (
                    <p className="text-sm text-muted-foreground">
                      Signed on {format(new Date(selectedContract.signed_at), "PPp")}
                    </p>
                  )}
                </div>
              )}

              {selectedContract.file_path && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Document</Label>
                  <Button
                    variant="outline"
                    className="mt-1"
                    onClick={() => {
                      if (selectedContract.file_path) {
                        downloadFile(selectedContract.file_path, `${selectedContract.title}.pdf`);
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Agreement
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewContractOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContractsList({ 
  contracts, 
  isLoading,
  onSign,
  onView,
  onDownload
}: { 
  contracts: Contract[]; 
  isLoading: boolean;
  onSign: (contract: Contract) => void;
  onView: (contract: Contract) => void;
  onDownload: (contract: Contract) => void;
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No agreements found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {contracts.map((contract) => {
        const config = statusConfig[contract.status];
        const StatusIcon = config.icon;
        const isExpiringSoon = contract.days_until_expiration !== null && 
          contract.days_until_expiration <= 30 && 
          contract.days_until_expiration > 0;

        return (
          <Card key={contract.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 
                      className="font-medium cursor-pointer hover:underline"
                      onClick={() => onView(contract)}
                    >
                      {contract.title}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {contractTypeLabels[contract.contract_type]}
                    </Badge>
                    <Badge className={config.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                  {contract.description && (
                    <p className="text-sm text-muted-foreground">{contract.description}</p>
                  )}
                  
                  {/* Vendor Info */}
                  {(contract.account_name || contract.contact_name) && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {contract.account_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {contract.account_name}
                        </span>
                      )}
                      {contract.contact_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {contract.contact_name}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    {contract.version && (
                      <span>Version: {contract.version}</span>
                    )}
                    {contract.effective_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Effective: {format(new Date(contract.effective_date), "PP")}
                      </span>
                    )}
                    {contract.expiration_date && (
                      <span className={`flex items-center gap-1 ${isExpiringSoon ? 'text-orange-600 font-medium' : ''}`}>
                        <Clock className="h-3 w-3" />
                        Expires: {format(new Date(contract.expiration_date), "PP")}
                        {contract.days_until_expiration !== null && contract.days_until_expiration > 0 && (
                          <span className="ml-1">({contract.days_until_expiration} days)</span>
                        )}
                      </span>
                    )}
                    {contract.auto_renews && (
                      <Badge variant="secondary" className="text-xs">Auto-renews</Badge>
                    )}
                  </div>
                  {contract.signed_by && (
                    <p className="text-xs text-muted-foreground">
                      Signed by {contract.signed_by}
                      {contract.signed_at && ` on ${format(new Date(contract.signed_at), "PP")}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onView(contract)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {contract.file_path && (
                    <Button variant="outline" size="sm" onClick={() => onDownload(contract)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {['draft', 'sent', 'pending_signature'].includes(contract.status) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onSign(contract)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Mark Signed
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}