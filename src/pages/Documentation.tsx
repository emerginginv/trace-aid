import React, { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  ChevronRight, 
  CheckCircle2, 
  ClipboardList,
  BookOpen,
  Shield,
  Users,
  FileCheck,
  Loader2
} from "lucide-react";
import html2pdf from "html2pdf.js";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PrintableDocument } from "@/components/documentation/PrintableDocument";

// Documentation files available for viewing/download
const DOCUMENTATION_FILES = [
  {
    id: "system-testing",
    title: "System Testing & Validation Checklist",
    description: "Complete 16-section QA checklist for validating CaseWyze functionality",
    icon: ClipboardList,
    category: "QA & Testing",
    path: "/docs/SYSTEM_TESTING_CHECKLIST.md"
  },
  {
    id: "case-request-testing",
    title: "Case Request Testing Guide",
    description: "Testing procedures for case request intake and review workflows",
    icon: FileCheck,
    category: "QA & Testing",
    path: "/docs/CASE_REQUEST_TESTING.md"
  },
  {
    id: "permissions-access",
    title: "Permissions & Access Control",
    description: "Reference guide for user roles, permissions, and access control",
    icon: Shield,
    category: "Reference",
    path: "/PERMISSIONS_ACCESS_CONTROL_HELP.md"
  },
  {
    id: "case-lifecycle",
    title: "Case Lifecycle Guidance",
    description: "Understanding case phases, statuses, and workflow progression",
    icon: BookOpen,
    category: "Reference",
    path: "/CASE_LIFECYCLE_GUIDANCE.md"
  },
  {
    id: "first-time-guidance",
    title: "First-Time User Guidance",
    description: "Onboarding guide for new CaseWyze users",
    icon: Users,
    category: "Onboarding",
    path: "/FIRST_TIME_GUIDANCE_HELP.md"
  }
];

// Markdown renderer component
function MarkdownRenderer({ content, forPrint = false }: { content: string; forPrint?: boolean }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];
  let tableKey = 0;

  const processInlineMarkdown = (text: string): React.ReactNode => {
    // Handle bold, italic, and code
    let parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i}>{part}</strong>;
      }
      // Handle inline code
      const codeParts = part.split(/`(.*?)`/g);
      return codeParts.map((codePart, j) => 
        j % 2 === 1 ? <code key={`${i}-${j}`} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{codePart}</code> : codePart
      );
    });
  };

  const flushTable = (key: number) => {
    if (tableHeaders.length === 0) return null;
    
    const table = (
      <div key={`table-${key}`} className={cn(
        "overflow-x-auto my-4",
        forPrint && "break-inside-avoid"
      )}>
        <table className={cn(
          "w-full text-sm border-collapse border border-border",
          forPrint && "text-xs"
        )}>
          <thead>
            <tr className="bg-muted/50">
              {tableHeaders.map((h, idx) => (
                <th key={idx} className="text-left p-2 font-semibold border border-border text-xs">
                  {processInlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="p-2 border border-border text-xs">
                    {processInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    
    return table;
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
        continue;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      elements.push(flushTable(tableKey++));
      inTable = false;
      tableRows = [];
      tableHeaders = [];
    }

    // Handle horizontal rules
    if (trimmedLine === '---' || trimmedLine === '***') {
      elements.push(<hr key={i} className="my-6 border-border" />);
      continue;
    }

    // Handle headers
    if (trimmedLine.startsWith('#### ')) {
      elements.push(
        <h4 key={i} className={cn(
          "text-sm font-semibold mt-4 mb-2 text-foreground",
          forPrint && "text-xs mt-3 mb-1"
        )}>
          {processInlineMarkdown(trimmedLine.slice(5))}
        </h4>
      );
    } else if (trimmedLine.startsWith('### ')) {
      elements.push(
        <h3 key={i} className={cn(
          "text-base font-semibold mt-5 mb-3 flex items-center gap-2 text-foreground",
          forPrint && "text-sm mt-4 mb-2"
        )}>
          <CheckCircle2 className={cn("h-4 w-4 text-primary", forPrint && "h-3 w-3")} />
          {processInlineMarkdown(trimmedLine.slice(4))}
        </h3>
      );
    } else if (trimmedLine.startsWith('## ')) {
      elements.push(
        <h2 key={i} className={cn(
          "text-lg font-bold mt-8 mb-4 pb-2 border-b border-border text-foreground",
          forPrint && "text-base mt-6 mb-3 break-before-auto"
        )}>
          {processInlineMarkdown(trimmedLine.slice(3))}
        </h2>
      );
    } else if (trimmedLine.startsWith('# ')) {
      elements.push(
        <h1 key={i} className={cn(
          "text-2xl font-bold mt-6 mb-4 text-foreground",
          forPrint && "text-xl mt-4 mb-3"
        )}>
          {processInlineMarkdown(trimmedLine.slice(2))}
        </h1>
      );
    } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      // Bullet list item
      const bulletText = trimmedLine.slice(2);
      // Check for checkbox syntax
      if (bulletText.startsWith('[ ]') || bulletText.startsWith('[x]') || bulletText.startsWith('[X]') || bulletText.startsWith('☐') || bulletText.startsWith('☑')) {
        const isChecked = bulletText.startsWith('[x]') || bulletText.startsWith('[X]') || bulletText.startsWith('☑');
        const text = bulletText.replace(/^\[.\]\s*|^☐\s*|^☑\s*/, '');
        elements.push(
          <div key={i} className="flex items-start gap-2 ml-4 mb-1">
            <span className={cn(
              "inline-block w-4 h-4 border rounded mt-0.5 flex-shrink-0",
              isChecked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
            )}>
              {isChecked && <CheckCircle2 className="h-4 w-4" />}
            </span>
            <span className={cn("text-sm text-muted-foreground", forPrint && "text-xs")}>
              {processInlineMarkdown(text)}
            </span>
          </div>
        );
      } else {
        elements.push(
          <li key={i} className={cn(
            "ml-6 mb-1 text-sm text-muted-foreground list-disc",
            forPrint && "text-xs"
          )}>
            {processInlineMarkdown(bulletText)}
          </li>
        );
      }
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      // Numbered list
      const text = trimmedLine.replace(/^\d+\.\s*/, '');
      elements.push(
        <li key={i} className={cn(
          "ml-6 mb-1 text-sm text-muted-foreground list-decimal",
          forPrint && "text-xs"
        )}>
          {processInlineMarkdown(text)}
        </li>
      );
    } else if (trimmedLine.length > 0) {
      elements.push(
        <p key={i} className={cn(
          "mb-3 text-sm text-muted-foreground leading-relaxed",
          forPrint && "text-xs mb-2"
        )}>
          {processInlineMarkdown(trimmedLine)}
        </p>
      );
    }
  }

  // Flush any remaining table
  if (inTable) {
    elements.push(flushTable(tableKey));
  }

  return <div className="documentation-content">{elements}</div>;
}

export default function Documentation() {
  useSetBreadcrumbs([{ label: "Documentation" }]);
  
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedDocInfo = DOCUMENTATION_FILES.find(d => d.id === selectedDoc);

  const loadDocument = async (docId: string) => {
    const doc = DOCUMENTATION_FILES.find(d => d.id === docId);
    if (!doc) return;

    setLoading(true);
    setSelectedDoc(docId);
    
    try {
      const response = await fetch(doc.path);
      if (response.ok) {
        const text = await response.text();
        setContent(text);
      } else {
        setContent("# Document Not Found\n\nThis document could not be loaded.");
      }
    } catch (error) {
      console.error("Error loading document:", error);
      setContent("# Error Loading Document\n\nThere was an error loading this document.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!selectedDocInfo || !content) return;
    
    setDownloading(true);
    
    try {
      // Create a temporary container for the print-optimized version
      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.left = '-9999px';
      printContainer.style.top = '0';
      printContainer.style.width = '210mm'; // A4 width
      printContainer.style.backgroundColor = '#ffffff';
      document.body.appendChild(printContainer);

      // Render the print-optimized component
      const root = createRoot(printContainer);
      root.render(
        <PrintableDocument 
          content={content} 
          title={selectedDocInfo.title} 
          category={selectedDocInfo.category}
        />
      );

      // Wait for React to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const filename = `${selectedDocInfo.title.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      await (html2pdf() as any)
        .set({
          margin: [12, 12, 16, 12], // top, left, bottom, right - extra bottom for page numbers
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        })
        .from(printContainer)
        .save();

      // Cleanup
      root.unmount();
      document.body.removeChild(printContainer);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setDownloading(false);
    }
  };

  const categories = [...new Set(DOCUMENTATION_FILES.map(d => d.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
          <p className="text-muted-foreground">
            View and download system documentation, testing checklists, and reference guides
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Available Documents</CardTitle>
            <CardDescription>Select a document to view</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {categories.map(category => (
                <div key={category}>
                  <div className="px-4 py-2 bg-muted/50 border-y border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {category}
                    </span>
                  </div>
                  {DOCUMENTATION_FILES.filter(d => d.category === category).map(doc => {
                    const Icon = doc.icon;
                    const isSelected = selectedDoc === doc.id;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => loadDocument(doc.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 border-b border-border transition-colors",
                          "hover:bg-muted/50",
                          isSelected && "bg-primary/10 border-l-2 border-l-primary"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={cn(
                            "h-5 w-5 mt-0.5 flex-shrink-0",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{doc.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {doc.description}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Document Viewer */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedDocInfo?.title || "Select a Document"}
              </CardTitle>
              {selectedDocInfo && (
                <CardDescription className="mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {selectedDocInfo.category}
                  </Badge>
                </CardDescription>
              )}
            </div>
            {selectedDocInfo && (
              <Button 
                onClick={downloadPdf} 
                disabled={downloading || loading}
                className="gap-2"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PDF
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : content ? (
                <div ref={printRef} className="p-6 bg-background">
                  <MarkdownRenderer content={content} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Select a document from the list to view its contents
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    You can download any document as a PDF for offline use
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
