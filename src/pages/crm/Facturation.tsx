import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, CircleCheck, Download, Eye, FilePlus2, FileText, ImageOff, Plus, Receipt, Search, Send, Trash2, UserPlus, X, XCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { canAccess, useAccess } from "../../lib/access";
import { cn } from "../../lib/cn";
import { ISSUERS, VAT_RATES, buildBillingPdf, bytesToBase64, clientName, downloadBillingPdf, euros, frDate, vatBreakdown, type BillingClient, type BillingDocForPdf, type Issuer } from "../../lib/billing";

type Doc = FunctionReturnType<typeof api.batire.listBillingDocs>[number];
type DocType = "devis" | "facture";
export type Line = { key: number; materialId?: Id<"btMaterials">; issuer?: Issuer; label: string; quantity: string; unit: string; price: string };

export const STATUS: Record<Doc["status"], { label: string; className: string }> = {
  en_attente: { label: "En attente", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  accepte: { label: "Accepté", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  refuse: { label: "Refusé", className: "bg-red-500/15 text-red-700 dark:text-red-300" },
  annule: { label: "Annulé", className: "bg-zinc-500/15 text-[var(--muted-foreground)]" },
  a_regler: { label: "À régler", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  payee: { label: "Payée", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};
export const PAYMENT_METHODS = ["Virement", "Carte bancaire", "Espèces", "Chèque", "Mandat administratif"];

const errorText = (caught: unknown, fallback: string) => {
  const data = (caught as { data?: unknown })?.data;
  if (typeof data === "string") return data;
  return caught instanceof Error ? caught.message.replace(/^.*Uncaught ConvexError: /, "").split("\n")[0] || fallback : fallback;
};
const parseEuros = (value: string) => { const number = Number(value.replace(/\s/g, "").replace(",", ".")); return Number.isFinite(number) && value.trim() !== "" ? Math.round(number * 100) : NaN; };
const parseQuantity = (value: string) => { const number = Number(value.replace(",", ".")); return Number.isFinite(number) && value.trim() !== "" ? number : NaN; };
const centsInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Devis et factures Bâtire (Recyclerie pour le mobilier, MATERIOSOL pour le reste). */
export function Facturation() {
  const access = useAccess();
  const canUpdate = canAccess(access, "batire:demandes", "update");
  const quotes = useQuery(api.batire.listBillingDocs, { type: "devis" });
  const invoices = useQuery(api.batire.listBillingDocs, { type: "facture" });
  const [tab, setTab] = useState<DocType>("devis");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DocType | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const docs = tab === "devis" ? quotes : invoices;
  // Aperçu : après création, il s'ouvre dès que le document apparaît dans la liste.
  const preview = previewId ? [...(quotes ?? []), ...(invoices ?? [])].find(item => item._id === previewId) : undefined;

  const needle = search.trim().toLocaleLowerCase("fr-FR");
  const shown = (docs ?? []).filter(doc => !needle || [doc.number, clientName(doc.client), doc.client.email, doc.client.city, ...doc.lines.map(line => line.label)].some(value => value?.toLocaleLowerCase("fr-FR").includes(needle)));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Facturation</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Mobilier facturé par la Recyclerie, autres matériaux par MATERIOSOL.</p>
      </div>
      {canUpdate && <Button onClick={() => setEditing(tab)}><FilePlus2 className="h-4 w-4" />{tab === "devis" ? "Nouveau devis" : "Nouvelle facture"}</Button>}
    </div>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <UnderlineTabs value={tab} onChange={setTab} items={[{ key: "devis", label: "Devis" }, { key: "facture", label: "Factures" }]} counts={quotes && invoices ? { devis: quotes.length, facture: invoices.length } : undefined} />
      <label className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Numéro, client, article…" aria-label="Rechercher" className="pl-9" />
      </label>
    </div>
    {docs === undefined ? <FullSpinner label="Chargement…" />
      : shown.length === 0 ? <EmptyState icon={tab === "devis" ? <FileText className="h-6 w-6" /> : <Receipt className="h-6 w-6" />} title={needle ? "Aucun résultat" : tab === "devis" ? "Aucun devis" : "Aucune facture"} description={needle ? "Aucun document ne correspond à la recherche." : tab === "devis" ? "Créez un devis en cherchant les articles et le client." : "Les factures se créent directement ou depuis un devis accepté."} />
        : <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              <tr><th className="px-4 py-3 font-semibold">Numéro</th><th className="px-4 py-3 font-semibold">Client</th><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 text-right font-semibold">Total TTC</th><th className="px-4 py-3 font-semibold">Statut</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">{shown.map(doc => <DocRow key={doc._id} doc={doc} canUpdate={canUpdate} onPreview={setPreviewId} onConverted={id => { setTab("facture"); setPreviewId(id); }} />)}</tbody>
          </table>
        </div>}
    {editing && <DocEditor type={editing} onClose={() => setEditing(null)} onCreated={id => { setEditing(null); setPreviewId(id); }} />}
    {preview && <PdfPreview doc={preview} canUpdate={canUpdate} onClose={() => setPreviewId(null)} />}
  </div>;
}

export function IssuerBadge({ issuer }: { issuer: Issuer }) {
  const item = ISSUERS[issuer];
  return <span className="inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${item.color}22`, color: item.color }}>{item.short}</span>;
}

function DocRow({ doc, canUpdate, onConverted, onPreview }: { doc: Doc; canUpdate: boolean; onConverted: (id: string) => void; onPreview: (id: string) => void }) {
  const setQuoteStatus = useMutation(api.batire.setQuoteStatus);
  const convert = useMutation(api.batire.convertQuoteToInvoice);
  const setPaid = useMutation(api.batire.setInvoicePaid);
  const [confirm, setConfirm] = useState<"" | "convert" | "paid" | "refuse" | "cancel">("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0]!);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(task: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await task(); setConfirm(""); } catch (caught) { setError(errorText(caught, "Opération impossible.")); } finally { setBusy(false); }
  }
  const status = STATUS[doc.status];
  const open = doc.type === "devis" && !doc.invoiceId && (doc.status === "en_attente" || doc.status === "accepte");
  return <tr className="align-top">
    <td className="px-4 py-3"><p className="font-mono font-semibold">{doc.number}</p><IssuerBadge issuer={doc.issuer} />{doc.linkedNumber && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{doc.type === "devis" ? "Facture" : "Devis"} {doc.linkedNumber}</p>}</td>
    <td className="px-4 py-3"><p className="font-medium">{clientName(doc.client)}</p><p className="text-xs text-[var(--muted-foreground)]">{[doc.client.email, doc.client.city].filter(Boolean).join(" · ")}</p><p className="mt-1 line-clamp-1 text-xs text-[var(--muted-foreground)]">{doc.lines.length} ligne{doc.lines.length > 1 ? "s" : ""} · {doc.lines.map(line => line.label).join(", ")}</p></td>
    <td className="px-4 py-3 whitespace-nowrap"><p>{frDate(doc.issueDate)}</p><p className="text-xs text-[var(--muted-foreground)]">{doc.type === "devis" ? `valable → ${frDate(doc.validUntil)}` : doc.status === "payee" ? `payée${doc.paymentMethod ? ` · ${doc.paymentMethod}` : ""}` : `échéance ${frDate(doc.dueDate)}`}</p></td>
    <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{euros(doc.totalCents)}</td>
    <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", status.className)}>{doc.type === "devis" && doc.invoiceId ? "Facturé" : status.label}</span>{doc.sentAt && <p className="mt-1 text-xs text-[var(--muted-foreground)]">envoyé le {new Date(doc.sentAt).toLocaleDateString("fr-FR")}</p>}{error && <p className="mt-1 max-w-[14rem] text-xs text-red-600">{error}</p>}</td>
    <td className="px-4 py-3">
      <div className="flex flex-wrap justify-end gap-1.5">
        <Button size="sm" variant="outline" onClick={() => onPreview(doc._id)}><Eye className="h-4 w-4" />Aperçu</Button>
        {canUpdate && open && <Button size="sm" onClick={() => { setError(""); setConfirm("convert"); }}><Receipt className="h-4 w-4" />Facturer</Button>}
        {canUpdate && doc.type === "devis" && doc.status === "en_attente" && <>
          <Button size="sm" variant="ghost" onClick={() => void run(() => setQuoteStatus({ id: doc._id, status: "accepte" }))}><CircleCheck className="h-4 w-4" />Accepté</Button>
          <Button size="sm" variant="ghost" onClick={() => { setError(""); setConfirm("refuse"); }}><XCircle className="h-4 w-4" />Refusé</Button>
        </>}
        {canUpdate && doc.type === "devis" && (doc.status === "refuse" || doc.status === "annule") && <Button size="sm" variant="ghost" onClick={() => void run(() => setQuoteStatus({ id: doc._id, status: "en_attente" }))}>Rouvrir</Button>}
        {canUpdate && doc.type === "facture" && doc.status === "a_regler" && <Button size="sm" onClick={() => { setError(""); setConfirm("paid"); }}><Check className="h-4 w-4" />Payée</Button>}
        {canUpdate && doc.type === "facture" && doc.status === "payee" && <Button size="sm" variant="ghost" onClick={() => void run(() => setPaid({ id: doc._id, paid: false }))}>Annuler le paiement</Button>}
      </div>
    </td>
    {confirm && createPortal(<Dialog title={confirm === "convert" ? "Convertir en facture ?" : confirm === "paid" ? "Facture payée" : "Devis refusé ?"} onClose={() => { if (!busy) setConfirm(""); }}>
        {confirm === "convert" && <p className="text-sm text-[var(--muted-foreground)]">Une facture {ISSUERS[doc.issuer].name} de {euros(doc.totalCents)} est créée à partir du devis {doc.number} (mêmes lignes, même client). Le devis passe « Accepté ». L’aperçu s’ouvre ensuite.</p>}
        {confirm === "refuse" && <p className="text-sm text-[var(--muted-foreground)]">Le devis {doc.number} sera marqué refusé. Il pourra être rouvert.</p>}
        {confirm === "paid" && <div className="space-y-3 text-sm"><p className="text-[var(--muted-foreground)]">Facture {doc.number} · {euros(doc.totalCents)}</p><Field label="Moyen de paiement"><select value={method} onChange={event => setMethod(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">{PAYMENT_METHODS.map(item => <option key={item}>{item}</option>)}</select></Field></div>}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => setConfirm("")}>Annuler</Button>
          {confirm === "convert" && <Button disabled={busy} onClick={() => void run(async () => { const result = await convert({ id: doc._id }); onConverted(result.id); })}><Receipt className="h-4 w-4" />{busy ? "Création…" : "Créer la facture"}</Button>}
          {confirm === "refuse" && <Button variant="danger" disabled={busy} onClick={() => void run(() => setQuoteStatus({ id: doc._id, status: "refuse" }))}>Marquer refusé</Button>}
          {confirm === "paid" && <Button disabled={busy} onClick={() => void run(() => setPaid({ id: doc._id, paid: true, paymentMethod: method }))}><Check className="h-4 w-4" />Marquer payée</Button>}
        </div>
      </Dialog>, document.body)}
  </tr>;
}

/* ------------------------------------------------------------------ */
/* Éditeur : client, articles, lignes                                   */
/* ------------------------------------------------------------------ */

let lineKey = 0;

export function DocEditor({ type, onClose, onCreated, orderId, initialClient, initialLines, initialNotes }: {
  type: DocType; onClose: () => void; onCreated: (id: string) => void;
  /** Depuis la popup d'une demande : client et lignes pré-remplis, document rattaché à la demande. */
  orderId?: Id<"btOrders">; initialClient?: BillingClient; initialLines?: Omit<Line, "key">[]; initialNotes?: string;
}) {
  const create = useMutation(api.batire.createBillingDoc);
  const [client, setClient] = useState<{ clientId?: Id<"btBillingClients">; data: BillingClient } | null>(initialClient ? { data: initialClient } : null);
  const [lines, setLines] = useState<Line[]>(() => (initialLines ?? []).map(line => ({ ...line, key: ++lineKey })));
  const [freeIssuer, setFreeIssuer] = useState<Issuer>("materiosol");
  const [vatRate, setVatRate] = useState<number>(20);
  const [days, setDays] = useState("30");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lockedIssuer = lines.find(line => line.issuer)?.issuer;
  const issuer = lockedIssuer ?? freeIssuer;
  const parsed = lines.map(line => ({ materialId: line.materialId, label: line.label.trim(), quantity: parseQuantity(line.quantity), unit: line.unit.trim() || undefined, unitPriceCents: parseEuros(line.price) }));
  const valid = parsed.length > 0 && parsed.every(line => line.label && line.quantity > 0 && Number.isFinite(line.unitPriceCents) && (line.unitPriceCents >= 0 || !line.materialId));
  const sum = valid ? parsed.reduce((acc, line) => acc + Math.round(line.quantity * line.unitPriceCents), 0) : NaN;
  const total = sum >= 0 ? sum : NaN;
  const breakdown = Number.isFinite(total) ? vatBreakdown(total, vatRate) : null;
  const setLine = (key: number, patch: Partial<Line>) => setLines(current => current.map(line => line.key === key ? { ...line, ...patch } : line));

  function addMaterial(material: { _id: Id<"btMaterials">; title: string; price: number; unit: string; issuer: Issuer }) {
    setLines(current => {
      const existing = current.find(line => line.materialId === material._id);
      if (existing) return current.map(line => line === existing ? { ...line, quantity: String((parseQuantity(line.quantity) || 0) + 1) } : line);
      return [...current, { key: ++lineKey, materialId: material._id, issuer: material.issuer, label: material.title, quantity: "1", unit: material.unit, price: centsInput(Math.round(material.price * 100)) }];
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!client) { setError("Choisissez ou créez un client."); return; }
    if (!valid) { setError("Vérifiez les lignes : désignation, quantité et prix."); return; }
    setBusy(true); setError("");
    try {
      const result = await create({ type, issuer, orderId, clientId: client.clientId, client: client.data, lines: parsed, vatRate, notes: notes.trim() || undefined, ...(type === "devis" ? { validityDays: Number(days) || 30 } : { dueDays: Number(days) || 0 }) });
      onCreated(result.id);
    } catch (caught) { setError(errorText(caught, "Création impossible.")); }
    finally { setBusy(false); }
  }

  return <div role="dialog" aria-modal="true" aria-labelledby="doc-editor-title" className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 p-3 sm:p-6" onKeyDown={event => { if (event.key === "Escape" && !busy) { event.stopPropagation(); onClose(); } }}>
    <form onSubmit={submit} className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[var(--card)] text-[var(--foreground)] shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4" style={{ borderTop: `6px solid ${ISSUERS[issuer].color}` }}>
        <div>
          <h2 id="doc-editor-title" className="text-lg font-bold">{type === "devis" ? "Nouveau devis" : "Nouvelle facture"}</h2>
          <p className="text-xs text-[var(--muted-foreground)]">Émis par <strong style={{ color: ISSUERS[issuer].color }}>{ISSUERS[issuer].name}</strong>{lockedIssuer ? (issuer === "recyclerie" ? " (mobilier)" : " (matériaux)") : ""}</p>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-[var(--accent)]"><X className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Client</h3>
          {client ? <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-sm">
            <div><p className="font-semibold">{clientName(client.data)}</p><p className="text-[var(--muted-foreground)]">{[client.data.company && [client.data.firstName, client.data.lastName].filter(Boolean).join(" "), client.data.email, client.data.phone].filter(Boolean).join(" · ")}</p><p className="text-[var(--muted-foreground)]">{[client.data.address, [client.data.postalCode, client.data.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p></div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setClient(null)}>Changer</Button>
          </div> : <ClientPicker onPick={setClient} />}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Articles</h3>
          <MaterialSearch lockedIssuer={lockedIssuer} onAdd={addMaterial} />
          <div className="mt-3 space-y-2">
            {lines.length > 0 && <div className="hidden grid-cols-[minmax(0,1fr)_6rem_5rem_7rem_7rem_2rem] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] md:grid"><span>Désignation</span><span>Quantité</span><span>Unité</span><span>PU TTC (€)</span><span className="text-right">Total TTC</span><span /></div>}
            {lines.map(line => {
              const amount = parseQuantity(line.quantity) * parseEuros(line.price);
              return <div key={line.key} className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] p-2 md:grid-cols-[minmax(0,1fr)_6rem_5rem_7rem_7rem_2rem] md:items-center md:border-0 md:p-0">
                <Input className="col-span-2 md:col-span-1" aria-label="Désignation" required maxLength={300} value={line.label} onChange={event => setLine(line.key, { label: event.target.value })} placeholder="Désignation" />
                <Input aria-label="Quantité" inputMode="decimal" required value={line.quantity} onChange={event => setLine(line.key, { quantity: event.target.value.replace(/[^\d.,]/g, "") })} />
                <Input aria-label="Unité" maxLength={20} value={line.unit} onChange={event => setLine(line.key, { unit: event.target.value })} placeholder="u" />
                <Input aria-label="Prix unitaire TTC" inputMode="decimal" required value={line.price} onChange={event => setLine(line.key, { price: line.materialId ? event.target.value.replace(/[^\d.,]/g, "") : event.target.value.replace(/[^\d.,-]/g, "") })} />
                <span className="text-right text-sm font-semibold tabular-nums">{Number.isFinite(amount) ? euros(Math.round(amount)) : "—"}</span>
                <button type="button" onClick={() => setLines(current => current.filter(item => item.key !== line.key))} aria-label="Supprimer la ligne" className="justify-self-end rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>;
            })}
            <Button type="button" variant="ghost" size="sm" onClick={() => setLines(current => [...current, { key: ++lineKey, label: "", quantity: "1", unit: "", price: "" }])}><Plus className="h-4 w-4" />Ligne libre (transport, main-d’œuvre…)</Button>
          </div>
          {!lockedIssuer && lines.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="text-[var(--muted-foreground)]">Émetteur :</span>{(["materiosol", "recyclerie"] as const).map(key => <button key={key} type="button" onClick={() => setFreeIssuer(key)} className={cn("rounded-xl border px-3 py-1 font-semibold", freeIssuer === key ? "border-transparent text-white" : "border-[var(--border)]")} style={freeIssuer === key ? { backgroundColor: ISSUERS[key].color } : undefined}>{ISSUERS[key].name}</button>)}</div>}
        </section>

        <section className="grid gap-4 md:grid-cols-[1fr_18rem]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="TVA (prix saisis TTC)"><select value={vatRate} onChange={event => setVatRate(Number(event.target.value))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm">{VAT_RATES.map(rate => <option key={rate} value={rate}>{rate.toLocaleString("fr-FR")} %</option>)}</select></Field>
              <Field label={type === "devis" ? "Validité (jours)" : "Échéance (jours)"}><Input inputMode="numeric" value={days} onChange={event => setDays(event.target.value.replace(/[^\d]/g, ""))} /></Field>
            </div>
            <Field label="Notes (imprimées sur le document)"><Textarea rows={3} maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Conditions de retrait, délai, référence chantier…" /></Field>
          </div>
          <div className="space-y-1.5 self-start rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-sm">
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Total HT</span><span className="tabular-nums">{breakdown ? euros(breakdown.netCents) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">TVA {vatRate.toLocaleString("fr-FR")} %</span><span className="tabular-nums">{breakdown ? euros(breakdown.vatCents) : "—"}</span></div>
            <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base"><strong>Total TTC</strong><strong className="tabular-nums">{breakdown ? euros(total) : "—"}</strong></div>
          </div>
        </section>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-4">
        <p role="alert" className="text-sm text-red-600">{error}</p>
        <div className="flex gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Annuler</Button><Button type="submit" disabled={busy || !client || !valid}><FileText className="h-4 w-4" />{busy ? "Création…" : type === "devis" ? "Créer et prévisualiser le devis" : "Créer et prévisualiser la facture"}</Button></div>
      </footer>
    </form>
  </div>;
}

function useDebounced(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}

function MaterialSearch({ lockedIssuer, onAdd }: { lockedIssuer?: Issuer; onAdd: (material: { _id: Id<"btMaterials">; title: string; price: number; unit: string; issuer: Issuer }) => void }) {
  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim());
  const results = useQuery(api.batire.searchBillingMaterials, query.length >= 2 ? { search: query } : "skip");
  return <div>
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
      <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Chercher un article (titre, référence, QR, marque)…" aria-label="Chercher un article" className="pl-9" />
    </label>
    {query.length >= 2 && <div className="mt-2 max-h-72 overflow-y-auto rounded-2xl border border-[var(--border)]">
      {results === undefined ? <p className="p-3 text-sm text-[var(--muted-foreground)]">Recherche…</p> : results.length === 0 ? <p className="p-3 text-sm text-[var(--muted-foreground)]">Aucun article.</p>
        : <ul className="divide-y divide-[var(--border)]">{results.map(material => {
          const conflict = Boolean(lockedIssuer && lockedIssuer !== material.issuer);
          return <li key={material._id} className="flex items-center gap-3 px-3 py-2">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--muted)]">{material.thumbUrl ? <img src={material.thumbUrl} alt="" className="h-full w-full object-cover" /> : <ImageOff className="m-3 h-5 w-5 text-[var(--muted-foreground)]" />}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{material.title}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--muted-foreground)]"><span>{euros(Math.round(material.price * 100))} / {material.unit}</span><span>stock {material.quantity} {material.unit}</span>{material.reference && <span className="font-mono">{material.reference}</span>}<IssuerBadge issuer={material.issuer} />{material.status !== "disponible" && <span className="text-amber-600">{material.status}</span>}</p>
              {conflict && <p className="text-xs text-red-600">Émetteur différent : faites un document séparé.</p>}
            </div>
            <Button type="button" size="sm" variant="outline" disabled={conflict} onClick={() => onAdd(material)}><Plus className="h-4 w-4" />Ajouter</Button>
          </li>;
        })}</ul>}
    </div>}
  </div>;
}

const EMPTY_CLIENT = { company: "", firstName: "", lastName: "", email: "", phone: "", address: "", postalCode: "", city: "", siret: "", vatNumber: "" };

function ClientPicker({ onPick }: { onPick: (client: { clientId?: Id<"btBillingClients">; data: BillingClient }) => void }) {
  const createClient = useMutation(api.batire.createBillingClient);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useDebounced(search.trim());
  const results = useQuery(api.batire.searchBillingClients, query.length >= 2 && !creating ? { search: query } : "skip");
  const first = useRef<HTMLInputElement>(null);
  const set = (key: keyof typeof EMPTY_CLIENT, value: string) => setForm(current => ({ ...current, [key]: value }));
  const compact = (data: typeof EMPTY_CLIENT): BillingClient => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.trim() || undefined]));

  async function save() {
    setBusy(true); setError("");
    try { const data = compact(form); const clientId = await createClient(data); onPick({ clientId, data }); }
    catch (caught) { setError(errorText(caught, "Création du client impossible.")); }
    finally { setBusy(false); }
  }

  if (creating) return <div className="space-y-3 rounded-2xl border border-[var(--border)] p-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Raison sociale"><Input ref={first} autoFocus value={form.company} onChange={event => set("company", event.target.value)} placeholder="Facultatif pour un particulier" /></Field>
      <Field label="Email"><Input type="email" value={form.email} onChange={event => set("email", event.target.value)} /></Field>
      <Field label="Prénom"><Input value={form.firstName} onChange={event => set("firstName", event.target.value)} /></Field>
      <Field label="Nom"><Input value={form.lastName} onChange={event => set("lastName", event.target.value)} /></Field>
      <Field label="Téléphone"><Input value={form.phone} onChange={event => set("phone", event.target.value)} /></Field>
      <Field label="Adresse"><Input value={form.address} onChange={event => set("address", event.target.value)} /></Field>
      <Field label="Code postal"><Input value={form.postalCode} onChange={event => set("postalCode", event.target.value)} /></Field>
      <Field label="Ville"><Input value={form.city} onChange={event => set("city", event.target.value)} /></Field>
      <Field label="SIRET"><Input value={form.siret} onChange={event => set("siret", event.target.value)} /></Field>
      <Field label="N° TVA intracommunautaire"><Input value={form.vatNumber} onChange={event => set("vatNumber", event.target.value)} /></Field>
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex gap-2"><Button type="button" disabled={busy || !(form.company.trim() || form.firstName.trim() || form.lastName.trim())} onClick={() => void save()}><Check className="h-4 w-4" />{busy ? "Création…" : "Créer et utiliser ce client"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setCreating(false)}>Annuler</Button></div>
  </div>;

  return <div>
    <div className="flex flex-wrap gap-2">
      <label className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Chercher un client (nom, société, email, téléphone)…" aria-label="Chercher un client" className="pl-9" />
      </label>
      <Button type="button" variant="outline" onClick={() => { setForm({ ...EMPTY_CLIENT, ...(search.includes("@") ? { email: search.trim() } : { company: search.trim() }) }); setCreating(true); }}><UserPlus className="h-4 w-4" />Nouveau client</Button>
    </div>
    {query.length >= 2 && <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-[var(--border)]">
      {results === undefined ? <p className="p-3 text-sm text-[var(--muted-foreground)]">Recherche…</p> : results.length === 0 ? <p className="p-3 text-sm text-[var(--muted-foreground)]">Aucun client. Créez-le avec « Nouveau client ».</p>
        : <ul className="divide-y divide-[var(--border)]">{results.map((row, index) => {
          const { source, clientId, ...data } = row;
          return <li key={`${source}-${clientId ?? index}`}>
            <button type="button" onClick={() => onPick({ clientId, data })} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[var(--accent)]">
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{clientName(data)}</span><span className="block truncate text-xs text-[var(--muted-foreground)]">{[data.company && [data.firstName, data.lastName].filter(Boolean).join(" "), data.email, data.phone, data.city].filter(Boolean).join(" · ")}</span></span>
              <span className="shrink-0 rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]">{source === "boutique" ? "Compte boutique" : "Client"}</span>
            </button>
          </li>;
        })}</ul>}
    </div>}
  </div>;
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <div className="w-full max-w-md rounded-3xl bg-[var(--card)] p-6 text-left text-[var(--foreground)] shadow-2xl">
      <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold">{title}</h3><button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 hover:bg-[var(--accent)]"><X className="h-4 w-4" /></button></div>
      <div className="mt-3">{children}</div>
    </div>
  </div>;
}

/* ------------------------------------------------------------------ */
/* Aperçu PDF et envoi au client                                        */
/* ------------------------------------------------------------------ */

type PreviewDoc = BillingDocForPdf & { _id: Id<"btBillingDocs">; sentAt?: number; sentTo?: string };

/** Aperçu du PDF (au lieu d'un téléchargement direct), puis envoi par email. */
export function PdfPreview({ doc, canUpdate, onClose, startSending }: { doc: PreviewDoc; canUpdate: boolean; onClose: () => void; startSending?: boolean }) {
  const send = useAction(api.batire.sendBillingDoc);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(Boolean(startSending && canUpdate));
  const [to, setTo] = useState(doc.client.email ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  // Le PDF est régénéré si le document change (statut payé, etc.).
  const signature = JSON.stringify([doc.status, doc.paidAt, doc.paymentMethod, doc.number]);
  useEffect(() => {
    let revoked = "";
    let cancelled = false;
    void buildBillingPdf(doc).then(result => {
      if (cancelled) return;
      setBytes(result);
      revoked = URL.createObjectURL(new Blob([result as BlobPart], { type: "application/pdf" }));
      setUrl(revoked);
    });
    return () => { cancelled = true; if (revoked) URL.revokeObjectURL(revoked); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!bytes) return;
    setBusy(true); setError("");
    try { await send({ id: doc._id, to, message: message.trim() || undefined, pdfBase64: bytesToBase64(bytes) }); setSent(to); setSending(false); }
    catch (caught) { setError(errorText(caught, "Envoi impossible.")); }
    finally { setBusy(false); }
  }
  const label = doc.type === "devis" ? "devis" : "facture";
  return createPortal(<div role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title" className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/70 p-3 sm:p-6" onKeyDown={event => { if (event.key === "Escape" && !busy) { event.stopPropagation(); onClose(); } }}>
    <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[var(--card)] text-[var(--foreground)] shadow-2xl">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3" style={{ borderTop: `6px solid ${ISSUERS[doc.issuer].color}` }}>
        <div className="min-w-0">
          <h2 id="pdf-preview-title" className="font-bold">{doc.type === "devis" ? "Devis" : "Facture"} {doc.number}</h2>
          <p className="text-xs text-[var(--muted-foreground)]">{ISSUERS[doc.issuer].name} · {clientName(doc.client)} · {euros(doc.totalCents)}{(sent || doc.sentAt) ? ` · envoyé${sent ? ` à ${sent}` : doc.sentTo ? ` à ${doc.sentTo}` : ""}${!sent && doc.sentAt ? ` le ${new Date(doc.sentAt).toLocaleDateString("fr-FR")}` : ""}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={!bytes} onClick={() => bytes && void downloadBillingPdf(doc, bytes)}><Download className="h-4 w-4" />Télécharger</Button>
          {canUpdate && <Button size="sm" disabled={!bytes} onClick={() => { setError(""); setSending(true); }}><Send className="h-4 w-4" />{sent || doc.sentAt ? "Renvoyer au client" : "Envoyer au client"}</Button>}
          <button type="button" onClick={onClose} disabled={busy} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-[var(--accent)]"><X className="h-5 w-5" /></button>
        </div>
      </header>
      {sent && <p className="shrink-0 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><Check className="mr-1 inline h-4 w-4" />Le {label} a été envoyé à {sent}.</p>}
      <div className="min-h-0 flex-1 bg-zinc-200 dark:bg-zinc-800">
        {url ? <iframe title={`Aperçu ${doc.number}`} src={url} className="h-full w-full border-0" /> : <FullSpinner label="Génération du PDF…" />}
      </div>
    </div>
    {sending && <Dialog title={`Envoyer le ${label} au client`} onClose={() => { if (!busy) setSending(false); }}>
      <form onSubmit={submit} className="space-y-3 text-sm">
        <p className="text-[var(--muted-foreground)]">Le PDF {doc.number} part en pièce jointe, avec le montant et {doc.type === "devis" ? "la date de validité" : "l’échéance"}.</p>
        <Field label="Email du client" required><Input type="email" required autoFocus value={to} onChange={event => setTo(event.target.value)} /></Field>
        <Field label="Message (facultatif)"><Textarea rows={3} maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} placeholder="Ajouté dans l’email" /></Field>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={() => setSending(false)}>Annuler</Button><Button type="submit" disabled={busy || !to.trim()}><Send className="h-4 w-4" />{busy ? "Envoi…" : "Envoyer"}</Button></div>
      </form>
    </Dialog>}
  </div>, overlayRoot());
}

/**
 * Un <dialog> modal (popup d'une demande) passe au-dessus de tout le reste de
 * la page : l'aperçu doit s'afficher DANS ce dialog pour rester visible.
 */
function overlayRoot(): Element {
  const open = document.querySelectorAll("dialog[open]");
  return open[open.length - 1] ?? document.body;
}
