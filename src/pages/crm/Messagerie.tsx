import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Mail, MessageSquare, PackageOpen, Send } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Pill, StatusBadge } from "../../components/ui/Badge";
import { formatDate, formatDateTime, formatPrice, formatStock, unitLabel } from "../../lib/format";
import { cn } from "../../lib/cn";
import { errorMessage } from "../../lib/errors";

/** Fils clients, côté équipe. */
export function MessagerieCrm() {
  const threads = useQuery(api.batire.listThreads, {});
  const send = useMutation(api.batire.sendMessage);
  const markRead = useMutation(api.batire.markThreadRead);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const current = threads?.find((thread) => thread.key === activeKey) ?? threads?.[0];

  useEffect(() => {
    if (current && current.unread > 0) void markRead({ clientId: current.clientId });
  }, [current, markRead]);

  if (threads === undefined) return <FullSpinner label="Chargement des discussions…" />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Messagerie</h1>

      {threads.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-10 w-10" />} title="Aucune discussion" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_320px]">
          <nav className="space-y-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2">
            {threads.map((thread) => (
              <button
                key={thread.key}
                type="button"
                onClick={() => setActiveKey(thread.key)}
                className={cn(
                  "block w-full rounded-lg px-3 py-2.5 text-left transition",
                  current?.key === thread.key ? "bg-brand-500/10" : "hover:bg-[var(--accent)]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{thread.clientName}</span>
                  {thread.unread > 0 ? (
                    <Pill className="bg-brand-600 text-white">{thread.unread}</Pill>
                  ) : null}
                </div>
                <p className="truncate text-xs text-[var(--muted-foreground)]">
                  {thread.materialTitle}
                </p>
                <p className="truncate text-xs text-[var(--muted-foreground)]">
                  {thread.lastMessage}
                </p>
              </button>
            ))}
          </nav>

          <section className="flex min-h-[460px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            {current ? (
              <>
                <header className="border-b border-[var(--border)] px-5 py-3">
                  <p className="font-semibold">{current.clientName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {current.clientEmail} · {current.materialTitle}
                  </p>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {current.messages.map((message) => (
                    <div
                      key={message._id}
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5",
                        message.fromStaff
                          ? "ml-auto bg-brand-600 text-white"
                          : "bg-[var(--muted)]",
                      )}
                    >
                      <p className="whitespace-pre-line text-sm">{message.body}</p>
                      <p
                        className={cn(
                          "mt-1 text-[11px]",
                          message.fromStaff ? "text-white/70" : "text-[var(--muted-foreground)]",
                        )}
                      >
                        {message.fromStaff ? message.authorName : current.clientName} ·{" "}
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>

                {sendError ? (
                  <p className="border-t border-[var(--border)] px-3 pt-3 text-xs font-medium text-red-600 dark:text-red-400">
                    {sendError}
                  </p>
                ) : null}
                <div className="flex items-end gap-2 border-t border-[var(--border)] p-3">
                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Répondre…"
                    className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <Button
                    disabled={sending || !draft.trim()}
                    onClick={async () => {
                      setSending(true);
                      setSendError(null);
                      try {
                        await send({
                          body: draft,
                          clientId: current.clientId,
                          materialId: current.materialId,
                        });
                        setDraft("");
                      } catch (caught) {
                        setSendError(errorMessage(caught, "Envoi impossible."));
                      } finally {
                        setSending(false);
                      }
                    }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : null}
          </section>

          {current ? <ThreadRecap thread={current} /> : null}
        </div>
      )}
    </div>
  );
}

type Thread = FunctionReturnType<typeof api.batire.listThreads>[number];

/**
 * Récapitulatif du fil : de quel objet on parle, et à qui on répond. Sans lui,
 * l'équipe répondait sur la foi d'un titre de matériau et devait rouvrir la
 * fiche dans un autre onglet pour connaître prix, stock et emplacement.
 */
function ThreadRecap({ thread }: { thread: Thread }) {
  const material = thread.material;

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Récapitulatif
        </p>
        <h2 className="mt-1 text-lg font-bold leading-tight">
          {material?.title ?? thread.materialTitle}
        </h2>
        {material?.reference ? (
          <p className="text-xs text-[var(--muted-foreground)]">Réf. {material.reference}</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)]">
        {material?.photoUrl ? (
          <img src={material.photoUrl} alt="" className="aspect-square w-full object-cover" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center text-[var(--muted-foreground)]">
            <PackageOpen className="h-8 w-8" />
          </div>
        )}
      </div>

      {material ? (
        <>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={material.status} />
            <Pill className="bg-[var(--muted)] text-[var(--foreground)]">{material.condition}</Pill>
            {material.published ? (
              <Pill className="bg-sky-100 text-sky-800">En boutique</Pill>
            ) : null}
          </div>

          <dl className="space-y-3 border-t border-[var(--border)] pt-4">
            <RecapRow label="Prix" value={`${formatPrice(material.price)} / ${unitLabel(1, material.unit)}`} />
            <RecapRow label="Stock" value={formatStock(material.quantity, material.unit)} />
            <RecapRow
              label="Catégorie"
              value={[material.category, material.family, material.subcategory].filter(Boolean).join(" · ")}
            />
            {material.depot || material.location ? (
              <RecapRow
                label="Emplacement"
                value={[material.depot, material.location].filter(Boolean).join(" · ")}
              />
            ) : null}
            {material.qrReference ? <RecapRow label="QR" value={material.qrReference} /> : null}
          </dl>

          <div className="grid gap-2">
            <Link
              to={`/crm/materiaux/${material._id}`}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Ouvrir la fiche
            </Link>
            <a
              href={`/materiau/${material._id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-center text-sm font-medium transition hover:border-brand-400"
            >
              Voir dans la boutique
            </a>
          </div>
        </>
      ) : (
        <p className="rounded-xl bg-[var(--muted)] px-3 py-2.5 text-xs text-[var(--muted-foreground)]">
          {thread.materialId
            ? "Ce matériau a été supprimé depuis l'ouverture du fil."
            : "Discussion générale, sans matériau rattaché."}
        </p>
      )}

      <div className="space-y-3 border-t border-[var(--border)] pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Client
        </p>
        <RecapRow label="Nom" value={thread.clientName || "—"} />
        {thread.clientEmail ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              E-mail
            </p>
            <a
              href={`mailto:${thread.clientEmail}`}
              className="mt-0.5 flex items-center gap-1.5 break-all text-sm font-medium text-brand-700 hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" /> {thread.clientEmail}
            </a>
          </div>
        ) : null}
        <RecapRow label="Premier message" value={formatDate(thread.firstAt)} />
        <RecapRow label="Dernier message" value={formatDateTime(thread.lastAt)} />
        <RecapRow
          label="Messages"
          value={`${thread.messageCount} message${thread.messageCount > 1 ? "s" : ""}`}
        />
      </div>
    </aside>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
