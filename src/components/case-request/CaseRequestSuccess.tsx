import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, Plus, Home, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CaseRequestSuccessProps {
  requestNumber: string;
  successMessage?: string;
  contactEmail?: string;
  onSubmitAnother?: () => void;
  onReturnHome?: () => void;
}

export function CaseRequestSuccess({
  requestNumber,
  successMessage,
  contactEmail,
  onSubmitAnother,
  onReturnHome,
}: CaseRequestSuccessProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(requestNumber);
      setCopied(true);
      toast.success('Request number copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Card className="max-w-lg mx-auto shadow-lg">
      <CardContent className="py-12 text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl" />
            <CheckCircle2 className="relative h-20 w-20 text-green-500" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold mb-2">Request Submitted Successfully</h2>
        <p className="text-muted-foreground mb-6">
          Your case request has been received and is pending review.
        </p>

        {/* Request Number Box */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-2">Your Request Number</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-mono font-bold text-primary">
              {requestNumber}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 w-8 p-0"
              aria-label="Copy request number"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Email Confirmation Notice */}
        {contactEmail && (
          <p className="text-muted-foreground mb-4">
            A confirmation email has been sent to{' '}
            <strong className="text-foreground">{contactEmail}</strong>
          </p>
        )}

        {/* Success Message */}
        <p className="text-muted-foreground mb-8">
          {successMessage ||
            'Thank you for your submission. We will review your request and get back to you shortly.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onSubmitAnother && (
            <Button onClick={onSubmitAnother} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Submit Another Request
            </Button>
          )}
          {onReturnHome && (
            <Button onClick={onReturnHome}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return
            </Button>
          )}
        </div>

        {/* Additional Help Text */}
        <p className="text-xs text-muted-foreground mt-8">
          Please save your request number for future reference.
        </p>
      </CardContent>
    </Card>
  );
}
