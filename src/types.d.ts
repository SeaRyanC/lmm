declare module 'pdfkit-browserify' {
  import PDFDocument from 'pdfkit';
  export default PDFDocument;
}

declare module 'blob-stream' {
  interface BlobStream extends NodeJS.WritableStream {
    toBlob(type?: string): Blob;
    toBlobURL(type?: string): string;
  }

  function blobStream(): BlobStream;
  export default blobStream;
}
