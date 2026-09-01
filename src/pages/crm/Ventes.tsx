import { useQuery } from "convex/react";
import { Receipt } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pill } from "../../components/ui/Badge";
import { formatDateTime, formatPrice, formatStock } from "../../lib/format";

const STATUS_TONES: Record<string, string> = {
  payee: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  en_attente: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  annulee: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
};

const STATUS_LABELS: Record<string, string> = {
  payee: "Payée",
  en_attente: "En attente",
  annulee: "Annulée",
};

export function Ventes() {
  const orders = useQuery(api.batire.listOrders, {});

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
                <th className="px-4 py-3 text-left font-medium">Canal</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {orders.map((order) => (
                <tr key={order._id} className="bg-[var(--card)]">
                  <td className="px-4 py-3 font-mono text-xs">{order.reference}</td>
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
                    {order.channel === "terminal" ? "Terminal" : "Boutique"}
                  </td>
                  <td className="px-4 py-3">
                    <Pill className={STATUS_TONES[order.status] ?? ""}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Pill>
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
