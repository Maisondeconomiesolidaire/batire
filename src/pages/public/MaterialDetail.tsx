import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { CheckCircle2, MapPin, MessageSquare, PackageOpen, QrCode as QrIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { formatDimensions, formatPrice, formatStock, formatUnitPrice, unitLabel } from "../../lib/format";
import { PAGE_X, UNIT_LABELS, type Unit } from "../../lib/constants";
import { QrCode } from "../../components/ui/QrCode";
import { cn } from "../../lib/cn";
import { errorMessage } from "../../lib/errors";

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
              <p className="text-3xl font-black text-brand-700">
                {formatUnitPrice(material.price, material.unit)}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Vendu {UNIT_LABELS[material.unit]} · {material.condition.toLowerCase()}
              </p>

              <p
                className={`mt-4 flex items-center gap-2 text-sm font-semibold ${
                  inStock ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {inStock ? `En stock · ${formatStock(material.quantity, material.unit)}` : "Épuisé"}
              </p>
            </div>

            <div className="border-t border-[var(--border)] p-5">
              {kiosk ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="rounded-xl bg-white p-2">
                    <QrCode value={`${window.location.origin}/materiau/${material._id}`} size={150} />
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
                  />
                  <AskBlock materialId={material._id} />
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BuyBlock({
  materialId,
  unit,
  price,
  stock,
}: {
  materialId: Id<"btMaterials">;
  unit: Unit;
  price: number;
  stock: number;
}) {
  const startCheckout = useAction(api.batire.startCheckout);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    quantity: "1",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

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
          {stock > 0 ? "Acheter" : "Épuisé"}
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
          <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
        </Field>
        <Field label="Entreprise">
          <Input value={form.company} onChange={(e) => set("company")(e.target.value)} />
        </Field>
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
