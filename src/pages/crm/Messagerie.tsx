import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { MessageSquare, Send } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Badge";
import { formatDateTime } from "../../lib/format";
import { cn } from "../../lib/cn";

/** Fils clients, côté équipe. */
export function MessagerieCrm() {
  const threads = useQuery(api.batire.listThreads, {});
  const send = useMutation(api.batire.sendMessage);
  const markRead = useMutation(api.batire.markThreadRead);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

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
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
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
                      try {
                        await send({
                          body: draft,
                          clientId: current.clientId,
                          materialId: current.materialId,
                        });
                        setDraft("");
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
        </div>
      )}
    </div>
  );
}
