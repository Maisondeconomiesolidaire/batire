import { useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { QrCode } from "../ui/QrCode";
import { escapeHtml, printIsolatedDocument, qrSvgMarkup } from "../../lib/printLabels";

/**
 * Impression des étiquettes QR du dépôt.
 *
 * Une étiquette porte le code ET sa référence en clair : sur un lot posé en
 * hauteur ou dans une allée, l'équipe lit le numéro sans sortir de téléphone,
 * et ne scanne que pour ouvrir la fiche.
 */
export interface QrLabelItem {
  /** Référence lisible imprimée à côté du code (BT-1042). */
  reference: string;
  /** Ce que le QR code encode : l'URL de la fiche. */
  value: string;
  /** Matériau rattaché, imprimé en petit sous la référence. */
  caption?: string;
}

/** « brother » = une étiquette 62 × 29 mm par page. « a4 » = planche A4. */
type Sheet = "brother" | "a4";

const LABEL_WIDTH_MM = 62;
const LABEL_HEIGHT_MM = 29;
/** Le rouleau DK 62 mm a une bande non imprimable d'environ 1 mm par bord. */
const LABEL_PADDING_MM = 1.5;
const GAP_MM = 2;

const USABLE_HEIGHT_MM = LABEL_HEIGHT_MM - LABEL_PADDING_MM * 2;
/** Le QR occupe toute la hauteur utile : c'est lui qu'on doit pouvoir scanner. */
const LABEL_QR_SIZE_MM = USABLE_HEIGHT_MM;

const A4_COLUMNS = 4;
const A4_QR_SIZE_MM = 32;

export function PrintQrLabels({
  items,
  title = "QR codes Bâtire",
  onClose,
}: {
  items: QrLabelItem[];
  title?: string;
  onClose: () => void;
}) {
  const [sheet, setSheet] = useState<Sheet>("brother");
  const brother = sheet === "brother";

  const content = (
    <div className="fixed inset-0 z-[400] flex flex-col bg-[var(--background)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-sm font-bold">
            {items.length} étiquette{items.length > 1 ? "s" : ""} à imprimer
          </h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            {brother
              ? `Brother QL-700 · ${LABEL_WIDTH_MM} × ${LABEL_HEIGHT_MM} mm · une étiquette par page`
              : `Planche A4 · ${A4_COLUMNS} étiquettes par ligne`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-[var(--border)] p-0.5">
            {(
              [
                ["brother", `QL-700 ${LABEL_WIDTH_MM}×${LABEL_HEIGHT_MM}`],
                ["a4", "Planche A4"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSheet(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  sheet === value
                    ? "bg-brand-600 text-white"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => (brother ? printBrotherLabels(items, title) : printA4Sheet(items, title))}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            <Printer className="h-4 w-4" /> Imprimer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2.5 text-[var(--muted-foreground)] transition hover:bg-[var(--accent)]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Aperçu à taille réelle : ce qui sort du rouleau est ce qu'on voit. */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div
          className={
            brother
              ? "mx-auto flex max-w-5xl flex-wrap justify-center gap-4"
              : "mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          }
        >
          {items.map((item) => (
            <div
              key={item.reference}
              className="rounded-lg border border-[var(--border)] bg-white shadow-sm"
            >
              <LabelPreview item={item} sizeMm={brother ? LABEL_QR_SIZE_MM : A4_QR_SIZE_MM} full={brother} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* ─── Impression ─────────────────────────────────────────────────────────── */

function labelHtml(item: QrLabelItem, sizeMm: number) {
  return `${qrSvgMarkup(item.value, sizeMm)}
    <span class="text">
      <span class="ref">${escapeHtml(item.reference)}</span>
      ${item.caption ? `<span class="caption">${escapeHtml(item.caption)}</span>` : ""}
    </span>`;
}

const TEXT_CSS = `
  .text { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
  .ref {
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-weight: 700;
    font-size: 12pt;
    letter-spacing: -0.02em;
    white-space: nowrap;
  }
  .caption {
    font-size: 7pt;
    line-height: 1.2;
    margin-top: 1mm;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
`;

/** Une étiquette 62 × 29 mm par page : QR à gauche, référence à droite. */
function printBrotherLabels(items: QrLabelItem[], title: string) {
  printIsolatedDocument({
    title,
    pageCss: `@page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }`,
    bodyCss: `
      .page {
        width: ${LABEL_WIDTH_MM}mm;
        height: ${LABEL_HEIGHT_MM}mm;
        box-sizing: border-box;
        padding: ${LABEL_PADDING_MM}mm;
        overflow: hidden;
        display: flex;
        align-items: center;
        gap: ${GAP_MM}mm;
        page-break-after: always;
        break-after: page;
      }
      .page:last-child { page-break-after: auto; break-after: auto; }
      ${TEXT_CSS}
    `,
    bodyHtml: items
      .map((item) => `<section class="page">${labelHtml(item, LABEL_QR_SIZE_MM)}</section>`)
      .join(""),
  });
}

/** Planche A4 : plusieurs étiquettes par ligne, à découper. */
function printA4Sheet(items: QrLabelItem[], title: string) {
  printIsolatedDocument({
    title,
    pageCss: "@page { size: A4; margin: 8mm; }",
    bodyCss: `
      .sheet { display: grid; grid-template-columns: repeat(${A4_COLUMNS}, 1fr); }
      .card {
        border: 0.5pt solid #ccc;
        padding: 3mm;
        box-sizing: border-box;
        page-break-inside: avoid;
        break-inside: avoid;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1.5mm;
      }
      .card .text { align-items: center; }
      ${TEXT_CSS}
    `,
    bodyHtml: `<div class="sheet">${items
      .map((item) => `<div class="card">${labelHtml(item, A4_QR_SIZE_MM)}</div>`)
      .join("")}</div>`,
  });
}

/* ─── Aperçu écran ───────────────────────────────────────────────────────── */

function LabelPreview({
  item,
  sizeMm,
  full,
}: {
  item: QrLabelItem;
  sizeMm: number;
  full: boolean;
}) {
  return (
    <div
      className={`flex bg-white text-black ${full ? "items-center" : "flex-col items-center p-3 text-center"}`}
      style={
        full
          ? {
              width: `${LABEL_WIDTH_MM}mm`,
              height: `${LABEL_HEIGHT_MM}mm`,
              padding: `${LABEL_PADDING_MM}mm`,
              gap: `${GAP_MM}mm`,
              boxSizing: "border-box",
              overflow: "hidden",
            }
          : { gap: "1.5mm" }
      }
    >
      <QrCode value={item.value} size={`${sizeMm}mm`} margin={4} className="shrink-0 text-black" />
      <span className={`flex min-w-0 flex-col justify-center ${full ? "" : "items-center"}`}>
        <span className="font-mono text-[12pt] font-bold leading-none tracking-tight">
          {item.reference}
        </span>
        {item.caption ? (
          <span className="mt-1 line-clamp-2 text-[7pt] leading-tight">{item.caption}</span>
        ) : null}
      </span>
    </div>
  );
}
