import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { 
  Shield, Lock, FileCheck, Server, Users, AlertTriangle, 
  CheckCircle, ExternalLink, ArrowLeft
} from "lucide-react";

interface TrustSection {
  id: string;
  section: string;
  title: string;
  content_markdown: string;
  display_order: number;
  is_visible: boolean;
}

const sectionIcons: Record<string, React.ReactNode> = {
  security: <Shield className="h-6 w-6" />,
  compliance: <FileCheck className="h-6 w-6" />,
  data_handling: <Lock className="h-6 w-6" />,
  availability: <Server className="h-6 w-6" />,
  subprocessors: <Users className="h-6 w-6" />,
  incidents: <AlertTriangle className="h-6 w-6" />,
};

// Simple markdown-to-HTML converter for Trust Center content
function renderMarkdown(markdown: string): React.ReactNode {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];

  const processInlineMarkdown = (text: string): React.ReactNode => {
    // Handle bold
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => 
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Handle tables
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      const cells = trimmedLine.slice(1, -1).split('|').map(c => c.trim());
      
      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else if (trimmedLine.includes('---')) {
        // Skip separator row
        continue;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      // End of table
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                {tableHeaders.map((h, idx) => (
                  <th key={idx} className="text-left p-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="p-3">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableRows = [];
      tableHeaders = [];
    }

    // Handle headers
    if (trimmedLine.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-lg font-semibold mt-6 mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-primary" />
          {trimmedLine.slice(3)}
        </h3>
      );
    } else if (trimmedLine.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="text-xl font-bold mt-6 mb-4">{trimmedLine.slice(2)}</h2>
      );
    } else if (trimmedLine.startsWith('- ')) {
      elements.push(
        <li key={i} className="ml-4 mb-2 flex items-start gap-2">
          <span className="text-primary mt-1">•</span>
          <span>{processInlineMarkdown(trimmedLine.slice(2))}</span>
        </li>
      );
    } else if (trimmedLine.length > 0 && !trimmedLine.startsWith('|')) {
      elements.push(
        <p key={i} className="mb-3 text-muted-foreground leading-relaxed">
          {processInlineMarkdown(trimmedLine)}
        </p>
      );
    }
  }

  // Handle remaining table
  if (inTable && tableRows.length > 0) {
    elements.push(
      <div key="table-end" className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              {tableHeaders.map((h, idx) => (
                <th key={idx} className="text-left p-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="p-3">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <div className="prose-content">{elements}</div>;
}

export default function TrustCenter() {
  // Fetch public trust center content
  const { data: sections, isLoading } = useQuery({
    queryKey: ['trust-center-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trust_center_config')
        .select('*')
        .eq('is_visible', true)
        .order('display_order');
      
      if (error) throw error;
      return data as TrustSection[];
    }
  });

  // Get most recent update time
  const lastUpdated = sections?.reduce((latest, section) => {
    const sectionDate = new Date(section.id); // Use created_at if available
    return latest;
  }, new Date(0));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-5xl py-8">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to CaseWyze
            </Link>
            <Button variant="outline" asChild>
              <Link to="/auth">
                Sign In
                <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Trust Center</h1>
              <p className="text-muted-foreground">
                Security, privacy, and compliance at CaseWyze
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              SOC 2 Readiness
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Encrypted
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Multi-Tenant Isolation
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <ExternalLink className="h-3 w-3" />
              Scoped Integrations
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Third-party integrations are permission-scoped. Customers control installation and revocation. 
            Integration activity is logged and auditable.
          </p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-muted/30 sticky top-0 z-10">
        <div className="container max-w-5xl py-3">
          <div className="flex gap-2 overflow-x-auto">
            {sections?.map((section) => (
              <a
                key={section.section}
                href={`#${section.section}`}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-accent whitespace-nowrap transition-colors"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container max-w-5xl py-8">
        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {sections?.map((section) => (
              <Card key={section.id} id={section.section} className="scroll-mt-20">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {sectionIcons[section.section] || <Shield className="h-6 w-6" />}
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderMarkdown(section.content_markdown)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Separator className="my-12" />

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground space-y-4">
          <div className="flex items-center justify-center gap-6">
            <Link to="/status" className="hover:text-foreground">System Status</Link>
            <span>•</span>
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-foreground">Terms of Service</a>
            <span>•</span>
            <a href="mailto:security@casewyze.com" className="hover:text-foreground">security@casewyze.com</a>
          </div>
          <p>
            We communicate service disruptions transparently via our{' '}
            <Link to="/status" className="text-primary hover:underline">public status page</Link>.
          </p>
          <p>
            Enterprise audit exports available. Time-scoped, organization-isolated reporting.
          </p>
          <p>
            Last updated: {format(new Date(), 'MMMM yyyy')}
          </p>
          <p className="text-xs">
            For organization-specific compliance details,{' '}
            <Link to="/auth" className="text-primary hover:underline">
              sign in to your account
            </Link>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
