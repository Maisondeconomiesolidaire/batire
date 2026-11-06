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
  const groups = new Map<string, Order[]>();
  for (const order of data?.orders ?? []) {
    const key = order.purchaseReference ?? order._id;
    groups.set(key, [...(groups.get(key) ?? []), order]);
  }
  const orders = data && [...groups.entries()].filter(([, lines]) => showCollected ? lines.every(line => !!line.collectedAt) : lines.some(line => !line.collectedAt));
  return <section className="mb-8 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Commandes et retraits</h2><p className="text-sm text-[var(--muted-foreground)]">Une carte par commande, avec le suivi de chaque matériau.</p></div><label className="flex gap-2 text-sm"><input type="checkbox" checked={showCollected} onChange={event => setShowCollected(event.target.checked)} />Afficher les commandes entièrement retirées</label></div>
    {!orders ? <p>Chargement des commandes…</p> : orders.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted-foreground)]">Aucune commande {showCollected ? "entièrement retirée" : "en cours"}.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{orders.map(([reference, lines]) => <article key={reference} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"><p className="text-xs font-bold text-brand-700">Commande {lines[0].purchaseReference ?? lines[0].reference}</p><h3 className="mt-2 font-semibold">{lines[0].customer.firstName} {lines[0].customer.lastName}</h3><p className="mt-1 text-xs text-[var(--muted-foreground)]">{lines.filter(line => line.fulfillment.status === "ready").length} retrait{lines.filter(line => line.fulfillment.status === "ready").length > 1 ? "s" : ""} prêt{lines.filter(line => line.fulfillment.status === "ready").length > 1 ? "s" : ""} sur {lines.length}</p><div className="mt-4 divide-y divide-[var(--border)]">{lines.map(order => <PreparationLine key={order._id} order={order} canUpdate={canAccess(access, "batire:demandes", "update")} />)}</div></article>)}</div>}
  </section>;
}

function PreparationLine({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
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
  const actionable = ["preparing", "ready"].includes(order.fulfillment.status);
  return <section className="space-y-3 py-4">
    <p className="text-xs font-bold text-brand-700">Retrait {order.pickupReference ?? order.reference}</p>
    <h4 className="font-semibold">{order.quantity} {order.unit} · {order.materialTitle}</h4>
    <p className="text-sm text-[var(--muted-foreground)]">{location?.name ?? order.pickupLocation}</p>
    <PickupTracking tracking={order.fulfillment} quantity={order.quantity} unit={order.unit} />
    {canUpdate && actionable && !order.collectedAt && <div className="space-y-3 border-t border-[var(--border)] pt-3">
      {!order.readyAt && <label className="block text-sm">Horaires à transmettre au client<input className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2" value={hours} maxLength={500} onChange={event => setHours(event.target.value)} placeholder="Jours et horaires de retrait" /></label>}
      <button disabled={busy || (!order.readyAt && !hours.trim())} onClick={() => void advance(order.readyAt ? "collect" : "ready")} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enregistrement…" : order.readyAt ? "Confirmer la remise au client" : "Confirmer prêt et notifier le client"}</button>
    </div>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
}
