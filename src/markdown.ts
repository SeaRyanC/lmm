import { marked } from 'marked';

// Configure marked for inline use
marked.use({
  gfm: true,
  breaks: true,
});

export function parseMarkdown(text: string): string {
  // Parse markdown to HTML
  return marked.parse(text, { async: false }) as string;
}

// Parse markdown to structured tokens for PDF rendering
export interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  newline: boolean;
}

export function parseMarkdownToSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  
  // Split by lines first
  const lines = text.split('\n');
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] ?? '';
    
    if (lineIndex > 0) {
      segments.push({ text: '', bold: false, italic: false, underline: false, newline: true });
    }
    
    // Process inline formatting
    let remaining = line;
    let currentBold = false;
    let currentItalic = false;
    let currentUnderline = false;
    
    // Simple state machine for markdown parsing
    let buffer = '';
    let i = 0;
    
    while (i < remaining.length) {
      const char = remaining[i];
      const nextChar = remaining[i + 1];
      const nextNextChar = remaining[i + 2];
      
      // Check for bold (** or __)
      if ((char === '*' && nextChar === '*') || (char === '_' && nextChar === '_')) {
        if (buffer) {
          segments.push({
            text: buffer,
            bold: currentBold,
            italic: currentItalic,
            underline: currentUnderline,
            newline: false,
          });
          buffer = '';
        }
        currentBold = !currentBold;
        i += 2;
        continue;
      }
      
      // Check for italic (* or _) but not at word boundaries for _
      if ((char === '*' && nextChar !== '*') || (char === '_' && nextChar !== '_')) {
        // Make sure it's not escaped
        const prevChar = remaining[i - 1];
        if (prevChar !== '\\') {
          if (buffer) {
            segments.push({
              text: buffer,
              bold: currentBold,
              italic: currentItalic,
              underline: currentUnderline,
              newline: false,
            });
            buffer = '';
          }
          currentItalic = !currentItalic;
          i += 1;
          continue;
        }
      }
      
      // Check for underline (~~) - using strikethrough syntax for underline
      if (char === '~' && nextChar === '~') {
        if (buffer) {
          segments.push({
            text: buffer,
            bold: currentBold,
            italic: currentItalic,
            underline: currentUnderline,
            newline: false,
          });
          buffer = '';
        }
        currentUnderline = !currentUnderline;
        i += 2;
        continue;
      }
      
      buffer += char;
      i += 1;
    }
    
    if (buffer) {
      segments.push({
        text: buffer,
        bold: currentBold,
        italic: currentItalic,
        underline: currentUnderline,
        newline: false,
      });
    }
  }
  
  return segments;
}

// Convert markdown to plain text (for simple preview)
export function markdownToPlainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1');
}
