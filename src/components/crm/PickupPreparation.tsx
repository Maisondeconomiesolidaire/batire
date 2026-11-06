import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { canAccess, useAccess } from "../../lib/access";
import { PICKUP_LOCATIONS } from "../../lib/pickupLocations";
import { PickupTracking } from "../public/PickupTracking";

type Order = FunctionReturnType<typeof api.batire.pickupOperations>["orders"][number];

export function PickupPreparation() {
  const data = useQuery(api.batire.pickupOperations, {});
  const access = useAccess();
  const [showCollected, setShowCollected] = useState(false);
  const orders = data?.orders.filter(order => showCollected ? !!order.collectedAt : !order.collectedAt);
  return <section className="mb-8 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Retraits au dépôt</h2><p className="text-sm text-[var(--muted-foreground)]">Lots sur place à préparer et à remettre au client.</p></div><label className="flex gap-2 text-sm"><input type="checkbox" checked={showCollected} onChange={event => setShowCollected(event.target.checked)} />Afficher les retraits remis</label></div>
    {!orders ? <p>Chargement des retraits…</p> : orders.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted-foreground)]">Aucun retrait {showCollected ? "remis" : "à préparer ou à remettre"}.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{orders.map(order => <PreparationCard key={order._id} order={order} canUpdate={canAccess(access, "batire:demandes", "update")} />)}</div>}
  </section>;
}

function PreparationCard({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const update = useMutation(api.batire.updatePickup);
  const [hours, setHours] = useState(order.pickupHours ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const location = PICKUP_LOCATIONS.find(location => location.id === order.pickupLocation);
  async function advance(step: "ready" | "collect") {
    setBusy(true); setError("");
    try { await update({ orderId: order._id, step, pickupHours: step === "ready" ? hours : undefined }); }
    catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }
  return <article className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
    <p className="text-xs font-bold text-brand-700">Retrait {order.pickupReference ?? order.reference}</p>
    <h3 className="font-semibold">{order.quantity} {order.unit} · {order.materialTitle}</h3>
    <p className="text-sm">{order.customer.firstName} {order.customer.lastName}</p>
    <p className="text-sm text-[var(--muted-foreground)]">{location?.name ?? order.pickupLocation}</p>
    <PickupTracking tracking={order.fulfillment} quantity={order.quantity} unit={order.unit} />
    {canUpdate && !order.collectedAt && <div className="space-y-3 border-t border-[var(--border)] pt-3">
      {!order.readyAt && <label className="block text-sm">Horaires à transmettre au client<input className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2" value={hours} maxLength={500} onChange={event => setHours(event.target.value)} placeholder="Jours et horaires de retrait" /></label>}
      <button disabled={busy || (!order.readyAt && !hours.trim())} onClick={() => void advance(order.readyAt ? "collect" : "ready")} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enregistrement…" : order.readyAt ? "Confirmer la remise au client" : "Confirmer prêt et notifier le client"}</button>
    </div>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </article>;
}
