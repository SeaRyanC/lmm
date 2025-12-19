// Common column headers for address data (lowercase for matching)
const KNOWN_HEADERS = new Set([
  'name', 'first name', 'firstname', 'first_name', 'fname',
  'last name', 'lastname', 'last_name', 'lname', 'surname',
  'full name', 'fullname', 'full_name',
  'address', 'address1', 'address 1', 'address_1', 'street', 'street address', 'street_address',
  'address2', 'address 2', 'address_2', 'apt', 'apartment', 'suite', 'unit',
  'city', 'town',
  'state', 'province', 'region',
  'zip', 'zipcode', 'zip code', 'zip_code', 'postal', 'postal code', 'postal_code', 'postcode',
  'country', 'nation',
  'email', 'e-mail', 'email address', 'email_address',
  'phone', 'telephone', 'phone number', 'phone_number', 'tel',
  'company', 'organization', 'org', 'business',
  'title', 'prefix', 'suffix', 'salutation',
  'department', 'dept',
]);

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  hasHeaders: boolean;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return tabCount > commaCount ? '\t' : ',';
}

function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  fields.push(current.trim());
  return fields;
}

function detectHeaders(firstRow: string[]): boolean {
  // Check if any field in the first row matches a known header
  const normalizedRow = firstRow.map(field => field.toLowerCase().trim());
  
  let matchCount = 0;
  for (const field of normalizedRow) {
    if (KNOWN_HEADERS.has(field)) {
      matchCount++;
    }
  }
  
  // If at least 2 fields match known headers or at least 50% match, it's likely a header row
  return matchCount >= 2 || (matchCount > 0 && matchCount >= normalizedRow.length * 0.5);
}

function generateColumnHeaders(count: number): string[] {
  const headers: string[] = [];
  for (let i = 0; i < count; i++) {
    headers.push(`Column${i + 1}`);
  }
  return headers;
}

function normalizeHeader(header: string): string {
  // Convert header to a valid placeholder name
  // Remove special characters, replace spaces with empty string, title case
  const cleaned = header
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim();
  
  // Convert to PascalCase
  const words = cleaned.split(/[\s_-]+/);
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export function parseCSV(text: string): ParsedData {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return { headers: [], rows: [], hasHeaders: false };
  }
  
  const delimiter = detectDelimiter(text);
  const firstRow = parseLine(lines[0] ?? '', delimiter);
  const hasHeaders = detectHeaders(firstRow);
  
  let headers: string[];
  let dataStartIndex: number;
  
  if (hasHeaders) {
    headers = firstRow.map(normalizeHeader);
    dataStartIndex = 1;
  } else {
    headers = generateColumnHeaders(firstRow.length);
    dataStartIndex = 0;
  }
  
  // Ensure unique headers
  const headerCounts = new Map<string, number>();
  headers = headers.map(header => {
    const count = headerCounts.get(header) ?? 0;
    headerCounts.set(header, count + 1);
    return count > 0 ? `${header}${count + 1}` : header;
  });
  
  const rows: Record<string, string>[] = [];
  
  for (let i = dataStartIndex; i < lines.length; i++) {
    const fields = parseLine(lines[i] ?? '', delimiter);
    const row: Record<string, string> = {};
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header !== undefined) {
        row[header] = fields[j] ?? '';
      }
    }
    
    rows.push(row);
  }
  
  return { headers, rows, hasHeaders };
}

export function applyTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/<<([^>]+)>>/g, (match, key: string) => {
    return data[key.trim()] ?? match;
  });
}

export function getPlaceholders(headers: string[]): string[] {
  return headers.map(h => `<<${h}>>`);
}
