import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DocumentBlock {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'paragraph' | 'bullet' | 'checklist' | 'hr' | 'table' | 'empty';
  content: string;
  checked?: boolean;
  rows?: string[][];
  headers?: string[];
}

interface GeneratePdfParams {
  title: string;
  category: string;
  content: string;
}

// Parse markdown content into structured blocks
function parseMarkdown(content: string): DocumentBlock[] {
  const lines = content.split('\n');
  const blocks: DocumentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      blocks.push({ type: 'empty', content: '' });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'hr', content: '' });
      i++;
      continue;
    }

    // Headers
    if (trimmed.startsWith('#### ')) {
      blocks.push({ type: 'h4', content: trimmed.slice(5) });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', content: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', content: trimmed.slice(3) });
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', content: trimmed.slice(2) });
      i++;
      continue;
    }

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [trimmed];
      i++;
      
      // Collect all table lines
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (nextLine.startsWith('|') && nextLine.endsWith('|')) {
          tableLines.push(nextLine);
          i++;
        } else {
          break;
        }
      }

      // Parse table
      if (tableLines.length >= 2) {
        const headers = parseTableRow(tableLines[0]);
        const rows: string[][] = [];
        
        // Skip separator row (index 1), process data rows
        for (let j = 2; j < tableLines.length; j++) {
          rows.push(parseTableRow(tableLines[j]));
        }
        
        blocks.push({ type: 'table', content: '', headers, rows });
      }
      continue;
    }

    // Checklist items
    if (/^[-*]\s*\[[ xX☐☑]\]/.test(trimmed) || /^[-*]\s*[☐☑]/.test(trimmed)) {
      const isChecked = /\[[xX☑]\]/.test(trimmed) || trimmed.includes('☑');
      const textContent = trimmed
        .replace(/^[-*]\s*\[[ xX☐☑]\]\s*/, '')
        .replace(/^[-*]\s*[☐☑]\s*/, '');
      blocks.push({ type: 'checklist', content: textContent, checked: isChecked });
      i++;
      continue;
    }

    // Bullet items
    if (/^[-*]\s+/.test(trimmed)) {
      blocks.push({ type: 'bullet', content: trimmed.replace(/^[-*]\s+/, '') });
      i++;
      continue;
    }

    // Numbered list items (treat as bullet)
    if (/^\d+\.\s+/.test(trimmed)) {
      blocks.push({ type: 'bullet', content: trimmed.replace(/^\d+\.\s+/, '') });
      i++;
      continue;
    }

    // Default: paragraph
    blocks.push({ type: 'paragraph', content: trimmed });
    i++;
  }

  return blocks;
}

function parseTableRow(row: string): string[] {
  return row
    .slice(1, -1) // Remove leading/trailing |
    .split('|')
    .map(cell => cell.trim());
}

// Strip markdown formatting for plain text
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // Bold
    .replace(/\*(.+?)\*/g, '$1')       // Italic
    .replace(/_(.+?)_/g, '$1')         // Italic alt
    .replace(/`(.+?)`/g, '$1')         // Inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Links
}

// Draw a checkbox (checked or unchecked) at position
function drawCheckbox(doc: jsPDF, x: number, y: number, checked: boolean, size: number = 3.5): void {
  const oldLineWidth = doc.getLineWidth();
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  
  // Draw square
  doc.rect(x, y - size + 0.5, size, size);
  
  // Draw checkmark if checked
  if (checked) {
    doc.setLineWidth(0.5);
    const padding = 0.7;
    const left = x + padding;
    const right = x + size - padding;
    const top = y - size + 0.5 + padding;
    const bottom = y - padding + 0.5;
    const midX = x + size * 0.4;
    const midY = bottom - 0.3;
    
    // Checkmark stroke
    doc.line(left, top + (bottom - top) * 0.5, midX, bottom - 0.2);
    doc.line(midX, bottom - 0.2, right, top + 0.2);
  }
  
  doc.setLineWidth(oldLineWidth);
}

// Check if a cell contains a checkbox symbol
function cellHasCheckbox(text: string): { hasCheckbox: boolean; checked: boolean } {
  if (text.includes('☑') || text.includes('[x]') || text.includes('[X]')) {
    return { hasCheckbox: true, checked: true };
  }
  if (text.includes('☐') || text.includes('[ ]')) {
    return { hasCheckbox: true, checked: false };
  }
  return { hasCheckbox: false, checked: false };
}

export async function generateDocumentationPdfBlob(params: GeneratePdfParams): Promise<Blob> {
  const { title, category, content } = params;
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to add page if needed
  const checkPageBreak = (neededHeight: number): void => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Render document header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  const titleLines = doc.splitTextToSize(title, contentWidth);
  checkPageBreak(titleLines.length * 8);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 2;

  // Category badge
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Category: ${category}`, margin, y);
  y += 8;

  // Date
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
  y += 10;

  // Horizontal line after header
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Handle empty content
  if (!content || content.trim().length === 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text('No content available for this document.', margin, y);
    return doc.output('blob');
  }

  // Parse and render content
  const blocks = parseMarkdown(content);
  let isFirstH2 = true;

  for (const block of blocks) {
    switch (block.type) {
      case 'h1':
        checkPageBreak(15);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const h1Lines = doc.splitTextToSize(stripMarkdown(block.content), contentWidth);
        doc.text(h1Lines, margin, y);
        y += h1Lines.length * 7 + 6;
        break;

      case 'h2':
        // Page break before h2 (except first)
        if (!isFirstH2) {
          doc.addPage();
          y = margin;
        }
        isFirstH2 = false;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const h2Lines = doc.splitTextToSize(stripMarkdown(block.content), contentWidth);
        doc.text(h2Lines, margin, y);
        y += h2Lines.length * 6 + 5;
        break;

      case 'h3':
        checkPageBreak(12);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const h3Lines = doc.splitTextToSize(stripMarkdown(block.content), contentWidth);
        doc.text(h3Lines, margin, y);
        y += h3Lines.length * 5.5 + 4;
        break;

      case 'h4':
        checkPageBreak(10);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const h4Lines = doc.splitTextToSize(stripMarkdown(block.content), contentWidth);
        doc.text(h4Lines, margin, y);
        y += h4Lines.length * 5 + 3;
        break;

      case 'paragraph':
        checkPageBreak(8);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const pLines = doc.splitTextToSize(stripMarkdown(block.content), contentWidth);
        doc.text(pLines, margin, y);
        y += pLines.length * 5 + 3;
        break;

      case 'bullet':
        checkPageBreak(8);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const bulletText = stripMarkdown(block.content);
        const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 8);
        doc.text('•', margin + 2, y);
        doc.text(bulletLines, margin + 8, y);
        y += bulletLines.length * 5 + 2;
        break;

      case 'checklist':
        checkPageBreak(8);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        // Draw checkbox
        drawCheckbox(doc, margin + 2, y, block.checked || false);
        
        // Draw text
        const checklistText = stripMarkdown(block.content);
        const checklistLines = doc.splitTextToSize(checklistText, contentWidth - 12);
        doc.text(checklistLines, margin + 10, y);
        y += checklistLines.length * 5 + 2;
        break;

      case 'hr':
        checkPageBreak(6);
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
        break;

      case 'table':
        if (block.headers && block.rows) {
          checkPageBreak(20);
          
          // Process table cells to handle checkboxes
          const processedRows = block.rows.map(row => 
            row.map(cell => {
              const { hasCheckbox } = cellHasCheckbox(cell);
              if (hasCheckbox) {
                // Will be replaced with drawn checkbox in didDrawCell
                return cell;
              }
              return stripMarkdown(cell);
            })
          );

          autoTable(doc, {
            startY: y,
            head: [block.headers.map(h => stripMarkdown(h))],
            body: processedRows,
            margin: { left: margin, right: margin },
            styles: {
              fontSize: 9,
              cellPadding: 2,
              textColor: [0, 0, 0],
              lineColor: [200, 200, 200],
              lineWidth: 0.1,
            },
            headStyles: {
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
              fontStyle: 'bold',
            },
            alternateRowStyles: {
              fillColor: [250, 250, 250],
            },
            didDrawCell: (data) => {
              // Handle checkbox cells
              if (data.section === 'body') {
                const cellText = block.rows![data.row.index][data.column.index];
                const { hasCheckbox, checked } = cellHasCheckbox(cellText);
                
                if (hasCheckbox) {
                  // Clear the cell text and draw checkbox instead
                  const cellX = data.cell.x + data.cell.width / 2 - 1.75;
                  const cellY = data.cell.y + data.cell.height / 2 + 1;
                  drawCheckbox(doc, cellX, cellY, checked, 3.5);
                }
              }
            },
            didParseCell: (data) => {
              // Clear text for checkbox cells (we'll draw the checkbox instead)
              if (data.section === 'body') {
                const cellText = block.rows![data.row.index]?.[data.column.index] || '';
                const { hasCheckbox } = cellHasCheckbox(cellText);
                if (hasCheckbox) {
                  data.cell.text = [''];
                }
              }
            },
          });

          // Get final Y position after table
          y = (doc as any).lastAutoTable.finalY + 8;
        }
        break;

      case 'empty':
        y += 2;
        break;
    }
  }

  return doc.output('blob');
}
