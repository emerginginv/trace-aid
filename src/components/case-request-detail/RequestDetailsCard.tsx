import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/formatters";

interface RequestDetailsCardProps {
  caseTypeName: string | null;
  caseServices: string[] | null;
  claimNumber: string | null;
  budgetDollars: number | null;
  budgetHours: number | null;
  notesInstructions: string | null;
  customFields: Record<string, unknown> | null;
}

export function RequestDetailsCard({
  caseTypeName,
  caseServices,
  claimNumber,
  budgetDollars,
  budgetHours,
  notesInstructions,
  customFields,
}: RequestDetailsCardProps) {
  const hasBudget = budgetDollars !== null || budgetHours !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Request Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Case Type */}
        {caseTypeName && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Case Type</dt>
            <dd className="mt-1">{caseTypeName}</dd>
          </div>
        )}

        {/* Services */}
        {caseServices && caseServices.length > 0 && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Services Requested</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {caseServices.map((service, idx) => (
                <Badge key={idx} variant="secondary">
                  {service}
                </Badge>
              ))}
            </dd>
          </div>
        )}

        {/* Claim Number */}
        {claimNumber && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Claim Number</dt>
            <dd className="mt-1">{claimNumber}</dd>
          </div>
        )}

        {/* Budget */}
        {hasBudget && (
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Budget</dt>
            <dd className="mt-1">
              {budgetDollars !== null && formatCurrency(budgetDollars)}
              {budgetDollars !== null && budgetHours !== null && ' / '}
              {budgetHours !== null && `${budgetHours} hours`}
            </dd>
          </div>
        )}

        {/* Custom Fields */}
        {customFields && Object.keys(customFields).length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Custom Fields</h4>
              {Object.entries(customFields).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="mt-1">{String(value)}</dd>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Notes/Instructions */}
        {notesInstructions && (
          <>
            <Separator />
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Notes & Instructions</dt>
              <dd className="mt-1 whitespace-pre-wrap">{notesInstructions}</dd>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
