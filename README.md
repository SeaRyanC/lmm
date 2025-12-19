# Label Mail Merge

A single-page JavaScript webapp for creating printable labels through mail merge.

![Label Mail Merge Screenshot](https://github.com/user-attachments/assets/4c17628d-2e3c-4803-a46b-5c840c3e43a3)

## Features

- **CSV/TSV Import**: Paste address data directly into the app with automatic header detection
- **Template Design**: Use placeholders like `<<FieldName>>` to create custom label layouts
- **Markdown Support**: Format labels with **bold**, *italic*, and ~~underline~~ text
- **Paper Formats**: Choose from 30+ Avery templates and common row/column layouts for Letter and A4 paper
- **PDF Output**: Generate professional PDF files ready for printing
- **Additional Options**:
  - Cut marks for precise cutting
  - Border lines for testing alignment
  - Configurable font size, padding, and alignment

## Usage

1. **Paste Your Data**: Enter CSV or TSV data in the first text box. Headers are auto-detected.
2. **Design Your Label**: Write your label template using placeholders shown below the input.
3. **Select Paper Format**: Search and select from Avery templates or generic layouts.
4. **Configure Options**: Adjust font size, alignment, borders, and cut marks as needed.
5. **Generate PDF**: Click the button to download your labels as a PDF file.

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build for Development

```bash
npm run build
```

### Build for Production

```bash
npm run deploy
```

This generates optimized files in the `/docs` directory for GitHub Pages deployment.

### Type Checking

```bash
npm run typecheck
```

## Tech Stack

- **TypeScript 5.9** with strict type checking
- **Preact** for reactive UI
- **PDFKit** for PDF generation
- **Marked** for Markdown parsing
- **esbuild** for fast bundling

## License

ISC