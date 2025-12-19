import PDFDocument from 'pdfkit-browserify';
import type PDFKit from 'pdfkit';
import blobStream from 'blob-stream';
import type { PaperFormat } from './paper-formats';
import { parseMarkdownToSegments, type TextSegment } from './markdown';
import { applyTemplate } from './csv-parser';

type PDFDocumentType = InstanceType<typeof PDFKit>;

export interface PDFOptions {
  format: PaperFormat;
  template: string;
  data: Record<string, string>[];
  showCutMarks: boolean;
  showBorders: boolean;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  padding: number;
}

export async function generatePDF(options: PDFOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const {
      format,
      template,
      data,
      showCutMarks,
      showBorders,
      fontSize,
      padding,
      textAlign,
      verticalAlign,
    } = options;

    // Create PDF with page size from format
    const doc = new PDFDocument({
      size: [format.pageWidth, format.pageHeight],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: false,
    });

    const stream = doc.pipe(blobStream());

    const labelsPerPage = format.columns * format.rows;
    const totalPages = Math.ceil(data.length / labelsPerPage);

    for (let page = 0; page < totalPages; page++) {
      doc.addPage();
      
      const startIndex = page * labelsPerPage;
      
      // Draw cut marks if enabled
      if (showCutMarks) {
        drawCutMarks(doc, format);
      }

      for (let row = 0; row < format.rows; row++) {
        for (let col = 0; col < format.columns; col++) {
          const dataIndex = startIndex + row * format.columns + col;
          if (dataIndex >= data.length) break;

          const record = data[dataIndex];
          if (!record) continue;

          const x = format.marginLeft + col * (format.labelWidth + format.horizontalGap);
          const y = format.marginTop + row * (format.labelHeight + format.verticalGap);

          // Draw border if enabled
          if (showBorders) {
            doc.rect(x, y, format.labelWidth, format.labelHeight)
               .stroke('#CCCCCC');
          }

          // Apply template and render text
          const content = applyTemplate(template, record);
          renderLabelContent(
            doc,
            content,
            x + padding,
            y + padding,
            format.labelWidth - padding * 2,
            format.labelHeight - padding * 2,
            fontSize,
            textAlign,
            verticalAlign
          );
        }
      }
    }

    doc.end();

    stream.on('finish', () => {
      const blob = stream.toBlob('application/pdf');
      resolve(blob);
    });

    stream.on('error', reject);
  });
}

function drawCutMarks(doc: PDFDocumentType, format: PaperFormat): void {
  const markLength = 10;
  const markOffset = 2;
  
  doc.strokeColor('#000000').lineWidth(0.5);

  for (let row = 0; row <= format.rows; row++) {
    for (let col = 0; col <= format.columns; col++) {
      const x = format.marginLeft + col * (format.labelWidth + format.horizontalGap);
      const y = format.marginTop + row * (format.labelHeight + format.verticalGap);

      // Adjust position for gaps
      const adjustedX = col > 0 ? x - format.horizontalGap / 2 : x;
      const adjustedY = row > 0 ? y - format.verticalGap / 2 : y;

      // Top-left corner marks
      if (row === 0 || col === 0) {
        // Horizontal mark
        doc.moveTo(adjustedX - markOffset - markLength, adjustedY)
           .lineTo(adjustedX - markOffset, adjustedY)
           .stroke();
        // Vertical mark
        doc.moveTo(adjustedX, adjustedY - markOffset - markLength)
           .lineTo(adjustedX, adjustedY - markOffset)
           .stroke();
      }

      // Top-right corner marks (last column)
      if (col === format.columns) {
        doc.moveTo(adjustedX + markOffset, adjustedY)
           .lineTo(adjustedX + markOffset + markLength, adjustedY)
           .stroke();
        doc.moveTo(adjustedX, adjustedY - markOffset - markLength)
           .lineTo(adjustedX, adjustedY - markOffset)
           .stroke();
      }

      // Bottom-left corner marks (last row)
      if (row === format.rows) {
        doc.moveTo(adjustedX - markOffset - markLength, adjustedY)
           .lineTo(adjustedX - markOffset, adjustedY)
           .stroke();
        doc.moveTo(adjustedX, adjustedY + markOffset)
           .lineTo(adjustedX, adjustedY + markOffset + markLength)
           .stroke();
      }

      // Bottom-right corner marks
      if (col === format.columns && row === format.rows) {
        doc.moveTo(adjustedX + markOffset, adjustedY)
           .lineTo(adjustedX + markOffset + markLength, adjustedY)
           .stroke();
        doc.moveTo(adjustedX, adjustedY + markOffset)
           .lineTo(adjustedX, adjustedY + markOffset + markLength)
           .stroke();
      }
    }
  }
}

function renderLabelContent(
  doc: PDFDocumentType,
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  textAlign: 'left' | 'center' | 'right',
  verticalAlign: 'top' | 'middle' | 'bottom'
): void {
  const segments = parseMarkdownToSegments(content);
  
  // Calculate total height needed
  const lineHeight = fontSize * 1.2;
  const lines = splitIntoLines(segments, doc, width, fontSize);
  const totalHeight = lines.length * lineHeight;
  
  // Calculate starting Y based on vertical alignment
  let startY = y;
  if (verticalAlign === 'middle') {
    startY = y + (height - totalHeight) / 2;
  } else if (verticalAlign === 'bottom') {
    startY = y + height - totalHeight;
  }

  let currentY = startY;

  for (const line of lines) {
    // Calculate line width for alignment
    let lineWidth = 0;
    for (const segment of line) {
      const font = getFontName(segment.bold, segment.italic);
      doc.font(font).fontSize(fontSize);
      lineWidth += doc.widthOfString(segment.text);
    }

    let currentX = x;
    if (textAlign === 'center') {
      currentX = x + (width - lineWidth) / 2;
    } else if (textAlign === 'right') {
      currentX = x + width - lineWidth;
    }

    for (const segment of line) {
      const font = getFontName(segment.bold, segment.italic);
      doc.font(font).fontSize(fontSize);
      
      if (segment.underline) {
        const textWidth = doc.widthOfString(segment.text);
        doc.text(segment.text, currentX, currentY, { continued: false, lineBreak: false });
        doc.moveTo(currentX, currentY + fontSize)
           .lineTo(currentX + textWidth, currentY + fontSize)
           .stroke();
        currentX += textWidth;
      } else {
        doc.text(segment.text, currentX, currentY, { continued: false, lineBreak: false });
        currentX += doc.widthOfString(segment.text);
      }
    }

    currentY += lineHeight;
  }
}

function getFontName(bold: boolean, italic: boolean): string {
  if (bold && italic) return 'Helvetica-BoldOblique';
  if (bold) return 'Helvetica-Bold';
  if (italic) return 'Helvetica-Oblique';
  return 'Helvetica';
}

function splitIntoLines(
  segments: TextSegment[],
  doc: PDFDocumentType,
  maxWidth: number,
  fontSize: number
): TextSegment[][] {
  const lines: TextSegment[][] = [];
  let currentLine: TextSegment[] = [];
  let currentWidth = 0;

  for (const segment of segments) {
    if (segment.newline) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentWidth = 0;
      continue;
    }

    const font = getFontName(segment.bold, segment.italic);
    doc.font(font).fontSize(fontSize);
    
    const words = segment.text.split(/(\s+)/);
    
    for (const word of words) {
      if (!word) continue;
      
      const wordWidth = doc.widthOfString(word);
      
      if (currentWidth + wordWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      }
      
      // Don't start a line with whitespace
      if (currentLine.length === 0 && word.trim() === '') {
        continue;
      }
      
      currentLine.push({
        text: word,
        bold: segment.bold,
        italic: segment.italic,
        underline: segment.underline,
        newline: false,
      });
      currentWidth += wordWidth;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}
