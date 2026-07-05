import { PDFDocument } from "pdf-lib";

// Fusionne plusieurs PDF (buffers) en un seul, dans l'ordre donné — utilisé
// pour accoler le PDF de référence importé par l'admin (mode "upload" du
// mandat SEPA) au récapitulatif + preuve de signature générés par LG BOX.
export async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create();
  for (const buffer of buffers) {
    const doc = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return Buffer.from(await merged.save());
}
