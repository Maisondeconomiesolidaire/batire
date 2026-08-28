import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { MessageSquare, Send } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { formatDateTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { PAGE_X } from "../../lib/constants";

/** Fils du client connecté, un par matériau discuté. */
export function Messagerie() {
  const { isSignedIn } = useUser();
  const messages = useQuery(api.batire.myMessages, isSignedIn ? {} : "skip");
  const send = useMutation(api.batire.sendMessage);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const threads = useMemo(() => {
    const map = new Map<string, { key: string; title: string; materialId?: string; items: NonNullable<typeof messages> }>();
    for (const message of messages ?? []) {
      const key = String(message.materialId ?? "general");
      const thread = map.get(key) ?? {
        key,
        title: message.materialTitle,
        materialId: message.materialId,
        items: [],
      };
      thread.items.push(message);
      map.set(key, thread);
    }
    return [...map.values()];
  }, [messages]);

  const current = threads.find((thread) => thread.key === active) ?? threads[0];

  if (!isSignedIn) {
    return (
      <div className={cn("mx-auto max-w-3xl py-16", PAGE_X)}>
        <EmptyState
          icon={<MessageSquare className="h-10 w-10" />}
          title="Connectez-vous"
          description="La messagerie est réservée aux clients connectés."
        />
      </div>
    );
  }

  if (messages === undefined) return <FullSpinner label="Chargement des messages…" />;

  return (
    <div className={cn("w-full py-6", PAGE_X)}>
      <h1 className="mb-5 text-2xl font-black tracking-tight">Messagerie</h1>

      {threads.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-10 w-10" />}
          title="Aucune discussion"
          description="Depuis la fiche d'un matériau, posez vos questions à l'équipe."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <nav className="space-y-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2">
            {threads.map((thread) => (
              <button
                key={thread.key}
                type="button"
                onClick={() => setActive(thread.key)}
                className={cn(
                  "block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition",
                  current?.key === thread.key
                    ? "bg-brand-50 font-semibold text-brand-800"
                    : "hover:bg-[var(--muted)]",
                )}
              >
                {thread.title}
              </button>
            ))}
          </nav>

          <section className="flex min-h-[420px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {current?.items.map((message) => (
                <div
                  key={message._id}
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    message.fromStaff
                      ? "bg-[var(--muted)]"
                      : "ml-auto bg-brand-600 text-white",
                  )}
                >
                  <p className="whitespace-pre-line text-sm">{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[11px]",
                      message.fromStaff ? "text-[var(--muted-foreground)]" : "text-white/70",
                    )}
                  >
                    {message.fromStaff ? message.authorName : "Vous"} ·{" "}
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
                placeholder="Votre message…"
                className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <Button
                disabled={sending || !draft.trim() || !current}
                onClick={async () => {
                  if (!current) return;
                  setSending(true);
                  try {
                    await send({
                      materialId: current.materialId as never,
                      body: draft,
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
          </section>
        </div>
      )}
    </div>
  );
}
