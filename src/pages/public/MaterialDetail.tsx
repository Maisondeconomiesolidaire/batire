import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CheckCircle2, MapPin, PackageOpen, Ruler } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Badge";
import { formatDimensions, formatStock, formatUnitPrice } from "../../lib/format";
import { UNIT_LABELS } from "../../lib/constants";

export function MaterialDetail({ kiosk = false }: { kiosk?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const material = useQuery(
    api.batire.getPublicMaterial,
    id ? { id: id as Id<"btMaterials"> } : "skip",
  );
  const [photoIndex, setPhotoIndex] = useState(0);

  if (material === undefined) return <FullSpinner label="Chargement du matériau…" />;
  if (material === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<PackageOpen className="h-10 w-10" />}
          title="Matériau introuvable"
          action={
            <Link to={kiosk ? "/kiosk" : "/"} className="text-sm font-semibold text-brand-700">
              Retour au catalogue
            </Link>
          }
        />
      </div>
    );
  }

  const dimensions = formatDimensions(material);
  const specs: Array<[string, string | undefined]> = [
    ["Catégorie", material.subcategory ? `${material.category} · ${material.subcategory}` : material.category],
    ["État", material.condition],
    ["Dimensions", dimensions || undefined],
    ["Matière", material.material],
    ["Marque", material.brand],
    ["Référence", material.modelReference],
    ["Couleur", material.color],
    ["Poids", material.weightKg ? `${material.weightKg} kg` : undefined],
    ["Conditionnement", material.packaging],
    ["Normes", material.standards],
    ["Caractéristiques", material.technicalNotes],
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to={kiosk ? "/kiosk" : "/"}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--muted)]">
            {material.photoUrls[photoIndex] ? (
              <img
                src={material.photoUrls[photoIndex]}
                alt={material.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
                <PackageOpen className="h-12 w-12" />
              </div>
            )}
          </div>
          {material.photoUrls.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {material.photoUrls.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPhotoIndex(index)}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    index === photoIndex ? "border-brand-500" : "border-transparent opacity-70"
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            <Pill className="bg-[var(--muted)] text-[var(--muted-foreground)]">
              {material.category}
            </Pill>
            <Pill className="bg-brand-50 text-brand-700">{material.condition}</Pill>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--foreground)]">
            {material.title}
          </h1>

          <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-3xl font-black text-brand-700">
              {formatUnitPrice(material.price, material.unit)}
            </p>
            <p className="mt-1 text-sm text-brand-800">
              Vendu {UNIT_LABELS[material.unit]} ·{" "}
              {formatStock(material.quantity, material.unit)} disponible
            </p>
          </div>

          <p className="mt-5 whitespace-pre-line text-[var(--foreground)]">{material.description}</p>

          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {specs
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-[var(--foreground)]">{value}</dd>
                </div>
              ))}
          </dl>

          {material.depot ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <MapPin className="h-4 w-4 text-brand-600" />
              Disponible au dépôt {material.depot}
              {material.location ? ` · ${material.location}` : ""}
            </p>
          ) : null}

          {kiosk ? (
            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-5 text-center">
              <Ruler className="mx-auto h-6 w-6 text-brand-600" />
              <p className="mt-2 font-semibold text-[var(--foreground)]">Renseignements au comptoir</p>
            </div>
          ) : (
            <RequestBlock materialId={material._id} title={material.title} unit={material.unit} />
          )}
        </div>
      </div>
    </div>
  );
}

function RequestBlock({
  materialId,
  title,
  unit,
}: {
  materialId: Id<"btMaterials">;
  title: string;
  unit: string;
}) {
  const createRequest = useMutation(api.batire.createRequest);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    quantity: "",
    message: "",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await createRequest({
        type: "devis",
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          company: form.company || undefined,
        },
        items: [
          {
            materialId,
            title,
            quantity: Number(form.quantity.replace(",", ".")) || 0,
            unit: unit as never,
          },
        ],
        message: form.message || undefined,
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
      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-900">Demande envoyée</p>
          <p className="mt-1 text-sm text-emerald-800">Nous vous recontactons rapidement.</p>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <Button className="mt-8 w-full" onClick={() => setOpen(true)}>
        Demander un devis
      </Button>
    );
  }

  return (
    <div className="mt-8 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <p className="font-semibold text-[var(--foreground)]">Votre demande</p>
      <div className="grid gap-3 sm:grid-cols-2">
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
        <Field label={`Quantité souhaitée (${unit})`}>
          <Input
            inputMode="decimal"
            value={form.quantity}
            onChange={(e) => set("quantity")(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Précisions">
        <Textarea
          rows={3}
          value={form.message}
          onChange={(e) => set("message")(e.target.value)}
        />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <Button
          onClick={() => void submit()}
          disabled={saving || !form.firstName || !form.lastName || !form.email}
        >
          {saving ? "Envoi…" : "Envoyer la demande"}
        </Button>
      </div>
    </div>
  );
}
