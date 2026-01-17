import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface PdfCaseHeaderProps {
  caseNumber: string;
  title: string;
  status: string;
  statusCategory?: string; // Category name (New, Open, Complete, Closed)
  showExactStatus?: boolean; // Whether to show exact status or category only
  logoUrl: string | null;
  companyName: string | null;
}

export function PdfCaseHeader({ 
  caseNumber, 
  title, 
  status, 
  statusCategory,
  showExactStatus = true,
  logoUrl, 
  companyName 
}: PdfCaseHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "in_progress":
      case "in progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending":
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "complete":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "closed":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  // Display status or category based on permission
  const displayStatus = showExactStatus ? status : (statusCategory || getCategoryFromStatus(status));
  
  // Helper to derive category from status name
  function getCategoryFromStatus(statusName: string): string {
    const lowerStatus = statusName.toLowerCase();
    if (lowerStatus.includes('new') || lowerStatus.includes('pending') || lowerStatus.includes('draft')) {
      return 'New';
    }
    if (lowerStatus.includes('open') || lowerStatus.includes('active') || lowerStatus.includes('investigation') || lowerStatus.includes('review')) {
      return 'Open';
    }
    if (lowerStatus.includes('complete') || lowerStatus.includes('finished') || lowerStatus.includes('delivered')) {
      return 'Complete';
    }
    if (lowerStatus.includes('closed') || lowerStatus.includes('cancelled') || lowerStatus.includes('archived')) {
      return 'Closed';
    }
    return 'Open';
  }

  return (
    <div className="pdf-header border-b-2 border-primary pb-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={companyName || "Company Logo"} 
              className="h-12 w-auto object-contain"
              crossOrigin="anonymous"
            />
          ) : companyName ? (
            <div className="text-xl font-bold text-primary">{companyName}</div>
          ) : null}
        </div>
        <Badge className={`text-sm px-3 py-1 ${getStatusColor(displayStatus)}`}>
          {displayStatus.replace(/_/g, " ").toUpperCase()}
        </Badge>
      </div>
      
      <div className="mt-4">
        <h1 className="text-2xl font-bold text-foreground">CASE SUMMARY</h1>
        <div className="flex items-baseline gap-4 mt-1">
          <span className="text-lg font-semibold text-primary">{caseNumber}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-lg text-foreground">{title}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Generated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
        </p>
      </div>
    </div>
  );
}
