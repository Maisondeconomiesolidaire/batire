/** PDF et calculs partagés avec le serveur (envoi automatique des factures). */
export * from "../../convex/lib/batireBillingPdf";
import { buildBillingPdf, type BillingDocForPdf } from "../../convex/lib/batireBillingPdf";

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

export async function downloadBillingPdf(doc: BillingDocForPdf, existing?: Uint8Array) {
  const bytes = existing ?? await buildBillingPdf(doc);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${doc.number}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
