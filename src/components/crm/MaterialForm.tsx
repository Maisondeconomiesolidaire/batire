import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ImagePlus, ScanLine, Sparkles, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";
import { Dropdown } from "../ui/Dropdown";
import { CameraScanner } from "../ui/CameraScanner";
import { Spinner } from "../ui/Spinner";
import { useAnalyzePhotos, useUpload } from "../../lib/upload";
import {
  CONDITIONS,
  MATERIAL_STATUSES,
  STATUS_LABELS,
  UNITS,
  UNIT_LABELS,
  type Condition,
  type MaterialStatus,
  type Unit,
} from "../../lib/constants";
import { CATEGORIES, familiesOf, subFamiliesOf } from "../../lib/taxonomy";

type FormState = {
  title: string;
  description: string;
  category: string;
  family: string;
  subcategory: string;
  condition: Condition;
  unit: Unit;
  quantity: string;
  price: string;
  packaging: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  thicknessMm: string;
  weightKg: string;
  brand: string;
  modelReference: string;
  material: string;
  color: string;
  standards: string;
  technicalNotes: string;
  depot: string;
  location: string;
  qrReference: string;
  status: MaterialStatus;
  published: boolean;
};

const EMPTY: FormState = {
  title: "",
  description: "",
  category: CATEGORIES[0]!,
  family: "",
  subcategory: "",
  condition: "Bon état",
  unit: "unité",
  quantity: "",
  price: "",
  packaging: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  thicknessMm: "",
  weightKg: "",
  brand: "",
  modelReference: "",
  material: "",
  color: "",
  standards: "",
  technicalNotes: "",
  depot: "",
  location: "",
  qrReference: "",
  status: "disponible",
  published: false,
};

const number = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
const text = (value: string) => (value.trim() ? value.trim() : undefined);

export function MaterialForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const materialId = id ? (id as Id<"btMaterials">) : undefined;
  const onClose = () => navigate("/crm");

  const existing = useQuery(
    api.batire.getMaterial,
    materialId ? { id: materialId } : "skip",
  );
  const createMaterial = useMutation(api.batire.createMaterial);
  const updateMaterial = useMutation(api.batire.updateMaterial);
  const analyze = useAnalyzePhotos();
  const { upload, uploading } = useUpload();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [photos, setPhotos] = useState<Id<"_storage">[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraDetails, setExtraDetails] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setForm({
      title: existing.title,
      description: existing.description,
      category: existing.category,
      family: existing.family ?? "",
      subcategory: existing.subcategory ?? "",
      condition: existing.condition,
      unit: existing.unit,
      quantity: String(existing.quantity ?? ""),
      price: String(existing.price ?? ""),
      packaging: existing.packaging ?? "",
      lengthCm: existing.lengthCm ? String(existing.lengthCm) : "",
      widthCm: existing.widthCm ? String(existing.widthCm) : "",
      heightCm: existing.heightCm ? String(existing.heightCm) : "",
      thicknessMm: existing.thicknessMm ? String(existing.thicknessMm) : "",
      weightKg: existing.weightKg ? String(existing.weightKg) : "",
      brand: existing.brand ?? "",
      modelReference: existing.modelReference ?? "",
      material: existing.material ?? "",
      color: existing.color ?? "",
      standards: existing.standards ?? "",
      technicalNotes: existing.technicalNotes ?? "",
      depot: existing.depot ?? "",
      location: existing.location ?? "",
      qrReference: existing.qrReference ?? "",
      status: existing.status,
      published: existing.published ?? false,
    });
    setPhotos(existing.photos);
    setPhotoUrls(existing.photoUrls);
    setAiNotes(existing.aiNotes ?? null);
  }, [existing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      const list = Array.from(files).slice(0, 8);
      setPhotoUrls((current) => [...current, ...list.map((file) => URL.createObjectURL(file))]);
      const ids = await upload(list);
      setPhotos((current) => [...current, ...ids]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Envoi des photos impossible.");
    }
  }

  async function runAnalysis() {
    if (photos.length === 0) {
      setError("Ajoutez au moins une photo avant de lancer l'analyse.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyze({ storageIds: photos, extraDetails: extraDetails || undefined });
      setForm((current) => ({
        ...current,
        title: result.title || current.title,
        description: result.description || current.description,
        category: result.category || current.category,
        family: result.family ?? current.family,
        subcategory: result.subcategory ?? current.subcategory,
        condition: (result.condition as Condition) || current.condition,
        unit: (result.unit as Unit) || current.unit,
        quantity: result.quantity ? String(result.quantity) : current.quantity,
        price: result.price ? String(result.price) : current.price,
        packaging: result.packaging ?? current.packaging,
        lengthCm: result.lengthCm ? String(result.lengthCm) : current.lengthCm,
        widthCm: result.widthCm ? String(result.widthCm) : current.widthCm,
        heightCm: result.heightCm ? String(result.heightCm) : current.heightCm,
        thicknessMm: result.thicknessMm ? String(result.thicknessMm) : current.thicknessMm,
        weightKg: result.weightKg ? String(result.weightKg) : current.weightKg,
        brand: result.brand ?? current.brand,
        modelReference: result.modelReference ?? current.modelReference,
        material: result.material ?? current.material,
        color: result.color ?? current.color,
        standards: result.standards ?? current.standards,
        technicalNotes: result.technicalNotes ?? current.technicalNotes,
      }));
      setAiNotes(result.aiNotes ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analyse impossible.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        family: text(form.family),
        subcategory: text(form.subcategory),
        condition: form.condition,
        unit: form.unit,
        quantity: Number(form.quantity.replace(",", ".")) || 0,
        price: Number(form.price.replace(",", ".")) || 0,
        packaging: text(form.packaging),
        lengthCm: number(form.lengthCm),
        widthCm: number(form.widthCm),
        heightCm: number(form.heightCm),
        thicknessMm: number(form.thicknessMm),
        weightKg: number(form.weightKg),
        brand: text(form.brand),
        modelReference: text(form.modelReference),
        material: text(form.material),
        color: text(form.color),
        standards: text(form.standards),
        technicalNotes: text(form.technicalNotes),
        depot: text(form.depot),
        location: text(form.location),
        qrReference: text(form.qrReference)?.toUpperCase(),
        photos,
        aiNotes: aiNotes ?? undefined,
      };
      if (materialId) {
        await updateMaterial({
          id: materialId,
          ...payload,
          status: form.status,
          published: form.published,
        });
      } else {
        await createMaterial({ ...payload, status: form.status, published: form.published });
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      {scanning ? (
        <CameraScanner
          onClose={() => setScanning(false)}
          onDetected={(code) => {
            // L'étiquette encode l'URL du QR ; on n'en garde que la référence,
            // qui est ce que porte la fiche.
            const match = code.trim().match(/([A-Z]{2}-\d{4,})/i);
            set("qrReference", (match?.[1] ?? code.trim()).toUpperCase());
            setScanning(false);
          }}
        />
      ) : null}
      <button
        type="button"
        onClick={onClose}
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </button>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <h1 className="text-xl font-bold">
            {materialId ? "Modifier le matériau" : "Nouveau matériau"}
          </h1>
        </div>

        <div className="space-y-6 p-6">
          {/* ── Photos et génération ─────────────────────────────────────── */}
          <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">Photos</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runAnalysis()}
                disabled={analyzing || uploading || photos.length === 0}
              >
                {analyzing ? <Spinner className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {analyzing ? "Analyse…" : "Générer la fiche"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {photoUrls.map((url, index) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt=""
                    className="h-20 w-20 rounded-lg border border-[var(--border)] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrls((current) => current.filter((_, i) => i !== index));
                      setPhotos((current) => current.filter((_, i) => i !== index));
                    }}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-red-600 p-0.5 text-white"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:border-brand-400">
                {uploading ? <Spinner className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => void addPhotos(event.target.files)}
                />
              </label>
            </div>

            <Field label="Précisions pour l'IA">
              <Input
                value={extraDetails}
                onChange={(event) => setExtraDetails(event.target.value)}
              />
            </Field>

            {aiNotes ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                À vérifier : {aiNotes}
              </p>
            ) : null}
          </section>

          {/* ── Identité ─────────────────────────────────────────────────── */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Titre" required>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description" required>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Catégorie" required>
              <Dropdown
                searchable
                value={form.category}
                onChange={(value) => {
                  // Les niveaux inférieurs appartiennent à leur parent : les
                  // garder après un changement laisserait une branche fausse.
                  set("category", value);
                  set("family", "");
                  set("subcategory", "");
                }}
                options={CATEGORIES.map((value) => ({ value, label: value }))}
              />
            </Field>
            <Field label="Famille">
              <Dropdown
                searchable
                value={form.family}
                onChange={(value) => {
                  set("family", value);
                  set("subcategory", "");
                }}
                placeholder="Choisir une famille"
                options={familiesOf(form.category).map((value) => ({ value, label: value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Sous-famille">
                <Dropdown
                  searchable
                  value={form.subcategory}
                  onChange={(value) => set("subcategory", value)}
                  placeholder={
                    form.family ? "Choisir une sous-famille" : "Choisissez d'abord une famille"
                  }
                  disabled={!form.family}
                  options={subFamiliesOf(form.category, form.family).map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </Field>
            </div>
          </section>

          {/* ── Vente ────────────────────────────────────────────────────── */}
          <section className="grid gap-4 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-3">
            <p className="text-sm font-semibold sm:col-span-3">Vente</p>
            <Field label="Unité de vente" required>
              <Dropdown
                value={form.unit}
                onChange={(value) => set("unit", value as Unit)}
                options={UNITS.map((value) => ({
                  value,
                  label: value,
                  hint: UNIT_LABELS[value],
                }))}
              />
            </Field>
            <Field label={`Prix par ${form.unit}`} required>
              <Input inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </Field>
            <Field label={`Stock (${form.unit})`} required>
              <Input
                inputMode="decimal"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
            </Field>
            <Field label="État" required>
              <Dropdown
                value={form.condition}
                onChange={(value) => set("condition", value as Condition)}
                options={CONDITIONS.map((value) => ({ value, label: value }))}
              />
            </Field>
            <Field label="Conditionnement">
              <Input value={form.packaging} onChange={(e) => set("packaging", e.target.value)} />
            </Field>
            <Field label="Poids (kg)">
              <Input inputMode="decimal" value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
            </Field>
          </section>

          {/* ── Caractéristiques ─────────────────────────────────────────── */}
          <section className="grid gap-4 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-4">
            <p className="text-sm font-semibold sm:col-span-4">Caractéristiques</p>
            <Field label="Longueur (cm)">
              <Input inputMode="decimal" value={form.lengthCm} onChange={(e) => set("lengthCm", e.target.value)} />
            </Field>
            <Field label="Largeur (cm)">
              <Input inputMode="decimal" value={form.widthCm} onChange={(e) => set("widthCm", e.target.value)} />
            </Field>
            <Field label="Hauteur (cm)">
              <Input inputMode="decimal" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
            </Field>
            <Field label="Épaisseur (mm)">
              <Input
                inputMode="decimal"
                value={form.thicknessMm}
                onChange={(e) => set("thicknessMm", e.target.value)}
              />
            </Field>
            <Field label="Matière">
              <Input value={form.material} onChange={(e) => set("material", e.target.value)} />
            </Field>
            <Field label="Couleur">
              <Input value={form.color} onChange={(e) => set("color", e.target.value)} />
            </Field>
            <Field label="Marque">
              <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
            </Field>
            <Field label="Référence fabricant">
              <Input
                value={form.modelReference}
                onChange={(e) => set("modelReference", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Normes et certifications">
                <Input value={form.standards} onChange={(e) => set("standards", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Caractéristiques techniques">
                <Input
                  value={form.technicalNotes}
                  onChange={(e) => set("technicalNotes", e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* ── Stockage et publication ──────────────────────────────────── */}
          <section className="grid gap-4 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-3">
            <p className="text-sm font-semibold sm:col-span-3">Dépôt et mise en ligne</p>
            <Field label="Dépôt">
              <Input value={form.depot} onChange={(e) => set("depot", e.target.value)} />
            </Field>
            <Field label="Emplacement">
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="QR code">
              <div className="flex gap-2">
                <Input
                  value={form.qrReference}
                  onChange={(e) => set("qrReference", e.target.value.toUpperCase())}
                  placeholder="BT-00012"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 px-3"
                  onClick={() => setScanning(true)}
                  aria-label="Scanner le QR code"
                >
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
            </Field>
            <Field label="Statut">
              <Dropdown
                value={form.status}
                onChange={(value) => set("status", value as MaterialStatus)}
                options={MATERIAL_STATUSES.map((value) => ({
                  value,
                  label: STATUS_LABELS[value],
                }))}
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => set("published", event.target.checked)}
                className="h-4 w-4 accent-[var(--color-brand-600)]"
              />
              Publier dans la boutique
            </label>
          </section>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={() => void save()}
              disabled={saving || uploading || !form.title.trim() || !form.description.trim()}
            >
              {saving ? "Enregistrement…" : materialId ? "Enregistrer" : "Créer le matériau"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
