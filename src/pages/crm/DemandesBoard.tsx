import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Inbox, Mail, MapPin, PackageOpen, Phone, Search, X } from "lucide-react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { PickupPreparation } from "../../components/crm/PickupPreparation";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullSpinner } from "../../components/ui/Spinner";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { canAccess, useAccess } from "../../lib/access";

type Outcome = "nouveau" | "en_cours" | "gagnee" | "perdue";
type Request = Doc<"btRequests">;
type Tab = "open" | "closed" | "pickups";
const COLUMNS: { key: Outcome; label: string; color: string }[] = [
  { key: "nouveau", label: "Nouvelles", color: "#3b82f6" },
  { key: "en_cours", label: "En cours", color: "#f59e0b" },
  { key: "gagnee", label: "Gagnées", color: "#10b981" },
  { key: "perdue", label: "Perdues", color: "#71717a" },
];
const TYPE: Record<string, string> = { devis: "Demande de devis", reservation: "Réservation", reprise: "Proposition de reprise", question: "Question" };

export function Demandes() {
  const requests = useQuery(api.batire.listRequests, {});
  const access = useAccess();
  const [tab, setTab] = useState<Tab>("open");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("desc");
  const [selected, setSelected] = useState<string | null>(null);
  if (requests === undefined) return <FullSpinner label="Chargement des demandes…" />;
  const openCount = requests.filter(r => r.outcome === "nouveau" || r.outcome === "en_cours").length;
  const rows = requests.filter(request => [request.reference, request.customer.firstName, request.customer.lastName, request.customer.email, request.message, ...request.items.map(item => item.title)].join(" ").toLocaleLowerCase("fr-FR").includes(search.trim().toLocaleLowerCase("fr-FR"))).sort((a, b) => sort === "desc" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
  const current = requests.find(request => request._id === selected);
  return <div className="flex min-h-[70vh] flex-col">
    <header className="border-b border-[var(--border)] pb-4"><h1 className="text-xl font-bold tracking-tight">Demandes</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Suivez les demandes et les retraits de vos clients.</p></header>
    <UnderlineTabs className="mt-4" value={tab} onChange={setTab} items={[{ key: "open", label: "Demandes en cours" }, { key: "closed", label: "Gagnées / Perdues" }, { key: "pickups", label: "Commandes et retraits" }]} counts={{ open: openCount, closed: requests.length - openCount }} />
    {tab === "pickups" ? <div className="pt-5"><PickupPreparation /></div> : <>
      <div className="border-b border-[var(--border)] py-3"><div className="mb-3 flex flex-wrap items-center gap-2"><label><span className="sr-only">Ordre des demandes</span><select value={sort} onChange={event => setSort(event.target.value)} className="h-9 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 text-xs font-medium"><option value="desc">Plus récent</option><option value="asc">Plus ancien</option></select></label></div><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input type="search" aria-label="Rechercher une demande" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher par nom, référence, email, matériau…" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" /></div></div>
      <div className="flex-1 py-5">{!rows.some(row => tab === "open" ? ["nouveau", "en_cours"].includes(row.outcome) : ["gagnee", "perdue"].includes(row.outcome)) ? <EmptyState icon={<Inbox className="h-10 w-10" />} title="Aucune demande" description={search ? "Aucune demande ne correspond à votre recherche." : "Les demandes apparaîtront ici."} /> : <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">{COLUMNS.filter(column => tab === "open" ? ["nouveau", "en_cours"].includes(column.key) : ["gagnee", "perdue"].includes(column.key)).map(column => { const entries = rows.filter(row => row.outcome === column.key); return <section key={column.key} className="min-w-0 flex-1"><header className="flex items-center gap-2 px-1 pb-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: column.color }} /><h2 className="text-sm font-semibold">{column.label}</h2><span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">{entries.length}</span></header><div className="min-h-[120px] space-y-2.5 rounded-xl bg-[var(--muted)] p-2">{entries.map(request => <RequestCard key={request._id} request={request} onOpen={() => setSelected(request._id)} />)}</div></section>; })}</div>}</div>
    </>}
    {current && <RequestDetail key={current._id} request={current} canUpdate={canAccess(access, "batire:demandes", "update")} onClose={() => setSelected(null)} />}
  </div>;
}

function RequestCard({ request, onOpen }: { request: Request; onOpen: () => void }) {
  const done = request.items.filter(item => ["gagnee", "perdue"].includes(item.outcome ?? "nouveau")).length;
  const percent = request.items.length ? Math.round(done / request.items.length * 100) : 0;
  return <button type="button" onClick={onOpen} className="block w-full rounded-xl bg-[#a0315a] p-3 text-left text-white shadow-sm ring-1 ring-black/10 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
    <div className="flex items-start justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold"><PackageOpen className="h-3.5 w-3.5" />{TYPE[request.type] ?? request.type}</span><span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium">{new Date(request.createdAt).toLocaleDateString("fr-FR")}</span></div>
    <div className="mt-2.5 flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">{`${request.customer.firstName[0] ?? ""}${request.customer.lastName[0] ?? ""}`.toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{request.customer.firstName} {request.customer.lastName}</p><p className="truncate text-xs text-white/80">{request.items.length ? `${request.items.length} matériau${request.items.length > 1 ? "x" : ""} · ${request.items.map(item => item.title).join(", ")}` : request.message || "Sans détail"}</p></div></div>
    {request.items.length > 0 && <span className="mt-3 block space-y-1">{request.items.map((item, index) => <span key={`${item.materialId ?? item.title}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2 py-1 text-xs"><span className="min-w-0 truncate">{item.quantity} {item.unit} · {item.title}</span><span className="shrink-0 text-white/80">{COLUMNS.find(column => column.key === (item.outcome ?? "nouveau"))?.label}</span></span>)}</span>}
    {request.items.length > 0 && <div className="mt-3"><div className="flex justify-between text-[11px] text-white/90"><span>Articles traités</span><span>{percent} %</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} /></div></div>}
    <p className="mt-2.5 text-[11px] text-white/80">{request.reference}</p>
  </button>;
}

function RequestDetail({ request, canUpdate, onClose }: { request: Request; canUpdate: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"details" | "gestion">("details");
  const [error, setError] = useState("");
  const update = useMutation(api.batire.updateRequestOutcome);
  const updateItem = useMutation(api.batire.updateRequestItemOutcome);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, []);
  function report(promise: Promise<unknown>) { setError(""); void promise.catch(caught => setError(caught instanceof Error ? caught.message : "Modification impossible.")); }
  return <dialog ref={dialog} aria-labelledby="request-title" onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto flex h-[calc(100%-1.5rem)] max-h-none w-[calc(100%-1.5rem)] max-w-none flex-col overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--card)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/70 sm:h-[calc(100%-2.5rem)] sm:w-[calc(100%-2.5rem)] lg:h-[calc(100%-3.5rem)] lg:w-[calc(100%-3.5rem)]">
    <header className="shrink-0 bg-[#a0315a] px-5 py-4 text-white"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{TYPE[request.type] ?? request.type} · {request.reference}</p><button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-white/15"><X className="h-5 w-5" /></button></div><h2 id="request-title" className="mt-3 text-xl font-bold">{request.customer.firstName} {request.customer.lastName}</h2><p className="mt-1 text-sm text-white/80">{request.items.length} matériau{request.items.length > 1 ? "x" : ""}</p></header>
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6"><UnderlineTabs className="mt-5" value={tab} onChange={setTab} items={[{ key: "details", label: "Demande" }, { key: "gestion", label: "Gestion" }]} />
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {tab === "details" ? <div className="grid gap-6 py-6 lg:grid-cols-2"><section className="space-y-4"><h3 className="font-semibold">Matériaux demandés</h3>{request.items.length ? <ul className="space-y-2">{request.items.map((item, index) => <li key={`${item.materialId ?? item.title}-${index}`} className="rounded-xl border border-[var(--border)] p-3"><p className="font-medium">{item.quantity} {item.unit} · {item.title}</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">{COLUMNS.find(column => column.key === (item.outcome ?? "nouveau"))?.label}</p></li>)}</ul> : <p className="text-sm text-[var(--muted-foreground)]">Aucun matériau précisé.</p>}{request.message && <p className="whitespace-pre-wrap rounded-xl bg-[var(--muted)] p-4 text-sm"><MapPin className="mr-2 inline h-4 w-4" />{request.message}</p>}</section><section className="space-y-3"><h3 className="font-semibold">Coordonnées</h3><p className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4" />{request.customer.email}</p>{request.customer.phone && <p className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4" />{request.customer.phone}</p>}</section></div> : <section className="max-w-3xl space-y-5 py-6"><h3 className="font-semibold">Suivi de la demande</h3><label className="block text-sm font-medium">Statut global<select disabled={!canUpdate} value={request.outcome} onChange={event => report(update({ id: request._id, outcome: event.target.value as Outcome }))} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 disabled:opacity-60">{COLUMNS.map(column => <option value={column.key} key={column.key}>{column.label}</option>)}</select></label>{request.items.map((item, index) => <label key={`${item.materialId ?? item.title}-${index}`} className="block rounded-xl border border-[var(--border)] p-3 text-sm"><span className="font-semibold">{item.quantity} {item.unit} · {item.title}</span><span className="mt-2 block text-xs text-[var(--muted-foreground)]">Statut de cet article</span><select disabled={!canUpdate} value={item.outcome ?? "nouveau"} onChange={event => report(updateItem({ id: request._id, index, outcome: event.target.value as Outcome }))} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 disabled:opacity-60">{COLUMNS.map(column => <option value={column.key} key={column.key}>{column.label}</option>)}</select></label>)}</section>}
    </div>
  </dialog>;
}
