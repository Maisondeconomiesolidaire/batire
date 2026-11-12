import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { Dropdown } from "../../components/ui/Dropdown";
import { FullSpinner } from "../../components/ui/Spinner";
import { useAccess, canAccess } from "../../lib/access";
import { PICKUP_LOCATIONS, type PickupLocationId } from "../../lib/pickupLocations";

type Slot = Doc<"btStorageSlots">;

const errorText = (caught: unknown, fallback: string) => {
  const data = (caught as { data?: unknown })?.data;
  if (typeof data === "string") return data;
  return caught instanceof Error ? caught.message.replace(/^.*Uncaught ConvexError: /, "").split("\n")[0] || fallback : fallback;
};

/**
 * Emplacements de stockage par lieu (« allée B3 », « extérieur »…). Ils
 * alimentent la liste « Emplacement » de la fiche matériau.
 */
export function Emplacements() {
  const access = useAccess();
  const slots = useQuery(api.batire.listStorageSlots, {});
  const create = useMutation(api.batire.createStorageSlot);
  const canEdit = canAccess(access, "batire:materiaux", "update");
  const [location, setLocation] = useState<PickupLocationId | "">("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!location || !label.trim()) return;
    setBusy(true); setError("");
    try { await create({ location, label }); setLabel(""); }
    catch (caught) { setError(errorText(caught, "Création impossible.")); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Emplacements</h1>
      <p className="text-sm text-[var(--muted-foreground)]">Les emplacements de chaque lieu de stockage, proposés dans la fiche matériau.</p>
    </div>

    {canEdit && <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-[16rem_1fr_auto] sm:items-end">
      <Field label="Lieu" required>
        <Dropdown value={location} onChange={value => setLocation(value as PickupLocationId)} placeholder="Choisir le lieu" options={PICKUP_LOCATIONS.map(item => ({ value: item.id, label: item.name }))} />
      </Field>
      <Field label="Emplacement" required>
        <Input value={label} maxLength={80} onChange={event => setLabel(event.target.value)} placeholder="Ex. Allée B3, étagère 2" />
      </Field>
      <Button type="submit" disabled={busy || !location || !label.trim()}><Plus className="h-4 w-4" />{busy ? "Ajout…" : "Ajouter"}</Button>
      {error && <p role="alert" className="text-sm text-red-600 sm:col-span-3">{error}</p>}
    </form>}

    {slots === undefined ? <FullSpinner label="Chargement des emplacements…" /> : <div className="grid gap-4 lg:grid-cols-3">
      {PICKUP_LOCATIONS.map(place => {
        const own = slots.filter(slot => slot.location === place.id);
        return <section key={place.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
            <h2 className="flex min-w-0 items-center gap-2 font-semibold"><MapPin className="h-4 w-4 shrink-0 text-brand-600" /><span className="truncate">{place.name}</span></h2>
            <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">{own.length}</span>
          </header>
          {own.length === 0 ? <p className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">Aucun emplacement.</p>
            : <ul className="divide-y divide-[var(--border)]">{own.map(slot => <SlotRow key={slot._id} slot={slot} canEdit={canEdit} />)}</ul>}
        </section>;
      })}
    </div>}
  </div>;
}

function SlotRow({ slot, canEdit }: { slot: Slot; canEdit: boolean }) {
  const update = useMutation(api.batire.updateStorageSlot);
  const remove = useMutation(api.batire.removeStorageSlot);
  const [editing, setEditing] = useState(false);
  const [location, setLocation] = useState(slot.location);
  const [label, setLabel] = useState(slot.label);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(task: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await task(); return true; }
    catch (caught) { setError(errorText(caught, "Opération impossible.")); return false; }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    let moved = 0;
    if (await run(async () => { moved = await update({ slotId: slot._id as Id<"btStorageSlots">, location, label }); })) {
      setEditing(false);
      setNotice(moved ? `${moved} matériau${moved > 1 ? "x" : ""} mis à jour.` : "");
    }
  }

  if (editing) return <li className="px-4 py-3">
    <form onSubmit={save} className="space-y-2">
      <Dropdown value={location} onChange={setLocation} options={PICKUP_LOCATIONS.map(item => ({ value: item.id, label: item.name }))} />
      <Input autoFocus value={label} maxLength={80} onChange={event => setLabel(event.target.value)} aria-label="Emplacement" />
      <p className="text-xs text-[var(--muted-foreground)]">Les matériaux rangés à cet emplacement suivent la modification.</p>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2"><Button type="submit" size="sm" disabled={busy || !label.trim()}><Check className="h-4 w-4" />Enregistrer</Button><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setEditing(false); setLocation(slot.location); setLabel(slot.label); setError(""); }}>Annuler</Button></div>
    </form>
  </li>;

  return <li className="px-4 py-2.5">
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-sm font-medium">{slot.label}</span>
      {canEdit && (confirmDelete ? <span className="flex shrink-0 items-center gap-1 text-xs">
        <span className="text-[var(--muted-foreground)]">Supprimer ?</span>
        <Button size="sm" variant="danger" disabled={busy} onClick={() => void run(() => remove({ slotId: slot._id }))}>Oui</Button>
        <button type="button" onClick={() => setConfirmDelete(false)} aria-label="Annuler" className="rounded-lg p-1 hover:bg-[var(--accent)]"><X className="h-4 w-4" /></button>
      </span> : <span className="flex shrink-0 gap-1">
        <button type="button" onClick={() => { setNotice(""); setEditing(true); }} aria-label={`Modifier ${slot.label}`} className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"><Pencil className="h-4 w-4" /></button>
        <button type="button" onClick={() => setConfirmDelete(true)} aria-label={`Supprimer ${slot.label}`} className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
      </span>)}
    </div>
    {notice && <p className="mt-1 text-xs text-brand-600">{notice}</p>}
    {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
  </li>;
}
