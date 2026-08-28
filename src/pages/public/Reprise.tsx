import { useState } from "react";
import { useMutation } from "convex/react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ImagePlus, Recycle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { UNITS, type Unit } from "../../lib/constants";
import { useUpload } from "../../lib/upload";

/**
 * Proposition de reprise : un artisan ou un particulier propose ses surplus.
 *
 * Les photos comptent autant que le texte — sans elles, impossible d'estimer
 * l'état d'un lot à distance. La quantité et son unité sont demandées d'emblée
 * pour la même raison : « des plaques de plâtre » ne se chiffre pas.
 */
export function Reprise() {
  const createRequest = useMutation(api.batire.createRequest);
  const { upload, uploading } = useUpload();
  const [photos, setPhotos] = useState<Id<"_storage">[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    quantity: "",
    unit: "palette" as Unit,
    message: "",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      const list = Array.from(files).slice(0, 8);
      setPreviews((current) => [...current, ...list.map((file) => URL.createObjectURL(file))]);
      const ids = await upload(list);
      setPhotos((current) => [...current, ...ids]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Envoi des photos impossible.");
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await createRequest({
        type: "reprise",
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          company: form.company || undefined,
        },
        items: form.title
          ? [
              {
                title: form.title,
                quantity: Number(form.quantity.replace(",", ".")) || 0,
                unit: form.unit,
              },
            ]
          : [],
        message: form.message || undefined,
        photos: photos.length ? photos : undefined,
      });
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Envoi impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Proposition envoyée</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Nous étudions votre lot et revenons vers vous rapidement, avec une estimation et les
          conditions d'enlèvement.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-brand-700">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </Link>

      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <Recycle className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
            Proposer des matériaux
          </h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Fin de chantier, surplus de commande, dépose soignée : décrivez le lot et joignez
            quelques photos. Nous vous répondons avec une proposition de reprise.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" required>
            <Input value={form.firstName} onChange={(e) => set("firstName")(e.target.value)} />
          </Field>
          <Field label="Nom" required>
            <Input value={form.lastName} onChange={(e) => set("lastName")(e.target.value)} />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
          </Field>
          <Field label="Entreprise">
            <Input value={form.company} onChange={(e) => set("company")(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="Nature du lot" hint="ex. plaques de plâtre BA13">
            <Input value={form.title} onChange={(e) => set("title")(e.target.value)} />
          </Field>
          <Field label="Quantité">
            <Input
              inputMode="decimal"
              value={form.quantity}
              onChange={(e) => set("quantity")(e.target.value)}
            />
          </Field>
          <Field label="Unité">
            <Select value={form.unit} onChange={(e) => set("unit")(e.target.value)}>
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Précisions" hint="état, lieu, délai d'enlèvement">
          <Textarea value={form.message} onChange={(e) => set("message")(e.target.value)} />
        </Field>

        <Field label="Photos" hint="jusqu'à 8, elles conditionnent l'estimation">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] px-4 py-6 text-sm text-[var(--muted-foreground)] transition hover:border-brand-400">
            <ImagePlus className="h-5 w-5" />
            {uploading ? "Envoi en cours…" : "Ajouter des photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => void addPhotos(event.target.files)}
            />
          </label>
        </Field>

        {previews.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {previews.map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                className="h-20 w-20 rounded-lg border border-[var(--border)] object-cover"
              />
            ))}
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button
          className="w-full"
          onClick={() => void submit()}
          disabled={saving || uploading || !form.firstName || !form.lastName || !form.email}
        >
          {saving ? "Envoi…" : "Envoyer ma proposition"}
        </Button>
      </div>
    </div>
  );
}
