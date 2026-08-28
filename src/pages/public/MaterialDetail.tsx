import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { ArrowLeft, CheckCircle2, MapPin, MessageSquare, PackageOpen, QrCode as QrIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Badge";
import { formatDimensions, formatPrice, formatStock, formatUnitPrice } from "../../lib/format";
import { UNIT_LABELS, type Unit } from "../../lib/constants";
import { QrCode } from "../../components/ui/QrCode";

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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
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
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-5 text-center">
              <QrCode value={`${window.location.origin}/materiau/${material._id}`} size={160} />
              <p className="flex items-center gap-2 font-semibold text-zinc-900">
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

  const quantity = Number(form.quantity.replace(",", ".")) || 0;
  const total = quantity > 0 ? quantity * price : 0;

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

  if (!open) {
    return (
      <Button className="mt-8 w-full" onClick={() => setOpen(true)}>
        Acheter
      </Button>
    );
  }

  return (
    <div className="mt-8 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
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
        <Field label={`Quantité (${unit})`} required>
          <Input
            inputMode="decimal"
            value={form.quantity}
            onChange={(e) => set("quantity")(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex items-baseline justify-between rounded-xl bg-[var(--muted)] px-4 py-3">
        <span className="text-sm text-[var(--muted-foreground)]">Total</span>
        <span className="text-xl font-bold text-brand-700">{formatPrice(total)}</span>
      </div>

      {quantity > stock ? (
        <p className="text-sm text-amber-700">
          Stock disponible : {formatStock(stock, unit)}.
        </p>
      ) : null}
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
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
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
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
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

  if (!isSignedIn) {
    return (
      <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
        Connectez-vous pour poser une question à l'équipe.
      </p>
    );
  }

  if (sent) {
    return (
      <p className="mt-4 rounded-xl bg-[var(--muted)] px-4 py-3 text-center text-sm">
        Message envoyé. La réponse arrivera dans votre messagerie.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium transition hover:border-brand-400"
      >
        <MessageSquare className="h-4 w-4" /> Poser une question
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-2 rounded-2xl border border-[var(--border)] p-4">
      <textarea
        rows={3}
        autoFocus
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Disponibilité, découpe, enlèvement…"
        className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <Button
          disabled={sending || !body.trim()}
          onClick={async () => {
            setSending(true);
            try {
              await send({ materialId, body });
              setSent(true);
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
