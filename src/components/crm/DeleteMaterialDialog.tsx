import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/Button";

const errorText = (caught: unknown) => {
  const data = (caught as { data?: unknown })?.data;
  return typeof data === "string" ? data : caught instanceof Error ? caught.message.replace(/^.*Uncaught (?:Convex)?Error: /s, "").split("\n")[0] : "Suppression impossible.";
};

/** Confirmation avant de supprimer définitivement un matériau du catalogue. */
export function DeleteMaterialDialog({ material, onClose, onDeleted }: { material: { _id: Id<"btMaterials">; title: string; reference?: string | null }; onClose: () => void; onDeleted?: () => void }) {
  const remove = useMutation(api.batire.removeMaterial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    setBusy(true); setError("");
    try { await remove({ id: material._id }); onClose(); onDeleted?.(); }
    catch (caught) { setError(errorText(caught)); }
    finally { setBusy(false); }
  }
  return createPortal(<div role="dialog" aria-modal="true" aria-labelledby="delete-material-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    onClick={() => { if (!busy) onClose(); }} onKeyDown={event => { if (event.key === "Escape" && !busy) onClose(); }}>
    <div className="w-full max-w-md rounded-3xl bg-[var(--card)] p-6 text-[var(--foreground)] shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3">
        <h3 id="delete-material-title" className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="h-5 w-5 text-red-500" />Supprimer ce matériau ?</h3>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 hover:bg-[var(--accent)]"><X className="h-4 w-4" /></button>
      </div>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">« <strong className="text-[var(--foreground)]">{material.title}</strong> »{material.reference ? ` (${material.reference})` : ""} sera supprimé définitivement du catalogue et de la boutique. Son QR code redeviendra libre pour un autre lot. Cette action est irréversible.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" disabled={busy} onClick={onClose}>Annuler</Button>
        <Button variant="danger" autoFocus disabled={busy} onClick={() => void confirm()}><Trash2 className="h-4 w-4" />{busy ? "Suppression…" : "Supprimer définitivement"}</Button>
      </div>
    </div>
  </div>, document.body);
}
