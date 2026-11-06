import { PICKUP_LOCATIONS } from "../../lib/pickupLocations";

export type PickupTrackingData = {
  status: string;
  scheduledDate?: string;
  receivedQuantity?: number;
  receivedAt?: number;
};

export const PICKUP_STATUS: Record<string, string> = {
  payment: "En attente de paiement",
  waiting: "En attente de planification",
  scheduled: "Date programmée",
  transit: "En cours de transfert",
  preparing: "En préparation au point de retrait",
  ready: "Prêt à retirer",
  collected: "Retiré",
  cancelled: "Annulé",
  incident: "Transfert interrompu · L’équipe vous recontactera",
};

export function PickupTracking({ tracking, quantity, unit }: { tracking: PickupTrackingData; quantity: number; unit: string }) {
  const ready = tracking.status === "ready";
  const planned = ["scheduled", "transit"].includes(tracking.status) && tracking.scheduledDate;
  return <div className="space-y-1 text-sm">
    <p className={`font-semibold ${ready ? "text-emerald-700" : "text-[var(--foreground)]"}`}>{PICKUP_STATUS[tracking.status] ?? "Suivi à confirmer"}</p>
    <p className="text-[var(--muted-foreground)]">{ready ? "Dès aujourd’hui" : tracking.status === "collected" ? "Remis au client" : planned ? `Disponible à partir du ${new Date(`${tracking.scheduledDate}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}, sous réserve de confirmation` : "Date à confirmer"}</p>
    {tracking.status === "transit" && tracking.receivedQuantity !== undefined && <p className="text-amber-800">Réception partielle : {tracking.receivedQuantity} / {quantity} {unit}. Le solde reste en attente.</p>}
  </div>;
}

export type PickupLine = {
  _id: string; reference: string; pickupReference?: string; purchaseReference?: string;
  materialTitle: string; quantity: number; unit: string; pickupLocation?: string;
  amountCents: number; pickupFeeCents?: number; pickupHours?: string;
  paymentMethod?: "card" | "cash" | "bank_transfer";
  status?: "en_attente" | "payee" | "annulee" | "reservee";
  fulfillment?: PickupTrackingData;
};

export function PickupOrderDetail({ lines, onBack }: { lines: PickupLine[]; onBack: () => void }) {
  const ready = lines.filter(line => line.fulfillment?.status === "ready").length;
  return <section className="mt-6 space-y-5">
    <button onClick={onBack} className="text-sm font-semibold text-brand-700">← Mes commandes</button>
    <div><h2 className="text-2xl font-bold">Commande {lines[0].purchaseReference}</h2><p className="mt-2 text-[var(--muted-foreground)]">{ready} retrait{ready > 1 ? "s" : ""} disponible{ready > 1 ? "s" : ""} sur {lines.length}</p></div>
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]"><table className="w-full min-w-[680px] text-left text-sm">
      <thead className="bg-[var(--muted)]"><tr>{["Retrait", "Matériaux", "Lieu choisi", "Suivi et disponibilité"].map(label => <th key={label} className="p-4 font-semibold" scope="col">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-[var(--border)]">{lines.map(line => {
        const location = PICKUP_LOCATIONS.find(location => location.id === line.pickupLocation);
        return <tr key={line._id}><td className="p-4 align-top font-semibold">{line.pickupReference ?? line.reference}</td><td className="p-4 align-top">{line.materialTitle}<p className="mt-1 text-[var(--muted-foreground)]">{line.quantity} {line.unit}</p></td><td className="p-4 align-top">{location?.name ?? "À confirmer"}<p className="mt-1 text-xs text-[var(--muted-foreground)]">{location?.address}</p>{line.pickupHours && <p className="mt-1 text-xs">Horaires : {line.pickupHours}</p>}</td><td className="p-4 align-top">{line.fulfillment && <PickupTracking tracking={line.fulfillment} quantity={line.quantity} unit={line.unit} />}</td></tr>;
      })}</tbody>
    </table></div>
    <p className="font-semibold">Total : {(lines.reduce((sum, line) => sum + line.amountCents, 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
    {lines[0].paymentMethod && lines[0].paymentMethod !== "card" && <p className="text-sm text-[var(--muted-foreground)]">Paiement {lines[0].paymentMethod === "cash" ? "en espèces au retrait" : "par virement bancaire"} · {lines.every(line => line.status === "payee") ? "Paiement confirmé" : "En attente de paiement"}</p>}
    {lines[0].paymentMethod === "bank_transfer" && !lines.every(line => line.status === "payee") && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Titulaire : [À RENSEIGNER] · IBAN : [À RENSEIGNER] · BIC : [À RENSEIGNER]. Ne faites pas de virement avant réception des coordonnées définitives.</p>}
    {lines.some(line => line.pickupFeeCents) && <p className="text-sm text-[var(--muted-foreground)]">Dont 35 € de transfert, facturés une seule fois pour la commande.</p>}
    <p className="text-sm text-[var(--muted-foreground)]">Attendez la notification « Prêt à retirer » avant de vous déplacer. Chaque retrait peut être récupéré indépendamment.</p>
  </section>;
}
