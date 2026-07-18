declare module "pdf-parse" {
  type PdfParseResult = {
    text?: string;
  };

  export default function parsePdf(input: Buffer): Promise<PdfParseResult>;
}
