import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ClipboardList, Mail, Phone } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { OutcomeBadge, Pill } from "../../components/ui/Badge";
import { Select, Textarea } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { formatDateTime, formatStock } from "../../lib/format";
import {
  REQUEST_OUTCOMES,
  REQUEST_TYPE_LABELS,
  OUTCOME_LABELS,
  type RequestOutcome,
  type RequestType,
} from "../../lib/constants";
import { useAccess, canAccess } from "../../lib/access";

/** Devis, réservations et propositions de reprise reçus du site. */
export function Demandes() {
  const access = useAccess();
  const [outcome, setOutcome] = useState<"" | RequestOutcome>("");
  const requests = useQuery(api.batire.listRequests, { outcome: outcome || undefined });
  const update = useMutation(api.batire.updateRequest);
  const canUpdate = canAccess(access, "batire:demandes", "update");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demandes</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {requests ? `${requests.length} demande${requests.length > 1 ? "s" : ""}` : "…"}
          </p>
        </div>
        <Select
          value={outcome}
          onChange={(event) => setOutcome(event.target.value as RequestOutcome | "")}
          className="w-48"
        >
          <option value="">Toutes</option>
          {REQUEST_OUTCOMES.map((value) => (
            <option key={value} value={value}>
              {OUTCOME_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {requests === undefined ? (
        <FullSpinner label="Chargement des demandes…" />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="Aucune demande"
          description="Les devis, réservations et propositions de reprise arriveront ici."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <article
              key={request._id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill className="bg-[var(--muted)] text-[var(--muted-foreground)]">
                      #{request.reference}
                    </Pill>
                    <Pill className="bg-brand-500/15 text-brand-300">
                      {REQUEST_TYPE_LABELS[request.type as RequestType]}
                    </Pill>
                    <OutcomeBadge outcome={request.outcome} />
                  </div>
                  <p className="mt-2 font-semibold">
                    {request.customer.firstName} {request.customer.lastName}
                    {request.customer.company ? ` · ${request.customer.company}` : ""}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--muted-foreground)]">
                    <a
                      href={`mailto:${request.customer.email}`}
                      className="inline-flex items-center gap-1.5 hover:text-brand-400"
                    >
                      <Mail className="h-3.5 w-3.5" /> {request.customer.email}
                    </a>
                    {request.customer.phone ? (
                      <a
                        href={`tel:${request.customer.phone}`}
                        className="inline-flex items-center gap-1.5 hover:text-brand-400"
                      >
                        <Phone className="h-3.5 w-3.5" /> {request.customer.phone}
                      </a>
                    ) : null}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {formatDateTime(request.createdAt)}
                </span>
              </div>

              {request.items.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {request.items.map((item, index) => (
                    <li key={index} className="text-[var(--foreground)]">
                      • {item.title} — {formatStock(item.quantity, item.unit)}
                    </li>
                  ))}
                </ul>
              ) : null}

              {request.message ? (
                <p className="mt-3 whitespace-pre-line rounded-xl bg-[var(--muted)] p-3 text-sm">
                  {request.message}
                </p>
              ) : null}

              {request.photoUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {request.photoUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url}
                        alt=""
                        className="h-20 w-20 rounded-lg border border-[var(--border)] object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : null}

              {canUpdate ? (
                <RequestActions
                  requestId={request._id}
                  outcome={request.outcome}
                  notes={request.internalNotes ?? ""}
                  onUpdate={update}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestActions({
  requestId,
  outcome,
  notes,
  onUpdate,
}: {
  requestId: string;
  outcome: RequestOutcome;
  notes: string;
  onUpdate: ReturnType<typeof useMutation>;
}) {
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--border)] pt-4">
      <label className="flex items-center gap-2 text-sm">
        Suivi
        <Select
          value={outcome}
          onChange={(event) =>
            void onUpdate({ id: requestId, outcome: event.target.value as RequestOutcome })
          }
          className="w-40"
        >
          {REQUEST_OUTCOMES.map((value) => (
            <option key={value} value={value}>
              {OUTCOME_LABELS[value]}
            </option>
          ))}
        </Select>
      </label>
      <div className="min-w-[240px] flex-1">
        <Textarea
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Note interne (non visible du client)"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={saving || draft === notes}
        onClick={async () => {
          setSaving(true);
          try {
            await onUpdate({ id: requestId, internalNotes: draft });
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "…" : "Enregistrer la note"}
      </Button>
    </div>
  );
}
