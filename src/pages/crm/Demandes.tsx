import { useMutation, useQuery } from "convex/react";
import { Inbox, Mail, Phone } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { PickupPreparation } from "../../components/crm/PickupPreparation";

const COLUMNS = [
  ["nouveau", "Nouvelles", "#3b82f6"],
  ["en_cours", "En cours", "#f59e0b"],
  ["gagnee", "Gagnées", "#10b981"],
  ["perdue", "Perdues", "#71717a"],
] as const;
const TYPE: Record<string, string> = { devis: "Demande de devis", reservation: "Réservation", reprise: "Proposition de reprise", question: "Question" };

/** Même lecture Kanban que les demandes Recycapp : une colonne = une décision. */
export function Demandes() {
  const requests = useQuery(api.batire.listRequests, {});
  const update = useMutation(api.batire.updateRequestOutcome);
  if (!requests) return <FullSpinner label="Chargement des demandes…" />;
  return <div><PickupPreparation /><div className="mb-5"><h1 className="text-2xl font-bold tracking-tight">Demandes</h1><p className="text-sm text-[var(--muted-foreground)]">Suivez les demandes comme dans Recycapp.</p></div>{requests.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] py-16 text-center text-[var(--muted-foreground)]"><Inbox className="mx-auto h-9 w-9" /><p className="mt-3 font-medium">Aucune demande</p></div> : <div className="grid min-w-[980px] grid-cols-4 gap-4 overflow-x-auto">{COLUMNS.map(([outcome, label, color]) => { const entries = requests.filter((request) => request.outcome === outcome); return <section key={outcome} className="min-w-0"><header className="mb-2 flex items-center gap-2 px-1"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><h2 className="text-sm font-semibold">{label}</h2><span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs">{entries.length}</span></header><div className="min-h-32 space-y-3 rounded-xl bg-[var(--muted)] p-2">{entries.map((request) => <article key={request._id} className="rounded-xl bg-[var(--card)] p-3 shadow-sm ring-1 ring-black/5"><p className="text-xs font-semibold text-brand-700">{TYPE[request.type] ?? request.type} · {request.reference}</p><p className="mt-2 font-semibold">{request.customer.firstName} {request.customer.lastName}</p><p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{request.items.map((item) => item.title).join(", ") || request.message || "Sans détail"}</p><div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]"><Mail className="h-3.5 w-3.5" />{request.customer.email}</div>{request.customer.phone && <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]"><Phone className="h-3.5 w-3.5" />{request.customer.phone}</div>}<select className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs" value={request.outcome} onChange={(event) => void update({ id: request._id, outcome: event.target.value as typeof outcome })}>{COLUMNS.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></article>)}</div></section>; })}</div>}</div>;
}
