import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, Copy, Link2, Mail, MessageCircle, MessageSquare, Plus, RotateCcw, Search, Share2, Tag, X, XCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { canAccess, useAccess } from "../../lib/access";
import { cn } from "../../lib/cn";

type Promo = FunctionReturnType<typeof api.batire.listPromoCodes>[number];
type Tab = "active" | "used";

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const promoValue = (promo: Pick<Promo, "kind" | "value">) => promo.kind === "percent" ? `${promo.value} %` : euros(promo.value);
const dateTime = (at: number) => new Date(at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const errorText = (caught: unknown, fallback: string) => {
  const data = (caught as { data?: unknown })?.data;
  if (typeof data === "string") return data;
  return caught instanceof Error ? caught.message.replace(/^.*Uncaught ConvexError: /, "").split("\n")[0] || fallback : fallback;
};
const isActive = (promo: Promo, now: number) => !promo.usedAt && !promo.canceledAt && !(promo.expiresAt !== undefined && promo.expiresAt < now);

/** Tous les codes promo Bâtire : actifs d'un côté, utilisés (ou clos) de l'autre. */
export function CodesPromo() {
  const access = useAccess();
  const codes = useQuery(api.batire.listPromoCodes, {});
  const canUpdate = canAccess(access, "batire:demandes", "update");
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const now = Date.now();
  const active = (codes ?? []).filter(promo => isActive(promo, now));
  const used = (codes ?? []).filter(promo => !isActive(promo, now));
  const needle = search.trim().toLocaleLowerCase("fr-FR");
  const shown = (tab === "active" ? active : used).filter(promo => !needle || [promo.code, promo.reason, promo.customerEmail, promo.source?.reference, promo.source?.customerName, promo.usedReference].some(value => value?.toLocaleLowerCase("fr-FR").includes(needle)));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Codes promo</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Codes à usage unique, valables sur un panier de la boutique (hors frais de transfert).</p>
      </div>
      {canUpdate && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Nouveau code promo</Button>}
    </div>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <UnderlineTabs value={tab} onChange={setTab} items={[{ key: "active", label: "Actifs" }, { key: "used", label: "Utilisés" }]} counts={codes ? { active: active.length, used: used.length } : undefined} />
      <label className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Code, client, demande…" aria-label="Rechercher un code promo" className="pl-9" />
      </label>
    </div>
    {codes === undefined ? <FullSpinner label="Chargement des codes promo…" />
      : shown.length === 0 ? <EmptyState icon={<Tag className="h-6 w-6" />} title={needle ? "Aucun résultat" : tab === "active" ? "Aucun code actif" : "Aucun code utilisé"} description={tab === "active" && !needle ? "Créez un code ici ou depuis l’onglet Code promo d’une demande." : tab === "used" && !needle ? "Les codes utilisés, annulés ou expirés apparaîtront ici." : "Aucun code ne correspond à la recherche."} />
        : <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"><ul className="divide-y divide-[var(--border)]">{shown.map(promo => <PromoRow key={promo._id} promo={promo} canUpdate={canUpdate} now={now} />)}</ul></div>}
    {creating && <NewPromo onClose={() => setCreating(false)} onCreated={() => setTab("active")} />}
  </div>;
}

function statusOf(promo: Promo, now: number) {
  if (promo.canceledAt) return { label: "Annulé", className: "bg-zinc-500/15 text-[var(--muted-foreground)]" };
  if (promo.usedAt) return { label: "Utilisé", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  if (promo.expiresAt !== undefined && promo.expiresAt < now) return { label: "Expiré", className: "bg-red-500/15 text-red-700 dark:text-red-300" };
  return { label: "Actif", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
}

function PromoRow({ promo, canUpdate, now }: { promo: Promo; canUpdate: boolean; now: number }) {
  const act = useMutation(api.batire.promoCodeAction);
  const [confirm, setConfirm] = useState<"" | "email" | "cancel" | "release">("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const active = isActive(promo, now);
  const status = statusOf(promo, now);
  async function run() {
    if (!confirm) return;
    setBusy(true); setError("");
    try { await act({ promoId: promo._id, action: confirm }); setConfirm(""); }
    catch (caught) { setError(errorText(caught, "Opération impossible.")); setConfirm(""); }
    finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(promo.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* presse-papiers indisponible */ } }
  return <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("font-mono text-base font-black tracking-wider", !active && "text-[var(--muted-foreground)]")}>{promo.code}</span>
        <button type="button" onClick={() => void copy()} aria-label="Copier le code" className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">{copied ? <Check className="h-4 w-4 text-brand-600" /> : <Copy className="h-4 w-4" />}</button>
        {active && <button type="button" onClick={() => setSharing(true)} aria-label="Partager le code" title="Partager" className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-brand-600"><Share2 className="h-4 w-4" /></button>}
        <span className="font-bold">{promoValue(promo)}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", status.className)}>{status.label}</span>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        {[promo.reason, promo.source ? `Demande #${promo.source.reference}${promo.source.customerName ? ` · ${promo.source.customerName}` : ""}` : promo.customerEmail ?? "Sans client", `créé le ${dateTime(promo.createdAt)}${promo.createdBy ? ` par ${promo.createdBy}` : ""}`, promo.expiresAt ? `${promo.expiresAt < now ? "expiré le" : "valable jusqu’au"} ${new Date(promo.expiresAt).toLocaleDateString("fr-FR")}` : "sans expiration"].filter(Boolean).join(" · ")}
      </p>
      {promo.usedAt && <p className="text-xs text-[var(--muted-foreground)]">Utilisé le {dateTime(promo.usedAt)}{promo.usedReference ? ` · commande ${promo.usedReference}` : ""}{promo.usedDiscountCents !== undefined ? ` · remise de ${euros(promo.usedDiscountCents)}` : ""}{promo.releasable ? " · commande non réglée" : ""}</p>}
      {promo.emailedAt && <p className="text-xs text-[var(--muted-foreground)]">Envoyé par email le {dateTime(promo.emailedAt)}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
    {canUpdate && <div className="flex flex-wrap gap-2">
      {active && promo.customerEmail && <Button size="sm" variant="outline" onClick={() => setConfirm("email")}><Mail className="h-4 w-4" />{promo.emailedAt ? "Renvoyer" : "Envoyer"}</Button>}
      {active && <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => setConfirm("cancel")}><XCircle className="h-4 w-4" />Annuler</Button>}
      {promo.releasable && <Button size="sm" variant="outline" onClick={() => setConfirm("release")}><RotateCcw className="h-4 w-4" />Réactiver</Button>}
    </div>}
    {sharing && <ShareDialog promo={promo} canEmail={canUpdate && Boolean(promo.customerEmail)} onEmail={() => { setSharing(false); setConfirm("email"); }} onClose={() => setSharing(false)} />}
    {confirm && <Dialog title={confirm === "email" ? "Envoyer le code promo ?" : confirm === "cancel" ? "Annuler le code promo ?" : "Réactiver le code promo ?"} onClose={() => { if (!busy) setConfirm(""); }}>
      <p className="text-sm text-[var(--muted-foreground)]">{confirm === "email" ? <>Le code {promo.code} ({promoValue(promo)}) sera envoyé par email à <strong className="text-[var(--foreground)]">{promo.customerEmail}</strong>.</> : confirm === "cancel" ? `Le code ${promo.code} ne pourra plus être utilisé.` : `Le code ${promo.code} a servi à une commande jamais réglée. Il redevient utilisable.`}</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setConfirm("")}>Non</Button><Button variant={confirm === "cancel" ? "danger" : "primary"} disabled={busy} onClick={() => void run()}>{busy ? "…" : confirm === "email" ? "Envoyer" : confirm === "cancel" ? "Annuler le code" : "Réactiver"}</Button></div>
    </Dialog>}
  </li>;
}

function NewPromo({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const create = useMutation(api.batire.createPromoCode);
  const [kind, setKind] = useState<"amount" | "percent">("amount");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [validity, setValidity] = useState("180");
  const [sendEmail, setSendEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const number = Number(value.replace(",", "."));
  const parsed = kind === "percent" ? Math.round(number) : Math.round(number * 100);
  const valid = Number.isFinite(number) && (kind === "percent" ? parsed >= 1 && parsed <= 100 : parsed >= 1) && (!sendEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setBusy(true); setError("");
    try {
      const result = await create({ kind, value: parsed, reason: reason.trim() || undefined, customerEmail: email.trim() || undefined, validityDays: validity ? Number(validity) : undefined, sendEmail });
      setCreated(result.code); onCreated();
    } catch (caught) { setError(errorText(caught, "Création du code impossible.")); }
    finally { setBusy(false); }
  }
  if (created) return <Dialog title="Code promo créé" onClose={onClose}>
    <p className="rounded-xl border-2 border-dashed border-brand-500 px-4 py-3 text-center font-mono text-2xl font-black tracking-wider text-brand-700 dark:text-brand-300">{created}</p>
    <p className="mt-3 text-sm text-[var(--muted-foreground)]">{sendEmail ? `Le code a été envoyé à ${email.trim()}.` : "Communiquez ce code au client."}</p>
    <div className="mt-5 flex justify-end"><Button onClick={onClose}>Fermer</Button></div>
  </Dialog>;
  return <Dialog title="Nouveau code promo" onClose={() => { if (!busy) onClose(); }} wide>
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type de remise">
        {([["amount", "Montant (€)"], ["percent", "Pourcentage (%)"]] as const).map(([key, text]) => <button key={key} type="button" role="radio" aria-checked={kind === key} onClick={() => setKind(key)} className={cn("rounded-xl border px-3 py-1.5 text-sm font-semibold", kind === key ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-[var(--border)] bg-[var(--card)]")}>{text}</button>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={kind === "percent" ? "Remise (%)" : "Remise (€)"} required><Input autoFocus inputMode="decimal" required value={value} onChange={event => setValue(event.target.value.replace(/[^\d.,]/g, ""))} placeholder={kind === "percent" ? "10" : "15,00"} /></Field>
        <Field label="Validité (jours)"><Input inputMode="numeric" value={validity} onChange={event => setValidity(event.target.value.replace(/[^\d]/g, ""))} placeholder="Illimitée" /></Field>
        <Field label="Motif"><Input maxLength={300} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ex. geste commercial" /></Field>
        <Field label="Email du client"><Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Facultatif" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendEmail} disabled={!email.trim()} onChange={event => setSendEmail(event.target.checked)} className="h-4 w-4 accent-brand-600" />Envoyer le code par email au client</label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Annuler</Button><Button type="submit" disabled={busy || !valid}><Tag className="h-4 w-4" />{busy ? "Génération…" : sendEmail ? "Générer et envoyer" : "Générer le code"}</Button></div>
    </form>
  </Dialog>;
}

/** Partage d'un code promo : lien direct (le code s'applique au panier), messageries, e-mail. */
function ShareDialog({ promo, canEmail, onEmail, onClose }: { promo: Promo; canEmail: boolean; onEmail: () => void; onClose: () => void }) {
  const [done, setDone] = useState("");
  const link = `${window.location.origin}/code-promo/${encodeURIComponent(promo.code)}`;
  const until = promo.expiresAt ? `, valable jusqu’au ${new Date(promo.expiresAt).toLocaleDateString("fr-FR")}` : "";
  const message = `Votre code promo BâtiRe : ${promo.code} (${promoValue(promo)} de remise${until}). Il s’applique directement à votre panier : ${link}`;
  async function copy(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); setDone(label); setTimeout(() => setDone(""), 1800); } catch { setDone("Copie impossible sur ce navigateur."); }
  }
  const option = "flex w-full items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 text-left text-sm font-medium transition hover:border-brand-500 hover:bg-[var(--accent)]";
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return <Dialog title={`Partager ${promo.code}`} onClose={onClose}>
    <p className="text-sm text-[var(--muted-foreground)]">{promoValue(promo)} de remise{until}.</p>
    <div className="mt-4 grid gap-2">
      <button type="button" className={option} onClick={() => void copy(promo.code, "Code copié")}><Copy className="h-4 w-4 text-brand-600" />Copier le code</button>
      <button type="button" className={option} onClick={() => void copy(link, "Lien copié")}><Link2 className="h-4 w-4 text-brand-600" />Copier le lien (applique le code au panier)</button>
      <button type="button" className={option} onClick={() => void copy(message, "Message copié")}><MessageSquare className="h-4 w-4 text-brand-600" />Copier le message complet</button>
      <a className={option} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-emerald-600" />WhatsApp</a>
      <a className={option} href={`sms:?&body=${encodeURIComponent(message)}`}><MessageSquare className="h-4 w-4 text-sky-600" />SMS</a>
      {canEmail ? <button type="button" className={option} onClick={onEmail}><Mail className="h-4 w-4 text-brand-600" />E-mail BâtiRe à {promo.customerEmail}</button>
        : <a className={option} href={`mailto:${promo.customerEmail ?? ""}?subject=${encodeURIComponent(`Votre code promo BâtiRe : ${promoValue(promo)} de remise`)}&body=${encodeURIComponent(message)}`}><Mail className="h-4 w-4 text-brand-600" />Ouvrir dans ma messagerie</a>}
      {canNativeShare && <button type="button" className={option} onClick={() => void navigator.share({ title: "Code promo BâtiRe", text: message, url: link }).catch(() => undefined)}><Share2 className="h-4 w-4 text-brand-600" />Autres applications…</button>}
    </div>
    <p role="status" className="mt-3 h-4 text-xs font-semibold text-brand-700">{done}</p>
  </Dialog>;
}

function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <div className={cn("w-full rounded-3xl bg-[var(--card)] p-6 text-[var(--foreground)] shadow-2xl", wide ? "max-w-xl" : "max-w-md")}>
      <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold">{title}</h3><button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 hover:bg-[var(--accent)]"><X className="h-4 w-4" /></button></div>
      <div className="mt-3">{children}</div>
    </div>
  </div>;
}
