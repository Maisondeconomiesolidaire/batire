import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CheckCircle2, ImagePlus, Lock, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { Dropdown } from "../../components/ui/Dropdown";
import { Spinner } from "../../components/ui/Spinner";
import {
  DonorFieldset,
  EMPTY_DONOR,
  donorReady,
  type DonorForm,
} from "../../components/public/DonorFieldset";
import { formatFrPhone } from "../../components/ui/PhoneInput";
import { useUpload } from "../../lib/upload";
import { CATEGORIES, familiesOf, subFamiliesOf } from "../../lib/taxonomy";
import { CONDITIONS, PAGE_X, UNITS, type Condition, type Unit } from "../../lib/constants";
import { errorMessage } from "../../lib/errors";
import { cn } from "../../lib/cn";

type LotForm = {
  title: string;
  description: string;
  category: string;
  family: string;
  subcategory: string;
  condition: Condition;
  quantity: string;
  unit: Unit;
  availableFrom: string;
};

const EMPTY_LOT: LotForm = {
  title: "",
  description: "",
  category: "",
  family: "",
  subcategory: "",
  condition: "Bon",
  quantity: "",
  unit: "unité",
  availableFrom: "",
};

export function NouveauDon() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();
  const profile = useQuery(api.batireDons.getMyDonorProfile, {});
  const submit = useMutation(api.batireDons.submitDonation);
  const { upload, uploading } = useUpload();

  const [lot, setLot] = useState<LotForm>(EMPTY_LOT);
  const [donor, setDonor] = useState<DonorForm>(EMPTY_DONOR);
  const [photos, setPhotos] = useState<Id<"_storage">[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  // La fiche donateur remplit le formulaire, sans jamais écraser ce que le
  // donateur vient de taper.
  useEffect(() => {
    if (!profile) return;
    setDonor((current) => ({
      company: current.company || profile.company,
      siret: current.siret || profile.siret,
      profiles: current.profiles.length ? current.profiles : profile.profiles,
      firstName: current.firstName || profile.firstName,
      lastName: current.lastName || profile.lastName,
      email: profile.email,
      phone: current.phone || formatFrPhone(profile.phone),
      address: current.address || profile.address,
      postalCode: current.postalCode || profile.postalCode,
      city: current.city || profile.city,
    }));
  }, [profile]);

  const setLotField = <K extends keyof LotForm>(key: K, value: LotForm[K]) =>
    setLot((current) => ({ ...current, [key]: value }));
  const setDonorField = <K extends keyof DonorForm>(key: K, value: DonorForm[K]) =>
    setDonor((current) => ({ ...current, [key]: value }));
  const patchDonor = (values: Partial<DonorForm>) =>
    setDonor((current) => ({ ...current, ...values }));

  const families = useMemo(() => familiesOf(lot.category), [lot.category]);
  const subFamilies = useMemo(
    () => subFamiliesOf(lot.category, lot.family),
    [lot.category, lot.family],
  );

  const ready =
    Boolean(lot.title.trim()) && Boolean(lot.category) && photos.length > 0 && donorReady(donor);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files).slice(0, 8);
    setPreviews((current) => [...current, ...list.map((file) => URL.createObjectURL(file))]);
    try {
      const ids = await upload(list);
      setPhotos((current) => [...current, ...ids]);
    } catch (caught) {
      setError(errorMessage(caught, "Envoi des photos impossible."));
    }
  }

  async function send() {
    setSaving(true);
    setError(null);
    try {
      await submit({
        title: lot.title,
        description: lot.description || undefined,
        category: lot.category,
        family: lot.family || undefined,
        subcategory: lot.subcategory || undefined,
        condition: lot.condition,
        quantity: lot.quantity ? Number(lot.quantity.replace(",", ".")) : undefined,
        unit: lot.unit,
        availableFrom: lot.availableFrom ? new Date(lot.availableFrom).getTime() : undefined,
        photos,
        donor: {
          company: donor.company || undefined,
          firstName: donor.firstName,
          lastName: donor.lastName,
          phone: donor.phone || undefined,
          profiles: donor.profiles,
          address: donor.address || undefined,
          postalCode: donor.postalCode || undefined,
          city: donor.city || undefined,
        },
      });
      setReference("envoyé");
    } catch (caught) {
      setError(errorMessage(caught, "Envoi impossible."));
    } finally {
      setSaving(false);
    }
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className={cn("mx-auto max-w-lg py-24 text-center", PAGE_X)}>
        <Lock className="mx-auto h-6 w-6 text-[var(--muted-foreground)]" />
        <h1 className="mt-4 text-2xl font-black tracking-tight">Proposer un don</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Connectez-vous pour proposer vos matériaux et suivre vos dons.
        </p>
        <div className="mt-6">
          <SignInButton mode="modal">
            <Button>Se connecter</Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (reference) {
    return (
      <div className={cn("mx-auto max-w-lg py-24 text-center", PAGE_X)}>
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-black tracking-tight">Don envoyé</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          L'équipe l'étudie et vous répond par email.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => navigate("/mon-compte")}>
            Suivre mes dons
          </Button>
          <Button
            onClick={() => {
              setLot(EMPTY_LOT);
              setPhotos([]);
              setPreviews([]);
              setReference(null);
            }}
          >
            Proposer un autre lot
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-6xl py-6", PAGE_X)}>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </Link>

      <header className="mt-4 border-b border-[var(--border)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Don de matériaux
        </p>
        <h1 className="mt-1.5 text-3xl font-black tracking-tight sm:text-4xl">Proposer un don</h1>
        <p className="mt-1.5 max-w-xl text-sm text-[var(--muted-foreground)]">
          Photographiez le lot, rangez-le dans le catalogue, envoyez. L'équipe répond par email.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6">
          {/* ── Photos ───────────────────────────────────────────────────── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Photos
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Au moins une photo, 8 au maximum.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {previews.map((url, index) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt=""
                    className="h-24 w-24 rounded-xl border border-[var(--border)] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviews((current) => current.filter((_, i) => i !== index));
                      setPhotos((current) => current.filter((_, i) => i !== index));
                    }}
                    className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white shadow-sm"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--border)] text-[var(--muted-foreground)] transition hover:border-brand-400 hover:text-brand-600">
                {uploading ? (
                  <Spinner className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[11px] font-medium">Ajouter</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </section>

          {/* ── Le lot ───────────────────────────────────────────────────── */}
          <section className="space-y-4 border-t border-[var(--border)] pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Le lot
            </p>
            <Field label="Titre" required>
              <Input
                value={lot.title}
                onChange={(event) => setLotField("title", event.target.value)}
                placeholder="Palette de tuiles terre cuite"
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={3}
                value={lot.description}
                onChange={(event) => setLotField("description", event.target.value)}
                placeholder="État, provenance, conditionnement, contraintes d'enlèvement…"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Catégorie" required>
                <Dropdown
                  searchable
                  value={lot.category}
                  onChange={(value) =>
                    setLot((current) => ({ ...current, category: value, family: "", subcategory: "" }))
                  }
                  placeholder="Choisir"
                  options={CATEGORIES.map((value) => ({ value, label: value }))}
                />
              </Field>
              <Field label="Famille">
                <Dropdown
                  searchable
                  disabled={!lot.category}
                  value={lot.family}
                  onChange={(value) =>
                    setLot((current) => ({ ...current, family: value, subcategory: "" }))
                  }
                  placeholder={lot.category ? "Choisir" : "Catégorie d'abord"}
                  options={families.map((value) => ({ value, label: value }))}
                />
              </Field>
              <Field label="Sous-famille">
                <Dropdown
                  searchable
                  disabled={!lot.family}
                  value={lot.subcategory}
                  onChange={(value) => setLotField("subcategory", value)}
                  placeholder={lot.family ? "Choisir" : "Famille d'abord"}
                  options={subFamilies.map((value) => ({ value, label: value }))}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="État">
                <Dropdown
                  value={lot.condition}
                  onChange={(value) => setLotField("condition", value as Condition)}
                  options={CONDITIONS.map((value) => ({ value, label: value }))}
                />
              </Field>
              <Field label="Quantité">
                <Input
                  inputMode="decimal"
                  value={lot.quantity}
                  onChange={(event) => setLotField("quantity", event.target.value)}
                  placeholder="12"
                />
              </Field>
              <Field label="Unité">
                <Dropdown
                  value={lot.unit}
                  onChange={(value) => setLotField("unit", value as Unit)}
                  options={UNITS.map((value) => ({ value, label: value }))}
                />
              </Field>
              <Field label="Disponible à partir du">
                <Input
                  type="date"
                  value={lot.availableFrom}
                  onChange={(event) => setLotField("availableFrom", event.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* ── Donateur ─────────────────────────────────────────────────── */}
          <section className="space-y-4 border-t border-[var(--border)] pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Vos coordonnées
              </p>
              <Link to="/mon-compte" className="text-xs font-semibold text-brand-700">
                Modifier ma fiche
              </Link>
            </div>
            <DonorFieldset donor={donor} set={setDonorField} patch={patchDonor} showSiret={false} />
          </section>
        </div>

        {/* ── Récapitulatif ──────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-[var(--border)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Récapitulatif
            </p>
            <p className="mt-3 text-lg font-bold">{lot.title.trim() || "Votre lot"}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {[lot.category, lot.family, lot.subcategory].filter(Boolean).join(" › ") ||
                "Aucune catégorie"}
            </p>
            <dl className="mt-4 space-y-2 border-t border-[var(--border)] pt-4 text-sm">
              <Row label="Photos" value={`${photos.length}`} />
              <Row
                label="Quantité"
                value={lot.quantity ? `${lot.quantity} ${lot.unit}` : "—"}
              />
              <Row label="État" value={lot.condition} />
              <Row
                label="Donateur"
                value={
                  [donor.company, `${donor.firstName} ${donor.lastName}`.trim()]
                    .filter(Boolean)
                    .join(" · ") || "—"
                }
              />
            </dl>

            {error ? (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            ) : null}

            <Button
              className="mt-4 w-full"
              disabled={!ready || saving || uploading}
              onClick={() => void send()}
            >
              {saving ? "Envoi…" : "Envoyer le don"}
            </Button>
            {!ready ? (
              <p className="mt-2 text-center text-xs text-[var(--muted-foreground)]">
                Titre, catégorie, une photo, prénom, nom et téléphone.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--muted-foreground)]">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}
