import React from "react";
import { format } from "date-fns";

interface PrintableDocumentProps {
  content: string;
  title: string;
  category: string;
}

// Process inline markdown (bold, code)
function processInlineMarkdown(text: string): React.ReactNode {
  let parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} style={{ fontWeight: 600 }}>{part}</strong>;
    }
    const codeParts = part.split(/`(.*?)`/g);
    return codeParts.map((codePart, j) =>
      j % 2 === 1 ? (
        <code
          key={`${i}-${j}`}
          style={{
            backgroundColor: "#f3f4f6",
            padding: "1px 4px",
            borderRadius: "3px",
            fontSize: "0.85em",
            fontFamily: "monospace",
          }}
        >
          {codePart}
        </code>
      ) : (
        codePart
      )
    );
  });
}

export function PrintableDocument({ content, title, category }: PrintableDocumentProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];
  let tableKey = 0;
  let sectionCount = 0;

  // Check if this is a testing/checklist document
  const isTestingDoc = category === "QA & Testing";

  const flushTable = (key: number) => {
    if (tableHeaders.length === 0) return null;

    // For testing docs, add a checkbox column at the start
    const hasCheckboxColumn = isTestingDoc;
    const headers = hasCheckboxColumn ? ["✓", ...tableHeaders, "Notes"] : tableHeaders;
    const rows = hasCheckboxColumn
      ? tableRows.map((row) => ["☐", ...row, ""])
      : tableRows;

    const table = (
      <table
        key={`table-${key}`}
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "12px",
          marginBottom: "16px",
          fontSize: "9pt",
          pageBreakInside: "avoid",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#1e293b", color: "white" }}>
            {headers.map((h, idx) => (
              <th
                key={idx}
                style={{
                  padding: "8px 6px",
                  textAlign: "left",
                  fontWeight: 600,
                  border: "1px solid #374151",
                  fontSize: "8pt",
                  ...(idx === 0 && hasCheckboxColumn ? { width: "30px", textAlign: "center" } : {}),
                  ...(h === "Notes" ? { width: "80px" } : {}),
                }}
              >
                {processInlineMarkdown(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              style={{ backgroundColor: rowIdx % 2 === 0 ? "#ffffff" : "#f8fafc" }}
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  style={{
                    padding: "6px",
                    border: "1px solid #e2e8f0",
                    fontSize: "8pt",
                    verticalAlign: "top",
                    ...(cellIdx === 0 && hasCheckboxColumn
                      ? {
                          textAlign: "center",
                          fontSize: "14pt",
                          fontFamily: "sans-serif",
                        }
                      : {}),
                  }}
                >
                  {processInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );

    // Add section completion checkbox after table for testing docs
    const sectionCheckbox = isTestingDoc ? (
      <div
        key={`section-check-${key}`}
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          paddingTop: "8px",
          borderTop: "1px dashed #cbd5e1",
          fontSize: "9pt",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-block",
              width: "14px",
              height: "14px",
              border: "2px solid #16a34a",
              borderRadius: "2px",
            }}
          />
          All tests passed
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-block",
              width: "14px",
              height: "14px",
              border: "2px solid #dc2626",
              borderRadius: "2px",
            }}
          />
          Issues found (document below)
        </span>
      </div>
    ) : null;

    return (
      <React.Fragment key={`table-wrapper-${key}`}>
        {table}
        {sectionCheckbox}
      </React.Fragment>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Handle tables
    if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
      const cells = trimmedLine
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else if (trimmedLine.includes("---")) {
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
    if (trimmedLine === "---" || trimmedLine === "***") {
      elements.push(
        <hr
          key={i}
          style={{ margin: "20px 0", border: "none", borderTop: "1px solid #e2e8f0" }}
        />
      );
      continue;
    }

    // Handle headers
    if (trimmedLine.startsWith("#### ")) {
      elements.push(
        <h4
          key={i}
          style={{
            fontSize: "10pt",
            fontWeight: 600,
            marginTop: "14px",
            marginBottom: "6px",
            color: "#1e293b",
          }}
        >
          {processInlineMarkdown(trimmedLine.slice(5))}
        </h4>
      );
    } else if (trimmedLine.startsWith("### ")) {
      sectionCount++;
      elements.push(
        <h3
          key={i}
          style={{
            fontSize: "11pt",
            fontWeight: 600,
            marginTop: "18px",
            marginBottom: "10px",
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            pageBreakAfter: "avoid",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              backgroundColor: "#3b82f6",
              color: "white",
              borderRadius: "50%",
              fontSize: "9pt",
              fontWeight: 700,
            }}
          >
            {sectionCount}
          </span>
          {processInlineMarkdown(trimmedLine.slice(4))}
        </h3>
      );
    } else if (trimmedLine.startsWith("## ")) {
      sectionCount = 0; // Reset section count for new major section
      elements.push(
        <h2
          key={i}
          style={{
            fontSize: "14pt",
            fontWeight: 700,
            marginTop: "28px",
            marginBottom: "12px",
            paddingBottom: "6px",
            borderBottom: "2px solid #3b82f6",
            color: "#0f172a",
            pageBreakBefore: i > 10 ? "auto" : "avoid",
          }}
        >
          {processInlineMarkdown(trimmedLine.slice(3))}
        </h2>
      );
    } else if (trimmedLine.startsWith("# ")) {
      // Skip the main title since we handle it in the header
      continue;
    } else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      const bulletText = trimmedLine.slice(2);
      // Handle checkbox syntax
      if (
        bulletText.startsWith("[ ]") ||
        bulletText.startsWith("[x]") ||
        bulletText.startsWith("[X]") ||
        bulletText.startsWith("☐") ||
        bulletText.startsWith("☑")
      ) {
        const isChecked =
          bulletText.startsWith("[x]") ||
          bulletText.startsWith("[X]") ||
          bulletText.startsWith("☑");
        const text = bulletText.replace(/^\[.\]\s*|^☐\s*|^☑\s*/, "");
        elements.push(
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              marginLeft: "16px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                border: "1.5px solid #64748b",
                borderRadius: "2px",
                marginTop: "2px",
                flexShrink: 0,
                backgroundColor: isChecked ? "#3b82f6" : "transparent",
              }}
            />
            <span style={{ fontSize: "9pt", color: "#374151" }}>
              {processInlineMarkdown(text)}
            </span>
          </div>
        );
      } else {
        elements.push(
          <li
            key={i}
            style={{
              marginLeft: "24px",
              marginBottom: "4px",
              fontSize: "9pt",
              color: "#374151",
            }}
          >
            {processInlineMarkdown(bulletText)}
          </li>
        );
      }
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      const text = trimmedLine.replace(/^\d+\.\s*/, "");
      elements.push(
        <li
          key={i}
          style={{
            marginLeft: "24px",
            marginBottom: "4px",
            fontSize: "9pt",
            color: "#374151",
            listStyleType: "decimal",
          }}
        >
          {processInlineMarkdown(text)}
        </li>
      );
    } else if (trimmedLine.length > 0) {
      elements.push(
        <p
          key={i}
          style={{
            marginBottom: "10px",
            fontSize: "9pt",
            color: "#374151",
            lineHeight: 1.5,
          }}
        >
          {processInlineMarkdown(trimmedLine)}
        </p>
      );
    }
  }

  // Flush remaining table
  if (inTable) {
    elements.push(flushTable(tableKey));
  }

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Arial, sans-serif",
        backgroundColor: "#ffffff",
        color: "#1e293b",
        padding: "0",
        maxWidth: "100%",
      }}
    >
      {/* Document Header */}
      <div
        style={{
          borderBottom: "3px solid #3b82f6",
          paddingBottom: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "12px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "18pt",
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                marginBottom: "4px",
              }}
            >
              {title}
            </h1>
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "2px 10px",
                borderRadius: "4px",
                fontSize: "8pt",
                fontWeight: 500,
              }}
            >
              {category}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "8pt", color: "#64748b" }}>
            <div>Generated: {format(new Date(), "MMMM d, yyyy")}</div>
            <div>CaseWyze Documentation</div>
          </div>
        </div>

        {/* Tester Info Section for QA docs */}
        {isTestingDoc && (
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              padding: "12px",
              marginTop: "12px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                fontSize: "9pt",
              }}
            >
              <div>
                <span style={{ fontWeight: 600, color: "#475569" }}>Tester Name:</span>
                <span
                  style={{
                    display: "inline-block",
                    borderBottom: "1px solid #94a3b8",
                    width: "150px",
                    marginLeft: "8px",
                  }}
                >
                  &nbsp;
                </span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "#475569" }}>Date:</span>
                <span
                  style={{
                    display: "inline-block",
                    borderBottom: "1px solid #94a3b8",
                    width: "150px",
                    marginLeft: "8px",
                  }}
                >
                  &nbsp;
                </span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "#475569" }}>Environment:</span>
                <span
                  style={{
                    display: "inline-block",
                    borderBottom: "1px solid #94a3b8",
                    width: "130px",
                    marginLeft: "8px",
                  }}
                >
                  &nbsp;
                </span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "#475569" }}>Version/Build:</span>
                <span
                  style={{
                    display: "inline-block",
                    borderBottom: "1px solid #94a3b8",
                    width: "130px",
                    marginLeft: "8px",
                  }}
                >
                  &nbsp;
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document Content */}
      <div>{elements}</div>

      {/* Final Sign-off Section for QA docs */}
      {isTestingDoc && (
        <div
          style={{
            marginTop: "40px",
            paddingTop: "20px",
            borderTop: "2px solid #3b82f6",
            pageBreakInside: "avoid",
          }}
        >
          <h2
            style={{
              fontSize: "12pt",
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: "16px",
            }}
          >
            Testing Sign-Off
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px",
                border: "2px solid #16a34a",
                borderRadius: "4px",
                backgroundColor: "#f0fdf4",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "18px",
                  border: "2px solid #16a34a",
                  borderRadius: "2px",
                }}
              />
              <span style={{ fontSize: "10pt", fontWeight: 600, color: "#166534" }}>
                READY FOR RELEASE
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px",
                border: "2px solid #ca8a04",
                borderRadius: "4px",
                backgroundColor: "#fefce8",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "18px",
                  border: "2px solid #ca8a04",
                  borderRadius: "2px",
                }}
              />
              <span style={{ fontSize: "10pt", fontWeight: 600, color: "#854d0e" }}>
                NEEDS REVISION
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px",
                border: "2px solid #dc2626",
                borderRadius: "4px",
                backgroundColor: "#fef2f2",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "18px",
                  border: "2px solid #dc2626",
                  borderRadius: "2px",
                }}
              />
              <span style={{ fontSize: "10pt", fontWeight: 600, color: "#991b1b" }}>
                BLOCKED
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              fontSize: "9pt",
            }}
          >
            <div>
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>
                  Tester Signature:
                </span>
                <div
                  style={{
                    borderBottom: "1px solid #94a3b8",
                    height: "30px",
                    marginTop: "4px",
                  }}
                />
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "#475569" }}>Date:</span>
                <span
                  style={{
                    display: "inline-block",
                    borderBottom: "1px solid #94a3b8",
                    width: "120px",
                    marginLeft: "8px",
                  }}
                >
                  &nbsp;
                </span>
              </div>
            </div>
            <div>
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>
                  Reviewer Signature:
                </span>
                <div
                  style={{
                    borderBottom: "1px solid #94a3b8",
                    height: "30px",
                    marginTop: "4px",
                  }}
                />
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "#475569" }}>Date:</span>
                <span
                  style={{
                    display: "inline-block",
                    borderBottom: "1px solid #94a3b8",
                    width: "120px",
                    marginLeft: "8px",
                  }}
                >
                  &nbsp;
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <span style={{ fontWeight: 600, color: "#475569", fontSize: "9pt" }}>
              Notes / Issues Found:
            </span>
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                minHeight: "80px",
                marginTop: "8px",
                backgroundColor: "#f8fafc",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
