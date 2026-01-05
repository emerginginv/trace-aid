import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { EmailTestForm } from "@/components/EmailTestForm";

interface EmailSettingsTabProps {
  signatureName: string;
  setSignatureName: (value: string) => void;
  signatureTitle: string;
  setSignatureTitle: (value: string) => void;
  signaturePhone: string;
  setSignaturePhone: (value: string) => void;
  signatureEmail: string;
  setSignatureEmail: (value: string) => void;
  senderEmail: string;
  setSenderEmail: (value: string) => void;
  logoUrl: string;
  companyName: string;
  address: string;
  saving: boolean;
  onSave: () => Promise<void>;
}

export const EmailSettingsTab = ({
  signatureName,
  setSignatureName,
  signatureTitle,
  setSignatureTitle,
  signaturePhone,
  setSignaturePhone,
  signatureEmail,
  setSignatureEmail,
  senderEmail,
  setSenderEmail,
  logoUrl,
  companyName,
  address,
  saving,
  onSave,
}: EmailSettingsTabProps) => {
  return (
    <div className="space-y-6">
      {/* Email Sender Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>
            Configure email sender and signature settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Sender Settings</h4>
            <div>
              <Label htmlFor="senderEmail">Verified Sender Email *</Label>
              <Input
                id="senderEmail"
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be verified in Mailjet. Visit{" "}
                <a 
                  href="https://app.mailjet.com/account/sender" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Mailjet Sender Settings
                </a>{" "}
                to verify your domain or email.
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Email Signature</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signatureName">Name</Label>
                <Input
                  id="signatureName"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="signatureTitle">Title</Label>
                <Input
                  id="signatureTitle"
                  value={signatureTitle}
                  onChange={(e) => setSignatureTitle(e.target.value)}
                  placeholder="Case Manager"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signaturePhone">Phone</Label>
                <Input
                  id="signaturePhone"
                  value={signaturePhone}
                  onChange={(e) => setSignaturePhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="signatureEmail">Email</Label>
                <Input
                  id="signatureEmail"
                  type="email"
                  value={signatureEmail}
                  onChange={(e) => setSignatureEmail(e.target.value)}
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-sm font-medium mb-3 block">Preview</Label>
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#333' }}>
                  {logoUrl && (
                    <div style={{ marginBottom: '12px' }}>
                      <img 
                        src={logoUrl} 
                        alt="Company logo" 
                        style={{ height: '40px', width: 'auto' }}
                      />
                    </div>
                  )}
                  {signatureName && (
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {signatureName}
                    </div>
                  )}
                  {signatureTitle && (
                    <div style={{ color: '#666', marginBottom: '8px' }}>
                      {signatureTitle}
                    </div>
                  )}
                  {companyName && (
                    <div style={{ fontWeight: '500', marginBottom: '8px' }}>
                      {companyName}
                    </div>
                  )}
                  {(signaturePhone || signatureEmail) && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
                      {signaturePhone && (
                        <div style={{ marginBottom: '4px' }}>
                          📞 {signaturePhone}
                        </div>
                      )}
                      {signatureEmail && (
                        <div>
                          ✉️ <a href={`mailto:${signatureEmail}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                            {signatureEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  {address && (
                    <div style={{ marginTop: '8px', color: '#666', fontSize: '12px' }}>
                      {address.split('\n').map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
            
          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Signature
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Email Test Form */}
      <EmailTestForm />
    </div>
  );
};

export default EmailSettingsTab;
