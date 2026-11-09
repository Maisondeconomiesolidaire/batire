import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, Inbox, Mail, MapPin, Phone, Search, Truck, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { LogisticsCard, ON_SITE_COLOR, TRANSIT_COLOR, shortDate } from "../../components/crm/LogisticsCard";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullSpinner } from "../../components/ui/Spinner";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { canAccess, useAccess } from "../../lib/access";
import { PICKUP_LOCATIONS, storageLocationId, type PickupLocationId } from "../../lib/pickupLocations";
import { OtherRequests } from "./OtherRequests";

type Order = FunctionReturnType<typeof api.batire.pickupOperations>["orders"][number];
type Stage = "nouveau" | "transit" | "disponible" | "retire";
type Tab = "open" | "collected" | "other";

const STAGES: { key: Exclude<Stage, "retire">; label: string; color: string }[] = [
  { key: "nouveau", label: "Nouveau", color: "#3b82f6" },
  { key: "transit", label: "En transit", color: TRANSIT_COLOR },
  { key: "disponible", label: "Disponible pour retrait", color: "#10b981" },
];

/** Bâtire n'affiche pas les emplacements : seulement le mode de retrait demandé. */
const WAREHOUSE = "Retrait entrepôt";
const RELAY = "Point relais demandé";
type Mode = "" | "warehouse" | "relay";

function stageOf(order: Order): Stage {
  if (order.collectedAt) return "retire";
  // Un transit déclaré « Disponible à destination » dans Meslogistic est prêt pour le retrait.
  if (order.readyAt || order.transfer?.status === "receptionnee") return "disponible";
  if (order.transfer && ["en_transit", "receptionnee"].includes(order.transfer.status)) return "transit";
  return "nouveau";
}

const hasTransit = (order: Order) => Boolean(order.transfer && order.transfer.status !== "annulee");
const customerName = (order: Order) => `${order.customer.firstName} ${order.customer.lastName}`.trim();
const modeLabel = (order: Order) => hasTransit(order) ? RELAY : WAREHOUSE;
const orderNumber = (order: Order) => order.pickupReference ?? order.purchaseReference ?? order.reference;

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
  const rows = orders
    .filter(order => !mode || (mode === "relay") === hasTransit(order))
    .filter(order => !query || [order.pickupReference, order.reference, order.purchaseReference, order.materialTitle, order.customer.firstName, order.customer.lastName, order.customer.email, order.customer.company].join(" ").toLocaleLowerCase("fr-FR").includes(query))
    .sort((a, b) => sort === "desc" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
  const current = orders.find(order => order._id === openId);
  const openCount = orders.filter(order => !order.collectedAt).length;

  return <div className="flex min-h-[70vh] flex-col">
    <header className="border-b border-[var(--border)] pb-4">
      <h1 className="text-xl font-bold tracking-tight">Demandes</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Orange : {RELAY.toLocaleLowerCase("fr-FR")} · Bleu : {WAREHOUSE.toLocaleLowerCase("fr-FR")}.</p>
    </header>
    <UnderlineTabs className="mt-4" value={tab} onChange={setTab} items={[{ key: "open", label: "Demandes en cours" }, { key: "collected", label: "Retirées" }, { key: "other", label: "Devis et questions" }]} counts={data ? { open: openCount, collected: orders.length - openCount } : undefined} />
    {tab === "other" ? <div className="pt-4"><OtherRequests /></div> : <>
      <div className="border-b border-[var(--border)] py-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label><span className="sr-only">Ordre des demandes</span><select value={sort} onChange={event => setSort(event.target.value as "desc" | "asc")} className="h-9 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 text-xs font-medium"><option value="desc">Plus récent</option><option value="asc">Plus ancien</option></select></label>
          <div className="h-4 w-px shrink-0 bg-[var(--border)]" />
          <label><span className="sr-only">Mode de retrait</span><select value={mode} onChange={event => setMode(event.target.value as Mode)} className="h-9 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 text-xs font-medium"><option value="">Tous les modes de retrait</option><option value="warehouse">{WAREHOUSE}</option><option value="relay">{RELAY}</option></select></label>
        </div>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input type="search" aria-label="Rechercher une demande" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher par client, référence, email, matériau…" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" /></div>
      </div>
      <div className="flex-1 py-5">
        {data === undefined ? <FullSpinner label="Chargement des demandes…" /> : tab === "open" ? (
          !rows.some(order => !order.collectedAt) ? <EmptyState icon={<Inbox className="h-10 w-10" />} title="Aucune demande en cours" description={search || mode ? "Aucune demande ne correspond aux filtres." : "Les commandes et réservations Bâtire apparaîtront ici."} /> :
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">{STAGES.map(stage => {
            const cards = rows.filter(order => stageOf(order) === stage.key);
            return <Column key={stage.key} title={stage.label} accent={stage.color} count={cards.length}>{cards.map(order => <OrderCard key={order._id} order={order} onOpen={() => setOpenId(order._id)} />)}</Column>;
          })}</div>
        ) : (
          !rows.some(order => order.collectedAt) ? <EmptyState icon={<Inbox className="h-10 w-10" />} title="Aucun retrait terminé" description="Les lots remis aux clients apparaîtront ici." /> :
          <div className="flex flex-col gap-4 lg:flex-row"><Column title="Retirées" accent="#71717a" count={rows.filter(order => order.collectedAt).length}>{rows.filter(order => order.collectedAt).map(order => <OrderCard key={order._id} order={order} onOpen={() => setOpenId(order._id)} />)}</Column></div>
        )}
      </div>
    </>}
    {current && <OrderDetail key={current._id} order={current} canUpdate={canUpdate} onClose={() => setOpenId(null)} />}
  </div>;
}

function Column({ title, accent, count, children }: { title: string; accent: string; count: number; children: ReactNode }) {
  return <section className="flex min-w-0 flex-1 flex-col">
    <header className="flex items-center gap-2 px-1 pb-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} /><h2 className="text-sm font-semibold">{title}</h2><span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">{count}</span></header>
    <div className="min-h-[120px] flex-1 space-y-2.5 rounded-xl bg-[var(--muted)] p-2">{children}</div>
  </section>;
}

function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const due = order.transfer?.dueDate;
  return <LogisticsCard
    source="BatiRE"
    date={shortDate(order.createdAt)}
    customer={customerName(order)}
    product={`${order.quantity} ${order.unit} · ${order.materialTitle}`}
    detail={<><span className="min-w-0 truncate font-mono">#{orderNumber(order)}</span><span className="shrink-0 font-semibold">{modeLabel(order)}</span></>}
    footer={order.readyAt ? "Prêt · client prévenu" : order.transfer?.status === "receptionnee" ? "Arrivé · client à prévenir" : due ? shortDate(due) : undefined}
    color={hasTransit(order) ? TRANSIT_COLOR : ON_SITE_COLOR}
    onOpen={onOpen}
  />;
}

function OrderDetail({ order, canUpdate, onClose }: { order: Order; canUpdate: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"demande" | "gestion">("demande");
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, []);
  const transit = hasTransit(order);
  const stage = stageOf(order);
  const statusLabel = stage === "retire" ? "Retirée" : STAGES.find(item => item.key === stage)?.label;
  return <dialog ref={dialog} aria-labelledby="order-title" onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto flex h-[calc(100%-1.5rem)] max-h-none w-[calc(100%-1.5rem)] max-w-none flex-col overflow-hidden rounded-[30px] border-0 bg-[var(--card)] p-0 text-[var(--foreground)] shadow-[0_28px_90px_rgba(0,0,0,0.18)] backdrop:bg-black/70 sm:h-[calc(100%-2.5rem)] sm:w-[calc(100%-2.5rem)] lg:h-[calc(100%-3.5rem)] lg:w-[calc(100%-3.5rem)]">
    <header className="shrink-0 px-5 py-4 text-zinc-950" style={{ backgroundColor: transit ? TRANSIT_COLOR : ON_SITE_COLOR }}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white/45 px-2 py-0.5 font-bold">{transit ? <Truck className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}{modeLabel(order)}</span>
          <span className="font-medium">{statusLabel}</span>
          <span className="font-mono text-xs text-zinc-950/65">#{order.pickupReference ?? order.reference}</span>
          <span className="text-xs text-zinc-950/65">{new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
        </p>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-black/10"><X className="h-5 w-5" /></button>
      </div>
      <h2 id="order-title" className="mt-3 text-xl font-bold">{customerName(order)}</h2>
      <p className="mt-1 text-sm">{order.quantity} {order.unit} · {order.materialTitle} · Commande {orderNumber(order)}</p>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)] px-6 pt-3 sm:px-7"><UnderlineTabs className="border-b-0" value={tab} onChange={setTab} items={[{ key: "demande", label: "Demande" }, { key: "gestion", label: "Gestion" }]} /></div>
      <div className="px-6 pb-6 pt-6 sm:px-7">
        {tab === "demande" ? <DemandeTab order={order} /> : <GestionTab order={order} canUpdate={canUpdate} />}
      </div>
    </div>
  </dialog>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{children}</h3>;
}

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function DemandeTab({ order }: { order: Order }) {
  const transit = hasTransit(order);
  const payment = order.paymentMethod === "cash" ? "Espèces au retrait" : order.paymentMethod === "bank_transfer" ? "Virement bancaire" : "Carte bancaire";
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
    <div className="space-y-6">
      <section>
        <SectionTitle>Produit</SectionTitle>
        <div className="rounded-2xl border border-[var(--border)] p-4">
          <p className="text-lg font-semibold">{order.materialTitle}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-[var(--muted-foreground)]">Quantité</dt><dd className="font-medium">{order.quantity} {order.unit}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Prix unitaire</dt><dd className="font-medium">{euros(Math.round(order.unitPrice * 100))}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Montant</dt><dd className="font-medium">{euros(order.amountCents)}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Paiement</dt><dd className="font-medium">{payment} · {order.status === "payee" ? "réglé" : "en attente"}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Commande</dt><dd className="font-medium">{order.purchaseReference ?? order.reference}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Retrait</dt><dd className="font-medium">{order.pickupReference ?? order.reference}</dd></div>
          </dl>
        </div>
      </section>
      <section>
        <SectionTitle>Mode de retrait</SectionTitle>
        <div className="rounded-2xl border border-[var(--border)] p-4">
          <p className="flex items-center gap-2 font-semibold">{transit ? <Truck className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}{modeLabel(order)}</p>
          {transit && order.transfer?.dueDate && <p className="mt-2 text-sm">Échéance : <strong>{new Date(`${order.transfer.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}</strong></p>}
        </div>
      </section>
    </div>
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
  </div>;
}

function CheckCard({ label, done, disabled, onToggle, children }: { label: string; done: boolean; disabled: boolean; onToggle: () => void; children?: ReactNode }) {
  return <div className={`rounded-3xl border p-4 ${done ? "border-brand-500/35 bg-brand-500/10" : "border-[var(--border)] bg-[var(--muted)]"}`}>
    <button type="button" role="checkbox" aria-checked={done} disabled={disabled} onClick={onToggle} className="flex items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-70">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-brand-500 bg-brand-500 text-white" : "border-zinc-400"}`}>{done && <Check className="h-4 w-4" />}</span>
      <span className="text-base font-semibold">{label}</span>
    </button>
    {children && <div className="mt-3">{children}</div>}
  </div>;
}

function GestionTab({ order, canUpdate }: { order: Order; canUpdate: boolean }) {
  const update = useMutation(api.batire.updatePickup);
  const confirmPayment = useMutation(api.batire.confirmOfflinePayment);
  const requestTransfer = useMutation(api.batire.requestPickupTransfer);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
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
  const locked = !canUpdate || busy;

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); return true; } catch (caught) { setError(caught instanceof Error ? caught.message : "Enregistrement impossible."); return false; } finally { setBusy(false); }
  }
  function markAvailable() {
    if (!transit) return void run(() => update({ orderId: order._id, step: "ready" }));
    if (!date || !time) return setError("Indiquez la date et l’heure de retrait avant de cocher « Disponible ».");
    const label = `Le ${new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} à partir de ${time.replace(":", "h")}`;
    void run(() => update({ orderId: order._id, step: "ready", pickupHours: label }));
  }
  async function submitTransfer(event: FormEvent) {
    event.preventDefault();
    if (await run(() => requestTransfer({ orderId: order._id, destination: destination as PickupLocationId, dueDate }))) setTransferOpen(false);
  }

  return <div className="max-w-3xl space-y-6">
    {!canUpdate && <p className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs text-[var(--muted-foreground)]">Lecture seule — vous n'avez pas la permission de modifier cette demande.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}

    {transit && <section>
      <SectionTitle>Acheminement (Meslogistic)</SectionTitle>
      <div className="rounded-2xl border border-[var(--border)] p-4 text-sm">
        <p><strong>{RELAY}</strong> · {order.transfer!.status === "a_preparer" ? "Nouveau" : order.transfer!.status === "en_transit" ? "En transit" : order.transfer!.status === "receptionnee" ? "Disponible à destination" : "Annulé"}</p>
        {order.transfer!.dueDate && <p className="mt-1">Échéance : {new Date(`${order.transfer!.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}</p>}
        {order.transfer!.scheduledDate && <p className="mt-1">Navette prévue le {new Date(`${order.transfer!.scheduledDate}T12:00:00`).toLocaleDateString("fr-FR")}</p>}
        {!received && <p className="mt-2 text-xs text-[var(--muted-foreground)]">La carte passe en « Disponible pour retrait » dès que Meslogistic indique le lot disponible à destination.</p>}
      </div>
    </section>}

    <section>
      <SectionTitle>Disponibilité</SectionTitle>
      <CheckCard label="Disponible" done={Boolean(order.readyAt)} disabled={locked || Boolean(order.readyAt) || Boolean(order.collectedAt) || (transit && !received)} onToggle={markAvailable}>
        {order.readyAt ? <p className="text-sm text-[var(--muted-foreground)]">Client notifié le {new Date(order.readyAt).toLocaleString("fr-FR")}{order.pickupHours ? ` · ${order.pickupHours}` : ""}</p>
          : transit ? <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Date de retrait<input type="date" value={date} disabled={locked || !received} onChange={event => setDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5 disabled:opacity-60" /></label>
            <label className="block text-sm font-medium">Heure de retrait<input type="time" value={time} disabled={locked || !received} onChange={event => setTime(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5 disabled:opacity-60" /></label>
          </div>
          : <p className="text-sm text-[var(--muted-foreground)]">Le lot est déjà sur le lieu de stockage : cocher « Disponible » notifie le client.</p>}
      </CheckCard>
    </section>

    {!transit && !order.readyAt && !order.collectedAt && canUpdate && <section>
      <SectionTitle>Point relais</SectionTitle>
      {!transferOpen ? <Button variant="outline" disabled={busy} onClick={() => { setError(""); setTransferOpen(true); }}><Truck className="h-4 w-4" />Demander un point relais</Button> :
        <form onSubmit={submitTransfer} className="space-y-4 rounded-2xl border border-[var(--border)] p-4">
          <label className="block text-sm font-medium">Point relais demandé<select required value={destination} onChange={event => setDestination(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5"><option value="" disabled>Choisir un point relais</option>{destinations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label className="block text-sm font-medium">Échéance · le produit doit être sur place le<input type="date" required value={dueDate} min={new Date().toISOString().slice(0, 10)} onChange={event => setDueDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5" /></label>
          <p className="text-xs text-[var(--muted-foreground)]">La demande passe en « Point relais demandé » (carte orange) et Meslogistic organise l’acheminement.</p>
          <div className="flex gap-2"><Button type="submit" disabled={busy || !destination || !dueDate}>{busy ? "Création…" : "Créer le transit"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setTransferOpen(false)}>Annuler</Button></div>
        </form>}
    </section>}

    {(offline || order.readyAt) && <section>
      <SectionTitle>Remise au client</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {offline && order.status !== "payee" && <Button variant="outline" disabled={locked} onClick={() => void run(() => confirmPayment({ orderId: order._id }))}>Enregistrer le paiement ({order.paymentMethod === "cash" ? "espèces" : "virement"})</Button>}
        {order.readyAt && !order.collectedAt && <Button disabled={locked || (offline && order.status !== "payee")} onClick={() => void run(() => update({ orderId: order._id, step: "collect" }))}>Confirmer la remise au client</Button>}
        {order.collectedAt && <p className="text-sm text-[var(--muted-foreground)]">Remis au client le {new Date(order.collectedAt).toLocaleString("fr-FR")}.</p>}
      </div>
    </section>}
  </div>;
}
