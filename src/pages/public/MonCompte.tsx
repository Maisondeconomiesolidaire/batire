import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ChevronRight, HeartHandshake, Lock, PackageOpen, Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { DonationBadge } from "../../components/ui/Badge";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { DonorFieldset, EMPTY_DONOR, type DonorForm } from "../../components/public/DonorFieldset";
import { formatFrPhone } from "../../components/ui/PhoneInput";
import { formatDate, formatDateTime } from "../../lib/format";
import { PAGE_X, type DonationStatus } from "../../lib/constants";
import { errorMessage } from "../../lib/errors";
import { cn } from "../../lib/cn";

type MyDonation = {
  _id: string;
  reference: string;
  title: string;
  description?: string;
  category: string;
  family?: string;
  subcategory?: string;
  condition?: string;
  quantity?: number;
  unit?: string;
  availableFrom?: number;
  status: DonationStatus;
  decisionMessage?: string;
  decidedAt?: number;
  photoUrls: string[];
  createdAt: number;
};

type Tab = "infos" | "dons";

export function MonCompte() {
  const { isLoaded, isSignedIn, user } = useUser();
  const profile = useQuery(api.batireDons.getMyDonorProfile, {});
  const donations = useQuery(api.batireDons.myDonations, {}) as MyDonation[] | undefined;
  const save = useMutation(api.batireDons.saveMyDonorProfile);

  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("onglet") === "dons" ? "dons" : "infos";
  const setTab = (next: Tab) => {
    const updated = new URLSearchParams(params);
    if (next === "dons") updated.set("onglet", "dons");
    else updated.delete("onglet");
    setParams(updated, { replace: true });
  };
  const [openId, setOpenId] = useState<string | null>(null);
  const [donor, setDonor] = useState<DonorForm>(EMPTY_DONOR);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDonor({
      company: profile.company,
      siret: profile.siret,
      profiles: profile.profiles,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: formatFrPhone(profile.phone),
      address: profile.address,
      postalCode: profile.postalCode,
      city: profile.city,
    });
  }, [profile]);

  const set = <K extends keyof DonorForm>(key: K, value: DonorForm[K]) => {
    setSaved(false);
    setDonor((current) => ({ ...current, [key]: value }));
  };
  const selected = donations?.find((donation) => donation._id === openId) ?? null;
  const patch = (values: Partial<DonorForm>) => {
    setSaved(false);
    setDonor((current) => ({ ...current, ...values }));
  };

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await save({
        company: donor.company,
        siret: donor.siret,
        profiles: donor.profiles,
        firstName: donor.firstName,
        lastName: donor.lastName,
        phone: donor.phone,
        address: donor.address,
        postalCode: donor.postalCode,
        city: donor.city,
      });
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className={cn("mx-auto max-w-lg py-24 text-center", PAGE_X)}>
        <Lock className="mx-auto h-6 w-6 text-[var(--muted-foreground)]" />
        <h1 className="mt-4 text-2xl font-black tracking-tight">Espace client</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Connectez-vous pour renseigner votre fiche donateur et suivre vos dons.
        </p>
        <div className="mt-6">
          <SignInButton mode="modal">
            <Button>Se connecter</Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (profile === undefined) return <FullSpinner label="Chargement de votre espace…" />;

  return (
    <div className={cn("mx-auto w-full max-w-6xl py-6", PAGE_X)}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Espace client
          </p>
          <h1 className="mt-1.5 truncate text-3xl font-black tracking-tight sm:text-4xl">
            {donor.company.trim() || user?.fullName || "Mon espace"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {[donor.email || user?.primaryEmailAddress?.emailAddress, ...donor.profiles]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Link to="/don/nouveau">
          <Button>
            <Plus className="h-4 w-4" /> Nouveau don
          </Button>
        </Link>
      </header>

      <UnderlineTabs
        className="mt-5"
        value={tab}
        onChange={(next) => {
          setTab(next);
          setOpenId(null);
        }}
        items={[
          { key: "infos", label: "Mes informations" },
          { key: "dons", label: "Mes dons" },
        ]}
        counts={{ dons: donations?.length }}
      />

      {tab === "infos" ? (
        <section className="mt-6 max-w-3xl space-y-5">
          <p className="text-sm text-[var(--muted-foreground)]">
            Ces informations remplissent le formulaire d'achat et chaque proposition de don.
          </p>
          <DonorFieldset donor={donor} set={set} patch={patch} />
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {saved ? (
              <span className="text-sm font-medium text-emerald-600">Fiche à jour.</span>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="mt-6">
          {donations === undefined ? (
            <FullSpinner />
          ) : selected ? (
            <DonationDetail donation={selected} onBack={() => setOpenId(null)} />
          ) : donations.length === 0 ? (
            <EmptyState
              icon={<HeartHandshake className="h-9 w-9" />}
              title="Aucun don proposé"
              description="Vos propositions et leurs réponses s'afficheront ici."
              action={
                <Link to="/don/nouveau">
                  <Button variant="outline">Proposer un don</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {donations.map((donation) => (
                <li key={donation._id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(donation._id)}
                    className="group flex w-full items-center gap-4 py-4 text-left transition"
                  >
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--muted)]">
                      {donation.photoUrls[0] ? (
                        <img
                          src={donation.photoUrls[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <PackageOpen className="m-5 h-6 w-6 text-[var(--muted-foreground)]" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold transition group-hover:text-brand-700">
                        {donation.title}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-[var(--muted-foreground)]">
                        {donation.reference} · {formatDate(donation.createdAt)}
                      </span>
                    </span>
                    <DonationBadge status={donation.status} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** Fiche d'un don : ce que le donateur a envoyé, et la réponse de l'équipe. */
function DonationDetail({ donation, onBack }: { donation: MyDonation; onBack: () => void }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const specs: Array<[string, string | undefined]> = [
    ["Catégorie", [donation.category, donation.family, donation.subcategory].filter(Boolean).join(" › ")],
    ["Quantité", donation.quantity ? `${donation.quantity} ${donation.unit ?? ""}`.trim() : undefined],
    ["État", donation.condition],
    ["Disponible dès", donation.availableFrom ? formatDate(donation.availableFrom) : undefined],
    ["Proposé le", formatDateTime(donation.createdAt)],
    ["Réponse le", donation.decidedAt ? formatDateTime(donation.decidedAt) : undefined],
  ];

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Tous mes dons
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {donation.reference}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">{donation.title}</h2>
        </div>
        <DonationBadge status={donation.status} />
      </div>

      {donation.decisionMessage ? (
        <p className="mt-4 whitespace-pre-line border-l-2 border-brand-400 bg-[var(--muted)] px-4 py-3 text-sm leading-relaxed">
          {donation.decisionMessage}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        {donation.photoUrls.length ? (
          <div>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
              <img
                src={donation.photoUrls[photoIndex]}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            {donation.photoUrls.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {donation.photoUrls.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setPhotoIndex(index)}
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition",
                      index === photoIndex ? "border-brand-500" : "border-[var(--border)]",
                    )}
                  >
                    <img src={url} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          {donation.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed">{donation.description}</p>
          ) : null}
          <dl className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)] text-sm">
            {specs
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-[var(--muted-foreground)]">{label}</dt>
                  <dd className="min-w-0 text-right font-medium">{value}</dd>
                </div>
              ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
