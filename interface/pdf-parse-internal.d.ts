declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseOptions = {
    pagerender?: (page: unknown) => Promise<string>;
    max?: number;
    version?: string;
  };

  type PdfParseResult = {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    text: string;
    version: string;
  };

  const parsePdf: (
    data: Buffer | Uint8Array,
    options?: PdfParseOptions,
  ) => Promise<PdfParseResult>;

  export default parsePdf;
}
