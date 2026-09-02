import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Building2, Check, HeartHandshake, Mail, MapPin, Phone, Search, X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Field";
import { Dropdown } from "../../components/ui/Dropdown";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { DonationBadge } from "../../components/ui/Badge";
import { formatDate, formatDateTime } from "../../lib/format";
import {
  DONATION_STATUSES,
  DONATION_STATUS_LABELS,
  type DonationStatus,
  type Unit,
} from "../../lib/constants";
import { useAccess, canAccess } from "../../lib/access";
import { errorMessage } from "../../lib/errors";
import { taxonomyPath } from "../../lib/taxonomy";
import { cn } from "../../lib/cn";

type Donation = {
  _id: Id<"btDonations">;
  reference: string;
  title: string;
  description?: string;
  category: string;
  family?: string;
  subcategory?: string;
  condition?: string;
  quantity?: number;
  unit?: Unit;
  availableFrom?: number;
  handover?: "depot" | "recuperer";
  pickupAddress?: string;
  pickupPostalCode?: string;
  pickupCity?: string;
  status: DonationStatus;
  decisionMessage?: string;
  decidedAt?: number;
  decidedBy?: string;
  internalNote?: string;
  photoUrls: string[];
  createdAt: number;
  donor: {
    company?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profiles?: string[];
    address?: string;
    postalCode?: string;
    city?: string;
  };
};

export function Dons() {
  const access = useAccess();
  const [status, setStatus] = useState<"" | DonationStatus>("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<Id<"btDonations"> | null>(null);

  const donations = useQuery(api.batireDons.listDonations, {
    status: status || undefined,
    search: search.trim() || undefined,
  }) as Donation[] | undefined;

  const canUpdate = canAccess(access, "batire:dons", "update");
  const selected = donations?.find((donation) => donation._id === openId) ?? null;
  const pending = donations?.filter((donation) => donation.status === "nouveau").length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dons</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {donations ? `${donations.length} don${donations.length > 1 ? "s" : ""}` : "…"}
            {pending > 0 ? ` · ${pending} à étudier` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher (lot, référence, entreprise, email)…"
            className="pl-9"
          />
        </div>
        <Dropdown
          className="w-52"
          value={status}
          onChange={(value) => setStatus(value as DonationStatus | "")}
          placeholder="Tous les statuts"
          options={[
            { value: "", label: "Tous les statuts" },
            ...DONATION_STATUSES.map((value) => ({
              value,
              label: DONATION_STATUS_LABELS[value],
            })),
          ]}
        />
      </div>

      {donations === undefined ? (
        <FullSpinner label="Chargement des dons…" />
      ) : donations.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="h-10 w-10" />}
          title="Aucun don"
          description="Les propositions envoyées depuis la boutique arrivent ici."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {donations.map((donation) => (
            <button
              key={donation._id}
              type="button"
              onClick={() => setOpenId(donation._id)}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] text-left transition hover:border-brand-400 hover:shadow-lg hover:shadow-black/5"
            >
              <div className="relative aspect-[4/3] bg-[var(--muted)]">
                {donation.photoUrls[0] ? (
                  <img
                    src={donation.photoUrls[0]}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                ) : null}
                <span className="absolute left-3 top-3">
                  <DonationBadge status={donation.status} />
                </span>
                {donation.photoUrls.length > 1 ? (
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                    +{donation.photoUrls.length - 1}
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <p className="truncate font-semibold">{donation.title}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                  {taxonomyPath(donation.category, donation.family, donation.subcategory)}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted-foreground)]">
                  <span className="truncate">
                    {donation.donor.company ||
                      `${donation.donor.firstName} ${donation.donor.lastName}`}
                  </span>
                  <span className="shrink-0">{formatDate(donation.createdAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <DonationPanel
          donation={selected}
          canUpdate={canUpdate}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

function DonationPanel({
  donation,
  canUpdate,
  onClose,
}: {
  donation: Donation;
  canUpdate: boolean;
  onClose: () => void;
}) {
  const decide = useMutation(api.batireDons.decideDonation);
  const saveNote = useMutation(api.batireDons.setDonationNote);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [mode, setMode] = useState<"accepte" | "refuse" | null>(null);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState(donation.internalNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPhotoIndex(0);
    setMode(null);
    setMessage("");
    setNote(donation.internalNote ?? "");
  }, [donation._id, donation.internalNote]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(status: "accepte" | "refuse") {
    setBusy(true);
    setError(null);
    try {
      await decide({ id: donation._id, status, message: message.trim() || undefined });
      setMode(null);
      setMessage("");
    } catch (caught) {
      setError(errorMessage(caught, "Décision impossible."));
    } finally {
      setBusy(false);
    }
  }

  const donorName = `${donation.donor.firstName} ${donation.donor.lastName}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <header className="flex items-start gap-3 border-b border-[var(--border)] px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <DonationBadge status={donation.status} />
              <span className="text-xs font-medium text-[var(--muted-foreground)]">
                {donation.reference}
              </span>
            </div>
            <h2 className="mt-2 truncate text-xl font-bold">{donation.title}</h2>
            <p className="mt-0.5 truncate text-sm text-[var(--muted-foreground)]">
              {taxonomyPath(donation.category, donation.family, donation.subcategory)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--accent)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {donation.photoUrls.length ? (
            <div>
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--muted)]">
                <img
                  src={donation.photoUrls[photoIndex]}
                  alt=""
                  className="h-72 w-full object-contain"
                />
              </div>
              {donation.photoUrls.length > 1 ? (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {donation.photoUrls.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setPhotoIndex(index)}
                      className={cn(
                        "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition",
                        index === photoIndex ? "border-brand-500" : "border-[var(--border)]",
                      )}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {donation.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]">
              {donation.description}
            </p>
          ) : null}

          <dl className="grid grid-cols-2 gap-3">
            <Detail label="Quantité" value={donation.quantity ? `${donation.quantity} ${donation.unit ?? ""}`.trim() : "—"} />
            <Detail label="État" value={donation.condition ?? "—"} />
            <Detail
              label="Disponible dès"
              value={donation.availableFrom ? formatDate(donation.availableFrom) : "—"}
            />
            <Detail label="Proposé le" value={formatDate(donation.createdAt)} />
            <div className="col-span-2 rounded-xl border border-[var(--border)] px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Remise
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {donation.handover === "recuperer" ? (
                  <>
                    À récupérer
                    <span className="block text-[var(--muted-foreground)]">
                      {[donation.pickupAddress, donation.pickupPostalCode, donation.pickupCity]
                        .filter(Boolean)
                        .join(" ") || "Adresse non renseignée"}
                    </span>
                  </>
                ) : (
                  "Dépôt sur place"
                )}
              </dd>
            </div>
          </dl>

          {/* ── Donateur ────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--accent)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Donateur
            </p>
            <p className="mt-2 flex items-center gap-2 font-semibold">
              <Building2 className="h-4 w-4 text-[var(--muted-foreground)]" />
              {donation.donor.company || donorName}
            </p>
            {donation.donor.company ? (
              <p className="mt-0.5 pl-6 text-sm text-[var(--muted-foreground)]">{donorName}</p>
            ) : null}
            <div className="mt-3 space-y-1.5 text-sm">
              <a
                href={`mailto:${donation.donor.email}`}
                className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-brand-600 dark:hover:text-brand-400"
              >
                <Mail className="h-4 w-4" /> {donation.donor.email}
              </a>
              {donation.donor.phone ? (
                <a
                  href={`tel:${donation.donor.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-brand-600 dark:hover:text-brand-400"
                >
                  <Phone className="h-4 w-4" /> {donation.donor.phone}
                </a>
              ) : null}
              {donation.donor.address || donation.donor.city ? (
                <p className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <MapPin className="h-4 w-4" />
                  {[donation.donor.address, donation.donor.postalCode, donation.donor.city]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              ) : null}
            </div>
            {donation.donor.profiles?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {donation.donor.profiles.map((value) => (
                  <span
                    key={value}
                    className="rounded-full bg-[var(--card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-foreground)] ring-1 ring-[var(--border)]"
                  >
                    {value}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          {donation.status !== "nouveau" ? (
            <section className="rounded-2xl border border-[var(--border)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {donation.status === "accepte" ? "Accepté" : "Refusé"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {[donation.decidedBy, donation.decidedAt ? formatDateTime(donation.decidedAt) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {donation.decisionMessage ? (
                <p className="mt-2 whitespace-pre-line rounded-xl bg-[var(--muted)] px-3 py-2 text-sm">
                  {donation.decisionMessage}
                </p>
              ) : null}
            </section>
          ) : null}

          {canUpdate ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Note interne
              </p>
              <Textarea
                rows={2}
                className="mt-2"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Jamais visible du donateur."
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={note === (donation.internalNote ?? "")}
                onClick={() => void saveNote({ id: donation._id, internalNote: note })}
              >
                Enregistrer la note
              </Button>
            </section>
          ) : null}
        </div>

        {canUpdate ? (
          <footer className="space-y-3 border-t border-[var(--border)] px-6 py-4">
            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            ) : null}

            {mode ? (
              <>
                <Textarea
                  rows={3}
                  autoFocus
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={
                    mode === "refuse"
                      ? "Motif du refus, envoyé tel quel au donateur."
                      : "Conditions de dépôt : créneau, dépôt, consignes (facultatif)."
                  }
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setMode(null)} disabled={busy}>
                    Annuler
                  </Button>
                  <Button
                    variant={mode === "refuse" ? "danger" : "primary"}
                    disabled={busy || (mode === "refuse" && !message.trim())}
                    onClick={() => void submit(mode)}
                  >
                    {busy
                      ? "Envoi…"
                      : mode === "refuse"
                        ? "Refuser et prévenir"
                        : "Accepter et prévenir"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    setMessage("");
                    setMode("refuse");
                  }}
                >
                  <X className="h-4 w-4" /> Refuser
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setMessage("");
                    setMode("accepte");
                  }}
                >
                  <Check className="h-4 w-4" /> Accepter
                </Button>
              </div>
            )}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}
