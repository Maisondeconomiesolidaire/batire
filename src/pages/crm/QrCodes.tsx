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
import { useAccess, canAccess } from "../../lib/access";

/**
 * QR codes imprimés à l'avance.
 *
 * On les colle sur les matériaux à leur arrivée au dépôt, avant même d'avoir
 * créé la fiche : la référence imprimée sert ensuite de lien entre l'objet
 * physique et son annonce.
 */
export function QrCodes() {
  const access = useAccess();
  const codes = useQuery(api.batire.listQrCodes, {});
  const generate = useMutation(api.batire.generateQrCodes);
  const [count, setCount] = useState("24");
  const [busy, setBusy] = useState(false);
  const canCreate = canAccess(access, "batire:materiaux", "create");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QR codes</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Imprimez des étiquettes vierges, collez-les sur les matériaux, puis saisissez la
            référence dans la fiche.
          </p>
        </div>
        <div className="flex items-end gap-2 print:hidden">
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
                  await generate({ count: Number(count) || 0 });
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Génération…" : "Générer"}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
        </div>
      </div>

      {codes === undefined ? (
        <FullSpinner label="Chargement des QR codes…" />
      ) : codes.length === 0 ? (
        <EmptyState
          icon={<QrIcon className="h-10 w-10" />}
          title="Aucun QR code"
          description="Générez un premier lot d'étiquettes à coller sur les matériaux."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {codes.map((code) => (
            <div
              key={code._id}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-white p-3 text-center"
            >
              <QrCode value={`${origin}/qr/${code.reference}`} size={104} />
              <p className="font-mono text-xs font-semibold text-zinc-900">{code.reference}</p>
              {code.materialTitle ? (
                <p className="line-clamp-2 text-[11px] text-zinc-500">{code.materialTitle}</p>
              ) : (
                <Pill className="bg-zinc-100 text-zinc-500 print:hidden">Libre</Pill>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
