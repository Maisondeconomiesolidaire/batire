import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { Building2, HeartHandshake, Lock, PackageOpen, Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { DonationBadge } from "../../components/ui/Badge";
import { DonorFieldset, EMPTY_DONOR, type DonorForm } from "../../components/public/DonorFieldset";
import { formatDate } from "../../lib/format";
import { PAGE_X, type DonationStatus } from "../../lib/constants";
import { errorMessage } from "../../lib/errors";
import { cn } from "../../lib/cn";

type MyDonation = {
  _id: string;
  reference: string;
  title: string;
  category: string;
  family?: string;
  subcategory?: string;
  status: DonationStatus;
  decisionMessage?: string;
  photoUrls: string[];
  createdAt: number;
};

export function MonCompte() {
  const { isLoaded, isSignedIn, user } = useUser();
  const profile = useQuery(api.batireDons.getMyDonorProfile, {});
  const donations = useQuery(api.batireDons.myDonations, {}) as MyDonation[] | undefined;
  const save = useMutation(api.batireDons.saveMyDonorProfile);

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
      phone: profile.phone,
      address: profile.address,
      postalCode: profile.postalCode,
      city: profile.city,
    });
  }, [profile]);

  const set = <K extends keyof DonorForm>(key: K, value: DonorForm[K]) => {
    setSaved(false);
    setDonor((current) => ({ ...current, [key]: value }));
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
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Lock className="h-5 w-5" />
        </span>
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
      <header className="overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-brand-50 via-[var(--card)] to-[var(--card)] p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <h1 className="mt-4 truncate text-3xl font-black tracking-tight">
              {donor.company.trim() || user?.fullName || "Mon espace"}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {donor.email || user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
          <Link to="/don/nouveau">
            <Button>
              <Plus className="h-4 w-4" /> Nouveau don
            </Button>
          </Link>
        </div>
        {donor.profiles.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {donor.profiles.map((value) => (
              <span
                key={value}
                className="rounded-full bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)] ring-1 ring-[var(--border)]"
              >
                {value}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* ── Fiche donateur ───────────────────────────────────────────── */}
        <section className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <div>
            <h2 className="text-lg font-bold">Ma fiche donateur</h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Reprise automatiquement à l'achat et à chaque don.
            </p>
          </div>
          <DonorFieldset donor={donor} set={set} />
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
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

        {/* ── Mes dons ─────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold">Mes dons</h2>
            <span className="text-sm text-[var(--muted-foreground)]">
              {donations?.length ?? 0}
            </span>
          </div>

          <div className="mt-4">
            {donations === undefined ? (
              <FullSpinner />
            ) : donations.length === 0 ? (
              <EmptyState
                icon={<HeartHandshake className="h-9 w-9" />}
                title="Aucun don proposé"
                action={
                  <Link to="/don/nouveau">
                    <Button variant="outline">Proposer un don</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {donations.map((donation) => (
                  <li
                    key={donation._id}
                    className="rounded-xl border border-[var(--border)] p-3 transition hover:border-brand-300"
                  >
                    <div className="flex gap-3">
                      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--muted)]">
                        {donation.photoUrls[0] ? (
                          <img
                            src={donation.photoUrls[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <PackageOpen className="m-4 h-6 w-6 text-[var(--muted-foreground)]" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate font-semibold">{donation.title}</p>
                          <DonationBadge status={donation.status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                          {donation.reference} · {formatDate(donation.createdAt)}
                        </p>
                      </div>
                    </div>
                    {donation.decisionMessage ? (
                      <p className="mt-2 rounded-lg bg-[var(--muted)] px-3 py-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                        {donation.decisionMessage}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
