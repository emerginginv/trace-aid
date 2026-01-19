import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";

export default function SecurityReport() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    reporter_email: '',
    reporter_name: '',
    description: '',
    steps_to_reproduce: '',
    impact_assessment: ''
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.rpc('submit_security_report', {
        p_reporter_email: data.reporter_email,
        p_reporter_name: data.reporter_name || null,
        p_description: data.description,
        p_steps_to_reproduce: data.steps_to_reproduce || null,
        p_impact_assessment: data.impact_assessment || null
      });
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (error) => console.error('Submit error:', error)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reporter_email || !formData.description) return;
    submitMutation.mutate(formData);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-green-100 dark:bg-green-900/20 w-fit mb-4">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Thank You</CardTitle>
            <CardDescription>
              Your security report has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Our security team will review your submission and respond within 48 hours.
              We appreciate your responsible disclosure.
            </p>
            <Button asChild variant="outline">
              <Link to="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-2xl py-6">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to CaseWyze
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Report a Security Vulnerability</h1>
              <p className="text-muted-foreground">Responsible disclosure program</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8 space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important Guidelines</AlertTitle>
          <AlertDescription className="space-y-1 mt-2">
            <p>• Do not access or modify data belonging to other users</p>
            <p>• Do not perform actions that could disrupt our services</p>
            <p>• Do not publicly disclose the issue before we've addressed it</p>
            <p>• We will acknowledge receipt within 48 hours</p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Vulnerability Details</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help us understand and address the issue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.reporter_email}
                    onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.reporter_name}
                    onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the vulnerability in detail. What is the issue? What component is affected?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="steps">Steps to Reproduce</Label>
                <Textarea
                  id="steps"
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe that..."
                  value={formData.steps_to_reproduce}
                  onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="impact">Impact Assessment</Label>
                <Textarea
                  id="impact"
                  placeholder="What is the potential impact? What data or functionality could be affected?"
                  value={formData.impact_assessment}
                  onChange={(e) => setFormData({ ...formData, impact_assessment: e.target.value })}
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitMutation.isPending || !formData.reporter_email || !formData.description}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>

              {submitMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to submit report. Please try again or email security@caseinformation.app directly.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          For urgent security matters, contact us directly at{' '}
          <a href="mailto:security@caseinformation.app" className="text-primary hover:underline">
            security@caseinformation.app
          </a>
        </p>
      </main>
    </div>
  );
}
