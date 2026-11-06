import { PickupOrderDetail, PickupTracking, type PickupTrackingData } from "../../components/public/PickupTracking";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  HeartHandshake,
  Lock,
  MapPin,
  PackageOpen,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { DonationBadge } from "../../components/ui/Badge";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import {
  DonorFieldset,
  EMPTY_DONOR,
  type DonorForm,
} from "../../components/public/DonorFieldset";
import { formatFrPhone } from "../../components/ui/PhoneInput";
import { formatDate, formatDateTime } from "../../lib/format";
import { PAGE_X, type DonationStatus } from "../../lib/constants";
import { errorMessage } from "../../lib/errors";
import { cn } from "../../lib/cn";
import { PICKUP_LOCATIONS } from "../../lib/pickupLocations";

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

type Tab = "infos" | "commandes" | "donateur" | "recherches" | "documents";

type MyOrder = {
  paymentMethod?: "card" | "cash" | "bank_transfer";
  purchaseReference?: string;
  pickupReference?: string;
  pickupHours?: string;
  fulfillment?: PickupTrackingData;
  _id: Id<"btOrders">;
  reference: string;
  materialId: Id<"btMaterials">;
  materialTitle: string;
  quantity: number;
  unit: string;
  amountCents: number;
  pickupFeeCents?: number;
  pickupLocation?: string;
  channel: "boutique" | "terminal";
  paidAt?: number;
  status: "en_attente" | "payee" | "annulee" | "reservee";
  createdAt: number;
};

type MyDeliveryRequest = {
  _id: Id<"btRequests">;
  reference: string;
  items: Array<{ title: string; quantity: number; unit: string }>;
  outcome: "nouveau" | "en_cours" | "gagnee" | "perdue";
  message?: string;
  createdAt: number;
};

type MyOrderActivity = {
  orders: MyOrder[];
  deliveryRequests: MyDeliveryRequest[];
};

/**
 * Documents à connaître avant de déposer un premier lot.
 *
 * L'email de bienvenue y renvoie : un compte créé ne suffit pas à déposer, et
 * ces textes disent ce que la ressourcerie accepte et dans quel état.
 */
const CLIENT_DOCUMENTS: { title: string; description: string; to: string }[] = [
  {
    title: "Conditions générales d'utilisation",
    description:
      "Ce que permet BâtiRe : consulter le catalogue, réserver un matériau, proposer un don, et les règles qui s'y appliquent.",
    to: "/conditions-generales",
  },
  {
    title: "Politique de confidentialité",
    description:
      "Les données collectées à la création de votre compte et lors de vos démarches, leur usage et vos droits.",
    to: "/politique-confidentialite",
  },
];

type SearchAlert = {
  _id: Id<"btSearchAlerts">;
  category: string;
  family?: string;
  subcategory?: string;
  until?: number;
  matchCount?: number;
  createdAt: number;
};

export function MonCompte() {
  const { isLoaded, isSignedIn, user } = useUser();
  const profile = useQuery(api.batireDons.getMyDonorProfile, {});
  const donations = useQuery(api.batireDons.myDonations, {}) as
    MyDonation[] | undefined;
  const alerts = useQuery(api.batire.mySearchAlerts, {}) as
    SearchAlert[] | undefined;
  const orderActivity = useQuery(api.batire.myOrderActivity, {}) as
    MyOrderActivity | undefined;
  const removeAlert = useMutation(api.batire.removeSearchAlert);
  const save = useMutation(api.batireDons.saveMyDonorProfile);

  const [params, setParams] = useSearchParams();
  const onglet = params.get("onglet");
  const tab: Tab =
    onglet === "commandes"
      ? "commandes"
      : onglet === "dons" || onglet === "donateur"
        ? "donateur"
        : onglet === "recherches"
          ? "recherches"
          : onglet === "documents"
            ? "documents"
            : "infos";
  const setTab = (next: Tab) => {
    const updated = new URLSearchParams(params);
    if (next === "infos") updated.delete("onglet");
    else updated.set("onglet", next);
    setParams(updated, { replace: true });
  };
  const [openId, setOpenId] = useState<string | null>(null);
  const [donorTab, setDonorTab] = useState<"profil" | "dons">(onglet === "dons" ? "dons" : "profil");
  const [customerType, setCustomerType] = useState<"particulier" | "professionnel" | "collectivite">("particulier");
  const [donor, setDonor] = useState<DonorForm>(EMPTY_DONOR);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setCustomerType(profile.customerType);
    setDonor({
      company: profile.company,
      siret: profile.siret,
      apeCode: profile.apeCode,
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
  const selected =
    donations?.find((donation) => donation._id === openId) ?? null;
  const patch = (values: Partial<DonorForm>) => {
    setSaved(false);
    setDonor((current) => ({ ...current, ...values }));
  };

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await save({
        customerType,
        company: donor.company,
        siret: donor.siret,
        apeCode: donor.apeCode,
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
        <h1 className="mt-4 text-2xl font-black tracking-tight">
          Espace client
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Connectez-vous pour renseigner votre fiche donateur et suivre vos
          dons.
        </p>
        <div className="mt-6">
          <Link to="/connexion">
            <Button>Se connecter</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (profile === undefined)
    return <FullSpinner label="Chargement de votre espace…" />;

  return (
    <div className={cn("mx-auto w-full max-w-6xl py-6", PAGE_X)}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Espace client
          </p>
          <h1 className="mt-1.5 truncate text-3xl font-black tracking-tight sm:text-4xl">
            {(customerType !== "particulier" && donor.company.trim()) || user?.fullName || "Mon espace"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {[
              donor.email || user?.primaryEmailAddress?.emailAddress,
              ...donor.profiles,
            ]
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
          { key: "commandes", label: "Mes commandes" },
          { key: "donateur", label: "Donateur" },
          { key: "recherches", label: "Mes recherches" },
          { key: "documents", label: "Documents" },
        ]}
        counts={{
          commandes: orderActivity
            ? new Set(orderActivity.orders.map((order) => order.purchaseReference ?? order._id)).size +
              orderActivity.deliveryRequests.length
            : undefined,
          donateur: donations?.length,
          recherches: alerts?.length,
        }}
      />

      {tab === "commandes" ? <OrdersPanel activity={orderActivity} /> : null}
      {tab === "donateur" && <UnderlineTabs className="mt-4" value={donorTab} onChange={setDonorTab} items={[{ key: "profil", label: "Informations donateur" }, { key: "dons", label: "Mes dons" }]} counts={{ dons: donations?.length }} />}

      {tab === "documents" ? (
        <section className="mt-6 max-w-3xl space-y-4">
          <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 text-sm leading-6 text-zinc-700">
            <p className="font-semibold text-zinc-950">
              À lire avant votre premier dépôt
            </p>
            <p className="mt-1">
              Ces documents précisent ce que BâtiRe accepte, dans quel état, et
              les règles qui encadrent vos dons. Prenez-en connaissance avant de
              nous apporter un lot.
            </p>
          </div>

          <ul className="space-y-3">
            {CLIENT_DOCUMENTS.map((document) => (
              <li key={document.to}>
                <Link
                  to={document.to}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-brand-400"
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-zinc-950">
                      {document.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-[var(--muted-foreground)]">
                      {document.description}
                    </span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                </Link>
              </li>
            ))}
          </ul>

          <p className="text-sm text-[var(--muted-foreground)]">
            Une question sur un matériau ou sur les conditions de dépôt ?
            Écrivez-nous depuis la{" "}
            <Link
              to="/messagerie"
              className="font-semibold text-brand-700 underline underline-offset-2"
            >
              messagerie
            </Link>
            .
          </p>
        </section>
      ) : null}

      {tab === "recherches" ? (
        <section className="mt-6">
          {alerts === undefined ? (
            <FullSpinner />
          ) : alerts.length === 0 ? (
            <EmptyState
              icon={<BellRing className="h-9 w-9" />}
              title="Aucune recherche en cours"
              description="Dites-nous ce qu'il vous manque : nous vous écrivons dès qu'un lot arrive."
              action={
                <Link to="/je-recherche">
                  <Button variant="outline">Créer une alerte</Button>
                </Link>
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {alerts.map((alert) => {
                  const expired = Boolean(
                    alert.until && alert.until < Date.now(),
                  );
                  return (
                    <li
                      key={alert._id}
                      className="flex items-center gap-3 py-4"
                    >
                      <BellRing
                        className={cn(
                          "h-4 w-4 shrink-0",
                          expired
                            ? "text-[var(--muted-foreground)]"
                            : "text-brand-600",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold",
                            expired &&
                              "text-[var(--muted-foreground)] line-through",
                          )}
                        >
                          {[alert.category, alert.family, alert.subcategory]
                            .filter(Boolean)
                            .join(" › ")}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                          {[
                            alert.until
                              ? `${expired ? "Terminée le" : "Jusqu'au"} ${formatDate(alert.until)}`
                              : "Sans date de fin",
                            alert.matchCount
                              ? `${alert.matchCount} lot${alert.matchCount > 1 ? "s" : ""} signalé${alert.matchCount > 1 ? "s" : ""}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeAlert({ id: alert._id })}
                        className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-red-600"
                        aria-label="Supprimer la recherche"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5">
                <Link to="/je-recherche">
                  <Button variant="outline">Nouvelle recherche</Button>
                </Link>
              </div>
            </>
          )}
        </section>
      ) : tab === "infos" || (tab === "donateur" && donorTab === "profil") ? (
        <section className="mt-6 max-w-3xl space-y-5">
          <p className="text-sm text-[var(--muted-foreground)]">
            Ces informations remplissent le formulaire d'achat et chaque
            proposition de don.
          </p>
          {tab === "infos" && <fieldset className="space-y-3"><legend className="font-semibold">Vous êtes</legend>{([
            ["particulier", "Particulier", "Paiement par carte"],
            ["professionnel", "Professionnel / entreprise", "Carte ou espèces au retrait"],
            ["collectivite", "Collectivité / PP / Assos", "Carte, espèces au retrait ou virement"],
          ] as const).map(([value, label, description]) => <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] p-3"><input type="radio" name="customerType" checked={customerType === value} onChange={() => { setCustomerType(value); setSaved(false); }} /><span><strong className="block text-sm">{label}</strong><span className="text-xs text-[var(--muted-foreground)]">{description}</span></span></label>)}</fieldset>}
          <DonorFieldset donor={donor} set={set} patch={patch} customerType={customerType} showProfiles={tab === "donateur"} />
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
              <span className="text-sm font-medium text-emerald-600">
                Fiche à jour.
              </span>
            ) : null}
          </div>
        </section>
      ) : tab === "donateur" && donorTab === "dons" ? (
        <section className="mt-6">
          {donations === undefined ? (
            <FullSpinner />
          ) : selected ? (
            <DonationDetail
              donation={selected}
              onBack={() => setOpenId(null)}
            />
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
      ) : null}
    </div>
  );
}

function OrdersPanel({ activity }: { activity: MyOrderActivity | undefined }) {
  const [selected, setSelected] = useState<{
    kind: "order" | "delivery";
    id: string;
  } | null>(null);
  if (activity === undefined)
    return (
      <section className="mt-6">
        <FullSpinner />
      </section>
    );
  const { orders, deliveryRequests } = activity;
  const selectedOrder =
    selected?.kind === "order"
      ? orders.find((order) => String(order._id) === selected.id)
      : undefined;
  const selectedDelivery =
    selected?.kind === "delivery"
      ? deliveryRequests.find((request) => String(request._id) === selected.id)
      : undefined;

  if (selectedOrder?.purchaseReference) return <PickupOrderDetail lines={orders.filter(order => order.purchaseReference === selectedOrder.purchaseReference)} onBack={() => setSelected(null)} />;
  if (selectedOrder)
    return (
      <OrderDetail order={selectedOrder} onBack={() => setSelected(null)} />
    );
  if (selectedDelivery)
    return (
      <DeliveryRequestDetail
        request={selectedDelivery}
        onBack={() => setSelected(null)}
      />
    );

  if (!orders.length && !deliveryRequests.length) {
    return (
      <section className="mt-6">
        <EmptyState
          icon={<ShoppingBag className="h-9 w-9" />}
          title="Aucune commande pour le moment"
          description="Vos achats, réservations et demandes de livraison apparaîtront ici."
          action={
            <Link to="/">
              <Button variant="outline">Voir le catalogue</Button>
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-8">
      {orders.length ? (
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand-700" />
            <h2 className="text-lg font-bold">Mes achats et réservations</h2>
          </div>
          <ul className="mt-3 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4">
            {orders.filter((order, index) => !order.purchaseReference || orders.findIndex(other => other.purchaseReference === order.purchaseReference) === index).map((order) => {
              const group = order.purchaseReference ? orders.filter(other => other.purchaseReference === order.purchaseReference) : [order];
              const ready = group.filter(line => line.fulfillment?.status === "ready").length;
              const location = PICKUP_LOCATIONS.find(
                (item) => item.id === order.pickupLocation,
              );
              const status = orderStatus(order.status);
              const total = group.reduce((sum, line) => sum + line.amountCents, 0) / 100;
              return (
                <li key={order._id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected({ kind: "order", id: String(order._id) })
                    }
                    className="group flex w-full items-center gap-3 py-4 text-left transition hover:text-brand-700"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <ShoppingBag className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-950">
                        {order.purchaseReference ? `Commande ${order.purchaseReference} · ${ready} retrait${ready > 1 ? "s" : ""} disponible${ready > 1 ? "s" : ""} sur ${group.length}` : order.materialTitle}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {order.purchaseReference ? `${group.length} retraits` : `${order.reference} · ${order.quantity} ${order.unit}`} ·{" "}
                        {formatDate(order.createdAt)}
                      </p>
                      {location && !order.purchaseReference ? (
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          Retrait : {location.name}
                        </p>
                      ) : null}
                    </div>
                    <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                      <span className="text-sm font-semibold text-zinc-950">
                        {total.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {deliveryRequests.length ? (
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-brand-700" />
            <h2 className="text-lg font-bold">Mes demandes de livraison</h2>
          </div>
          <ul className="mt-3 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4">
            {deliveryRequests.map((request) => {
              const outcome = deliveryStatus(request.outcome);
              return (
                <li key={request._id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected({ kind: "delivery", id: String(request._id) })
                    }
                    className="group flex w-full items-center gap-3 py-4 text-left transition hover:text-brand-700"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Truck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-950">
                        {request.items.map((item) => item.title).join(", ")}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {request.reference} · Demandée le{" "}
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-bold",
                        outcome.className,
                      )}
                    >
                      {outcome.label}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 text-sm text-zinc-700">
        <Phone className="h-5 w-5 shrink-0 text-brand-700" />
        <span>Une question sur votre commande ?</span>
        <a
          href="tel:+33375150475"
          className="font-bold text-brand-700 underline underline-offset-2"
        >
          03 75 15 04 75
        </a>
      </div>
    </section>
  );
}

function OrderDetail({
  order,
  onBack,
}: {
  order: MyOrder;
  onBack: () => void;
}) {
  const status = orderStatus(order.status);
  const location = PICKUP_LOCATIONS.find(
    (item) => item.id === order.pickupLocation,
  );
  const paymentStep =
    order.status === "en_attente"
      ? 0
      : order.status === "payee"
        ? 1
        : order.status === "reservee"
          ? 0
          : -1;
  const steps =
    order.status === "reservee"
      ? ["Réservation créée", "Paiement au retrait", "Retrait"]
      : ["Commande créée", "Paiement confirmé", "Retrait"];

  return (
    <section className="mt-6 space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Mes commandes
      </button>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Commande {order.reference}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">
              {order.materialTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Passée le {formatDateTime(order.createdAt)}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>
        {order.status === "annulee" ? (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            Cette commande a été annulée.
          </p>
        ) : (
          <StatusProgress steps={steps} currentStep={paymentStep} />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Article commandé
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-brand-700">
              <PackageOpen className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-950">
                {order.materialTitle}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {order.quantity} {order.unit}
              </p>
            </div>
          </div>
          <Link
            to={`/materiau/${order.materialId}`}
            className="mt-5 inline-flex text-sm font-semibold text-brand-700 underline underline-offset-2"
          >
            Voir la fiche du matériau
          </Link>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Paiement
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-zinc-950">
            {(order.amountCents / 100).toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            })}
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {order.status === "reservee"
              ? "À régler au retrait."
              : order.status === "payee"
                ? `Paiement confirmé${order.paidAt ? ` le ${formatDate(order.paidAt)}` : ""}.`
                : "Paiement en attente de confirmation."}
          </p>
          {order.pickupFeeCents ? (
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--muted-foreground)]">
              Dont{" "}
              {((order.pickupFeeCents ?? 0) / 100).toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}{" "}
              de transfert entre dépôts.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-brand-700" />
          <p className="font-semibold text-zinc-950">Retrait</p>
        </div>
        {order.fulfillment && <PickupTracking tracking={order.fulfillment} quantity={order.quantity} unit={order.unit} />}
        {location ? (
          <>
            <p className="mt-3 font-medium">{location.name}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {location.address}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Le lieu de retrait sera confirmé avec l’équipe BâtiRe.
          </p>
        )}
      </div>
      <OrderHelp />
    </section>
  );
}

function DeliveryRequestDetail({
  request,
  onBack,
}: {
  request: MyDeliveryRequest;
  onBack: () => void;
}) {
  const outcome = deliveryStatus(request.outcome);
  const currentStep =
    request.outcome === "nouveau"
      ? 0
      : request.outcome === "en_cours"
        ? 1
        : request.outcome === "gagnee"
          ? 2
          : -1;
  return (
    <section className="mt-6 space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Mes commandes
      </button>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Demande de livraison {request.reference}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">
              Livraison à domicile
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Demandée le {formatDateTime(request.createdAt)}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold",
              outcome.className,
            )}
          >
            {outcome.label}
          </span>
        </div>
        {request.outcome === "perdue" ? (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            Cette demande n’a pas pu être retenue.
          </p>
        ) : (
          <StatusProgress
            steps={[
              "Demande reçue",
              "Étude de la livraison",
              "Proposition transmise",
            ]}
            currentStep={currentStep}
          />
        )}
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Articles à livrer
        </p>
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {request.items.map((item, index) => (
            <li
              key={`${item.title}-${index}`}
              className="flex justify-between gap-4 py-3 first:pt-0"
            >
              <span className="font-medium text-zinc-950">{item.title}</span>
              <span className="shrink-0 text-sm text-[var(--muted-foreground)]">
                {item.quantity} {item.unit}
              </span>
            </li>
          ))}
        </ul>
        {request.message ? (
          <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm leading-6 text-[var(--muted-foreground)]">
            {request.message}
          </p>
        ) : null}
      </div>
      <OrderHelp />
    </section>
  );
}

function StatusProgress({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <div className="mt-7 flex items-start">
      {steps.map((label, index) => {
        const reached = index <= currentStep;
        const current = index === currentStep;
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center justify-center">
              <span
                className={cn(
                  "h-0.5 flex-1",
                  index === 0
                    ? "invisible"
                    : reached
                      ? "bg-brand-500"
                      : "bg-[var(--border)]",
                )}
              />
              <span
                className={cn(
                  "mx-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  reached
                    ? "bg-brand-600 text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                  current && "ring-4 ring-brand-500/15",
                )}
              >
                {reached ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </span>
              <span
                className={cn(
                  "h-0.5 flex-1",
                  index === steps.length - 1
                    ? "invisible"
                    : index < currentStep
                      ? "bg-brand-500"
                      : "bg-[var(--border)]",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-2 text-center text-[11px] sm:text-xs",
                current
                  ? "font-bold text-zinc-950"
                  : reached
                    ? "font-medium text-zinc-600"
                    : "text-[var(--muted-foreground)]",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OrderHelp() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 text-sm text-zinc-700">
      <Phone className="h-5 w-5 shrink-0 text-brand-700" />
      <span>Une question sur votre commande ?</span>
      <a
        href="tel:+33375150475"
        className="font-bold text-brand-700 underline underline-offset-2"
      >
        03 75 15 04 75
      </a>
    </div>
  );
}

function orderStatus(status: MyOrder["status"]) {
  if (status === "payee")
    return { label: "Payée", className: "bg-emerald-100 text-emerald-800" };
  if (status === "reservee")
    return {
      label: "Réservée · paiement au retrait",
      className: "bg-blue-100 text-blue-800",
    };
  if (status === "annulee")
    return { label: "Annulée", className: "bg-red-100 text-red-800" };
  return {
    label: "Paiement en attente",
    className: "bg-amber-100 text-amber-800",
  };
}

function deliveryStatus(outcome: MyDeliveryRequest["outcome"]) {
  if (outcome === "en_cours")
    return {
      label: "En cours d'étude",
      className: "bg-blue-100 text-blue-800",
    };
  if (outcome === "gagnee")
    return { label: "Traitée", className: "bg-emerald-100 text-emerald-800" };
  if (outcome === "perdue")
    return { label: "Non retenue", className: "bg-red-100 text-red-800" };
  return { label: "Demande reçue", className: "bg-amber-100 text-amber-800" };
}

/** Fiche d'un don : ce que le donateur a envoyé, et la réponse de l'équipe. */
function DonationDetail({
  donation,
  onBack,
}: {
  donation: MyDonation;
  onBack: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const specs: Array<[string, string | undefined]> = [
    [
      "Catégorie",
      [donation.category, donation.family, donation.subcategory]
        .filter(Boolean)
        .join(" › "),
    ],
    [
      "Quantité",
      donation.quantity
        ? `${donation.quantity} ${donation.unit ?? ""}`.trim()
        : undefined,
    ],
    ["État", donation.condition],
    [
      "Disponible dès",
      donation.availableFrom ? formatDate(donation.availableFrom) : undefined,
    ],
    ["Proposé le", formatDateTime(donation.createdAt)],
    [
      "Réponse le",
      donation.decidedAt ? formatDateTime(donation.decidedAt) : undefined,
    ],
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
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {donation.title}
          </h2>
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
                      index === photoIndex
                        ? "border-brand-500"
                        : "border-[var(--border)]",
                    )}
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          {donation.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {donation.description}
            </p>
          ) : null}
          <dl className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)] text-sm">
            {specs
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 py-2.5"
                >
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
