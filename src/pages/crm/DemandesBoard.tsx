import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { AlertTriangle, BellRing, CalendarClock, Check, CircleCheck, ExternalLink, ImageOff, Inbox, Mail, MapPin, MessageSquare, Pencil, Phone, Search, Send, Truck, X, XCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { LogisticsCard, ON_SITE_COLOR, TRANSIT_COLOR, shortDate } from "../../components/crm/LogisticsCard";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullSpinner } from "../../components/ui/Spinner";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { canAccess, useAccess } from "../../lib/access";
import { cn } from "../../lib/cn";
import { formatDimensions } from "../../lib/format";
import { DEFAULT_OPENING_HOURS, PICKUP_LOCATIONS, pickupLocationById, storageLocationId, type PickupLocationId } from "../../lib/pickupLocations";

type Order = FunctionReturnType<typeof api.batire.pickupOperations>["orders"][number];
type Stage = "nouveau" | "transit" | "disponible" | "retire";
type Tab = "open" | "closed";
type Mode = "" | "warehouse" | "relay";

/**
 * Pastilles de colonnes : volontairement hors du bleu et de l'orange des
 * cartes, qui codent le mode de retrait.
 */
const STAGES: { key: Exclude<Stage, "retire">; label: string; color: string }[] = [
  { key: "nouveau", label: "Nouveau", color: "#64748b" },
  { key: "transit", label: "En transit", color: "#8b5cf6" },
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
  if (order.transfer && order.transfer.status === "en_transit") return "transit";
  return "nouveau";
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

type DetailTab = "demande" | "messagerie" | "gestion";

function OrderDetail({ order, canUpdate, onClose }: { order: Order; canUpdate: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<DetailTab>("demande");
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, []);
  const relay = isRelay(order);
  const stage = stageOf(order);
  const statusLabel = order.lostAt ? "Perdue" : order.collectedAt ? "Gagnée · remise au client" : STAGES.find(item => item.key === stage)?.label;
  return <dialog ref={dialog} aria-labelledby="order-title" onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto flex h-[calc(100%-1.5rem)] max-h-none w-[calc(100%-1.5rem)] max-w-none flex-col overflow-hidden rounded-[30px] border-0 bg-[var(--card)] p-0 text-[var(--foreground)] shadow-[0_28px_90px_rgba(0,0,0,0.18)] backdrop:bg-black/70 sm:h-[calc(100%-2.5rem)] sm:w-[calc(100%-2.5rem)] lg:h-[calc(100%-3.5rem)] lg:w-[calc(100%-3.5rem)]">
    <header className="shrink-0 px-5 py-4 text-zinc-950" style={{ backgroundColor: relay ? TRANSIT_COLOR : ON_SITE_COLOR }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="order-title" className="font-mono text-2xl font-bold tracking-tight">#{orderNumber(order)}</h2>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/45 px-2 py-0.5 font-bold">{relay ? <Truck className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}{relay ? `${RELAY} · ${pickupName(order)}` : pickupName(order)}</span>
            <span className="font-medium">{statusLabel}</span>
            <PaymentStatus order={order} compact />
            <span className="text-xs text-zinc-950/65">Reçue le {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-black/10"><X className="h-5 w-5" /></button>
      </div>
      <p className="mt-3 text-lg font-semibold">{customerName(order)}</p>
      <p className="mt-0.5 text-sm">{order.quantity} {order.unit} · {order.materialTitle}{order.purchaseReference && order.purchaseReference !== orderNumber(order) ? ` · Commande ${order.purchaseReference}` : ""}</p>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)] px-6 pt-3 sm:px-7"><UnderlineTabs className="border-b-0" value={tab} onChange={setTab} items={[{ key: "demande", label: "Demande" }, { key: "messagerie", label: "Messagerie" }, { key: "gestion", label: "Gestion" }]} /></div>
      <div className="px-6 pb-6 pt-6 sm:px-7">
        {tab === "demande" ? <DemandeTab order={order} canUpdate={canUpdate} onManage={() => setTab("gestion")} /> : tab === "messagerie" ? <MessagerieTab order={order} canUpdate={canUpdate} /> : <GestionTab order={order} canUpdate={canUpdate} />}
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

/** Départ → arrivée sur une ligne, comme dans Meslogistic. */
function Route({ from, to }: { from: string; to: string }) {
  return <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
    <div className="min-w-0"><p className="text-xs text-[var(--muted-foreground)]">Départ · lieu de stockage</p><p className="mt-1 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 shrink-0" />{from}</p></div>
    <div aria-hidden className="hidden w-20 items-center sm:flex"><span className="flex-1 border-t border-dashed border-[var(--muted-foreground)]" /><span className="border-y-[5px] border-l-[8px] border-y-transparent border-l-[var(--muted-foreground)]" /></div>
    <span className="sr-only">vers</span>
    <div className="min-w-0 sm:text-right"><p className="text-xs text-[var(--muted-foreground)]">Arrivée · lieu de retrait</p><p className="mt-1 flex items-center gap-2 font-semibold sm:justify-end"><MapPin className="h-4 w-4 shrink-0" />{to}</p></div>
  </div>;
}

function DemandeTab({ order, canUpdate, onManage }: { order: Order; canUpdate: boolean; onManage: () => void }) {
  const relay = isRelay(order);
  const material = order.material;
  const [photo, setPhoto] = useState(0);
  const photos = material?.photoUrls ?? [];
  const location = pickupLocationById(order.pickupLocation);
  const dimensions = material ? formatDimensions(material) : "";
  const path = material ? [material.category, material.family, material.subcategory].filter(Boolean).join(" › ") : "";
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
    <div className="space-y-6">
      {order.lostAt && <p className="flex items-start gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><span><strong>Demande perdue</strong> le {new Date(order.lostAt).toLocaleDateString("fr-FR")}{order.lostReason ? ` · ${order.lostReason}` : ""}</span></p>}
      {needsPickupRequest(order) && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ff914d]/60 bg-[#ff914d]/15 p-4 text-sm">
        <p><strong>Enlèvement à organiser.</strong> Le client retire à {pickupName(order)} : créez la demande d’enlèvement avec son échéance pour l’envoyer à Meslogistic.</p>
        {canUpdate && <Button size="sm" onClick={onManage}><Truck className="h-4 w-4" />Créer la demande d’enlèvement</Button>}
      </div>}
      <section>
        <SectionTitle>Article</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <div className="grid gap-4 p-4 sm:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[var(--muted)]">
                {photos[photo] ? <img src={photos[photo]} alt={order.materialTitle} className="h-full w-full object-cover" /> : <ImageOff className="h-8 w-8 text-[var(--muted-foreground)]" />}
              </div>
              {photos.length > 1 && <div className="mt-2 flex gap-1.5 overflow-x-auto">{photos.map((url, index) => <button key={url} type="button" onClick={() => setPhoto(index)} aria-label={`Photo ${index + 1}`} className={cn("h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2", index === photo ? "border-brand-500" : "border-transparent opacity-70 hover:opacity-100")}><img src={url} alt="" className="h-full w-full object-cover" /></button>)}</div>}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{order.materialTitle}</p>
              {path && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{path}</p>}
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Detail label="État" value={material?.condition.replace(/_/g, " ")} />
                <Detail label="Marque" value={[material?.brand, material?.modelReference].filter(Boolean).join(" · ")} />
                <Detail label="Dimensions" value={dimensions} />
                <Detail label="Poids" value={material?.weightKg ? `${material.weightKg} kg` : undefined} />
                <Detail label="Matière" value={[material?.material, material?.color].filter(Boolean).join(" · ")} />
                <Detail label="Conditionnement" value={material?.packaging} />
                <Detail label="Stockage" value={[material?.depot, material?.location].filter(Boolean).join(" · ")} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`/materiau/${order.materialId}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--accent)]"><ExternalLink className="h-4 w-4" />Fiche produit</a>
                <a href={`/crm/materiaux/${order.materialId}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--accent)]"><Pencil className="h-4 w-4" />Fiche CRM</a>
              </div>
            </div>
          </div>
          {material?.description && <p className="whitespace-pre-line border-t border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">{material.description}</p>}
        </div>
      </section>
      <section>
        <SectionTitle>Commande</SectionTitle>
        <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] p-4 text-sm sm:grid-cols-3">
          <Detail label="Référence" value={orderNumber(order)} />
          <Detail label="Commande" value={order.purchaseReference ?? order.reference} />
          <Detail label="Quantité" value={`${order.quantity} ${order.unit}`} />
          <Detail label="Prix unitaire" value={euros(Math.round(order.unitPrice * 100))} />
          <Detail label="Montant" value={euros(order.amountCents)} />
          <Detail label="Paiement" value={<PaymentStatus order={order} />} />
        </dl>
      </section>
    </div>
    <div className="space-y-6">
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
      <section>
        <SectionTitle>Client</SectionTitle>
        <div className="space-y-3 rounded-2xl border border-[var(--border)] p-4 text-sm">
          <p className="text-lg font-semibold">{customerName(order)}</p>
          {order.customer.company && <p className="text-[var(--muted-foreground)]">{order.customer.company}</p>}
          <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 hover:underline"><Mail className="h-4 w-4" />{order.customer.email}</a>
          {order.customer.phone && <a href={`tel:${order.customer.phone}`} className="flex items-center gap-2 hover:underline"><Phone className="h-4 w-4" />{order.customer.phone}</a>}
        </div>
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">Reçue le {new Date(order.createdAt).toLocaleString("fr-FR")}</p>
      </section>
    </div>
  </div>;
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

function GestionTab({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const update = useMutation(api.batire.updatePickup);
  const confirmPayment = useMutation(api.batire.confirmOfflinePayment);
  const requestTransfer = useMutation(api.batire.requestPickupTransfer);
  const markLost = useMutation(api.batire.markPickupLost);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [availableFrom, setAvailableFrom] = useState(order.availableFrom ?? todayIso());
  const [editingDate, setEditingDate] = useState(false);
  const [hours, setHours] = useState(() => order.pickupHours ?? savedHours(order.pickupLocation));
  const [confirmNotify, setConfirmNotify] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const source = order.sourceLocation ?? storageLocationId(order.logisticsSourceDepot);
  const destinations = PICKUP_LOCATIONS.filter(location => location.id !== source);
  const [destination, setDestination] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const transit = hasTransit(order);
  const received = order.transfer?.status === "receptionnee";
  const offline = order.paymentMethod === "cash" || order.paymentMethod === "bank_transfer";
  const locked = !canUpdate || busy || Boolean(order.lostAt);
  const location = pickupLocationById(order.pickupLocation);
  const waitingTransit = (transit && !received) || needsPickupRequest(order);

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); return true; } catch (caught) { setError(errorText(caught, "Enregistrement impossible.")); return false; } finally { setBusy(false); }
  }
  async function saveAvailability(event: FormEvent) {
    event.preventDefault();
    if (await run(() => update({ orderId: order._id, step: "ready", availableFrom }))) setEditingDate(false);
  }
  async function notify() {
    try { localStorage.setItem(hoursKey(order.pickupLocation), hours.trim()); } catch { /* préférence locale facultative */ }
    if (await run(() => update({ orderId: order._id, step: "notify", pickupHours: hours.trim() }))) setConfirmNotify(false);
    else setConfirmNotify(false);
  }
  async function submitPickupRequest(event: FormEvent) {
    event.preventDefault();
    await run(() => requestTransfer({ orderId: order._id, dueDate }));
  }
  async function submitLost(event: FormEvent) {
    event.preventDefault();
    if (await run(() => markLost({ orderId: order._id, reason: lostReason, restock: isPaid(order) && restock }))) setLostOpen(false);
  }
  async function submitTransfer(event: FormEvent) {
    event.preventDefault();
    if (await run(() => requestTransfer({ orderId: order._id, destination: destination as PickupLocationId, dueDate }))) setTransferOpen(false);
  }

  return <div className="max-w-3xl space-y-6">
    {!canUpdate && <p className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs text-[var(--muted-foreground)]">Lecture seule — vous n'avez pas la permission de modifier cette demande.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}

    {needsPickupRequest(order) && <section>
      <SectionTitle>Demande d’enlèvement (Meslogistic)</SectionTitle>
      <form onSubmit={submitPickupRequest} className="space-y-4 rounded-2xl border border-[#ff914d]/60 bg-[#ff914d]/10 p-4">
        <p className="text-sm">Le client a demandé un retrait à <strong>{pickupName(order)}</strong>. Renseignez l’échéance : la demande part dans Meslogistic avec ce trajet.</p>
        <div className="rounded-xl bg-[var(--card)] p-4"><Route from={sourceName(order)} to={pickupName(order)} /></div>
        <label className="block text-sm font-semibold">Échéance · le lot doit être arrivé le (obligatoire)<input type="date" required value={dueDate} min={todayIso()} disabled={locked} onChange={event => setDueDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5 text-base" /></label>
        {!order.sourceLocation && <p className="text-xs text-red-600">Le lieu de stockage du matériau n’est pas reconnu : corrigez le dépôt sur la fiche CRM avant de créer l’enlèvement.</p>}
        <Button type="submit" disabled={locked || !dueDate || !order.sourceLocation}><Truck className="h-4 w-4" />{busy ? "Création…" : "Créer la demande d’enlèvement"}</Button>
      </form>
    </section>}

    {transit && <section>
      <SectionTitle>Acheminement (Meslogistic)</SectionTitle>
      <div className="space-y-3 rounded-2xl border border-[var(--border)] p-4 text-sm">
        <p><strong>{RELAY}</strong> · {order.transfer!.status === "a_preparer" ? "Nouveau" : order.transfer!.status === "en_transit" ? "En transit" : order.transfer!.status === "receptionnee" ? "Disponible à destination" : "Annulé"}</p>
        <Route from={order.transfer!.origin} to={order.transfer!.destination} />
        {order.transfer!.dueDate && <p>Échéance : <strong>{longDate(order.transfer!.dueDate)}</strong></p>}
        {order.transfer!.scheduledDate && <p>Navette prévue le {longDate(order.transfer!.scheduledDate)}</p>}
        {!received && <p className="text-xs text-[var(--muted-foreground)]">La carte passe en « Disponible pour retrait » dès que Meslogistic indique le lot disponible à destination.</p>}
      </div>
    </section>}

    <section>
      <SectionTitle>Disponibilité</SectionTitle>
      <div className={cn("rounded-3xl border p-4", order.readyAt ? "border-brand-500/35 bg-brand-500/10" : "border-[var(--border)] bg-[var(--muted)]")}>
        {order.readyAt && order.availableFrom && !editingDate ? <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"><Check className="h-4 w-4" /></span><span className="text-base font-semibold">Disponible le {shortDate(order.availableFrom)}</span></p>
          {canUpdate && !order.collectedAt && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditingDate(true)}><Pencil className="h-4 w-4" />Modifier la date</Button>}
        </div> : <form onSubmit={saveAvailability} className="space-y-3">
          <p className="flex items-center gap-2 text-base font-semibold"><CalendarClock className="h-5 w-5" />Disponible le</p>
          {waitingTransit && <p className="text-sm text-[var(--muted-foreground)]">{needsPickupRequest(order) ? "Créez d’abord la demande d’enlèvement." : "Le lot doit d’abord être disponible à destination dans Meslogistic."}</p>}
          <div className="flex flex-wrap items-end gap-2">
            <input type="date" required value={availableFrom} disabled={locked || waitingTransit || Boolean(order.collectedAt)} onChange={event => setAvailableFrom(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5 disabled:opacity-60" aria-label="Date de disponibilité" />
            <Button type="submit" disabled={locked || waitingTransit || !availableFrom || Boolean(order.collectedAt)}>Enregistrer</Button>
            {editingDate && <Button type="button" variant="ghost" disabled={busy} onClick={() => { setEditingDate(false); setAvailableFrom(order.availableFrom ?? todayIso()); }}>Annuler</Button>}
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">Aucun email n’est envoyé : prévenez le client avec le bouton « Notifier le client ».</p>
        </form>}
      </div>
    </section>

    {order.readyAt && order.availableFrom && !order.collectedAt && <section>
      <SectionTitle>Notifier le client</SectionTitle>
      <div className="space-y-3 rounded-2xl border border-[var(--border)] p-4 text-sm">
        {order.customerNotifiedAt && <p className="flex items-center gap-2 text-[var(--muted-foreground)]"><BellRing className="h-4 w-4" />Client notifié le {new Date(order.customerNotifiedAt).toLocaleString("fr-FR")}</p>}
        <p>Le client reçoit : la date de disponibilité, le lieu ({pickupName(order)}{location ? `, ${location.address}` : ""}), les horaires d’ouverture et sa référence.</p>
        <label className="block font-medium">Horaires d’ouverture de {pickupName(order)}<textarea rows={2} maxLength={500} value={hours} disabled={locked} onChange={event => setHours(event.target.value)} placeholder="Ex. du mardi au samedi, de 14h00 à 17h00" className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5" /></label>
        {canUpdate && <Button disabled={locked || !hours.trim()} onClick={() => { setError(""); setConfirmNotify(true); }}><BellRing className="h-4 w-4" />{order.customerNotifiedAt ? "Notifier à nouveau" : "Notifier le client"}</Button>}
      </div>
    </section>}

    {!transit && !order.relayRequested && !order.readyAt && !order.collectedAt && canUpdate && <section>
      <SectionTitle>Point relais</SectionTitle>
      {!transferOpen ? <Button variant="outline" disabled={busy} onClick={() => { setError(""); setTransferOpen(true); }}><Truck className="h-4 w-4" />Demander un point relais</Button> :
        <form onSubmit={submitTransfer} className="space-y-4 rounded-2xl border border-[var(--border)] p-4">
          <label className="block text-sm font-medium">Point relais demandé<select required value={destination} onChange={event => setDestination(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5"><option value="" disabled>Choisir un point relais</option>{destinations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label className="block text-sm font-semibold">Échéance · le lot doit être arrivé le (obligatoire)<input type="date" required value={dueDate} min={todayIso()} onChange={event => setDueDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5" /></label>
          <p className="text-xs text-[var(--muted-foreground)]">La demande passe en « Point relais » (carte orange) et Meslogistic organise l’acheminement.</p>
          <div className="flex gap-2"><Button type="submit" disabled={busy || !destination || !dueDate}>{busy ? "Création…" : "Créer la demande d’enlèvement"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setTransferOpen(false)}>Annuler</Button></div>
        </form>}
    </section>}

    {order.lostAt && <p className="flex items-start gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><span><strong>Demande perdue</strong> le {new Date(order.lostAt).toLocaleString("fr-FR")}{order.lostReason ? ` · ${order.lostReason}` : ""}</span></p>}

    <section>
      <SectionTitle>Paiement</SectionTitle>
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm", isPaid(order) ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/50 bg-amber-500/10")}>
        <PaymentStatus order={order} />
        <span className="font-semibold">{euros(order.amountCents)}</span>
      </div>
    </section>

    {(offline || order.readyAt) && <section>
      <SectionTitle>Remise au client</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {offline && order.status !== "payee" && <Button variant="outline" disabled={locked} onClick={() => void run(() => confirmPayment({ orderId: order._id }))}>Enregistrer le paiement ({order.paymentMethod === "cash" ? "espèces" : "virement"})</Button>}
        {order.readyAt && !order.collectedAt && <Button disabled={locked || (offline && order.status !== "payee")} onClick={() => void run(() => update({ orderId: order._id, step: "collect" }))}>Confirmer la remise au client</Button>}
        {order.collectedAt && <p className="text-sm text-[var(--muted-foreground)]">Remis au client le {new Date(order.collectedAt).toLocaleString("fr-FR")}.</p>}
      </div>
    </section>}

    {!isClosed(order) && canUpdate && <section>
      <SectionTitle>Clôturer sans retrait</SectionTitle>
      {!lostOpen ? <Button variant="danger" disabled={busy} onClick={() => { setError(""); setLostOpen(true); }}><XCircle className="h-4 w-4" />Perdue</Button> :
        <form onSubmit={submitLost} className="space-y-3 rounded-2xl border border-red-500/40 p-4 text-sm">
          <label className="block font-medium">Raison (obligatoire)<input required maxLength={500} value={lostReason} onChange={event => setLostReason(event.target.value)} placeholder="Ex. client injoignable, désistement…" className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5" /></label>
          {isPaid(order) && <label className="flex items-center gap-2"><input type="checkbox" checked={restock} onChange={event => setRestock(event.target.checked)} className="h-4 w-4" />Remettre {order.quantity} {order.unit} en stock</label>}
          {hasTransit(order) && order.transfer?.status === "a_preparer" && <p className="text-xs text-[var(--muted-foreground)]">L’enlèvement Meslogistic pas encore parti sera annulé.</p>}
          {isPaid(order) && <p className="text-xs text-[var(--muted-foreground)]">Commande déjà réglée : un éventuel remboursement se fait à part.</p>}
          <div className="flex gap-2"><Button type="submit" variant="danger" disabled={busy || !lostReason.trim()}>{busy ? "Enregistrement…" : "Marquer comme perdue"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setLostOpen(false)}>Annuler</Button></div>
        </form>}
    </section>}

    {confirmNotify && order.availableFrom && <ConfirmSend title="Notifier le client ?" to={order.customer.email} confirmLabel="Oui, notifier" busy={busy} onCancel={() => setConfirmNotify(false)} onConfirm={() => void notify()}>
      {`Votre retrait ${orderNumber(order)} est disponible à partir du ${longDate(order.availableFrom)}.\n\n${order.quantity} ${order.unit} · ${order.materialTitle}\n\n${pickupName(order)}${location ? `\n${location.address}` : ""}\nHoraires d’ouverture : ${hours.trim()}\nPrésentez la référence ${orderNumber(order)} à l’équipe.`}
    </ConfirmSend>}
  </div>;
}
