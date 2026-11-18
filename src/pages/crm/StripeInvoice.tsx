import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Download, ExternalLink, Loader2, Receipt, Send, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { euros } from "../../lib/billing";
import { cn } from "../../lib/cn";

const errorText = (caught: unknown) => {
  const data = (caught as { data?: unknown })?.data;
  return typeof data === "string" ? data : caught instanceof Error ? caught.message.replace(/^.*Uncaught (?:Convex)?Error: /s, "").split("\n")[0] : "Opération impossible.";
};
export const sentLabel = (at: number) => { const date = new Date(at); return `${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`; };

/**
 * Facture Stripe d'une demande payée : émise automatiquement au paiement et
 * envoyée au client. Bouton pour l'envoyer / la renvoyer (ou l'émettre si
 * elle manque, pour une demande payée avant la facturation Stripe).
 */
export function OrderStripeInvoice({ orderId, canUpdate, paid, compact = false }: { orderId: Id<"btOrders">; canUpdate: boolean; paid: boolean; compact?: boolean }) {
  const invoice = useQuery(api.batireStripeInvoices.orderInvoice, { orderId });
  const send = useAction(api.batireStripeInvoices.sendOrderInvoice);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState("");
  if (invoice === undefined || !paid) return null;

  async function run() {
    setBusy(true); setError(""); setDone(""); setConfirm(false);
    try { const result = await send({ orderId }); setDone(`Facture ${result.number} envoyée à ${result.to}.`); }
    catch (caught) { setError(errorText(caught)); }
    finally { setBusy(false); }
  }
  const has = Boolean(invoice?.id);
  const label = !has ? "Émettre et envoyer la facture" : invoice!.sentAt ? "Renvoyer la facture" : "Envoyer la facture";

  return <div className={cn(compact ? "space-y-1 text-center" : "space-y-3 rounded-2xl border border-[var(--border)] p-4 text-sm")}>
    {!compact && <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 font-semibold"><Receipt className="h-4 w-4" />Facture Stripe{invoice?.number ? <span className="font-mono">{invoice.number}</span> : null}</p>
      {invoice?.status === "paid" && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Payée</span>}
    </div>}
    {!compact && has && <p className="text-[var(--muted-foreground)]">{invoice!.issuer ?? "Stripe"}{invoice!.totalCents !== null ? ` · ${euros(invoice!.totalCents)}` : ""}{invoice!.sentAt ? ` · envoyée le ${sentLabel(invoice!.sentAt)}${invoice!.sentTo ? ` à ${invoice!.sentTo}` : ""}` : " · pas encore envoyée"}</p>}
    {!has && (invoice?.pending ? <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--muted-foreground)]"><Loader2 className="h-3.5 w-3.5 animate-spin" />Facture en cours de création chez Stripe…</p>
      : !compact && <p className="text-[var(--muted-foreground)]">Aucune facture Stripe pour l’instant.</p>)}
    {canUpdate && !invoice?.pending && <Button size="sm" variant={invoice?.sentAt ? "outline" : "primary"} className={compact ? "w-full justify-center" : undefined} disabled={busy} onClick={() => invoice?.sentAt ? setConfirm(true) : void run()}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{busy ? "Envoi…" : label}
    </Button>}
    {has && <div className={cn("flex flex-wrap gap-3 text-xs font-semibold", compact && "justify-center")}>
      {invoice!.url && <a href={invoice!.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"><ExternalLink className="h-3.5 w-3.5" />Voir{compact && invoice!.number ? ` ${invoice!.number}` : ""}</a>}
      {invoice!.pdfUrl && <a href={invoice!.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"><Download className="h-3.5 w-3.5" />PDF</a>}
    </div>}
    {compact && has && invoice!.sentAt && <p className="text-[11px] text-[var(--muted-foreground)]">Envoyée le {sentLabel(invoice!.sentAt)}</p>}
    {(error || (invoice?.error && !has)) && <p role="alert" className="text-xs text-red-600">{error || invoice?.error}</p>}
    {done && <p className="text-xs text-emerald-700 dark:text-emerald-300">{done}</p>}
    {confirm && invoice?.sentAt && <div role="dialog" aria-modal="true" aria-label="Facture déjà envoyée" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-left" onKeyDown={event => { if (event.key === "Escape") setConfirm(false); }}>
      <div className="w-full max-w-md rounded-3xl bg-[var(--card)] p-6 text-[var(--foreground)] shadow-2xl">
        <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold">Facture déjà envoyée</h3><button type="button" onClick={() => setConfirm(false)} aria-label="Fermer" className="rounded-lg p-1 hover:bg-[var(--accent)]"><X className="h-4 w-4" /></button></div>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">La facture {invoice.number} a déjà été envoyée le {sentLabel(invoice.sentAt)}{invoice.sentTo ? ` à ${invoice.sentTo}` : ""}. Êtes-vous sûr(e) de vouloir la renvoyer ?</p>
        <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirm(false)}>Non</Button><Button autoFocus onClick={() => void run()}><Send className="h-4 w-4" />Oui, renvoyer</Button></div>
      </div>
    </div>}
  </div>;
}

/** Page Facturation : toutes les factures Stripe des demandes. */
export function StripeInvoicesTable({ search }: { search: string }) {
  const rows = useQuery(api.batireStripeInvoices.listOrderInvoices, {});
  if (rows === undefined) return <p className="p-6 text-center text-sm text-[var(--muted-foreground)]">Chargement…</p>;
  const needle = search.trim().toLocaleLowerCase("fr-FR");
  const shown = rows.filter(row => !needle || [row.number, row.client, row.email, row.reference].some(value => value?.toLocaleLowerCase("fr-FR").includes(needle)));
  if (!shown.length) return <p className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">{needle ? "Aucune facture ne correspond à la recherche." : "Aucune facture Stripe pour l’instant : elles sont émises automatiquement quand une demande passe en « Payé »."}</p>;
  return <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
    <table className="w-full min-w-[720px] text-sm">
      <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-left text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
        <tr><th className="px-4 py-2.5 font-semibold">Facture Stripe</th><th className="px-4 py-2.5 font-semibold">Client</th><th className="px-4 py-2.5 font-semibold">Payée</th><th className="px-4 py-2.5 text-right font-semibold">Total</th><th className="px-4 py-2.5 text-right font-semibold" /></tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">{shown.map(row => <tr key={row.id}>
        <td className="px-4 py-3"><p className="font-mono font-semibold">{row.number}</p><p className="text-xs text-[var(--muted-foreground)]">{row.issuer === "recycapp" ? "Recyclerie" : "MATERIOSOL"} · demande #{row.reference}</p></td>
        <td className="px-4 py-3"><p className="font-medium">{row.client}</p><p className="text-xs text-[var(--muted-foreground)]">{row.email}</p></td>
        <td className="px-4 py-3 whitespace-nowrap"><p>{row.paidAt ? new Date(row.paidAt).toLocaleDateString("fr-FR") : "—"}</p><p className="text-xs text-[var(--muted-foreground)]">{row.paymentMethod}{row.sentAt ? ` · envoyée le ${new Date(row.sentAt).toLocaleDateString("fr-FR")}` : ""}</p></td>
        <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{euros(row.totalCents)}</td>
        <td className="px-4 py-3"><div className="flex justify-end gap-3 text-xs font-semibold">
          {row.url && <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"><ExternalLink className="h-3.5 w-3.5" />Voir</a>}
          {row.pdfUrl && <a href={row.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"><Download className="h-3.5 w-3.5" />PDF</a>}
        </div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
