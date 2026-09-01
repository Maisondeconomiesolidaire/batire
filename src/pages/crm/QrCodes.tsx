import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Printer, QrCode as QrIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pill } from "../../components/ui/Badge";
import { QrCode } from "../../components/ui/QrCode";
import { PrintQrLabels, type QrLabelItem } from "../../components/crm/PrintQrLabels";
import { useAccess, canAccess } from "../../lib/access";

export function QrCodes() {
  const access = useAccess();
  const codes = useQuery(api.batire.listQrCodes, {});
  const generate = useMutation(api.batire.generateQrCodes);
  const [count, setCount] = useState("24");
  const [busy, setBusy] = useState(false);
  // Les étiquettes s'impriment dans un document dédié : imprimer la page du
  // CRM sortait l'écran (barre latérale, filtres, boutons) au lieu des codes.
  const [printing, setPrinting] = useState<QrLabelItem[] | null>(null);
  const canCreate = canAccess(access, "batire:materiaux", "create");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const labelOf = (code: { reference: string; materialTitle?: string | null }): QrLabelItem => ({
    reference: code.reference,
    value: `${origin}/qr/${code.reference}`,
    caption: code.materialTitle ?? undefined,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QR codes</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {codes ? `${codes.length} étiquette${codes.length > 1 ? "s" : ""}` : "…"}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Input
            value={count}
            onChange={(event) => setCount(event.target.value)}
            inputMode="numeric"
            className="w-24"
          />
          {canCreate ? (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const created = await generate({ count: Number(count) || 0 });
                  // On enchaîne sur l'impression : une planche générée mais pas
                  // imprimée ne sert à rien.
                  if (created?.length) {
                    setPrinting(created.map((reference) => labelOf({ reference })));
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Génération…" : "Générer"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={!codes?.length}
            onClick={() => setPrinting((codes ?? []).map(labelOf))}
          >
            <Printer className="h-4 w-4" /> Tout imprimer
          </Button>
        </div>
      </div>

      {codes === undefined ? (
        <FullSpinner label="Chargement des QR codes…" />
      ) : codes.length === 0 ? (
        <EmptyState icon={<QrIcon className="h-10 w-10" />} title="Aucun QR code" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {codes.map((code) => (
            <div
              key={code._id}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-white p-3 text-center"
            >
              <QrCode value={`${origin}/qr/${code.reference}`} size={104} className="text-black" />
              <p className="font-mono text-xs font-semibold text-zinc-900">{code.reference}</p>
              {code.materialTitle ? (
                <p className="line-clamp-2 text-[11px] text-zinc-500">{code.materialTitle}</p>
              ) : (
                <Pill className="bg-zinc-100 text-zinc-500">Libre</Pill>
              )}
              <button
                type="button"
                onClick={() => setPrinting([labelOf(code)])}
                className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-brand-400 hover:text-brand-700"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimer
              </button>
            </div>
          ))}
        </div>
      )}

      {printing ? <PrintQrLabels items={printing} onClose={() => setPrinting(null)} /> : null}
    </div>
  );
}
