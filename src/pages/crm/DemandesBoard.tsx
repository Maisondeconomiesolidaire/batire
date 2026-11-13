import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { AlertTriangle, BellRing, Check, CircleCheck, Download, ExternalLink, Eye, FilePlus2, FileText, ImageOff, Inbox, Lock, Mail, MapPin, MessageSquare, Pencil, Phone, Plus, Receipt, RefreshCw, RotateCcw, Search, Send, Tag, Trash2, Truck, X, XCircle, Copy } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { LogisticsCard, ON_SITE_COLOR, TRANSIT_COLOR, shortDate } from "../../components/crm/LogisticsCard";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field, Input } from "../../components/ui/Field";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { FullSpinner } from "../../components/ui/Spinner";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { DocEditor, IssuerBadge, PAYMENT_METHODS, PdfPreview, STATUS as BILLING_STATUS, type Line as BillingLine } from "./Facturation";
import { issuerOfCategory, euros as billingEuros, frDate } from "../../lib/billing";
import { canAccess, useAccess } from "../../lib/access";
import { cn } from "../../lib/cn";
import { formatDimensions } from "../../lib/format";
import { DEFAULT_OPENING_HOURS, PICKUP_LOCATIONS, pickupLocationById, storageLocationId, type PickupLocationId } from "../../lib/pickupLocations";

type Order = FunctionReturnType<typeof api.batire.pickupOperations>["orders"][number];
type Stage = "nouveau" | "en_cours" | "disponible" | "retire";
type Tab = "open" | "closed";
type Mode = "" | "warehouse" | "relay";

/**
 * Pastilles de colonnes : volontairement hors du bleu et de l'orange des
 * cartes, qui codent le mode de retrait.
 */
const STAGES: { key: Exclude<Stage, "retire">; label: string; color: string }[] = [
  { key: "nouveau", label: "Nouveau", color: "#64748b" },
  { key: "en_cours", label: "En cours", color: "#eab308" },
  { key: "disponible", label: "Disponible pour retrait", color: "#10b981" },
];

const WAREHOUSE = "Retrait entrepôt";
const RELAY = "Point relais";
const MODE_FILTERS: { key: Mode; label: string; color?: string }[] = [
  { key: "", label: "Tout" },
  { key: "warehouse", label: WAREHOUSE, color: ON_SITE_COLOR },
  { key: "relay", label: RELAY, color: TRANSIT_COLOR },
];

function stageOf(order: Order): Stage {
  if (order.collectedAt || order.lostAt) return "retire";
  // Un transit déclaré « Disponible à destination » dans Meslogistic est prêt pour le retrait.
  if (order.readyAt || order.transfer?.status === "receptionnee") return "disponible";
  // Un lot en route reste « En cours » jusqu'à son arrivée (pas de colonne transit).
  return isTouched(order) ? "en_cours" : "nouveau";
}

/**
 * L'équipe a déjà agi sur la demande : enlèvement demandé à Meslogistic (même
 * sans navette), paiement espèces / virement enregistré, client prévenu.
 * « Nouveau » ne garde que les demandes encore jamais traitées.
 */
function isTouched(order: Order) {
  const offline = order.paymentMethod === "cash" || order.paymentMethod === "bank_transfer";
  return Boolean((order.transfer && order.transfer.status !== "annulee") || (offline && order.paidAt) || order.customerNotifiedAt || order.availableFrom);
}

const hasTransit = (order: Order) => Boolean(order.transfer && order.transfer.status !== "annulee");
/** Le client retire ailleurs que sur le lieu de stockage (transit créé ou encore à créer). */
const isRelay = (order: Order) => hasTransit(order) || order.relayRequested;
const isClosed = (order: Order) => Boolean(order.collectedAt || order.lostAt);
const needsPickupRequest = (order: Order) => order.relayRequested && !hasTransit(order) && !isClosed(order);
/** Réglé : payé en ligne, ou encaissé (espèces / virement) et confirmé par l'équipe. */
const isPaid = (order: Order) => order.status === "payee";
const paymentLabel = (order: Order) => order.paymentMethod === "cash" ? "Espèces" : order.paymentMethod === "bank_transfer" ? "Virement" : "Carte bancaire";

function PaymentStatus({ order, compact }: { order: Order; compact?: boolean }) {
  const paid = isPaid(order);
  const text = paid ? `${paymentLabel(order)} · réglé` : order.paymentMethod === "cash" ? "Espèces · à encaisser au retrait" : order.paymentMethod === "bank_transfer" ? "Virement · en attente de réception" : `${paymentLabel(order)} · paiement à effectuer`;
  return <span className={cn("inline-flex items-center gap-1.5 font-semibold", compact ? "rounded-md bg-white/60 px-2 py-0.5 text-zinc-950" : paid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
    {paid ? <CircleCheck className={cn("h-4 w-4 shrink-0", compact && "text-emerald-700")} aria-hidden /> : <AlertTriangle className={cn("h-4 w-4 shrink-0", compact && "text-orange-600")} aria-hidden />}
    {text}
  </span>;
}
const customerName = (order: Order) => `${order.customer.firstName} ${order.customer.lastName}`.trim();
const pickupName = (order: Order) => order.pickupLocationName ?? "Lieu à confirmer";
const sourceName = (order: Order) => order.sourceLocationName ?? "Lieu de stockage à confirmer";
const orderNumber = (order: Order) => order.pickupReference ?? order.purchaseReference ?? order.reference;
const longDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const todayIso = () => new Date().toLocaleDateString("sv-SE");
const errorText = (caught: unknown, fallback: string) => {
  const data = (caught as { data?: unknown })?.data;
  if (typeof data === "string") return data;
  return caught instanceof Error ? caught.message.replace(/^.*ConvexError:\s*/s, "").split("\n")[0] : fallback;
};

export function Demandes() {
  const data = useQuery(api.batire.pickupOperations, {});
  const access = useAccess();
  const canUpdate = canAccess(access, "batire:demandes", "update");
  const [tab, setTab] = useState<Tab>("open");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [openId, setOpenId] = useState<string | null>(null);

  const orders = data?.orders ?? [];
  const query = search.trim().toLocaleLowerCase("fr-FR");
  const inTab = orders.filter(order => (tab === "closed") === isClosed(order));
  const rows = inTab
    .filter(order => !mode || (mode === "relay") === isRelay(order))
    .filter(order => !query || [order.pickupReference, order.reference, order.purchaseReference, order.materialTitle, order.customer.firstName, order.customer.lastName, order.customer.email, order.customer.company, order.pickupLocationName].join(" ").toLocaleLowerCase("fr-FR").includes(query))
    .sort((a, b) => sort === "desc" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
  const current = orders.find(order => order._id === openId);
  const openCount = orders.filter(order => !isClosed(order)).length;
  const won = rows.filter(order => order.collectedAt);
  const lost = rows.filter(order => order.lostAt && !order.collectedAt);
  const modeCount = (key: Mode) => inTab.filter(order => !key || (key === "relay") === isRelay(order)).length;

  return <div className="flex min-h-[70vh] flex-col">
    <header className="border-b border-[var(--border)] pb-4">
      <h1 className="text-xl font-bold tracking-tight">Demandes</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Carte orange : retrait en point relais (enlèvement à organiser) · Carte bleue : retrait sur le lieu de stockage.</p>
    </header>
    <UnderlineTabs className="mt-4" value={tab} onChange={setTab} items={[{ key: "open", label: "Demandes en cours" }, { key: "closed", label: "Gagnées / Perdues" }]} counts={data ? { open: openCount, closed: orders.length - openCount } : undefined} />
    <>
      <div className="border-b border-[var(--border)] py-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label><span className="sr-only">Ordre des demandes</span><select value={sort} onChange={event => setSort(event.target.value as "desc" | "asc")} className="h-9 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 text-xs font-medium"><option value="desc">Plus récent</option><option value="asc">Plus ancien</option></select></label>
          <div className="h-4 w-px shrink-0 bg-[var(--border)]" />
          <div role="group" aria-label="Mode de retrait" className="flex flex-wrap gap-2">
            {MODE_FILTERS.map(filter => {
              const active = mode === filter.key;
              return <button key={filter.key || "all"} type="button" aria-pressed={active} onClick={() => setMode(filter.key)}
                className={cn("inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition",
                  filter.color ? "text-zinc-950" : active ? "bg-[var(--foreground)] text-[var(--background)]" : "border border-[var(--border)] bg-[var(--muted)]",
                  filter.color && (active ? "ring-2 ring-zinc-950/70 ring-offset-2 ring-offset-[var(--background)]" : "opacity-60 hover:opacity-100"))}
                style={filter.color ? { backgroundColor: filter.color } : undefined}>
                {filter.key === "relay" ? <Truck className="h-3.5 w-3.5" /> : filter.key === "warehouse" ? <MapPin className="h-3.5 w-3.5" /> : null}
                {filter.label}
                {data && <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", filter.color ? "bg-white/50" : active ? "bg-white/20" : "bg-[var(--card)]")}>{modeCount(filter.key)}</span>}
              </button>;
            })}
          </div>
        </div>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input type="search" aria-label="Rechercher une demande" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher par référence, client, email, matériau, lieu…" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" /></div>
      </div>
      <div className="flex-1 py-5">
        {data === undefined ? <FullSpinner label="Chargement des demandes…" /> : tab === "open" ? (
          rows.length === 0 ? <EmptyState icon={<Inbox className="h-10 w-10" />} title="Aucune demande en cours" description={search || mode ? "Aucune demande ne correspond aux filtres." : "Les commandes et réservations Bâtire apparaîtront ici."} /> :
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">{STAGES.map(stage => {
            const cards = rows.filter(order => stageOf(order) === stage.key);
            return <Column key={stage.key} title={stage.label} accent={stage.color} count={cards.length}>{cards.map(order => <OrderCard key={order._id} order={order} onOpen={() => setOpenId(order._id)} />)}</Column>;
          })}</div>
        ) : (
          rows.length === 0 ? <EmptyState icon={<Inbox className="h-10 w-10" />} title="Aucune demande clôturée" description={search || mode ? "Aucune demande ne correspond aux filtres." : "Les lots remis aux clients (gagnées) et les demandes perdues apparaîtront ici."} /> :
          <div className="flex flex-col gap-4 lg:flex-row">
            <Column title="Gagnées" accent="#196b24" count={won.length}>{won.map(order => <OrderCard key={order._id} order={order} onOpen={() => setOpenId(order._id)} />)}</Column>
            <Column title="Perdues" accent="#ef4444" count={lost.length}>{lost.map(order => <OrderCard key={order._id} order={order} onOpen={() => setOpenId(order._id)} />)}</Column>
          </div>
        )}
      </div>
    </>
    {current && <OrderDetail key={current._id} order={current} canUpdate={canUpdate} onClose={() => setOpenId(null)} />}
  </div>;
}

function Column({ title, accent, count, children }: { title: string; accent: string; count: number; children: ReactNode }) {
  return <section className="flex min-w-0 flex-1 flex-col">
    <header className="flex items-center gap-2 px-1 pb-2"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-[var(--background)]" style={{ backgroundColor: accent }} /><h2 className="text-sm font-semibold">{title}</h2><span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">{count}</span></header>
    <div className="min-h-[120px] flex-1 space-y-2.5 rounded-xl bg-[var(--muted)] p-2">{children}</div>
  </section>;
}

function cardFooter(order: Order) {
  if (order.collectedAt) return `Remis le ${shortDate(order.collectedAt)}`;
  if (order.lostAt) return `Perdue le ${shortDate(order.lostAt)}`;
  if (order.readyAt) return `${order.availableFrom ? `Dispo le ${shortDate(order.availableFrom)}` : "Disponible"} · ${order.customerNotifiedAt ? "client prévenu" : "client à prévenir"}`;
  if (order.transfer?.status === "receptionnee") return "Arrivé · date à fixer";
  if (needsPickupRequest(order)) return "Enlèvement à demander";
  if (order.transfer?.dueDate) return `Échéance ${shortDate(order.transfer.dueDate)}`;
  return undefined;
}

function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const relay = isRelay(order);
  return <LogisticsCard
    photo={order.material?.photoUrls[0] ?? null}
    source={`#${orderNumber(order)}`}
    date={shortDate(order.createdAt)}
    customer={customerName(order)}
    product={`${order.quantity} ${order.unit} · ${order.materialTitle}`}
    origin={relay ? sourceName(order) : undefined}
    destination={relay ? pickupName(order) : undefined}
    detail={relay ? undefined : <span className="flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{pickupName(order)}</span></span>}
    footer={cardFooter(order)}
    color={relay ? TRANSIT_COLOR : ON_SITE_COLOR}
    onOpen={onOpen}
  />;
}

type DetailTab = "demande" | "gestion" | "devis" | "facturation" | "promo" | "client" | "messages";
const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: "demande", label: "Demande" },
  { key: "gestion", label: "Gestion" },
  // Onglet Devis masqué : les devis Stripe exigent l’offre Invoicing Plus.
  // { key: "devis", label: "Devis" },
  { key: "facturation", label: "Facturation" },
  { key: "promo", label: "Code promo" },
  { key: "client", label: "Client" },
  { key: "messages", label: "Messages" },
];

const dateTime = (at: number) => new Date(at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function OrderDetail({ order, canUpdate, onClose }: { order: Order; canUpdate: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<DetailTab>("demande");
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, []);
  const relay = isRelay(order);
  const stage = stageOf(order);
  const statusLabel = order.lostAt ? (order.stripeRefundId ? "Perdue · remboursée" : "Perdue") : order.collectedAt ? "Gagnée · remise au client" : STAGES.find(item => item.key === stage)?.label;
  return <dialog ref={dialog} aria-labelledby="order-title" onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto flex h-[calc(100%-1.5rem)] max-h-none w-[calc(100%-1.5rem)] max-w-none flex-col overflow-hidden rounded-[30px] border-0 bg-[var(--card)] p-0 text-[var(--foreground)] shadow-[0_28px_90px_rgba(0,0,0,0.18)] backdrop:bg-black/70 sm:h-[calc(100%-2.5rem)] sm:w-[calc(100%-2.5rem)] lg:h-[calc(100%-3.5rem)] lg:w-[calc(100%-3.5rem)]">
    <header className="shrink-0 px-5 py-4 text-zinc-950" style={{ backgroundColor: relay ? TRANSIT_COLOR : ON_SITE_COLOR }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white/45 px-2 py-0.5 font-bold">{relay ? <Truck className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}{relay ? `${RELAY} · ${pickupName(order)}` : `${WAREHOUSE} · ${pickupName(order)}`}</span>
          <span className="font-medium">{statusLabel}</span>
          <h2 id="order-title" className="font-mono text-xs text-zinc-950/70">#{orderNumber(order)}</h2>
          <span className="text-xs text-zinc-950/60">{new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
          <PaymentStatus order={order} compact />
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-black/10"><X className="h-5 w-5" /></button>
      </div>
    </header>
    {order.lostAt && <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-6 py-4 sm:px-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-300">Demande perdue · motif</p>
      <p className="mt-1 text-xl font-black leading-tight">{order.lostReason || "Motif non précisé"}</p>
    </div>}
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)] px-6 pt-3 sm:px-7"><UnderlineTabs className="border-b-0" value={tab} onChange={setTab} items={DETAIL_TABS} /></div>
      <div className="px-6 pb-6 pt-6 sm:px-7">
        {tab === "demande" ? <DemandeTab order={order} canUpdate={canUpdate} />
          : tab === "gestion" ? <GestionTab order={order} canUpdate={canUpdate} />
          : tab === "devis" ? <DevisTab key={order._id} order={order} canUpdate={canUpdate} />
          : tab === "facturation" ? <BillingTab key={order._id} order={order} canUpdate={canUpdate} />
          : tab === "promo" ? <PromoTab key={order._id} order={order} canUpdate={canUpdate} />
          : tab === "client" ? <ClientTab key={order._id} order={order} canUpdate={canUpdate} />
          : <MessagerieTab order={order} canUpdate={canUpdate} />}
      </div>
    </div>
  </dialog>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{children}</h3>;
}

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function Detail({ label, value }: { label: string; value?: ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return <div><dt className="text-[var(--muted-foreground)]">{label}</dt><dd className="font-medium">{value}</dd></div>;
}

/** Ligne « libellé · valeur » du bloc Paiement, comme dans Recycapp. */
function Row({ label, value, mono }: { label: string; value?: ReactNode; mono?: boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return <div className="flex items-baseline justify-between gap-4"><span className="text-[var(--muted-foreground)]">{label}</span><span className={cn("min-w-0 truncate text-right font-medium", mono && "font-mono text-xs")}>{value}</span></div>;
}

/** Départ → arrivée sur une ligne, comme dans Meslogistic. */
function Route({ from, to }: { from: string; to: string }) {
  return <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
    <div className="min-w-0"><p className="text-xs text-[var(--muted-foreground)]">Départ · lieu de stockage</p><p className="mt-1 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 shrink-0" />{from}</p></div>
    <div aria-hidden className="hidden w-20 items-center sm:flex"><span className="flex-1 border-t border-dashed border-[var(--muted-foreground)]" /><span className="border-y-[5px] border-l-[8px] border-y-transparent border-l-[var(--muted-foreground)]" /></div>
    <span className="sr-only">vers</span>
    <div className="min-w-0 sm:text-right"><p className="text-xs text-[var(--muted-foreground)]">Arrivée · lieu de retrait</p><p className="mt-1 flex items-center gap-2 font-semibold sm:justify-end"><MapPin className="h-4 w-4 shrink-0" />{to}</p></div>
  </div>;
}

/** Fenêtre de confirmation, affichée au-dessus de la fiche. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <div className="w-full max-w-md rounded-3xl bg-[var(--card)] p-6 text-[var(--foreground)] shadow-2xl">
      <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold">{title}</h3><button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 hover:bg-[var(--accent)]"><X className="h-4 w-4" /></button></div>
      <div className="mt-3">{children}</div>
    </div>
  </div>;
}

/** Paiement de la demande, avec remboursement Stripe pour un paiement par carte (comme la boutique Recycapp). */
function PaymentSection({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const refund = useAction(api.batire.refundOrder);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const card = !order.paymentMethod || order.paymentMethod === "card";
  const refunded = Boolean(order.stripeRefundId);
  const canRefund = canUpdate && card && isPaid(order) && Boolean(order.stripePaymentIntentId) && !refunded && !order.collectedAt;
  async function submit() {
    setBusy(true); setError("");
    try { await refund({ orderId: order._id }); setOpen(false); }
    catch (caught) { setError(errorText(caught, "Remboursement impossible.")); }
    finally { setBusy(false); }
  }
  return <section>
    <SectionTitle>Paiement</SectionTitle>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
      <div className="space-y-2 text-sm">
        <Row label="Type de paiement" value={paymentLabel(order)} />
        <Row label="Paiement validé" value={isPaid(order) ? "Validé" : "En attente"} />
        <Row label="Montant" value={`${euros(order.amountCents - (order.pickupFeeCents ?? 0) + (order.discountCents ?? 0))} · ${order.quantity} ${order.unit} × ${euros(Math.round(order.unitPrice * 100))}`} />
        {order.discountCents ? <Row label={`Remise · code ${order.promoCode ?? ""}`} value={`− ${euros(order.discountCents)}`} /> : null}
        {order.pickupFeeCents ? <Row label="Frais de transfert" value={euros(order.pickupFeeCents)} /> : null}
        <div className="flex items-baseline justify-between gap-4 border-t border-[var(--border)] pt-2 text-base"><span className="font-semibold">Total</span><span className="font-bold">{euros(order.amountCents)}</span></div>
        <Row label="Date d'encaissement" value={order.paidAt ? dateTime(order.paidAt) : undefined} />
        {card && <Row label="Prestataire" value={order.stripePaymentIntentId || order.stripeSessionId ? "Stripe" : undefined} />}
        {card && <Row label="Payment Intent" value={order.stripePaymentIntentId} mono />}
        {refunded && <>
          <Row label="Remboursé le" value={order.refundedAt ? dateTime(order.refundedAt) : undefined} />
          <Row label="Montant remboursé" value={order.refundedAmountCents !== undefined ? euros(order.refundedAmountCents) : undefined} />
          <Row label="Remboursé par" value={order.refundedBy} />
          <Row label="Remboursement Stripe" value={order.stripeRefundId} mono />
        </>}
      </div>
      {canRefund && <div className="mt-4 border-t border-[var(--border)] pt-4">
        <Button variant="outline" className="text-red-600 dark:text-red-400" onClick={() => { setError(""); setOpen(true); }}><RotateCcw className="h-4 w-4" />Effectuer un remboursement</Button>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">Le montant de cette demande ({euros(order.amountCents)}) est rendu au client sur sa carte. La demande passe en « perdue » et le lot revient en stock.</p>
        {error && !open && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>}
    </div>
    {open && <Modal title="Effectuer un remboursement" onClose={() => { if (!busy) setOpen(false); }}>
      <p className="text-sm text-[var(--muted-foreground)]">Rembourser {euros(order.amountCents)} pour la demande #{orderNumber(order)} ? Le client sera recrédité sur sa carte via Stripe. Cette opération est définitive.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Annuler</Button><Button variant="danger" disabled={busy} onClick={() => void submit()}><RotateCcw className="h-4 w-4" />{busy ? "Remboursement…" : "Rembourser"}</Button></div>
    </Modal>}
  </section>;
}

/** Onglet Demande, même disposition que les demandes Boutique de Recycapp : paiement à gauche, article à droite. */
function DemandeTab({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const relay = isRelay(order);
  const material = order.material;
  const [photo, setPhoto] = useState(0);
  const photos = material?.photoUrls ?? [];
  const location = pickupLocationById(order.pickupLocation);
  const dimensions = material ? formatDimensions(material) : "";
  const path = material ? [material.category, material.family, material.subcategory].filter(Boolean).join(" › ") : "";
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
    <div className="space-y-6">
      {needsPickupRequest(order) && <p className="rounded-2xl border border-[#ff914d]/60 bg-[#ff914d]/15 p-4 text-sm"><strong>Enlèvement à demander.</strong> Le client retire à {pickupName(order)} : cochez « Enlèvement demandé » dans l’onglet Gestion.</p>}
      <PaymentSection order={order} canUpdate={canUpdate} />
      <section>
        <SectionTitle>Lieu de retrait</SectionTitle>
        <div className="space-y-3 rounded-2xl border border-[var(--border)] p-4 text-sm">
          <p className="flex items-center gap-2 text-lg font-semibold">{relay ? <Truck className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}{pickupName(order)}</p>
          {location && <p className="text-[var(--muted-foreground)]">{location.address}</p>}
          <p className="text-xs text-[var(--muted-foreground)]">{relay ? `${RELAY} : le lot doit être acheminé depuis ${sourceName(order)}.` : "Retrait sur le lieu de stockage."}</p>
          {relay && <div className="border-t border-[var(--border)] pt-3"><Route from={sourceName(order)} to={pickupName(order)} /></div>}
          {order.transfer?.dueDate && <p>Échéance : <strong>{longDate(order.transfer.dueDate)}</strong></p>}
          {order.availableFrom && <p>Disponible le <strong>{longDate(order.availableFrom)}</strong>{order.customerNotifiedAt ? " · client prévenu" : " · client à prévenir"}</p>}
        </div>
      </section>
      <p className="text-xs text-[var(--muted-foreground)]">Reçue le {dateTime(order.createdAt)}</p>
    </div>
    <section>
      <SectionTitle>Article</SectionTitle>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
        <div className="space-y-3 p-4">
          <div className="flex gap-4">
            <div className="shrink-0">
              <a href={photos[photo]} target="_blank" rel="noreferrer" className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl bg-[var(--muted)]" aria-label="Agrandir la photo">
                {photos[photo] ? <img src={photos[photo]} alt={order.materialTitle} className="h-full w-full object-cover" /> : <ImageOff className="h-6 w-6 text-[var(--muted-foreground)]" />}
              </a>
              {photos.length > 1 && <div className="mt-1.5 flex w-32 gap-1 overflow-x-auto">{photos.map((url, index) => <button key={url} type="button" onClick={() => setPhoto(index)} aria-label={`Photo ${index + 1}`} className={cn("h-8 w-8 shrink-0 overflow-hidden rounded-md border-2", index === photo ? "border-brand-500" : "border-transparent opacity-70 hover:opacity-100")}><img src={url} alt="" className="h-full w-full object-cover" /></button>)}</div>}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{order.materialTitle}</p>
              {path && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{path}</p>}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Detail label="Quantité" value={`${order.quantity} ${order.unit}`} />
            <Detail label="Prix unitaire" value={euros(Math.round(order.unitPrice * 100))} />
            <Detail label="Référence" value={orderNumber(order)} />
            <Detail label="Commande" value={order.purchaseReference ?? order.reference} />
            <Detail label="État" value={material?.condition.replace(/_/g, " ")} />
            <Detail label="Marque" value={[material?.brand, material?.modelReference].filter(Boolean).join(" · ")} />
            <Detail label="Dimensions" value={dimensions} />
            <Detail label="Poids" value={material?.weightKg ? `${material.weightKg} kg` : undefined} />
            <Detail label="Matière" value={[material?.material, material?.color].filter(Boolean).join(" · ")} />
            <Detail label="Conditionnement" value={material?.packaging} />
            <Detail label="Stockage" value={[material?.depot, material?.location].filter(Boolean).join(" · ")} />
          </dl>
          {material?.description && <p className="whitespace-pre-line border-t border-[var(--border)] pt-3 text-sm text-[var(--muted-foreground)]">{material.description}</p>}
          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
            <a href={`/materiau/${order.materialId}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--accent)]"><ExternalLink className="h-4 w-4" />Fiche produit</a>
            <a href={`/crm/materiaux/${order.materialId}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--accent)]"><Pencil className="h-4 w-4" />Fiche CRM</a>
          </div>
        </div>
      </div>
    </section>
  </div>;
}

/** Onglet Client : coordonnées modifiables, comme dans Recycapp. */
function ClientTab({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const update = useMutation(api.batire.updateOrderCustomer);
  const [form, setForm] = useState({ firstName: order.customer.firstName, lastName: order.customer.lastName, email: order.customer.email, phone: order.customer.phone ?? "", company: order.customer.company ?? "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string) => { setForm(previous => ({ ...previous, [key]: value })); setSaved(false); };
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try { await update({ orderId: order._id, customer: { ...form, phone: form.phone || undefined, company: form.company || undefined } }); setSaved(true); }
    catch (caught) { setError(errorText(caught, "Enregistrement impossible.")); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="max-w-3xl">
    <fieldset disabled={!canUpdate || saving} className="space-y-5 border-0 p-0">
      {!canUpdate && <p className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs text-[var(--muted-foreground)]">Lecture seule — vous n'avez pas la permission de modifier le client.</p>}
      <section>
        <SectionTitle>Coordonnées</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prénom"><Input value={form.firstName} onChange={event => set("firstName", event.target.value)} /></Field>
          <Field label="Nom"><Input value={form.lastName} onChange={event => set("lastName", event.target.value)} /></Field>
          <Field label="Email"><Input type="email" required value={form.email} onChange={event => set("email", event.target.value)} /></Field>
          <Field label="Téléphone"><PhoneInput value={form.phone} onValueChange={value => set("phone", value)} /></Field>
          <Field label="Société"><Input value={form.company} onChange={event => set("company", event.target.value)} /></Field>
        </div>
      </section>
      <div className="flex flex-wrap gap-4 text-sm">
        <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 hover:underline"><Mail className="h-4 w-4" />{order.customer.email}</a>
        {order.customer.phone && <a href={`tel:${order.customer.phone}`} className="flex items-center gap-2 hover:underline"><Phone className="h-4 w-4" />{order.customer.phone}</a>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {canUpdate && <div className="flex items-center gap-3"><Button type="submit">{saving ? "Enregistrement…" : "Enregistrer"}</Button>{saved && <span className="inline-flex items-center gap-1 text-sm text-brand-600"><Check className="h-4 w-4" />Enregistré</span>}</div>}
    </fieldset>
  </form>;
}

/** Confirmation avant tout envoi d'email au client. */
function ConfirmSend({ title, to, confirmLabel, busy, onCancel, onConfirm, children }: { title: string; to: string; confirmLabel: string; busy: boolean; onCancel: () => void; onConfirm: () => void; children: ReactNode }) {
  return <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-send-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onCancel(); } }}>
    <div className="w-full max-w-lg rounded-3xl bg-[var(--card)] p-6 text-[var(--foreground)] shadow-2xl">
      <h3 id="confirm-send-title" className="text-lg font-bold">{title}</h3>
      <p className="mt-3 flex items-start gap-2 text-sm text-[var(--muted-foreground)]"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><span>Un email sera envoyé à <strong className="text-[var(--foreground)]">{to}</strong>. Vérifiez qu’il est complet : chaque envoi déclenche un email séparé.</span></p>
      <div className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 text-sm">{children}</div>
      <p className="mt-4 text-sm text-[var(--muted-foreground)]">Êtes-vous sûr(e) de vouloir l’envoyer ?</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onCancel}>Non</Button><Button autoFocus disabled={busy} onClick={onConfirm}>{busy ? "Envoi…" : confirmLabel}</Button></div>
    </div>
  </div>;
}

function MessagerieTab({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const messages = useQuery(api.batire.orderMessages, { orderId: order._id });
  const send = useMutation(api.batire.sendOrderMessage);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);

  async function sendNow() {
    setBusy(true); setError("");
    try { await send({ orderId: order._id, body: draft }); setDraft(""); setConfirming(false); }
    catch (caught) { setError(errorText(caught, "Envoi impossible.")); setConfirming(false); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto flex max-w-3xl flex-col rounded-2xl border border-[var(--border)]">
    <header className="border-b border-[var(--border)] px-5 py-3">
      <p className="font-semibold">{customerName(order)}</p>
      <p className="text-xs text-[var(--muted-foreground)]">{order.customer.email} · #{orderNumber(order)} · {order.materialTitle}</p>
    </header>
    <div className="max-h-[50vh] min-h-[220px] space-y-3 overflow-y-auto p-5">
      {messages === undefined ? <FullSpinner label="Chargement des messages…" /> : messages.length === 0 ? <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="Aucun message" description="Écrivez au client : il recevra votre message par email." /> :
        messages.map(message => <div key={message._id} className={cn("max-w-[80%] rounded-2xl px-4 py-2.5", message.fromStaff ? "ml-auto bg-brand-600 text-white" : "bg-[var(--muted)]")}>
          <p className="whitespace-pre-line text-sm">{message.body}</p>
          <p className={cn("mt-1 text-[11px]", message.fromStaff ? "text-white/70" : "text-[var(--muted-foreground)]")}>{message.fromStaff ? message.authorName : message.clientName} · {new Date(message.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
        </div>)}
      <div ref={end} />
    </div>
    {error && <p role="alert" className="border-t border-[var(--border)] px-4 pt-3 text-xs font-medium text-red-600">{error}</p>}
    {canUpdate ? <div className="flex items-end gap-2 border-t border-[var(--border)] p-3">
      {/* « Entrée » passe à la ligne : un envoi accidentel expédierait un email au client. */}
      <textarea rows={3} maxLength={5000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Écrivez votre message au client… (Entrée pour aller à la ligne)" className="min-h-[72px] flex-1 resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-brand-500" />
      <Button disabled={!draft.trim() || busy} onClick={() => { setError(""); setConfirming(true); }}><Send className="h-4 w-4" />Envoyer</Button>
    </div> : <p className="border-t border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">Lecture seule.</p>}
    {confirming && <ConfirmSend title="Envoyer ce message au client ?" to={order.customer.email} confirmLabel="Oui, envoyer" busy={busy} onCancel={() => setConfirming(false)} onConfirm={() => void sendNow()}>{draft.trim()}</ConfirmSend>}
  </div>;
}

const hoursKey = (location?: string) => `batire:opening-hours:${location ?? "?"}`;
function savedHours(location?: string) {
  try { return localStorage.getItem(hoursKey(location)) ?? DEFAULT_OPENING_HOURS[location ?? ""] ?? ""; } catch { return DEFAULT_OPENING_HOURS[location ?? ""] ?? ""; }
}

type ProcessStep = {
  key: "requested" | "assigned" | "transit" | "ready" | "paid" | "collected";
  label: string;
  done: boolean;
  at?: number;
  by?: string;
  detail?: string;
  /** Cliquable depuis Bâtire. */
  actionable: boolean;
  /** Pourquoi l'étape ne se coche pas ici. */
  hint?: string;
  /** Ligne mise en avant dans la carte (ex. facture envoyée). */
  note?: string;
};

/**
 * Étapes du process, comme dans Recycapp. Point relais : enlèvement demandé →
 * navette assignée → en transit (ces deux-là cochées par Meslogistic) →
 * disponible (après l'arrivée dans Meslogistic) → payé. Retrait sur le lieu
 * de stockage : disponible → payé. Payé est indépendant des autres étapes.
 * Dans les deux cas, la dernière étape est « Retiré » : l'équipe confirme que
 * le client est venu chercher sa commande.
 */
function processSteps(order: Order, canUpdate: boolean): ProcessStep[] {
  const closed = isClosed(order);
  const editable = canUpdate && !closed;
  const steps = order.transitSteps;
  const transit = hasTransit(order);
  const arrived = order.transfer?.status === "receptionnee";
  const offline = order.paymentMethod === "cash" || order.paymentMethod === "bank_transfer";
  const ready: ProcessStep = {
    key: "ready", label: "Disponible", done: Boolean(order.readyAt), at: order.readyAt,
    detail: order.availableFrom ? `Retrait dès le ${shortDate(order.availableFrom)}` : undefined,
    actionable: editable && (!isRelay(order) || arrived),
    hint: isRelay(order) && !arrived ? "Se coche quand le lot est indiqué arrivé dans Meslogistic." : undefined,
  };
  const paid: ProcessStep = {
    key: "paid", label: "Payé", done: isPaid(order), at: order.paidAt,
    detail: paymentLabel(order),
    actionable: canUpdate && !order.lostAt && offline && !isPaid(order),
    hint: !offline && !isPaid(order) ? "Le paiement par carte se valide en ligne." : undefined,
  };
  const collected: ProcessStep = {
    key: "collected", label: "Retiré", done: Boolean(order.collectedAt), at: order.collectedAt,
    actionable: canUpdate && !order.collectedAt && !order.lostAt && Boolean(order.readyAt) && isPaid(order),
    hint: order.collectedAt || order.lostAt ? undefined : !order.readyAt ? "Se coche une fois le lot disponible." : !isPaid(order) ? "Cochez d’abord « Payé »." : undefined,
  };
  if (!isRelay(order)) return [ready, paid, collected];
  return [
    { key: "requested", label: "Enlèvement demandé", done: transit, at: steps?.requested.at, by: steps?.requested.by, detail: order.transfer?.dueDate ? `Échéance ${shortDate(order.transfer.dueDate)}` : undefined, actionable: editable && !transit },
    { key: "assigned", label: "Navette assignée", done: Boolean(steps?.assigned), at: steps?.assigned?.at, by: steps?.assigned?.by, detail: steps?.shuttleName, actionable: false, hint: "Coché par Meslogistic quand la demande est mise dans une navette." },
    { key: "transit", label: "En transit", done: Boolean(steps?.transit), at: steps?.transit?.at, by: steps?.transit?.by, actionable: false, hint: "Coché par Meslogistic au départ de la navette." },
    ready,
    paid,
    collected,
  ];
}

function ProcessChecklist({ steps, onStep, below }: { steps: ProcessStep[]; onStep: (step: ProcessStep) => void; below?: (step: ProcessStep) => ReactNode }) {
  const [hint, setHint] = useState<string | null>(null);
  const done = steps.filter(step => step.done).length;
  const percent = Math.round((done / steps.length) * 100);
  const next = steps.find(step => !step.done);
  return <div className="space-y-4">
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]"><span>Complétude</span><span className="text-brand-600 dark:text-brand-300">{percent}%</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--card)]"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${percent}%` }} /></div>
    </div>
    <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map(step => {
        const isNext = step === next;
        const clickable = step.actionable;
        return <li key={step.key}>
          <button type="button" onClick={() => clickable ? onStep(step) : step.hint ? setHint(step.hint) : undefined}
            className={cn("flex min-h-[152px] w-full flex-col items-center justify-between rounded-[24px] border px-3 py-3 text-center text-sm transition-all",
              step.done ? "border-brand-500/40 bg-brand-500/10"
                : clickable ? "border-[var(--border)] bg-[var(--card)] shadow-[0_12px_24px_rgba(0,0,0,0.08)] hover:border-brand-500"
                  : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
              clickable || step.hint ? "cursor-pointer" : "cursor-default")}>
            <span className={cn("mb-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
              step.done ? "border-brand-500 bg-brand-500 text-white" : clickable ? "border-brand-500 bg-brand-500/10" : "border-[var(--border)] bg-[var(--card)]")}>
              {step.done ? <Check className="h-4 w-4" strokeWidth={3} /> : !clickable && step.hint ? <Lock className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> : null}
            </span>
            <span className="flex flex-1 flex-col items-center justify-center">
              <span className="block font-semibold leading-5">{step.label}</span>
              {step.done && (step.at || step.by) && <span className="mt-2 flex flex-col items-center text-[11px] text-[var(--muted-foreground)]">
                {step.by && <span className="max-w-full truncate">par {step.by}</span>}
                {step.at && <span>{dateTime(step.at)}</span>}
              </span>}
              {step.detail && (step.done || step.key === "paid") && <span className="mt-1 text-[11px] font-medium text-[var(--muted-foreground)]">{step.detail}</span>}
              {step.note && <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300"><Send className="h-3 w-3" />{step.note}</span>}
            </span>
            {!step.done && (clickable ? <span className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", isNext ? "text-brand-600 dark:text-brand-300" : "text-[var(--muted-foreground)]")}>{isNext ? "Prochaine étape" : "À cocher"}</span>
              : step.hint ? <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{step.key === "assigned" || step.key === "transit" ? "Meslogistic" : "En attente"}</span> : null)}
            {step.done && step.key === "ready" && clickable && <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Modifier la date</span>}
          </button>
          {below?.(step)}
        </li>;
      })}
    </ol>
    {hint && <Modal title="Étape non modifiable ici" onClose={() => setHint(null)}>
      <p className="text-sm text-[var(--muted-foreground)]">{hint}</p>
      <div className="mt-5 flex justify-end"><Button onClick={() => setHint(null)}>Compris</Button></div>
    </Modal>}
  </div>;
}

function GestionTab({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const update = useMutation(api.batire.updatePickup);
  const confirmPayment = useMutation(api.batire.confirmOfflinePayment);
  const requestTransfer = useMutation(api.batire.requestPickupTransfer);
  const markLost = useMutation(api.batire.markPickupLost);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [availableFrom, setAvailableFrom] = useState(order.availableFrom ?? todayIso());
  const [hours, setHours] = useState(() => order.pickupHours ?? savedHours(order.pickupLocation));
  const [confirmNotify, setConfirmNotify] = useState(false);
  const [stepOpen, setStepOpen] = useState<ProcessStep["key"] | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const source = order.sourceLocation ?? storageLocationId(order.logisticsSourceDepot);
  const destinations = PICKUP_LOCATIONS.filter(location => location.id !== source);
  const [destination, setDestination] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const transit = hasTransit(order);
  const location = pickupLocationById(order.pickupLocation);
  const billingDocs = useQuery(api.batire.orderBillingDocs, { orderId: order._id });
  const invoice = billingDocs?.find(doc => doc.type === "facture");
  const sentLabel = (at: number) => { const date = new Date(at); return `${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`; };
  const steps = processSteps(order, canUpdate).map(step => step.key === "paid" && invoice?.sentAt ? { ...step, note: `Facture envoyée le ${sentLabel(invoice.sentAt)}` } : step);
  const [confirmResend, setConfirmResend] = useState(false);
  const generateInvoice = useMutation(api.batire.generateOrderInvoice);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
  const previewDoc = invoicePreview ? billingDocs?.find(doc => doc._id === invoicePreview) : undefined;

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); return true; } catch (caught) { setError(errorText(caught, "Enregistrement impossible.")); return false; } finally { setBusy(false); }
  }
  async function notify() {
    try { localStorage.setItem(hoursKey(order.pickupLocation), hours.trim()); } catch { /* préférence locale facultative */ }
    if (await run(() => update({ orderId: order._id, step: "notify", pickupHours: hours.trim() }))) setConfirmNotify(false);
  }
  async function submitStep(event: FormEvent) {
    event.preventDefault();
    const ok = stepOpen === "requested" ? await run(() => requestTransfer({ orderId: order._id, dueDate }))
      : stepOpen === "ready" ? await run(() => update({ orderId: order._id, step: "ready", availableFrom }))
        : stepOpen === "paid" ? await run(() => confirmPayment({ orderId: order._id }))
        : stepOpen === "collected" ? await run(() => update({ orderId: order._id, step: "collect" }))
          : false;
    if (ok) setStepOpen(null);
  }
  async function submitLost(event: FormEvent) {
    event.preventDefault();
    if (await run(() => markLost({ orderId: order._id, reason: lostReason, restock: isPaid(order) && restock }))) setLostOpen(false);
  }
  async function submitTransfer(event: FormEvent) {
    event.preventDefault();
    if (await run(() => requestTransfer({ orderId: order._id, destination: destination as PickupLocationId, dueDate }))) setTransferOpen(false);
  }

  return <div className="space-y-6">
    {!canUpdate && <p className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs text-[var(--muted-foreground)]">Lecture seule — vous n'avez pas la permission de modifier cette demande.</p>}
    {error && !stepOpen && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}

    <section>
      <SectionTitle>Process · {isRelay(order) ? `${RELAY} (${pickupName(order)})` : WAREHOUSE}</SectionTitle>
      <ProcessChecklist steps={steps} onStep={step => { setError(""); setDueDate(""); setAvailableFrom(order.availableFrom ?? todayIso()); setStepOpen(step.key); }}
        below={step => step.key === "paid" && step.done ? <div className="mt-2 space-y-1 text-center">
          {invoice ? <>
            {canUpdate && <Button size="sm" variant={invoice.sentAt ? "outline" : "primary"} className="w-full justify-center" onClick={() => invoice.sentAt ? setConfirmResend(true) : setInvoicePreview(invoice._id)}><Send className="h-4 w-4" />{invoice.sentAt ? "Renvoyer la facture" : "Envoyer la facture"}</Button>}
            <p className="text-[11px] text-[var(--muted-foreground)]">Facture {invoice.number}</p>
          </> : billingDocs !== undefined && canUpdate ? <Button size="sm" className="w-full justify-center" disabled={busy} onClick={() => void run(async () => { const id = await generateInvoice({ orderId: order._id }); setInvoicePreview(id); })}><Receipt className="h-4 w-4" />Générer la facture</Button> : null}
        </div> : step.key === "ready" && step.done && order.availableFrom && !order.collectedAt && !order.lostAt ? <div className="mt-2 space-y-1 text-center">
          {canUpdate && <Button size="sm" variant={order.customerNotifiedAt ? "outline" : "primary"} className="w-full justify-center" disabled={busy} onClick={() => { setError(""); setConfirmNotify(true); }}><BellRing className="h-4 w-4" />{order.customerNotifiedAt ? "Notifier à nouveau" : "Notifier le client"}</Button>}
          {order.customerNotifiedAt && <p className="text-[11px] text-[var(--muted-foreground)]">Notifié le {dateTime(order.customerNotifiedAt)}</p>}
        </div> : null} />
    </section>

    {transit && <section>
      <SectionTitle>Acheminement (Meslogistic)</SectionTitle>
      <div className="space-y-3 rounded-2xl border border-[var(--border)] p-4 text-sm">
        <Route from={order.transfer!.origin} to={order.transfer!.destination} />
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {order.transfer!.dueDate && <span>Échéance : <strong>{longDate(order.transfer!.dueDate)}</strong></span>}
          {order.transfer!.scheduledDate && <span>Navette {order.transitSteps?.shuttleName ? `« ${order.transitSteps.shuttleName} » ` : ""}prévue le {longDate(order.transfer!.scheduledDate)}</span>}
        </p>
      </div>
    </section>}



    {!transit && !order.relayRequested && !order.readyAt && !order.collectedAt && !order.lostAt && canUpdate && <section>
      <SectionTitle>Point relais</SectionTitle>
      {!transferOpen ? <Button variant="outline" disabled={busy} onClick={() => { setError(""); setDueDate(""); setTransferOpen(true); }}><Truck className="h-4 w-4" />Demander un point relais</Button> :
        <form onSubmit={submitTransfer} className="space-y-4 rounded-2xl border border-[var(--border)] p-4">
          <label className="block text-sm font-medium">Point relais demandé<select required value={destination} onChange={event => setDestination(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5"><option value="" disabled>Choisir un point relais</option>{destinations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label className="block text-sm font-semibold">Échéance · le lot doit être arrivé le (obligatoire)<input type="date" required value={dueDate} min={todayIso()} onChange={event => setDueDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5" /></label>
          <p className="text-xs text-[var(--muted-foreground)]">La demande passe en « Point relais » (carte orange) et Meslogistic organise l’acheminement.</p>
          <div className="flex gap-2"><Button type="submit" disabled={busy || !destination || !dueDate}>{busy ? "Création…" : "Créer la demande d’enlèvement"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setTransferOpen(false)}>Annuler</Button></div>
        </form>}
    </section>}

    {!isClosed(order) && canUpdate && <section>
      <SectionTitle>Clôturer sans retrait</SectionTitle>
      {!lostOpen ? <Button variant="danger" disabled={busy} onClick={() => { setError(""); setLostOpen(true); }}><XCircle className="h-4 w-4" />Perdue</Button> :
        <form onSubmit={submitLost} className="space-y-3 rounded-2xl border border-red-500/40 p-4 text-sm">
          <label className="block font-medium">Raison (obligatoire)<input required maxLength={500} value={lostReason} onChange={event => setLostReason(event.target.value)} placeholder="Ex. client injoignable, désistement…" className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5" /></label>
          {isPaid(order) && <label className="flex items-center gap-2"><input type="checkbox" checked={restock} onChange={event => setRestock(event.target.checked)} className="h-4 w-4" />Remettre {order.quantity} {order.unit} en stock</label>}
          {hasTransit(order) && order.transfer?.status === "a_preparer" && <p className="text-xs text-[var(--muted-foreground)]">L’enlèvement Meslogistic pas encore parti sera annulé.</p>}
          {isPaid(order) && <p className="text-xs text-[var(--muted-foreground)]">Commande déjà réglée : pour rendre l’argent d’un paiement par carte, utilisez plutôt « Effectuer un remboursement » (onglet Demande).</p>}
          <div className="flex gap-2"><Button type="submit" variant="danger" disabled={busy || !lostReason.trim()}>{busy ? "Enregistrement…" : "Marquer comme perdue"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setLostOpen(false)}>Annuler</Button></div>
        </form>}
    </section>}

    {stepOpen && <Modal title={stepOpen === "requested" ? "Enlèvement demandé" : stepOpen === "ready" ? "Disponible" : stepOpen === "collected" ? "Retiré" : "Payé"} onClose={() => { if (!busy) setStepOpen(null); }}>
      <form onSubmit={submitStep} className="space-y-4 text-sm">
        {stepOpen === "requested" && <>
          <p>Une demande d’enlèvement part dans Meslogistic : <strong>{sourceName(order)}</strong> → <strong>{pickupName(order)}</strong>.</p>
          <label className="block font-semibold">Échéance · le lot doit être arrivé le (obligatoire)<input type="date" required autoFocus value={dueDate} min={todayIso()} onChange={event => setDueDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5" /></label>
          {!order.sourceLocation && <p className="text-xs text-red-600">Le lieu de stockage du matériau n’est pas reconnu : corrigez le dépôt sur la fiche CRM.</p>}
        </>}
        {stepOpen === "ready" && <>
          <p>Le lot est prêt à être retiré à <strong>{pickupName(order)}</strong>. Aucun email n’est envoyé : prévenez ensuite le client avec le bouton « Notifier le client » qui apparaît sous l’étape.</p>
          <label className="block font-semibold">Disponible à partir du<input type="date" required autoFocus value={availableFrom} onChange={event => setAvailableFrom(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5" /></label>
        </>}
        {stepOpen === "collected" && <p>Confirmez que le client a bien retiré <strong>{order.quantity} {order.unit} · {order.materialTitle}</strong> à {pickupName(order)}. La demande passe dans « Gagnées ».</p>}
        {stepOpen === "paid" && <p>Confirmez avoir reçu le paiement de <strong>{euros(order.amountCents)}</strong> ({order.paymentMethod === "cash" ? "espèces" : "virement"}).</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setStepOpen(null)}>Annuler</Button>
          <Button type="submit" disabled={busy || (stepOpen === "requested" && (!dueDate || !order.sourceLocation)) || (stepOpen === "ready" && !availableFrom)}><Check className="h-4 w-4" />{busy ? "Enregistrement…" : stepOpen === "requested" ? "Envoyer à Meslogistic" : "Cocher l’étape"}</Button>
        </div>
      </form>
    </Modal>}

    {confirmResend && invoice?.sentAt && <Modal title="Facture déjà envoyée" onClose={() => setConfirmResend(false)}>
      <p className="text-sm text-[var(--muted-foreground)]">La facture {invoice.number} a déjà été envoyée le {sentLabel(invoice.sentAt)}{invoice.sentTo ? ` à ${invoice.sentTo}` : ""}. Êtes-vous sûr(e) de vouloir la renvoyer ?</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmResend(false)}>Non</Button><Button autoFocus onClick={() => { setConfirmResend(false); setInvoicePreview(invoice._id); }}><Send className="h-4 w-4" />Oui, renvoyer</Button></div>
    </Modal>}
    {previewDoc && <PdfPreview doc={previewDoc} canUpdate={canUpdate} startSending onClose={() => setInvoicePreview(null)} />}
    {confirmNotify && order.availableFrom && <div role="dialog" aria-modal="true" aria-labelledby="notify-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onKeyDown={event => { if (event.key === "Escape" && !busy) { event.stopPropagation(); setConfirmNotify(false); } }}>
      <div className="w-full max-w-lg rounded-3xl bg-[var(--card)] p-6 text-[var(--foreground)] shadow-2xl">
        <div className="flex items-start justify-between gap-3"><h3 id="notify-title" className="text-lg font-bold">Notifier le client</h3><button type="button" disabled={busy} onClick={() => setConfirmNotify(false)} aria-label="Fermer" className="rounded-lg p-1 hover:bg-[var(--accent)]"><X className="h-4 w-4" /></button></div>
        <p className="mt-3 flex items-start gap-2 text-sm text-[var(--muted-foreground)]"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><span>Email envoyé à <strong className="text-[var(--foreground)]">{order.customer.email}</strong>{order.customerNotifiedAt ? ` · déjà notifié le ${dateTime(order.customerNotifiedAt)}` : ""}</span></p>
        <label className="mt-4 block text-sm font-medium">Horaires d’ouverture de {pickupName(order)}<textarea rows={2} maxLength={500} value={hours} disabled={busy} onChange={event => setHours(event.target.value)} placeholder="Ex. du mardi au samedi, de 14h00 à 17h00" className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5" /></label>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Texte envoyé</p>
        <div className="mt-1.5 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 text-sm">
          {`Votre retrait ${orderNumber(order)} est disponible à partir du ${longDate(order.availableFrom)}.\n\n${order.quantity} ${order.unit} · ${order.materialTitle}\n\n${pickupName(order)}${location ? `\n${location.address}` : ""}\nHoraires d’ouverture : ${hours.trim() || "à renseigner"}\nPrésentez la référence ${orderNumber(order)} à l’équipe.`}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setConfirmNotify(false)}>Annuler</Button><Button disabled={busy || !hours.trim()} onClick={() => void notify()}><Send className="h-4 w-4" />{busy ? "Envoi…" : "Envoyer"}</Button></div>
      </div>
    </div>}
  </div>;
}

/* ------------------------------------------------------------------ */
/* Onglet Devis : devis Stripe, convertis en facture une fois acceptés  */
/* ------------------------------------------------------------------ */

type Quote = FunctionReturnType<typeof api.batire.orderQuotes>[number];
type DraftLine = { label: string; quantity: string; price: string };

const parseEuros = (value: string) => { const number = Number(value.replace(/\s/g, "").replace(",", ".")); return Number.isFinite(number) ? Math.round(number * 100) : NaN; };
const centsInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Lignes proposées par défaut : le lot (au prix de la demande) et les frais de transfert. */
function defaultLines(order: Order): DraftLine[] {
  const goodsCents = order.amountCents - (order.pickupFeeCents ?? 0);
  const whole = Number.isInteger(order.quantity);
  const lines: DraftLine[] = [whole
    ? { label: order.materialTitle, quantity: String(order.quantity), price: centsInput(Math.round(order.unitPrice * 100)) }
    : { label: `${order.materialTitle} — ${order.quantity.toLocaleString("fr-FR")} ${order.unit}`, quantity: "1", price: centsInput(goodsCents) }];
  if (order.pickupFeeCents) lines.push({ label: `Transfert vers ${pickupName(order)}`, quantity: "1", price: centsInput(order.pickupFeeCents) });
  return lines;
}

const QUOTE_STATUS: Record<Quote["status"], { label: string; className: string }> = {
  ouvert: { label: "Envoyé · en attente", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  accepte: { label: "Accepté · facturé", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  annule: { label: "Annulé", className: "bg-zinc-500/15 text-[var(--muted-foreground)]" },
};
const INVOICE_STATUS: Record<string, string> = { draft: "Brouillon", open: "À régler", paid: "Payée", void: "Annulée", uncollectible: "Irrécouvrable" };

function DevisTab({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const quotes = useQuery(api.batire.orderQuotes, { orderId: order._id });
  const [creating, setCreating] = useState(false);
  if (quotes === undefined) return <FullSpinner label="Chargement des devis…" />;
  const hasOpen = quotes.some(quote => quote.status === "ouvert");
  return <div className="max-w-4xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <SectionTitle>Devis</SectionTitle>
        <p className="-mt-2 text-sm text-[var(--muted-foreground)]">Devis Stripe numérotés, avec PDF officiel. Une fois accepté, le devis devient une facture Stripe.</p>
      </div>
      {canUpdate && !creating && <Button onClick={() => setCreating(true)}><FilePlus2 className="h-4 w-4" />Nouveau devis</Button>}
    </div>
    {creating && <QuoteForm order={order} warnOpen={hasOpen} onDone={() => setCreating(false)} />}
    {quotes.length === 0 && !creating ? <EmptyState icon={<FileText className="h-6 w-6" />} title="Aucun devis" description={canUpdate ? "Générez un devis à partir de la demande : les lignes sont pré-remplies, modifiables avant envoi." : "Aucun devis n'a été établi pour cette demande."} />
      : <div className="space-y-4">{quotes.map(quote => <QuoteCard key={quote._id} quote={quote} order={order} canUpdate={canUpdate} />)}</div>}
  </div>;
}

function QuoteForm({ order, warnOpen, onDone }: { order: Order; warnOpen: boolean; onDone: () => void }) {
  const create = useAction(api.batire.createQuote);
  const [lines, setLines] = useState<DraftLine[]>(() => defaultLines(order));
  const [note, setNote] = useState("");
  const [validity, setValidity] = useState("30");
  const [due, setDue] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const parsed = lines.map(line => ({ label: line.label.trim(), quantity: Number(line.quantity), unitAmountCents: parseEuros(line.price) }));
  const valid = parsed.every(line => line.label && Number.isInteger(line.quantity) && line.quantity >= 1 && Number.isFinite(line.unitAmountCents) && line.unitAmountCents >= 0);
  const total = valid ? parsed.reduce((sum, line) => sum + line.quantity * line.unitAmountCents, 0) : NaN;
  const setLine = (index: number, key: keyof DraftLine, value: string) => setLines(current => current.map((line, at) => at === index ? { ...line, [key]: value } : line));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) { setError("Vérifiez les lignes : libellé, quantité entière ≥ 1 et prix valides."); return; }
    if (!(total > 0)) { setError("Le total du devis doit être supérieur à 0 €."); return; }
    setBusy(true); setError("");
    try { await create({ orderId: order._id, lines: parsed, note: note.trim() || undefined, validityDays: Number(validity) || 30, daysUntilDue: Number(due) || 0 }); onDone(); }
    catch (caught) { setError(errorText(caught, "Création du devis impossible.")); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
    <fieldset disabled={busy} className="space-y-4 border-0 p-0">
      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Nouveau devis · {order.customer.company || `${order.customer.firstName} ${order.customer.lastName}`.trim()} <span className="font-normal text-[var(--muted-foreground)]">({order.customer.email})</span></h4></div>
      {warnOpen && <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Un devis est déjà en attente pour cette demande. Pensez à l'annuler si celui-ci le remplace.</p>}
      <div className="space-y-2">
        <div className="hidden grid-cols-[minmax(0,1fr)_5rem_7rem_7rem_2rem] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] sm:grid"><span>Désignation</span><span>Qté</span><span>Prix unit. (€)</span><span className="text-right">Total</span><span /></div>
        {lines.map((line, index) => {
          const amount = Number(line.quantity) * parseEuros(line.price);
          return <div key={index} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_7rem_2rem] sm:items-center">
            <Input aria-label="Désignation" className="col-span-2 sm:col-span-1" required maxLength={250} value={line.label} onChange={event => setLine(index, "label", event.target.value)} placeholder="Désignation" />
            <div className="col-span-2 grid grid-cols-[5rem_7rem_1fr_2rem] items-center gap-2 sm:contents">
              <Input aria-label="Quantité" inputMode="numeric" required value={line.quantity} onChange={event => setLine(index, "quantity", event.target.value.replace(/[^\d]/g, ""))} />
              <Input aria-label="Prix unitaire en euros" inputMode="decimal" required value={line.price} onChange={event => setLine(index, "price", event.target.value.replace(/[^\d.,]/g, ""))} />
              <span className="text-right text-sm font-semibold tabular-nums">{Number.isFinite(amount) ? euros(amount) : "—"}</span>
              <button type="button" disabled={lines.length === 1} onClick={() => setLines(current => current.filter((_, at) => at !== index))} aria-label="Supprimer la ligne" className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>;
        })}
        {lines.length < 20 && <Button type="button" variant="ghost" size="sm" onClick={() => setLines(current => [...current, { label: "", quantity: "1", price: "" }])}><Plus className="h-4 w-4" />Ajouter une ligne</Button>}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem]">
        <Field label="Note en pied de devis"><Input maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Conditions, délai de retrait…" /></Field>
        <Field label="Validité (jours)"><Input inputMode="numeric" value={validity} onChange={event => setValidity(event.target.value.replace(/[^\d]/g, ""))} /></Field>
        <Field label="Échéance facture (j)"><Input inputMode="numeric" value={due} onChange={event => setDue(event.target.value.replace(/[^\d]/g, ""))} /></Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <p className="text-base"><span className="text-[var(--muted-foreground)]">Total </span><strong className="tabular-nums">{Number.isFinite(total) ? euros(total) : "—"}</strong></p>
        <div className="flex gap-2"><Button type="button" variant="ghost" onClick={onDone}>Annuler</Button><Button type="submit"><FileText className="h-4 w-4" />{busy ? "Génération…" : "Générer le devis"}</Button></div>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </fieldset>
  </form>;
}

function QuoteCard({ quote, order, canUpdate }: { quote: Quote; order: Order; canUpdate: boolean }) {
  const accept = useAction(api.batire.acceptQuote);
  const cancel = useAction(api.batire.cancelQuote);
  const invoiceAction = useAction(api.batire.quoteInvoiceAction);
  const [confirm, setConfirm] = useState<"" | "accept" | "cancel" | "send" | "markPaid">("");
  const [sendInvoice, setSendInvoice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const expired = quote.status === "ouvert" && quote.expiresAt < Date.now();
  const status = expired ? { label: "Expiré", className: "bg-red-500/15 text-red-700 dark:text-red-300" } : QUOTE_STATUS[quote.status];
  async function run(task: () => Promise<unknown>, fallback: string) {
    setBusy(true); setError("");
    try { await task(); setConfirm(""); }
    catch (caught) { setError(errorText(caught, fallback)); }
    finally { setBusy(false); }
  }
  const invoicePaid = quote.invoiceStatus === "paid";
  return <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{quote.quoteNumber ?? "Devis"}</span><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", status.className)}>{status.label}</span></p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Créé le {dateTime(quote.createdAt)}{quote.createdBy ? ` par ${quote.createdBy}` : ""} · valable jusqu'au {new Date(quote.expiresAt).toLocaleDateString("fr-FR")}</p>
      </div>
      <p className="text-lg font-bold tabular-nums">{euros(quote.totalCents)}</p>
    </div>
    <ul className="mt-3 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] text-sm">
      {quote.lines.map((line, index) => <li key={index} className="flex items-baseline justify-between gap-3 px-3 py-2"><span className="min-w-0">{line.label} <span className="text-[var(--muted-foreground)]">· {line.quantity} × {euros(line.unitAmountCents)}</span></span><span className="shrink-0 font-medium tabular-nums">{euros(line.quantity * line.unitAmountCents)}</span></li>)}
    </ul>
    {quote.note && <p className="mt-2 text-xs text-[var(--muted-foreground)]">Note : {quote.note}</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      {quote.pdfUrl && <a href={quote.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--accent)]"><Download className="h-4 w-4" />PDF du devis</a>}
      {quote.pdfUrl && quote.status === "ouvert" && !expired && <a href={`mailto:${order.customer.email}?subject=${encodeURIComponent(`Votre devis ${quote.quoteNumber ?? ""} — Bâtire`)}&body=${encodeURIComponent(`Bonjour,\n\nVeuillez trouver votre devis (${euros(quote.totalCents)}) ici : ${quote.pdfUrl}\n\nIl est valable jusqu'au ${new Date(quote.expiresAt).toLocaleDateString("fr-FR")}.\n\nCordialement,`)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--accent)]"><Mail className="h-4 w-4" />Envoyer par email</a>}
      {canUpdate && quote.status === "ouvert" && !expired && <Button size="sm" onClick={() => { setError(""); setConfirm("accept"); }}><CircleCheck className="h-4 w-4" />Accepté → facturer</Button>}
      {canUpdate && quote.status === "ouvert" && <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => { setError(""); setConfirm("cancel"); }}><XCircle className="h-4 w-4" />Annuler le devis</Button>}
    </div>
    {quote.stripeInvoiceId && <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Receipt className="h-4 w-4" />Facture {quote.invoiceNumber ?? ""}<span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", invoicePaid ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")}>{INVOICE_STATUS[quote.invoiceStatus ?? ""] ?? quote.invoiceStatus ?? "—"}</span></p>
        {canUpdate && <button type="button" disabled={busy} onClick={() => void run(() => invoiceAction({ quoteId: quote._id, action: "refresh" }), "Actualisation impossible.")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)]"><RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />Actualiser</button>}
      </div>
      <div className="mt-2 space-y-1 text-xs text-[var(--muted-foreground)]">
        {quote.acceptedAt && <p>Devis accepté le {dateTime(quote.acceptedAt)}</p>}
        {quote.invoiceSentAt && <p>Facture envoyée au client le {dateTime(quote.invoiceSentAt)}</p>}
        {quote.invoicePaidAt && <p>Payée le {dateTime(quote.invoicePaidAt)}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {quote.invoicePdfUrl && <a href={quote.invoicePdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--accent)]"><Download className="h-4 w-4" />PDF de la facture</a>}
        {quote.invoiceUrl && <a href={quote.invoiceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--accent)]"><ExternalLink className="h-4 w-4" />Page de paiement</a>}
        {canUpdate && !invoicePaid && quote.invoiceStatus === "open" && <>
          <Button size="sm" variant="outline" onClick={() => { setError(""); setConfirm("send"); }}><Send className="h-4 w-4" />{quote.invoiceSentAt ? "Renvoyer" : "Envoyer"} la facture</Button>
          <Button size="sm" variant="outline" onClick={() => { setError(""); setConfirm("markPaid"); }}><Check className="h-4 w-4" />Marquer payée (hors Stripe)</Button>
        </>}
      </div>
    </div>}
    {error && !confirm && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    {confirm === "accept" && <Modal title="Devis accepté par le client ?" onClose={() => { if (!busy) setConfirm(""); }}>
      <p className="text-sm text-[var(--muted-foreground)]">Le devis {quote.quoteNumber} ({euros(quote.totalCents)}) sera marqué accepté chez Stripe et converti en facture, à régler sous l'échéance prévue. Cette opération est définitive.</p>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={sendInvoice} onChange={event => setSendInvoice(event.target.checked)} className="h-4 w-4 accent-brand-600" />Envoyer la facture par email à {order.customer.email} (via Stripe)</label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setConfirm("")}>Annuler</Button><Button disabled={busy} onClick={() => void run(() => accept({ quoteId: quote._id, sendInvoice }), "Conversion en facture impossible.")}><Receipt className="h-4 w-4" />{busy ? "Facturation…" : "Convertir en facture"}</Button></div>
    </Modal>}
    {confirm === "cancel" && <Modal title="Annuler le devis ?" onClose={() => { if (!busy) setConfirm(""); }}>
      <p className="text-sm text-[var(--muted-foreground)]">Le devis {quote.quoteNumber} sera annulé chez Stripe et ne pourra plus être accepté.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setConfirm("")}>Non</Button><Button variant="danger" disabled={busy} onClick={() => void run(() => cancel({ quoteId: quote._id }), "Annulation impossible.")}><XCircle className="h-4 w-4" />{busy ? "Annulation…" : "Annuler le devis"}</Button></div>
    </Modal>}
    {confirm === "send" && <Modal title="Envoyer la facture ?" onClose={() => { if (!busy) setConfirm(""); }}>
      <p className="text-sm text-[var(--muted-foreground)]">Stripe enverra la facture {quote.invoiceNumber} ({euros(quote.totalCents)}) par email à <strong className="text-[var(--foreground)]">{order.customer.email}</strong>, avec un lien de paiement.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setConfirm("")}>Non</Button><Button disabled={busy} onClick={() => void run(() => invoiceAction({ quoteId: quote._id, action: "send" }), "Envoi impossible.")}><Send className="h-4 w-4" />{busy ? "Envoi…" : "Envoyer"}</Button></div>
    </Modal>}
    {confirm === "markPaid" && <Modal title="Marquer la facture payée ?" onClose={() => { if (!busy) setConfirm(""); }}>
      <p className="text-sm text-[var(--muted-foreground)]">À utiliser quand le client a réglé hors Stripe (espèces, virement, chèque). La facture {quote.invoiceNumber} passera « Payée » chez Stripe.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setConfirm("")}>Non</Button><Button disabled={busy} onClick={() => void run(() => invoiceAction({ quoteId: quote._id, action: "markPaid" }), "Opération impossible.")}><Check className="h-4 w-4" />{busy ? "Enregistrement…" : "Marquer payée"}</Button></div>
    </Modal>}
  </article>;
}

/* ------------------------------------------------------------------ */
/* Onglet Code promo : geste commercial depuis la demande               */
/* ------------------------------------------------------------------ */

type Promo = FunctionReturnType<typeof api.batire.orderPromoCodes>[number];
const promoValue = (promo: Pick<Promo, "kind" | "value">) => promo.kind === "percent" ? `${promo.value} %` : euros(promo.value);

function PromoTab({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const codes = useQuery(api.batire.orderPromoCodes, { orderId: order._id });
  const create = useMutation(api.batire.createPromoCode);
  const [kind, setKind] = useState<"amount" | "percent">("amount");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [validity, setValidity] = useState("180");
  const [sendEmail, setSendEmail] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const number = Number(value.replace(",", "."));
  const parsed = kind === "percent" ? Math.round(number) : Math.round(number * 100);
  const valid = Number.isFinite(number) && (kind === "percent" ? parsed >= 1 && parsed <= 100 : parsed >= 1);
  const label = kind === "percent" ? `${parsed} %` : euros(parsed);
  async function submit() {
    setBusy(true); setError("");
    try {
      await create({ orderId: order._id, kind, value: parsed, reason: reason.trim() || undefined, validityDays: validity ? Number(validity) : undefined, sendEmail });
      setValue(""); setReason(""); setConfirm(false);
    } catch (caught) { setError(errorText(caught, "Création du code impossible.")); setConfirm(false); }
    finally { setBusy(false); }
  }
  return <div className="max-w-4xl space-y-6">
    {canUpdate && <section>
      <SectionTitle>Nouveau code promo</SectionTitle>
      <form onSubmit={event => { event.preventDefault(); if (valid) { setError(""); setConfirm(true); } }} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type de remise">
          {([["amount", "Montant (€)"], ["percent", "Pourcentage (%)"]] as const).map(([key, text]) => <button key={key} type="button" role="radio" aria-checked={kind === key} onClick={() => setKind(key)} className={cn("rounded-xl border px-3 py-1.5 text-sm font-semibold", kind === key ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-[var(--border)] bg-[var(--card)]")}>{text}</button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr_9rem]">
          <Field label={kind === "percent" ? "Remise (%)" : "Remise (€)"} required><Input inputMode="decimal" required value={value} onChange={event => setValue(event.target.value.replace(/[^\d.,]/g, ""))} placeholder={kind === "percent" ? "10" : "15,00"} /></Field>
          <Field label="Motif"><Input maxLength={300} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ex. article défectueux" /></Field>
          <Field label="Validité (jours)"><Input inputMode="numeric" value={validity} onChange={event => setValidity(event.target.value.replace(/[^\d]/g, ""))} placeholder="Illimitée" /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendEmail} onChange={event => setSendEmail(event.target.checked)} className="h-4 w-4 accent-brand-600" />Envoyer le code par email à {order.customer.email}</label>
        <p className="text-xs text-[var(--muted-foreground)]">Code à usage unique, valable sur un panier de la boutique (hors frais de transfert). Il s’affiche ci-dessous : le client peut aussi le noter sur place.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy || !valid}><Tag className="h-4 w-4" />Générer le code</Button>
      </form>
    </section>}
    <section>
      <SectionTitle>Codes émis pour cette demande</SectionTitle>
      {codes === undefined ? <FullSpinner label="Chargement…" /> : codes.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">Aucun code promo pour cette demande.</p>
        : <div className="space-y-3">{codes.map(promo => <PromoCard key={promo._id} promo={promo} order={order} canUpdate={canUpdate} />)}</div>}
    </section>
    {confirm && !sendEmail && <Modal title="Générer le code promo ?" onClose={() => { if (!busy) setConfirm(false); }}>
      <p className="text-sm text-[var(--muted-foreground)]">Remise de {label}{reason.trim() ? ` · ${reason.trim()}` : ""}, {validity ? `valable ${validity} jours` : "sans date d’expiration"}, usage unique. Aucun email n’est envoyé : communiquez le code au client sur place.</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>Annuler</Button><Button disabled={busy} onClick={() => void submit()}><Tag className="h-4 w-4" />{busy ? "Génération…" : "Générer"}</Button></div>
    </Modal>}
    {confirm && sendEmail && <ConfirmSend title="Générer et envoyer le code promo ?" to={order.customer.email} confirmLabel="Oui, générer" busy={busy} onCancel={() => setConfirm(false)} onConfirm={() => void submit()}>
      {`Remise de ${label}${reason.trim() ? ` · ${reason.trim()}` : ""}\n${validity ? `Valable ${validity} jours` : "Sans date d’expiration"} · usage unique\n${sendEmail ? "Le code est envoyé au client par email." : "Aucun email : communiquez le code au client sur place."}`}
    </ConfirmSend>}
  </div>;
}

function PromoCard({ promo, order, canUpdate }: { promo: Promo; order: Order; canUpdate: boolean }) {
  const act = useMutation(api.batire.promoCodeAction);
  const [confirm, setConfirm] = useState<"" | "email" | "cancel" | "release">("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const expired = !promo.usedAt && !promo.canceledAt && promo.expiresAt !== undefined && promo.expiresAt < Date.now();
  const status = promo.canceledAt ? { label: "Annulé", className: "bg-zinc-500/15 text-[var(--muted-foreground)]" }
    : promo.usedAt ? { label: `Utilisé${promo.usedReference ? ` · ${promo.usedReference}` : ""}`, className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }
      : expired ? { label: "Expiré", className: "bg-red-500/15 text-red-700 dark:text-red-300" }
        : { label: "Actif", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
  const active = !promo.canceledAt && !promo.usedAt && !expired;
  async function run() {
    if (!confirm) return;
    setBusy(true); setError("");
    try { await act({ promoId: promo._id, action: confirm }); setConfirm(""); }
    catch (caught) { setError(errorText(caught, "Opération impossible.")); setConfirm(""); }
    finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(promo.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* presse-papiers indisponible */ } }
  return <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("rounded-xl border-2 border-dashed px-3 py-1.5 font-mono text-lg font-black tracking-wider", active ? "border-brand-500 text-brand-700 dark:text-brand-300" : "border-[var(--border)] text-[var(--muted-foreground)] line-through")}>{promo.code}</span>
        <button type="button" onClick={() => void copy()} aria-label="Copier le code" className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">{copied ? <Check className="h-4 w-4 text-brand-600" /> : <Copy className="h-4 w-4" />}</button>
        <span className="text-lg font-bold">{promoValue(promo)}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", status.className)}>{status.label}</span>
      </div>
      {canUpdate && <div className="flex flex-wrap gap-2">
        {active && <Button size="sm" variant="outline" onClick={() => setConfirm("email")}><Mail className="h-4 w-4" />{promo.emailedAt ? "Renvoyer" : "Envoyer"} par email</Button>}
        {active && <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => setConfirm("cancel")}><XCircle className="h-4 w-4" />Annuler</Button>}
        {promo.releasable && <Button size="sm" variant="outline" onClick={() => setConfirm("release")}><RotateCcw className="h-4 w-4" />Réactiver</Button>}
      </div>}
    </div>
    <div className="mt-2 space-y-0.5 text-xs text-[var(--muted-foreground)]">
      {promo.reason && <p>Motif : {promo.reason}</p>}
      <p>Créé le {dateTime(promo.createdAt)}{promo.createdBy ? ` par ${promo.createdBy}` : ""} · {promo.expiresAt ? `valable jusqu’au ${new Date(promo.expiresAt).toLocaleDateString("fr-FR")}` : "sans date d’expiration"}</p>
      {promo.emailedAt && <p>Envoyé par email le {dateTime(promo.emailedAt)}</p>}
      {promo.usedAt && <p>Utilisé le {dateTime(promo.usedAt)}{promo.usedDiscountCents !== undefined ? ` · remise de ${euros(promo.usedDiscountCents)}` : ""}{promo.releasable ? " · commande non réglée (panier abandonné ?)" : ""}</p>}
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    {confirm === "email" && <ConfirmSend title="Envoyer le code promo ?" to={order.customer.email} confirmLabel="Oui, envoyer" busy={busy} onCancel={() => setConfirm("")} onConfirm={() => void run()}>
      {`Code promo ${promo.code} : ${promoValue(promo)} de remise${promo.reason ? ` (${promo.reason})` : ""}.\n${promo.expiresAt ? `Valable jusqu’au ${new Date(promo.expiresAt).toLocaleDateString("fr-FR")}, ` : ""}utilisable une fois dans le panier BâtiRe.`}
    </ConfirmSend>}
    {(confirm === "cancel" || confirm === "release") && <Modal title={confirm === "cancel" ? "Annuler le code promo ?" : "Réactiver le code promo ?"} onClose={() => { if (!busy) setConfirm(""); }}>
      <p className="text-sm text-[var(--muted-foreground)]">{confirm === "cancel" ? `Le code ${promo.code} ne pourra plus être utilisé.` : `Le code ${promo.code} a servi à une commande jamais réglée. Il redevient utilisable par le client.`}</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setConfirm("")}>Non</Button><Button variant={confirm === "cancel" ? "danger" : "primary"} disabled={busy} onClick={() => void run()}>{busy ? "…" : confirm === "cancel" ? "Annuler le code" : "Réactiver"}</Button></div>
    </Modal>}
  </article>;
}

/* ------------------------------------------------------------------ */
/* Onglet Facturation : devis / factures rattachés à la demande         */
/* ------------------------------------------------------------------ */

const centsText = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Lignes pré-remplies : le lot de la demande, le transfert, la remise du code promo. */
function orderBillingLines(order: Order): Omit<BillingLine, "key">[] {
  const issuer = issuerOfCategory(order.material?.category ?? "");
  const lines: Omit<BillingLine, "key">[] = [{ materialId: order.materialId, issuer, label: order.materialTitle, quantity: String(order.quantity).replace(".", ","), unit: order.unit, price: centsText(Math.round(order.unitPrice * 100)) }];
  if (order.pickupFeeCents) lines.push({ label: `Transfert vers ${pickupName(order)}`, quantity: "1", unit: "", price: centsText(order.pickupFeeCents) });
  if (order.discountCents) lines.push({ label: `Remise${order.promoCode ? ` · code ${order.promoCode}` : ""}`, quantity: "1", unit: "", price: centsText(-order.discountCents) });
  return lines;
}

function BillingTab({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const docs = useQuery(api.batire.orderBillingDocs, { orderId: order._id });
  const [editing, setEditing] = useState<"devis" | "facture" | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = previewId ? docs?.find(item => item._id === previewId) : undefined;
  return <div className="max-w-5xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <SectionTitle>Devis et factures de la demande</SectionTitle>
        <p className="-mt-2 text-sm text-[var(--muted-foreground)]">Client et lignes pré-remplis depuis la demande, modifiables avant création. Retrouvés aussi dans la page Facturation.</p>
      </div>
      {canUpdate && <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setEditing("devis")}><FilePlus2 className="h-4 w-4" />Générer un devis</Button>
        <Button onClick={() => setEditing("facture")}><Receipt className="h-4 w-4" />Générer une facture</Button>
      </div>}
    </div>
    {docs === undefined ? <FullSpinner label="Chargement…" /> : docs.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">Aucun devis ni facture pour cette demande.</p>
      : <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-left text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
            <tr><th className="px-3 py-2.5 font-semibold">Document</th><th className="px-3 py-2.5 font-semibold">Date</th><th className="px-3 py-2.5 text-right font-semibold">Total TTC</th><th className="px-3 py-2.5 font-semibold">Statut</th><th className="px-3 py-2.5 text-right font-semibold" /></tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">{docs.map(doc => <BillingRow key={doc._id} doc={doc} canUpdate={canUpdate} onPreview={setPreviewId} />)}</tbody>
        </table>
      </div>}
    {editing && <DocEditor type={editing} orderId={order._id} onClose={() => setEditing(null)} onCreated={id => { setEditing(null); setPreviewId(id); }}
      initialClient={{ company: order.customer.company, firstName: order.customer.firstName, lastName: order.customer.lastName, email: order.customer.email, phone: order.customer.phone }}
      initialLines={orderBillingLines(order)} initialNotes={`Demande Bâtire #${orderNumber(order)} · retrait ${pickupName(order)}`} />}
    {preview && <PdfPreview doc={preview} canUpdate={canUpdate} onClose={() => setPreviewId(null)} />}
  </div>;
}

type BillingDoc = FunctionReturnType<typeof api.batire.orderBillingDocs>[number];

function BillingRow({ doc, canUpdate, onPreview }: { doc: BillingDoc; canUpdate: boolean; onPreview: (id: string) => void }) {
  const setQuoteStatus = useMutation(api.batire.setQuoteStatus);
  const setPaid = useMutation(api.batire.setInvoicePaid);
  const convert = useMutation(api.batire.convertQuoteToInvoice);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(task: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await task(); } catch (caught) { setError(errorText(caught, "Opération impossible.")); } finally { setBusy(false); }
  }
  const invoiced = doc.type === "devis" && Boolean(doc.invoiceId);
  const value = doc.type === "facture" ? (doc.status === "payee" ? `payee:${doc.paymentMethod ?? ""}` : "a_regler") : invoiced ? "facture" : doc.status;
  const options = doc.type === "facture"
    ? [{ value: "a_regler", label: "À régler" }, ...PAYMENT_METHODS.map(method => ({ value: `payee:${method}`, label: `Payée · ${method}` })), ...(doc.status === "payee" && !PAYMENT_METHODS.includes(doc.paymentMethod ?? "") ? [{ value, label: "Payée" }] : [])]
    : invoiced ? [{ value: "facture", label: "Facturé" }]
      : [{ value: "en_attente", label: "En attente" }, { value: "accepte", label: "Accepté" }, { value: "refuse", label: "Refusé" }, { value: "annule", label: "Annulé" }];
  function change(next: string) {
    if (doc.type === "facture") void run(() => next === "a_regler" ? setPaid({ id: doc._id, paid: false }) : setPaid({ id: doc._id, paid: true, paymentMethod: next.slice("payee:".length) || undefined }));
    else void run(() => setQuoteStatus({ id: doc._id, status: next as "en_attente" | "accepte" | "refuse" | "annule" }));
  }
  const tone = BILLING_STATUS[doc.status]?.className ?? "";
  return <tr className="align-middle">
    <td className="px-3 py-2.5"><p className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">{doc.type === "devis" ? "Devis" : "Facture"}</span><span className="font-mono font-semibold">{doc.number}</span><IssuerBadge issuer={doc.issuer} /></p>{doc.linkedNumber && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{doc.type === "devis" ? "→ facture" : "← devis"} {doc.linkedNumber}</p>}</td>
    <td className="px-3 py-2.5 whitespace-nowrap">{frDate(doc.issueDate)}<p className="text-xs text-[var(--muted-foreground)]">{doc.type === "devis" ? `valable → ${frDate(doc.validUntil)}` : `échéance ${frDate(doc.dueDate)}`}</p>{doc.sentAt && <p className="text-xs text-[var(--muted-foreground)]">envoyé le {new Date(doc.sentAt).toLocaleDateString("fr-FR")}</p>}</td>
    <td className="px-3 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap">{billingEuros(doc.totalCents)}</td>
    <td className="px-3 py-2.5">
      <select aria-label={`Statut ${doc.number}`} value={value} disabled={!canUpdate || busy || invoiced} onChange={event => change(event.target.value)} className={cn("rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-semibold disabled:opacity-80", invoiced ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : tone)}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <p className="mt-1 max-w-[14rem] text-xs text-red-600">{error}</p>}
    </td>
    <td className="px-3 py-2.5"><div className="flex justify-end gap-1.5">
      <Button size="sm" variant="outline" onClick={() => onPreview(doc._id)}><Eye className="h-4 w-4" />Aperçu</Button>
      {canUpdate && doc.type === "devis" && !invoiced && (doc.status === "en_attente" || doc.status === "accepte") && <Button size="sm" disabled={busy} onClick={() => void run(async () => { const result = await convert({ id: doc._id }); onPreview(result.id); })}><Receipt className="h-4 w-4" />Facturer</Button>}
    </div></td>
  </tr>;
}
