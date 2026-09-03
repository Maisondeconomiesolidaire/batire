import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import {
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  PackageOpen,
  QrCode as QrIcon,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { PhoneInput, formatFrPhone } from "../../components/ui/PhoneInput";
import {
  formatDate,
  formatDimensions,
  formatPrice,
  formatStock,
  formatUnitPrice,
  unitLabel,
} from "../../lib/format";
import { PAGE_X, UNIT_LABELS, type Unit } from "../../lib/constants";
import { QrCode } from "../../components/ui/QrCode";
import { MaterialCard, type PublicMaterial } from "../../components/public/MaterialCard";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete";
import { cn } from "../../lib/cn";
import { errorMessage } from "../../lib/errors";
import { searchAddresses } from "../../lib/address";
import { distanceInKm, PICKUP_LOCATIONS, type PickupLocationId } from "../../lib/pickupLocations";

export function MaterialDetail({ kiosk = false }: { kiosk?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const sessionId = searchParams.get("session_id");
  const paid = searchParams.get("status") === "success";
  const material = useQuery(
    api.batire.getPublicMaterial,
    id ? { id: id as Id<"btMaterials"> } : "skip",
  );
  const [photoIndex, setPhotoIndex] = useState(0);

  if (paid && orderId && sessionId) {
    return <CheckoutReturn orderId={orderId as Id<"btOrders">} sessionId={sessionId} />;
  }

  if (material === undefined) return <FullSpinner label="Chargement du matériau…" />;
  if (material === null) {
    return (
      <div className={cn("mx-auto max-w-3xl py-16", PAGE_X)}>
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

  const base = kiosk ? "/kiosk" : "";
  const dimensions = formatDimensions(material);
  const inStock = material.quantity > 0;
  const upcoming =
    typeof material.availableFrom === "number" && material.availableFrom > Date.now();

  /** Caractéristiques : on n'affiche jamais une ligne vide. */
  const specs: Array<[string, string | undefined]> = [
    ["Dimensions", dimensions || undefined],
    ["Matière", material.material],
    ["Couleur", material.color],
    ["Poids", material.weightKg ? `${material.weightKg} kg` : undefined],
    ["Conditionnement", material.packaging],
    ["État", material.condition],
    ["Normes", material.standards],
    ["Caractéristiques", material.technicalNotes],
    ["Marque", material.brand],
    ["Référence fabricant", material.modelReference],
  ];

  return (
    <div className={cn("w-full py-5", PAGE_X)}>
      {/* Fil d'Ariane, jusqu'au produit courant. */}
      <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        <Link to={base || "/"} className="hover:text-brand-700">
          Accueil
        </Link>
        {[material.category, material.family, material.subcategory]
          .filter(Boolean)
          .map((level, index, levels) => {
            const params = new URLSearchParams();
            if (material.category) params.set("categorie", material.category);
            if (index >= 1 && material.family) params.set("famille", material.family);
            if (index >= 2 && material.subcategory) params.set("sousfamille", material.subcategory);
            return (
              <span key={level} className="flex items-center gap-2">
                <span>›</span>
                <Link to={`${base || "/"}?${params.toString()}`} className="hover:text-brand-700">
                  {level}
                </Link>
                {index === levels.length - 1 ? <span>›</span> : null}
              </span>
            );
          })}
        <span className="text-[var(--foreground)]">{material.title}</span>
      </nav>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--foreground)]">
        {material.title}
      </h1>
      {material.modelReference || material.qrReference ? (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Réf. : {material.modelReference || material.qrReference}
        </p>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr_360px] lg:items-start">
        {/* ── Visuel ─────────────────────────────────────────────────── */}
        <section>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            {material.photoUrls[photoIndex] ? (
              <img
                src={material.photoUrls[photoIndex]}
                alt={material.title}
                className="h-full w-full object-contain"
              />
            ) : (
              <PackageOpen className="h-16 w-16 text-zinc-300" />
            )}
          </div>
          {material.photoUrls.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {material.photoUrls.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPhotoIndex(index)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition ${
                    index === photoIndex ? "border-brand-500" : "border-[var(--border)]"
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {/* ── Informations produit ───────────────────────────────────── */}
        <section>
          {material.brand ? (
            <p className="text-lg font-bold text-[var(--foreground)]">{material.brand}</p>
          ) : null}

          <h2 className="mt-4 font-semibold text-[var(--foreground)]">Informations produit :</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-[var(--foreground)]">
            {material.description}
          </p>

          <dl className="mt-6 divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {specs
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label} className="flex gap-4 py-2.5 text-sm">
                  <dt className="w-40 shrink-0 text-[var(--muted-foreground)]">{label}</dt>
                  <dd className="text-[var(--foreground)]">{value}</dd>
                </div>
              ))}
          </dl>

          {material.depot ? (
            <p className="mt-5 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <MapPin className="h-4 w-4 text-brand-600" />
              Dépôt {material.depot}
              {material.location ? ` · ${material.location}` : ""}
            </p>
          ) : null}
        </section>

        {/* ── Encart d'achat ─────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <div className="p-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <p className="text-3xl font-black text-brand-700">
                  {formatUnitPrice(material.price, material.unit)}
                </p>
                {material.originalPrice && material.originalPrice > material.price ? (
                  <p className="text-lg font-semibold text-[var(--muted-foreground)] line-through">
                    {formatPrice(material.originalPrice)}
                  </p>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Vendu {UNIT_LABELS[material.unit]} · {material.condition.toLowerCase()}
              </p>

              {/* Un lot à venir n'est pas « épuisé » : il n'est pas encore
                  ouvert à la vente, et c'est sa date qui le dit. */}
              <p
                className={`mt-4 flex items-center gap-2 text-sm font-semibold ${
                  upcoming ? "text-brand-700" : inStock ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {upcoming ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {upcoming
                  ? `Bientôt disponible · à partir du ${formatDate(material.availableFrom!)}`
                  : inStock
                    ? `En stock · ${formatStock(material.quantity, material.unit)}`
                    : "Épuisé"}
              </p>
            </div>

            <div className="border-t border-[var(--border)] p-5">
              {kiosk ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="rounded-xl bg-white p-2">
                    <QrCode
                      value={`${window.location.origin}/materiau/${material._id}`}
                      size={150}
                      className="text-black"
                    />
                  </div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                    <QrIcon className="h-4 w-4" /> Scannez pour payer au comptoir
                  </p>
                </div>
              ) : (
                <>
                  <BuyBlock
                    materialId={material._id}
                    unit={material.unit}
                    price={material.price}
                    stock={material.quantity}
                    upcoming={upcoming}
                  />
                  <AskBlock materialId={material._id} />
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      <Suggestions materialId={material._id} base={base} />
    </div>
  );
}

/**
 * Ce qui va avec le lot affiché, puis le reste du stock. Deux rangées courtes :
 * une page produit qui déroule tout le catalogue ne se lit plus.
 */
function Suggestions({ materialId, base }: { materialId: Id<"btMaterials">; base: string }) {
  const data = useQuery(api.batire.relatedMaterials, { id: materialId }) as
    | { related: PublicMaterial[]; others: PublicMaterial[]; remaining: number }
    | undefined;

  if (!data || (data.related.length === 0 && data.others.length === 0)) return null;

  return (
    <div className="mt-14 space-y-12">
      <SuggestionShelf
        title="Vous aimeriez peut-être…"
        materials={data.related}
        base={base}
      />
      <SuggestionShelf
        title="Découvrez nos autres matériaux"
        materials={data.others}
        base={base}
        footer={
          data.remaining > 0 ? (
            <Link
              to={base || "/"}
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Voir tout le catalogue
            </Link>
          ) : null
        }
      />
    </div>
  );
}

/** Six produits, puis le reste au clic. */
function SuggestionShelf({
  title,
  materials,
  base,
  footer,
}: {
  title: string;
  materials: PublicMaterial[];
  base: string;
  footer?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const STEP = 6;
  if (materials.length === 0) return null;
  const shown = expanded ? materials : materials.slice(0, STEP);

  return (
    <section>
      <h2 className="text-xl font-black tracking-tight">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {shown.map((material) => (
          <MaterialCard
            key={material._id}
            material={material}
            to={`${base}/materiau/${material._id}`}
          />
        ))}
      </div>
      {materials.length > STEP && !expanded ? (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setExpanded(true)}>
            Voir plus
          </Button>
        </div>
      ) : footer ? (
        <div className="mt-4 flex justify-center">{footer}</div>
      ) : null}
    </section>
  );
}

function BuyBlock({
  materialId,
  unit,
  price,
  stock,
  upcoming = false,
}: {
  materialId: Id<"btMaterials">;
  unit: Unit;
  price: number;
  stock: number;
  /** Lot annoncé mais pas encore ouvert à la vente. */
  upcoming?: boolean;
}) {
  const startCheckout = useAction(api.batire.startCheckout);
  const { isSignedIn } = useUser();
  // La fiche donateur de l'espace client remplit le formulaire d'achat : le
  // client connecté ne ressaisit pas des coordonnées déjà connues.
  const donorProfile = useQuery(api.batireDons.getMyDonorProfile, isSignedIn ? {} : "skip");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState<PickupLocationId | null>(null);
  const [customerCoordinates, setCustomerCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    postalCode: "",
    city: "",
    quantity: "1",
  });

  // Sans écraser une saisie en cours : le préremplissage aide, il ne corrige
  // pas ce que le client vient de taper.
  useEffect(() => {
    if (!donorProfile) return;
    setForm((current) => ({
      ...current,
      firstName: current.firstName || donorProfile.firstName,
      lastName: current.lastName || donorProfile.lastName,
      email: current.email || donorProfile.email,
      phone: current.phone || formatFrPhone(donorProfile.phone),
      company: current.company || donorProfile.company,
      address: current.address || donorProfile.address,
      postalCode: current.postalCode || donorProfile.postalCode,
      city: current.city || donorProfile.city,
    }));
  }, [donorProfile]);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Une adresse de profil est déjà connue sous forme de texte : on la géocode
  // ici aussi, pour afficher les distances sans forcer le client à la ressaisir.
  useEffect(() => {
    const address = [form.address, form.postalCode, form.city].filter(Boolean).join(" ");
    if (address.length < 3) {
      setCustomerCoordinates(null);
      return;
    }
    let cancelled = false;
    void searchAddresses(address).then(([match]) => {
      if (!cancelled) {
        setCustomerCoordinates(
          match ? { latitude: match.latitude, longitude: match.longitude } : null,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [form.address, form.postalCode, form.city]);

  const [capped, setCapped] = useState(false);

  const quantity = Number(form.quantity.replace(",", ".")) || 0;
  const total = quantity > 0 ? quantity * price : 0;
  const step = 1;
  const round = (value: number) => Math.round(value * 100) / 100;

  /**
   * La saisie est bornée au stock : plutôt que d'accepter un nombre qu'on
   * refuserait au moment de payer, on le ramène au maximum disponible et on
   * le dit.
   */
  function setQuantity(raw: string) {
    const cleaned = raw.replace(/[^\d.,]/g, "");
    const parsed = Number(cleaned.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > stock) {
      setCapped(true);
      set("quantity")(String(round(stock)));
      return;
    }
    setCapped(false);
    set("quantity")(cleaned);
  }

  async function pay() {
    setSaving(true);
    setError(null);
    try {
      const { checkoutUrl } = await startCheckout({
        materialId,
        quantity,
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          company: form.company || undefined,
        },
        pickupLocation: pickupLocation!,
        returnUrl: `${window.location.origin}/materiau/${materialId}`,
      });
      window.location.assign(checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Paiement indisponible.");
      setSaving(false);
    }
  }

  const quantityPicker = (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[var(--foreground)]">Quantité</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setQuantity(String(Math.max(step, round(quantity - step))))}
          disabled={quantity <= step}
          className="h-11 w-11 shrink-0 rounded-xl border border-[var(--border)] text-lg font-bold transition hover:bg-[var(--muted)] disabled:opacity-40"
          aria-label="Diminuer la quantité"
        >
          −
        </button>
        {/* L'unité vit dans le champ, à droite du nombre : on lit « 10 tonnes »
            et non un 10 dont il faudrait deviner ce qu'il compte. */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 text-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
          <input
            inputMode="decimal"
            value={form.quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-label="Quantité"
            className="w-full min-w-0 flex-1 bg-transparent text-right font-semibold text-[var(--foreground)] outline-none"
          />
          <span className="shrink-0 text-[var(--muted-foreground)]">{unitLabel(quantity, unit)}</span>
        </div>
        <button
          type="button"
          onClick={() => setQuantity(String(round(Math.min(stock, quantity + step))))}
          disabled={quantity >= stock}
          className="h-11 w-11 shrink-0 rounded-xl border border-[var(--border)] text-lg font-bold transition hover:bg-[var(--muted)] disabled:opacity-40"
          aria-label="Augmenter la quantité"
        >
          +
        </button>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">{formatStock(stock, unit)} en stock</p>

      <div className="flex items-baseline justify-between rounded-xl bg-[var(--muted)] px-3 py-2.5">
        <span className="text-sm text-[var(--muted-foreground)]">Total</span>
        <span className="text-lg font-bold text-brand-700">{formatPrice(total)}</span>
      </div>

      {capped ? (
        <p className="text-sm text-amber-700">
          Il ne reste que {formatStock(stock, unit)} : la quantité a été ramenée au maximum.
        </p>
      ) : null}
    </div>
  );

  if (!open) {
    return (
      <div className="space-y-3">
        {quantityPicker}
        <Button
          className="w-full"
          onClick={() => setOpen(true)}
          disabled={stock <= 0 || quantity <= 0 || quantity > stock}
        >
          {stock > 0 ? "Acheter" : upcoming ? "Bientôt disponible" : "Épuisé"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quantityPicker}
      <div className="grid gap-3">
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
          <PhoneInput value={form.phone} onValueChange={set("phone")} />
        </Field>
        <Field label="Entreprise">
          <Input value={form.company} onChange={(e) => set("company")(e.target.value)} />
        </Field>
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">
            Où souhaitez-vous récupérer ce produit ?
          </h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Indiquez votre adresse pour comparer les distances.
          </p>
        </div>
        <Field label="Votre adresse" required>
          <AddressAutocomplete
            value={form.address}
            onValueChange={(value) => {
              set("address")(value);
              setCustomerCoordinates(null);
            }}
            onSelect={(address) => {
              setForm((current) => ({
                ...current,
                address: address.address,
                postalCode: address.postalCode,
                city: address.city,
              }));
              setCustomerCoordinates({ latitude: address.latitude, longitude: address.longitude });
            }}
            placeholder="12 rue des Ateliers, Beauvais"
          />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          {PICKUP_LOCATIONS.map((location) => {
            const distance = customerCoordinates
              ? distanceInKm(customerCoordinates, location)
              : null;
            const selected = pickupLocation === location.id;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => setPickupLocation(location.id)}
                aria-pressed={selected}
                className={cn(
                  "rounded-xl border bg-[var(--card)] p-3 text-left transition hover:border-brand-400",
                  selected ? "border-brand-600 ring-2 ring-brand-600/20" : "border-[var(--border)]",
                )}
              >
                <p className="font-semibold text-[var(--foreground)]">{location.name}</p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{location.address}</p>
                <p className="mt-2 text-xs font-medium text-brand-700">
                  {distance === null
                    ? "Saisissez votre adresse pour voir la distance"
                    : `${distance.toFixed(1).replace(".", ",")} km de votre adresse`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <Button
          onClick={() => void pay()}
          disabled={
            saving ||
            !form.firstName ||
            !form.lastName ||
            !form.email ||
            !form.address ||
            !customerCoordinates ||
            !pickupLocation ||
            quantity <= 0 ||
            quantity > stock
          }
        >
          {saving ? "Redirection…" : "Payer en ligne"}
        </Button>
      </div>
    </div>
  );
}

/** Retour de Stripe : le statut est relu chez eux avant d'annoncer la vente. */
function CheckoutReturn({
  orderId,
  sessionId,
}: {
  orderId: Id<"btOrders">;
  sessionId: string;
}) {
  const confirmCheckout = useAction(api.batire.confirmCheckout);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void confirmCheckout({ orderId, sessionId })
      .then((result) => {
        if (!cancelled) setReference(result.reference);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Confirmation impossible.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [confirmCheckout, orderId, sessionId]);

  if (error) {
    return (
      <div className={cn("mx-auto max-w-2xl py-20 text-center", PAGE_X)}>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Commande non finalisée</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">{error}</p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-brand-700">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  if (!reference) return <FullSpinner label="Confirmation du paiement…" />;

  return (
    <div className={cn("mx-auto max-w-2xl py-20 text-center", PAGE_X)}>
      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Paiement confirmé</h1>
      <p className="mt-2 text-[var(--muted-foreground)]">
        Commande {reference}. Un reçu vous a été envoyé par email.
      </p>
      <Link to="/" className="mt-6 inline-block text-sm font-semibold text-brand-700">
        Retour au catalogue
      </Link>
    </div>
  );
}

/** Question à l'équipe sur ce matériau : ouvre un fil dans la messagerie. */
function AskBlock({ materialId }: { materialId: Id<"btMaterials"> }) {
  const { isSignedIn } = useUser();
  const send = useMutation(api.batire.sendMessage);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  if (!isSignedIn) {
    return (
      <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
        Connectez-vous pour poser une question à l'équipe.
      </p>
    );
  }

  if (sent) {
    return (
      <p className="mt-3 rounded-xl bg-[var(--muted)] px-3 py-2.5 text-center text-xs">
        Message envoyé. La réponse arrivera dans votre messagerie.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition hover:border-brand-400"
      >
        <MessageSquare className="h-4 w-4" /> Poser une question
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-[var(--border)] p-3">
      <textarea
        rows={3}
        autoFocus
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Disponibilité, découpe, enlèvement…"
        className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
      {askError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {askError}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <Button
          disabled={sending || !body.trim()}
          onClick={async () => {
            setSending(true);
            setAskError(null);
            try {
              await send({ materialId, body });
              setSent(true);
            } catch (caught) {
              setAskError(errorMessage(caught, "Envoi impossible."));
            } finally {
              setSending(false);
            }
          }}
        >
          Envoyer
        </Button>
      </div>
    </div>
  );
}
