import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { canAccess, useAccess } from "../../lib/access";
import { Receipt } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pill } from "../../components/ui/Badge";
import { formatDateTime, formatPrice, formatStock } from "../../lib/format";
import { PICKUP_LOCATIONS } from "../../lib/pickupLocations";

const STATUS_TONES: Record<string, string> = {
  payee: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  en_attente: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  annulee: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  reservee: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
};

const STATUS_LABELS: Record<string, string> = {
  payee: "Payée",
  en_attente: "En attente",
  annulee: "Annulée",
  reservee: "Réservée",
};

export function Ventes() {
  const orders = useQuery(api.batire.listOrders, {});
  const access = useAccess();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventes</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {orders ? `${orders.length} commande${orders.length > 1 ? "s" : ""}` : "…"}
        </p>
      </div>

      {orders === undefined ? (
        <FullSpinner label="Chargement des ventes…" />
      ) : orders.length === 0 ? (
        <EmptyState icon={<Receipt className="h-10 w-10" />} title="Aucune vente" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Réf.</th>
                <th className="px-4 py-3 text-left font-medium">Matériau</th>
                <th className="px-4 py-3 text-left font-medium">Quantité</th>
                <th className="px-4 py-3 text-left font-medium">Montant</th>
                <th className="px-4 py-3 text-left font-medium">Client</th>
                <th className="px-4 py-3 text-left font-medium">Retrait</th>
                <th className="px-4 py-3 text-left font-medium">Canal</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {orders.map((order) => (
                <tr key={order._id} className="bg-[var(--card)]">
                  <td className="px-4 py-3 font-mono text-xs">{order.pickupReference ?? order.reference}</td>
                  <td className="px-4 py-3 font-medium">{order.materialTitle}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {formatStock(order.quantity, order.unit)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatPrice(order.amountCents / 100)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    <p>
                      {order.customer.firstName} {order.customer.lastName}
                    </p>
                    <p className="text-xs">{order.customer.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {order.pickupLocation
                      ? PICKUP_LOCATIONS.find((location) => location.id === order.pickupLocation)
                          ?.name ?? order.pickupLocation
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {order.channel === "terminal" ? "Terminal" : "Boutique"}
                  </td>
                  <td className="px-4 py-3">
                    <Pill className={STATUS_TONES[order.status] ?? ""}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Pill>
                    {order.paymentMethod && order.paymentMethod !== "card" && <div className="mt-2 text-xs">{order.paymentMethod === "cash" ? "Espèces au retrait" : "Virement"}{canAccess(access, "batire:demandes", "update") && ["reservee", "en_attente"].includes(order.status) && <ConfirmPayment orderId={order._id} />}</div>}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {formatDateTime(order.paidAt ?? order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConfirmPayment({ orderId }: { orderId: Id<"btOrders"> }) {
  const confirm = useMutation(api.batire.confirmOfflinePayment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true); setError("");
    try { await confirm({ orderId }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Confirmation impossible."); } finally { setBusy(false); }
  }
  return <div className="mt-2"><button type="button" disabled={busy} className="font-semibold text-brand-700 underline disabled:opacity-50" onClick={() => void submit()}>{busy ? "Enregistrement…" : "Confirmer l’encaissement de ce retrait"}</button>{error && <p role="alert" className="mt-1 text-red-600">{error}</p>}</div>;
}
