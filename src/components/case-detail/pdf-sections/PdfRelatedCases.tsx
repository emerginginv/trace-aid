import { format } from "date-fns";
import { Link2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RelatedCase {
  id: string;
  case_number: string;
  title: string;
  status: string;
  instance_number: number;
  created_at: string | null;
  closed_at: string | null;
}

interface PdfRelatedCasesProps {
  relatedCases: RelatedCase[];
  currentCaseId: string;
}

export function PdfRelatedCases({ relatedCases, currentCaseId }: PdfRelatedCasesProps) {
  if (relatedCases.length === 0) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return <Badge className="bg-emerald-100 text-emerald-700 text-xs">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700 text-xs">In Progress</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>;
      case "closed":
        return <Badge className="bg-slate-100 text-slate-700 text-xs">Closed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="pdf-section mb-6">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        Related Cases ({relatedCases.length})
      </h2>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead className="w-32">Case Number</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-28">Created</TableHead>
            <TableHead className="w-28">Closed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {relatedCases.map((relatedCase) => (
            <TableRow 
              key={relatedCase.id}
              className={relatedCase.id === currentCaseId ? "bg-primary/5" : ""}
            >
              <TableCell className="text-xs text-muted-foreground">
                {relatedCase.instance_number}
              </TableCell>
              <TableCell className="text-sm font-medium">
                {relatedCase.case_number}
                {relatedCase.id === currentCaseId && (
                  <span className="text-xs text-muted-foreground ml-1">(current)</span>
                )}
              </TableCell>
              <TableCell className="text-sm truncate max-w-[200px]">
                {relatedCase.title}
              </TableCell>
              <TableCell>{getStatusBadge(relatedCase.status)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {relatedCase.created_at && format(new Date(relatedCase.created_at), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {relatedCase.closed_at ? format(new Date(relatedCase.closed_at), "MMM d, yyyy") : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
