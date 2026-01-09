import { forwardRef } from "react";
import type { CaseSummaryData } from "@/lib/caseSummaryData";
import {
  PdfCaseHeader,
  PdfGeneralInfo,
  PdfSubjectCards,
  PdfBudgetSummary,
  PdfFinancialSummary,
  PdfActivitiesTimeline,
  PdfUpdatesSection,
  PdfAttachmentsList,
  PdfRelatedCases,
} from "./pdf-sections";

interface CaseSummaryContentProps {
  data: CaseSummaryData;
  sections: {
    generalInfo: boolean;
    subjects: boolean;
    budget: boolean;
    financials: boolean;
    activities: boolean;
    updates: boolean;
    attachments: boolean;
    relatedCases: boolean;
  };
}

export const CaseSummaryContent = forwardRef<HTMLDivElement, CaseSummaryContentProps>(
  ({ data, sections }, ref) => {
    return (
      <div 
        ref={ref}
        className="pdf-content bg-background text-foreground p-8 max-w-[8.5in] mx-auto"
        style={{ 
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "12px",
          lineHeight: "1.5",
        }}
      >
        {/* Header - Always shown */}
        <PdfCaseHeader
          caseNumber={data.case.case_number}
          title={data.case.title}
          status={data.case.status}
          logoUrl={data.organizationSettings?.logo_url || null}
          companyName={data.organizationSettings?.company_name || null}
        />

        {/* General Info */}
        {sections.generalInfo && (
          <PdfGeneralInfo
            account={data.account}
            contact={data.contact}
            caseManager={data.caseManager}
            investigators={data.investigators}
            dueDate={data.case.due_date}
            createdAt={data.case.created_at}
            closedAt={data.case.closed_at}
            referenceNumber={data.case.reference_number}
            expedited={data.case.expedited}
            feeWaiver={data.case.fee_waiver}
            purposeOfRequest={data.case.purpose_of_request}
          />
        )}

        {/* Subjects */}
        {sections.subjects && data.subjects.length > 0 && (
          <PdfSubjectCards subjects={data.subjects} />
        )}

        {/* Budget Summary */}
        {sections.budget && (
          <PdfBudgetSummary 
            budgetSummary={data.budgetSummary} 
            budgetNotes={data.case.budget_notes}
          />
        )}

        {/* Updates & Notes */}
        {sections.updates && (
          <PdfUpdatesSection 
            updates={data.updates} 
            caseDescription={data.case.description}
          />
        )}

        {/* Financial Summary */}
        {sections.financials && (
          <PdfFinancialSummary
            timeEntries={data.timeEntries}
            expenses={data.expenses}
            invoices={data.invoices}
          />
        )}

        {/* Activities Timeline */}
        {sections.activities && data.activities.length > 0 && (
          <PdfActivitiesTimeline activities={data.activities} />
        )}

        {/* Attachments List */}
        {sections.attachments && data.attachments.length > 0 && (
          <PdfAttachmentsList attachments={data.attachments} />
        )}

        {/* Related Cases */}
        {sections.relatedCases && data.relatedCases.length > 0 && (
          <PdfRelatedCases 
            relatedCases={data.relatedCases} 
            currentCaseId={data.case.id}
          />
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground">
          <p>
            {data.organizationSettings?.company_name || "Case Management System"}
            {data.organizationSettings?.phone && ` • ${data.organizationSettings.phone}`}
            {data.organizationSettings?.email && ` • ${data.organizationSettings.email}`}
          </p>
          <p className="mt-1">
            This document is confidential and intended for authorized recipients only.
          </p>
        </div>
      </div>
    );
  }
);

CaseSummaryContent.displayName = "CaseSummaryContent";
