import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, FileText, ImagePlus, ScanLine, Sparkles, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";
import { Dropdown } from "../ui/Dropdown";
import { DatePicker } from "../ui/DatePicker";
import { MultiPicker } from "../ui/MultiPicker";
import { StarRating } from "../ui/StarRating";
import { CameraScanner } from "../ui/CameraScanner";
import { Spinner } from "../ui/Spinner";
import { useAnalyzePhotos, useUpload } from "../../lib/upload";
import {
  CONDITIONS,
  DIMENSION_UNITS,
  MATERIALS,
  MATERIAL_STATUSES,
  ORIGINS,
  POTENTIALS,
  PROFILES,
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
  originalPrice: string;
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

  /* Fiche réemploi */
  reference: string;
  origin: string;
  profiles: string[];
  materials: string[];
  diameterCm: string;
  dimensionUnit: string;
  availableFrom: string;
  reusePotential: number;
  repurposePotential: number;
  recyclingPotential: number;
  recoveryPotential: number;
  disposalPotential: number;
  assemblyMode: string;
  transportTerms: string;
  packagingTerms: string;
  storageTerms: string;
  accessTerms: string;
  hazardousSubstances: string;
  typology: string;
  wasteCode: string;
  carbonFootprintKg: string;
  landfillCost: string;
  internalNote: string;
};

const EMPTY: FormState = {
  title: "",
  description: "",
  category: CATEGORIES[0]!,
  family: "",
  subcategory: "",
  condition: "Bon",
  unit: "unité",
  quantity: "",
  price: "",
  originalPrice: "",
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

  reference: "",
  origin: "",
  profiles: [],
  materials: [],
  diameterCm: "",
  // Les fiches déjà saisies ont toujours voulu dire des centimètres.
  dimensionUnit: "cm",
  availableFrom: "",
  reusePotential: 0,
  repurposePotential: 0,
  recyclingPotential: 0,
  recoveryPotential: 0,
  disposalPotential: 0,
  assemblyMode: "",
  transportTerms: "",
  packagingTerms: "",
  storageTerms: "",
  accessTerms: "",
  hazardousSubstances: "",
  typology: "",
  wasteCode: "",
  carbonFootprintKg: "",
  landfillCost: "",
  internalNote: "",
};

const number = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
const text = (value: string) => (value.trim() ? value.trim() : undefined);
/** Champ date natif ⇄ horodatage. Midi, pour ne pas glisser d'un jour au fuseau. */
const toDay = (ms?: number | null) =>
  ms ? new Date(ms).toLocaleDateString("sv-SE") : "";
const fromDay = (value: string) => {
  if (!value) return undefined;
  const parsed = new Date(`${value}T12:00:00`).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function MaterialForm() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const materialId = id ? (id as Id<"btMaterials">) : undefined;
  // Fiche née d'un don accepté : le formulaire s'ouvre avec ce que le donateur
  // a décrit et photographié, l'équipe n'a plus qu'à chiffrer et ranger.
  const donationId = params.get("don") as Id<"btDonations"> | null;
  const onClose = () => navigate(donationId ? "/crm/dons" : "/crm");

  const existing = useQuery(
    api.batire.getMaterial,
    materialId ? { id: materialId } : "skip",
  );
  const donation = useQuery(
    api.batireDons.getDonation,
    donationId ? { id: donationId } : "skip",
  );
  const markConverted = useMutation(api.batireDons.markDonationConverted);
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
  const [datasheet, setDatasheet] = useState<Id<"_storage"> | null>(null);
  const [datasheetName, setDatasheetName] = useState<string | null>(null);

  // Référentiel des matières : celui d'origine plus ce que l'équipe a ajouté.
  const materialOptions = useQuery(api.batire.materialOptions);
  const addMaterialOption = useMutation(api.batire.addMaterialOption);
  const materialChoices = materialOptions ?? [...MATERIALS];

  // Lot annoncé pour plus tard : la date commande, le statut suit.
  const availableFromMs = fromDay(form.availableFrom);
  const upcomingLot = typeof availableFromMs === "number" && availableFromMs > Date.now();
  useEffect(() => {
    if (upcomingLot && form.status !== "disponible") {
      setForm((current) => ({ ...current, status: "disponible" }));
    }
  }, [upcomingLot, form.status]);

  const seeded = useRef(false);
  useEffect(() => {
    if (!donation || seeded.current) return;
    seeded.current = true;
    setForm((current) => ({
      ...current,
      title: donation.title,
      description: donation.description ?? "",
      category: donation.category,
      family: donation.family ?? "",
      subcategory: donation.subcategory ?? "",
      condition: (donation.condition as Condition) ?? current.condition,
      unit: (donation.unit as Unit) ?? current.unit,
      quantity: donation.quantity ? String(donation.quantity) : "",
      availableFrom: toDay(donation.availableFrom),
      // Le lot vient d'un don : sa provenance et le type du donateur sont connus.
      origin: donation.handover === "recuperer" ? "Dépose préservante" : current.origin,
      profiles: donation.donor.profiles?.length ? donation.donor.profiles : current.profiles,
      internalNote: [
        `Don ${donation.reference} — ${donation.donor.company ?? ""} ${donation.donor.firstName} ${donation.donor.lastName}`.replace(/\s+/g, " ").trim(),
        donation.donor.phone,
        donation.donor.email,
      ]
        .filter(Boolean)
        .join(" · "),
      // Un lot donné n'est pas encore prêt à la vente : l'équipe le publie
      // quand il est chiffré, pesé et rangé.
      status: "brouillon",
      published: false,
    }));
    setPhotos(donation.photos as Id<"_storage">[]);
    setPhotoUrls(donation.photoUrls);
  }, [donation]);

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
      originalPrice: existing.originalPrice ? String(existing.originalPrice) : "",
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

      reference: existing.reference ?? "",
      origin: existing.origin ?? "",
      profiles: existing.profiles ?? [],
      // Fiche d'avant la liste fermée : sa matière en texte libre reste
      // affichée en pastille plutôt que de disparaître à l'ouverture.
      materials:
        existing.materials ??
        (existing.material
          ? existing.material.split(",").map((value) => value.trim()).filter(Boolean)
          : []),
      diameterCm: existing.diameterCm ? String(existing.diameterCm) : "",
      dimensionUnit: existing.dimensionUnit ?? "cm",
      availableFrom: toDay(existing.availableFrom),
      reusePotential: existing.reusePotential ?? 0,
      repurposePotential: existing.repurposePotential ?? 0,
      recyclingPotential: existing.recyclingPotential ?? 0,
      recoveryPotential: existing.recoveryPotential ?? 0,
      disposalPotential: existing.disposalPotential ?? 0,
      assemblyMode: existing.assemblyMode ?? "",
      transportTerms: existing.transportTerms ?? "",
      packagingTerms: existing.packagingTerms ?? "",
      storageTerms: existing.storageTerms ?? "",
      accessTerms: existing.accessTerms ?? "",
      hazardousSubstances: existing.hazardousSubstances ?? "",
      typology: existing.typology ?? "",
      wasteCode: existing.wasteCode ?? "",
      carbonFootprintKg: existing.carbonFootprintKg ? String(existing.carbonFootprintKg) : "",
      landfillCost: existing.landfillCost ? String(existing.landfillCost) : "",
      internalNote: existing.internalNote ?? "",
    });
    setDatasheet(existing.datasheet ?? null);
    setDatasheetName(existing.datasheetName ?? null);
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

  async function addDatasheet(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    try {
      const [id] = await upload([file]);
      setDatasheet(id ?? null);
      setDatasheetName(file.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Envoi du fichier impossible.");
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
        materials: result.materials?.length ? result.materials : current.materials,
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
        originalPrice: form.originalPrice.trim()
          ? Number(form.originalPrice.replace(",", ".")) || undefined
          : undefined,
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

        reference: text(form.reference),
        origin: text(form.origin),
        profiles: form.profiles.length ? form.profiles : undefined,
        materials: form.materials.length ? form.materials : undefined,
        diameterCm: number(form.diameterCm),
        dimensionUnit: text(form.dimensionUnit),
        availableFrom: fromDay(form.availableFrom),
        reusePotential: form.reusePotential || undefined,
        repurposePotential: form.repurposePotential || undefined,
        recyclingPotential: form.recyclingPotential || undefined,
        recoveryPotential: form.recoveryPotential || undefined,
        disposalPotential: form.disposalPotential || undefined,
        assemblyMode: text(form.assemblyMode),
        transportTerms: text(form.transportTerms),
        packagingTerms: text(form.packagingTerms),
        storageTerms: text(form.storageTerms),
        accessTerms: text(form.accessTerms),
        hazardousSubstances: text(form.hazardousSubstances),
        typology: text(form.typology),
        wasteCode: text(form.wasteCode),
        carbonFootprintKg: number(form.carbonFootprintKg),
        landfillCost: number(form.landfillCost),
        datasheet: datasheet ?? undefined,
        datasheetName: datasheetName ?? undefined,
        internalNote: text(form.internalNote),
      };
      if (materialId) {
        await updateMaterial({
          id: materialId,
          ...payload,
          status: form.status,
          published: form.published,
        });
      } else {
        const created = await createMaterial({
          ...payload,
          status: form.status,
          published: form.published,
        });
        // Le don garde la trace de la fiche qu'il a produite : on ne le
        // convertit pas deux fois.
        if (donationId) await markConverted({ id: donationId, materialId: created });
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
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-brand-600 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </button>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <h1 className="text-xl font-bold">
            {materialId ? "Modifier le matériau" : "Nouveau matériau"}
          </h1>
          {donation ? (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              D'après le don {donation.reference} de{" "}
              {donation.donor.company || `${donation.donor.firstName} ${donation.donor.lastName}`}{" "}
              — vérifiez le prix, les dimensions et l'emplacement avant de publier.
            </p>
          ) : null}
        </div>

        <div className="space-y-6 p-6">
          {/* ── Photos et génération ─────────────────────────────────────── */}
          <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
            <p className="font-semibold">Photos</p>

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

            {/* Ce que l'équipe sait et que la photo ne montre pas. Ces mots
                priment sur la lecture des photos et servent aussi à ranger le
                matériau dans l'arborescence : c'est le moyen le plus direct de
                corriger l'IA avant qu'elle ne se trompe. */}
            <Field label="Mots-clés et précisions pour l'IA">
              <Textarea
                rows={2}
                value={extraDetails}
                onChange={(event) => setExtraDetails(event.target.value)}
                placeholder="placo hydrofuge BA13, palette de 40 plaques, angles épaufrés"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Écrivez en style chantier, l'IA comprend. Ce que vous notez ici fait foi :
                l'IA le reprend tel quel et s'en sert pour ranger le matériau.
              </p>
            </Field>

            {/* Le bouton vient APRÈS les précisions, et non dans l'en-tête de
                la section : posé à côté du titre, il se cliquait avant même
                d'avoir vu le champ, et l'analyse partait sans ce que l'équipe
                avait à dire. */}
            <Button
              variant="outline"
              onClick={() => void runAnalysis()}
              disabled={analyzing || uploading || photos.length === 0}
            >
              {analyzing ? <Spinner className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {analyzing ? "Analyse…" : "Générer la fiche"}
            </Button>

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
            <Field label="Référence">
              <Input
                value={form.reference}
                onChange={(e) => set("reference", e.target.value)}
                placeholder="Référence interne du dépôt"
              />
            </Field>
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

          {/* ── Origine ──────────────────────────────────────────────────── */}
          <section className="grid gap-4 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-2">
            <p className="text-sm font-semibold sm:col-span-2">Origine</p>
            <div className="sm:col-span-2">
              <Field label="Type de donateur" hint="plusieurs choix possibles">
                <MultiPicker
                  values={form.profiles}
                  options={[...PROFILES]}
                  onChange={(values) => set("profiles", values)}
                  emptyLabel="Aucun type de donateur"
                />
              </Field>
            </div>
            <Field label="Origine du flux">
              <Dropdown
                value={form.origin}
                onChange={(value) => set("origin", value)}
                placeholder="Choisir une origine"
                options={ORIGINS.map((value) => ({ value, label: value }))}
              />
            </Field>
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
            {/* Le prix barré situe l'économie du réemploi : il n'est affiché
                en boutique que s'il dépasse le prix de vente. */}
            <Field label="Prix barré" hint="prix du neuf équivalent">
              <Input
                inputMode="decimal"
                value={form.originalPrice}
                onChange={(e) => set("originalPrice", e.target.value)}
                placeholder="39"
              />
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
                // Une fiche ancienne garde son état jusqu'à ce qu'on en
                // choisisse un autre : le masquer afficherait un champ vide.
                options={[
                  ...CONDITIONS.map((value) => ({ value, label: value })),
                  ...(CONDITIONS.includes(form.condition as never)
                    ? []
                    : [{ value: form.condition, label: `${form.condition} (ancien)` }]),
                ]}
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
            {/* L'unité s'applique aux quatre cotes à la fois : les saisir dans
                des unités différentes rendrait la fiche incomparable. */}
            <Field label="Unité des dimensions">
              <Dropdown
                value={form.dimensionUnit}
                onChange={(value) => set("dimensionUnit", value)}
                options={DIMENSION_UNITS.map((value) => ({ value, label: value }))}
              />
            </Field>
            <Field label={`Longueur (${form.dimensionUnit})`}>
              <Input inputMode="decimal" value={form.lengthCm} onChange={(e) => set("lengthCm", e.target.value)} />
            </Field>
            <Field label={`Largeur (${form.dimensionUnit})`}>
              <Input inputMode="decimal" value={form.widthCm} onChange={(e) => set("widthCm", e.target.value)} />
            </Field>
            <Field label={`Hauteur (${form.dimensionUnit})`}>
              <Input inputMode="decimal" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
            </Field>
            <Field label={`Diamètre (${form.dimensionUnit})`}>
              <Input
                inputMode="decimal"
                value={form.diameterCm}
                onChange={(e) => set("diameterCm", e.target.value)}
              />
            </Field>
            <Field label="Épaisseur (mm)">
              <Input
                inputMode="decimal"
                value={form.thicknessMm}
                onChange={(e) => set("thicknessMm", e.target.value)}
              />
            </Field>
            <Field label="Couleurs">
              <Input value={form.color} onChange={(e) => set("color", e.target.value)} />
            </Field>
            <Field label="Typologie">
              <Input value={form.typology} onChange={(e) => set("typology", e.target.value)} />
            </Field>
            <div className="sm:col-span-4">
              <Field label="Matériaux" hint="plusieurs choix possibles">
                <MultiPicker
                  values={form.materials}
                  options={materialChoices}
                  onChange={(values) => set("materials", values)}
                  onCreate={(value) => addMaterialOption({ value })}
                  placeholder="Rechercher une matière…"
                  emptyLabel="Aucune matière"
                />
              </Field>
            </div>
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

          {/* ── Diagnostic réemploi ──────────────────────────────────────── */}
          <section className="grid gap-4 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-2">
            <p className="text-sm font-semibold sm:col-span-2">Diagnostic réemploi</p>

            {/* Les cinq potentiels se lisent ensemble : c'est leur écart qui
                dit vers quel mode de traitement le lot doit partir. */}
            <div className="space-y-2 rounded-xl border border-[var(--border)] p-3 sm:col-span-2">
              <p className="text-sm font-medium">Potentiels</p>
              {POTENTIALS.map(({ key, label }) => (
                <StarRating
                  key={key}
                  label={label}
                  value={form[key]}
                  onChange={(value) => set(key, value)}
                />
              ))}
              <p className="text-xs text-[var(--muted-foreground)]">
                Recliquez une étoile déjà allumée pour revenir à « non évalué ».
              </p>
            </div>

            <Field label="Début de disponibilité">
              <DatePicker
                value={fromDay(form.availableFrom)}
                onChange={(ms) => set("availableFrom", toDay(ms))}
                placeholder="Disponible immédiatement"
              />
            </Field>

            <Field label="Mode d'assemblage">
              <Input value={form.assemblyMode} onChange={(e) => set("assemblyMode", e.target.value)} />
            </Field>
            <Field label="Modalités de transport">
              <Input value={form.transportTerms} onChange={(e) => set("transportTerms", e.target.value)} />
            </Field>
            <Field label="Modalités de conditionnement">
              <Input value={form.packagingTerms} onChange={(e) => set("packagingTerms", e.target.value)} />
            </Field>
            <Field label="Modalités de stockage">
              <Input value={form.storageTerms} onChange={(e) => set("storageTerms", e.target.value)} />
            </Field>
            <Field label="Modalités d'accès">
              <Input value={form.accessTerms} onChange={(e) => set("accessTerms", e.target.value)} />
            </Field>
            <Field label="Substances dangereuses" hint="amiante, plomb, HAP…">
              <Input
                value={form.hazardousSubstances}
                onChange={(e) => set("hazardousSubstances", e.target.value)}
              />
            </Field>
            <Field label="Code déchet">
              <Input
                value={form.wasteCode}
                onChange={(e) => set("wasteCode", e.target.value)}
                placeholder="17 02 01"
              />
            </Field>
            <Field label="Bilan carbone (kg CO₂e)">
              <Input
                inputMode="decimal"
                value={form.carbonFootprintKg}
                onChange={(e) => set("carbonFootprintKg", e.target.value)}
              />
            </Field>
            <Field label="Coût de mise en décharge (€)">
              <Input
                inputMode="decimal"
                value={form.landfillCost}
                onChange={(e) => set("landfillCost", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Fiche technique">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted-foreground)] hover:border-brand-400">
                    <FileText className="h-4 w-4" />
                    {datasheet ? "Remplacer le fichier" : "Joindre un fichier"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                      className="hidden"
                      onChange={(event) => void addDatasheet(event.target.files)}
                    />
                  </label>
                  {datasheet ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] py-1 pl-3 pr-1 text-sm">
                      {datasheetName ?? "Fiche technique"}
                      <button
                        type="button"
                        onClick={() => {
                          setDatasheet(null);
                          setDatasheetName(null);
                        }}
                        className="rounded-full p-0.5 hover:bg-[var(--border)]"
                        aria-label="Retirer la fiche technique"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : null}
                </div>
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Note interne" hint="jamais publiée">
                <Textarea
                  rows={2}
                  value={form.internalNote}
                  onChange={(e) => set("internalNote", e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* ── Stockage et publication ──────────────────────────────────── */}
          <section className="grid gap-4 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-3">
            <p className="text-sm font-semibold sm:col-span-3">Dépôt et mise en ligne</p>
            <Field label="Localisation">
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
            {/* Une date d'ouverture décide seule de l'état du lot : il est
                annoncé jusque-là, en vente ensuite. Laisser le statut à la main
                permettait de publier « brouillon » un lot déjà annoncé, ou
                l'inverse. */}
            {upcomingLot ? (
              <Field label="Statut" hint="fixé par la date de disponibilité">
                <p className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3.5 py-2.5 text-sm">
                  Bientôt disponible — en vente le{" "}
                  {new Date(fromDay(form.availableFrom)!).toLocaleDateString("fr-FR")}
                </p>
              </Field>
            ) : (
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
            )}
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
