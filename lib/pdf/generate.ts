import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

export async function renderPdfBuffer(document: ReactElement<DocumentProps>): Promise<Buffer> {
  return renderToBuffer(document);
}
