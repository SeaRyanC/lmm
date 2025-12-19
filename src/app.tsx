import { useState, useMemo, useCallback } from 'preact/hooks';
import type { FunctionComponent } from 'preact';
import { parseCSV, applyTemplate, getPlaceholders } from './csv-parser';
import { parseMarkdown } from './markdown';
import { paperFormats, searchFormats, type PaperFormat } from './paper-formats';
import { generatePDF, type PDFOptions } from './pdf-generator';

export const App: FunctionComponent = () => {
  // Data input state
  const [csvInput, setCsvInput] = useState<string>('');
  const [template, setTemplate] = useState<string>('<<FirstName>> <<LastName>>\n<<Address>>\n<<City>>, <<State>> <<Zip>>');
  
  // Format selection state
  const [formatSearch, setFormatSearch] = useState<string>('');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('avery-5160');
  const [showFormatDropdown, setShowFormatDropdown] = useState<boolean>(false);
  
  // PDF options
  const [showCutMarks, setShowCutMarks] = useState<boolean>(false);
  const [showBorders, setShowBorders] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(10);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [verticalAlign, setVerticalAlign] = useState<'top' | 'middle' | 'bottom'>('middle');
  const [padding, setPadding] = useState<number>(5);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Parse CSV data
  const parsedData = useMemo(() => {
    if (!csvInput.trim()) {
      return { headers: [], rows: [], hasHeaders: false };
    }
    try {
      return parseCSV(csvInput);
    } catch (e) {
      return { headers: [], rows: [], hasHeaders: false };
    }
  }, [csvInput]);

  // Get available placeholders
  const placeholders = useMemo(() => {
    return getPlaceholders(parsedData.headers);
  }, [parsedData.headers]);

  // Preview using second row (or first if only one row)
  const previewData = useMemo(() => {
    if (parsedData.rows.length === 0) return {};
    // Use second row for preview (index 1) or first row if only one exists
    return parsedData.rows[1] ?? parsedData.rows[0] ?? {};
  }, [parsedData.rows]);

  const previewText = useMemo(() => {
    if (Object.keys(previewData).length === 0) return '';
    return applyTemplate(template, previewData);
  }, [template, previewData]);

  const previewHtml = useMemo(() => {
    if (!previewText) return '';
    return parseMarkdown(previewText);
  }, [previewText]);

  // Filter formats based on search
  const filteredFormats = useMemo(() => {
    return searchFormats(formatSearch);
  }, [formatSearch]);

  const selectedFormat = useMemo(() => {
    return paperFormats.find(f => f.id === selectedFormatId) ?? paperFormats[0];
  }, [selectedFormatId]);

  const handleFormatSelect = useCallback((format: PaperFormat) => {
    setSelectedFormatId(format.id);
    setFormatSearch('');
    setShowFormatDropdown(false);
  }, []);

  const handleGeneratePDF = useCallback(async () => {
    if (!selectedFormat) {
      setError('Please select a paper format');
      return;
    }
    if (parsedData.rows.length === 0) {
      setError('Please enter some data');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const options: PDFOptions = {
        format: selectedFormat,
        template,
        data: parsedData.rows,
        showCutMarks,
        showBorders,
        fontSize,
        fontFamily: 'Helvetica',
        textAlign,
        verticalAlign,
        padding,
      };

      const blob = await generatePDF(options);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'labels.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`Failed to generate PDF: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedFormat, template, parsedData.rows, showCutMarks, showBorders, fontSize, textAlign, verticalAlign, padding]);

  const handlePlaceholderClick = useCallback((placeholder: string) => {
    setTemplate(prev => prev + placeholder);
  }, []);

  return (
    <div class="app">
      <header class="header">
        <h1>📬 Label Mail Merge</h1>
        <p>Create printable labels from your address data</p>
      </header>

      <main class="main">
        <div class="input-section">
          <div class="panel">
            <h2>1. Paste Your Data</h2>
            <p class="help-text">
              Paste CSV or TSV data. Headers will be auto-detected.
            </p>
            <textarea
              class="data-input"
              value={csvInput}
              onInput={(e) => setCsvInput((e.target as HTMLTextAreaElement).value)}
              placeholder="FirstName,LastName,Address,City,State,Zip&#10;John,Doe,123 Main St,Anytown,CA,90210&#10;Jane,Smith,456 Oak Ave,Springfield,IL,62701"
              rows={8}
            />
            {parsedData.headers.length > 0 && (
              <div class="data-info">
                <span class="badge">{parsedData.hasHeaders ? 'Headers detected' : 'No headers detected'}</span>
                <span class="badge">{parsedData.rows.length} record{parsedData.rows.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div class="panel">
            <h2>2. Design Your Label</h2>
            <p class="help-text">
              Use placeholders like <code>&lt;&lt;FieldName&gt;&gt;</code> and Markdown for formatting.
            </p>
            
            {placeholders.length > 0 && (
              <div class="placeholders">
                <span class="label">Available placeholders:</span>
                {placeholders.map(p => (
                  <button
                    key={p}
                    class="placeholder-btn"
                    onClick={() => handlePlaceholderClick(p)}
                    title="Click to insert"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            
            <textarea
              class="template-input"
              value={template}
              onInput={(e) => setTemplate((e.target as HTMLTextAreaElement).value)}
              placeholder="<<FirstName>> <<LastName>>&#10;<<Address>>&#10;<<City>>, <<State>> <<Zip>>"
              rows={5}
            />
            
            <div class="format-help">
              <span class="label">Formatting:</span>
              <code>**bold**</code>
              <code>*italic*</code>
              <code>~~underline~~</code>
            </div>
          </div>
        </div>

        <div class="preview-section">
          <div class="panel">
            <h2>Preview</h2>
            {previewHtml ? (
              <div
                class="preview-content"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div class="preview-empty">
                Enter data and a template to see a preview
              </div>
            )}
          </div>
        </div>

        <div class="settings-section">
          <div class="panel">
            <h2>3. Select Paper Format</h2>
            <div class="format-selector">
              <div class="format-search-container">
                <input
                  type="text"
                  class="format-search"
                  value={formatSearch}
                  onInput={(e) => {
                    setFormatSearch((e.target as HTMLInputElement).value);
                    setShowFormatDropdown(true);
                  }}
                  onFocus={() => setShowFormatDropdown(true)}
                  placeholder="Search formats (e.g., Avery, A4, 30 per sheet)..."
                />
                {showFormatDropdown && (
                  <div class="format-dropdown">
                    {filteredFormats.map(format => (
                      <button
                        key={format.id}
                        class={`format-option ${format.id === selectedFormatId ? 'selected' : ''}`}
                        onClick={() => handleFormatSelect(format)}
                      >
                        <strong>{format.name}</strong>
                        <span>{format.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                class="format-close-btn"
                onClick={() => setShowFormatDropdown(false)}
                style={{ display: showFormatDropdown ? 'block' : 'none' }}
              >
                ✕
              </button>
            </div>
            {selectedFormat && (
              <div class="selected-format">
                <strong>Selected:</strong> {selectedFormat.name} - {selectedFormat.description}
              </div>
            )}
          </div>

          <div class="panel">
            <h2>4. Options</h2>
            <div class="options-grid">
              <label class="option">
                <input
                  type="checkbox"
                  checked={showCutMarks}
                  onChange={(e) => setShowCutMarks((e.target as HTMLInputElement).checked)}
                />
                Show cut marks
              </label>
              <label class="option">
                <input
                  type="checkbox"
                  checked={showBorders}
                  onChange={(e) => setShowBorders((e.target as HTMLInputElement).checked)}
                />
                Show label borders
              </label>
              <label class="option">
                Font size:
                <input
                  type="number"
                  value={fontSize}
                  onInput={(e) => setFontSize(parseInt((e.target as HTMLInputElement).value) || 10)}
                  min={6}
                  max={72}
                  class="number-input"
                />
              </label>
              <label class="option">
                Padding:
                <input
                  type="number"
                  value={padding}
                  onInput={(e) => setPadding(parseInt((e.target as HTMLInputElement).value) || 5)}
                  min={0}
                  max={50}
                  class="number-input"
                />
              </label>
              <label class="option">
                Horizontal:
                <select
                  value={textAlign}
                  onChange={(e) => setTextAlign((e.target as HTMLSelectElement).value as 'left' | 'center' | 'right')}
                  class="select-input"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
              <label class="option">
                Vertical:
                <select
                  value={verticalAlign}
                  onChange={(e) => setVerticalAlign((e.target as HTMLSelectElement).value as 'top' | 'middle' | 'bottom')}
                  class="select-input"
                >
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div class="actions-section">
          {error && <div class="error-message">{error}</div>}
          <button
            class="generate-btn"
            onClick={handleGeneratePDF}
            disabled={isGenerating || parsedData.rows.length === 0}
          >
            {isGenerating ? 'Generating...' : '📄 Generate PDF'}
          </button>
          <p class="records-info">
            {parsedData.rows.length > 0 && selectedFormat && (
              <>
                {parsedData.rows.length} labels across{' '}
                {Math.ceil(parsedData.rows.length / (selectedFormat.columns * selectedFormat.rows))} page
                {Math.ceil(parsedData.rows.length / (selectedFormat.columns * selectedFormat.rows)) !== 1 ? 's' : ''}
              </>
            )}
          </p>
        </div>
      </main>

      <footer class="footer">
        <p>Label Mail Merge - Create labels from CSV/TSV data</p>
      </footer>
    </div>
  );
};
