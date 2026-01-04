import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Rocket, Shield, History, ArrowRight, 
  FileCheck, Database, RefreshCcw, CheckCircle2 
} from "lucide-react";

interface MigrationWelcomeProps {
  onBegin: () => void;
}

const JOURNEY_STEPS = [
  { 
    number: 1, 
    title: 'Prepare', 
    description: 'Download templates & format your data' 
  },
  { 
    number: 2, 
    title: 'Upload', 
    description: 'Add your CSV files' 
  },
  { 
    number: 3, 
    title: 'Review', 
    description: 'Validate & configure mappings' 
  },
  { 
    number: 4, 
    title: 'Test', 
    description: 'Simulate the import safely' 
  },
  { 
    number: 5, 
    title: 'Import', 
    description: 'Bring your data to CaseWyze' 
  },
];

const BENEFITS = [
  {
    icon: Shield,
    title: 'Your data stays safe',
    description: 'We simulate first before making any changes. Nothing happens until you confirm.',
  },
  {
    icon: History,
    title: 'Full audit trail',
    description: 'Every record is tracked. Know exactly what was imported, when, and by whom.',
  },
  {
    icon: RefreshCcw,
    title: 'Rollback protection',
    description: 'If anything goes wrong, we can reverse the import automatically.',
  },
];

export function MigrationWelcome({ onBegin }: MigrationWelcomeProps) {
  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-2">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Migrate Your Data to CaseWyze
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          We'll guide you through every step. Your existing data will be safely imported 
          without losing any information.
        </p>
      </div>

      {/* Journey Timeline */}
      <Card className="bg-muted/30">
        <CardContent className="py-8">
          <h2 className="text-lg font-semibold text-center mb-6">Your Migration Journey</h2>
          <div className="flex items-start justify-center gap-2 flex-wrap">
            {JOURNEY_STEPS.map((step, index) => (
              <div key={step.number} className="flex items-start">
                <div className="flex flex-col items-center text-center w-[120px]">
                  <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center font-bold text-primary flex-shrink-0">
                    {step.number}
                  </div>
                  <p className="font-medium text-sm mt-2">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
                {index < JOURNEY_STEPS.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground/50 mx-2 flex-shrink-0 hidden sm:block mt-2.5" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <div className="grid md:grid-cols-3 gap-6">
        {BENEFITS.map((benefit) => (
          <Card key={benefit.title} className="border-0 bg-muted/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* What You'll Need */}
      <Card>
        <CardContent className="py-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Before You Start
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Export your data from your current system</p>
                <p className="text-sm text-muted-foreground">
                  Most systems let you export to CSV or Excel format
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">About 15-30 minutes of your time</p>
                <p className="text-sm text-muted-foreground">
                  Depending on how much data you're importing
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">We'll provide everything else</p>
                <p className="text-sm text-muted-foreground">
                  Templates, guides, and step-by-step help along the way
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4 py-4">
        <Button size="lg" onClick={onBegin} className="text-lg px-8 py-6 h-auto">
          <Database className="h-5 w-5 mr-2" />
          Begin Migration
        </Button>
        <p className="text-sm text-muted-foreground">
          You're in good hands — we'll guide you through every step
        </p>
      </div>
    </div>
  );
}
