declare module "pdf-parse" {
  type PdfParseResult = {
    text?: string;
  };

  export default function parsePdf(input: Buffer): Promise<PdfParseResult>;
}

declare module "pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js" {
  const pdfJs: unknown;

  export default pdfJs;
}
