import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { CheckCircle2, Home, Loader2, MapPin, PackageOpen, ShoppingCart, Tag, Trash2, Truck, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete";
import { FullSpinner } from "../../components/ui/Spinner";
import { formatPrice } from "../../lib/format";
import { searchAddresses, type AddressSuggestion } from "../../lib/address";
import { distanceInKm, PICKUP_LOCATIONS, storageLocationId, type PickupLocationId } from "../../lib/pickupLocations";
import { useCart } from "../../lib/useCart";

const TRANSFER_FEE = 9.9;
/** Code promo mémorisé depuis le lien de l'email (page /code-promo/:code). */
export const PROMO_STORAGE_KEY = "batire-promo-code";
function savedPromo() { try { return localStorage.getItem(PROMO_STORAGE_KEY) ?? ""; } catch { return ""; } }

export function CartPage() {
  const cart = useCart();
  const materials = useQuery(api.batire.listPublicMaterials, {});
  const startCheckout = useAction(api.batire.startCartCheckout);
  const requestDelivery = useMutation(api.batire.requestHomeDelivery);
  const requestOffline = useMutation(api.batire.requestOfflineCart);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "bank_transfer">("card");
  const { isSignedIn } = useUser();
  const profile = useQuery(api.batireDons.getMyDonorProfile, isSignedIn ? {} : "skip");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const [promoInput, setPromoInput] = useState(savedPromo);
  const [promoCode, setPromoCode] = useState(savedPromo);
  const promo = useQuery(api.batire.checkPromoCode, promoCode ? { code: promoCode } : "skip");
  // Code mémorisé devenu invalide (déjà utilisé, expiré) : on l'oublie.
  useEffect(() => { if (promo && !promo.ok) { try { localStorage.removeItem(PROMO_STORAGE_KEY); } catch { /* stockage indisponible */ } } }, [promo]);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const resolvedAddress = useRef("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", address: "", pickupLocation: "" as PickupLocationId | "", fulfillment: "pickup" as "pickup" | "delivery" });
  // Aide sans surprise : les données connues remplissent les champs vides,
  // mais ne remplacent jamais ce que le client vient de saisir.
  useEffect(() => {
    if (!profile) return;
    setForm((current) => ({
      ...current,
      firstName: current.firstName || profile.firstName,
      lastName: current.lastName || profile.lastName,
      email: current.email || profile.email,
      phone: current.phone || profile.phone,
      address: current.address || [profile.address, profile.postalCode, profile.city].filter(Boolean).join(", "),
    }));
  }, [profile]);
  // Le profil préremplit le texte sans passer par la sélection d'une suggestion.
  // Résoudre aussi cette adresse pour afficher immédiatement les distances.
  useEffect(() => {
    const address = form.address.trim();
    if (address === resolvedAddress.current) return;
    resolvedAddress.current = "";
    setCoordinates(null);
    if (address.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchAddresses(address).then(([match]) => {
        if (cancelled || resolvedAddress.current === address) return;
        resolvedAddress.current = address;
        setCoordinates(match ? { latitude: match.latitude, longitude: match.longitude } : null);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.address]);

  function changeAddress(address: string) {
    resolvedAddress.current = "";
    setForm((current) => ({ ...current, address }));
    setCoordinates(null);
  }

  function selectAddress(address: AddressSuggestion) {
    const value = `${address.address}, ${address.postalCode} ${address.city}`;
    resolvedAddress.current = value.trim();
    setForm((current) => ({ ...current, address: value }));
    setCoordinates({ latitude: address.latitude, longitude: address.longitude });
  }
  const lines = useMemo(() => (materials ?? []).flatMap((material) => { const item = cart.items.find((x) => x.materialId === material._id); return item ? [{ material, quantity: item.quantity, pickupLocation: item.pickupLocation }] : []; }), [cart.items, materials]);
  const subtotal = lines.reduce((sum, line) => sum + line.material.price * line.quantity, 0);
  const transferNeeded = lines.some(({ material, pickupLocation }) => !!pickupLocation && !!storageLocationId(material.depot) && storageLocationId(material.depot) !== pickupLocation);
  // Remise calculée comme côté serveur : sur les articles, hors frais de transfert.
  const validPromo = promo?.ok ? promo : null;
  const discount = validPromo ? Math.min(subtotal, validPromo.kind === "percent" ? Math.round(subtotal * validPromo.value) / 100 : validPromo.value / 100) : 0;
  const total = subtotal - discount + (transferNeeded ? TRANSFER_FEE : 0);
  const appliedCode = validPromo && form.fulfillment === "pickup" ? validPromo.code : undefined;
  const customer = { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone || undefined };
  // Le vendeur est une information locale servant à filtrer le catalogue ;
  // l'API de checkout valide strictement les seules lignes de commande.
  const checkoutItems = cart.items.map(({ materialId, quantity }) => ({ materialId, quantity }));
  const allowedMethods = profile?.customerType === "collectivite" ? ["card", "cash", "bank_transfer"] : profile?.customerType === "professionnel" ? ["card", "cash"] : ["card"];
  const valid = !!(form.firstName && form.lastName && form.email && (form.fulfillment === "delivery" ? form.address : allowedMethods.includes(paymentMethod) && lines.length === cart.items.length && lines.every(line => line.pickupLocation && storageLocationId(line.material.depot))));
  async function submit() { setLoading(true); setError(""); try { if (form.fulfillment === "delivery") { const result = await requestDelivery({ items: checkoutItems, customer, address: form.address }); cart.clear(); setSuccess(`Demande ${result.reference} envoyée. L’équipe vous contactera pour le devis de livraison.`); return; } if (paymentMethod !== "card") { const result = await requestOffline({ items: cart.items.map(({ materialId, quantity, pickupLocation }) => ({ materialId, quantity, pickupLocation: pickupLocation! })), customer, paymentMethod, promoCode: appliedCode }); cart.clear(); setSuccess(paymentMethod === "cash" ? `Demande ${result.reference} envoyée. Le paiement en espèces aura lieu au retrait.` : `Demande ${result.reference} envoyée. Les coordonnées bancaires définitives restent à confirmer avant tout virement.`); return; } const result = await startCheckout({ items: cart.items.map(({ materialId, quantity, pickupLocation }) => ({ materialId, quantity, pickupLocation })), customer, returnUrl: `${window.location.origin}/panier/retour`, promoCode: appliedCode }); if (result.freeReference !== undefined || result.checkouts.length === 0) { cart.clear(); setSuccess(`Commande ${result.freeReference ?? ""} confirmée : votre code promo couvre la totalité des articles. Vous recevrez un email dès que votre retrait sera prêt.`); return; } sessionStorage.setItem("batire-cart-followups", JSON.stringify(result.checkouts.slice(1))); window.location.assign(result.checkouts[0]!.checkoutUrl); } catch (caught) { setError(caught instanceof Error ? caught.message : "Une erreur est survenue."); setLoading(false); } }
  if (!cart.items.length && !success) return <EmptyCart />;
  if (!materials) return <FullSpinner label="Chargement du panier…" />;
  if (!isSignedIn) return <main className="mx-auto max-w-2xl px-4 py-16 text-center"><ShoppingCart className="mx-auto h-10 w-10 text-brand-700" /><h1 className="mt-4 text-2xl font-bold">Connectez-vous pour finaliser votre commande</h1><p className="mx-auto mt-3 max-w-lg text-[var(--muted-foreground)]">Votre panier est conservé. Connectez-vous ou créez votre compte pour choisir votre mode de réception et passer au règlement.</p><Link to="/connexion?redirect_url=/panier" className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-3 font-bold text-white transition hover:bg-brand-700">Se connecter pour finaliser</Link><Link to="/" className="mt-4 block text-sm font-semibold text-brand-700">← Continuer mes achats</Link></main>;
  if (success) return <main className="mx-auto max-w-2xl px-4 py-20 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h1 className="mt-4 text-2xl font-bold">Demande envoyée</h1><p className="mt-3 text-[var(--muted-foreground)]">{success}</p>{paymentMethod === "bank_transfer" && <BankDetails />}<Link className="mt-6 inline-block font-semibold text-brand-700" to="/">Retour au catalogue</Link></main>;
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><Link className="text-sm font-semibold text-brand-700" to="/">← Continuer mes achats</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-brand-700">BâtiRe</p><h1 className="mt-1 text-3xl font-black">Finaliser ma commande</h1><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start"><section className="space-y-6"><Card title="Vos coordonnées" number="1"><div className="grid gap-3 sm:grid-cols-2">{([['firstName','Prénom'],['lastName','Nom'],['email','Email'],['phone','Téléphone']] as const).map(([key,label]) => <label key={key} className="text-sm font-semibold">{label}<input className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 font-normal outline-none focus:border-brand-500" type={key === "email" ? "email" : "text"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}</div></Card><Card title="Réception de vos articles" number="2"><div className="grid gap-3 sm:grid-cols-2"><Choice icon={<MapPin className="h-5 w-5" />} title="Retrait en point relais" detail="Gratuit au lieu de stockage" selected={form.fulfillment === "pickup"} onClick={() => setForm({ ...form, fulfillment: "pickup" })} /><Choice icon={<Truck className="h-5 w-5" />} title="Livraison à domicile" detail="Sur demande de devis" selected={form.fulfillment === "delivery"} onClick={() => setForm({ ...form, fulfillment: "delivery" })} /></div>{form.fulfillment === "pickup" ? <PickupChooser lines={lines} address={form.address} onPickupChange={cart.setPickupLocation} coordinates={coordinates} onAddressChange={changeAddress} onAddressSelect={selectAddress} transferNeeded={transferNeeded} /> : <label className="mt-5 block text-sm font-semibold">Adresse de livraison<textarea className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 font-normal outline-none focus:border-brand-500" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Adresse complète, code postal et ville" /></label>}</Card>{form.fulfillment === "pickup" && <Card title="Mode de paiement" number="3"><p className="mb-3 text-sm text-[var(--muted-foreground)]">Selon votre profil : {profile?.customerType === "collectivite" ? "Collectivité / PP / Assos" : profile?.customerType === "professionnel" ? "Professionnel / entreprise" : "Particulier"}. <Link className="font-semibold text-brand-700 underline" to="/mon-compte">Modifier mes informations</Link></p><div className="space-y-2">{([{ value: "card", label: "Carte bancaire", description: "Paiement sécurisé en ligne" }, { value: "cash", label: "Espèces", description: "Paiement au retrait" }, { value: "bank_transfer", label: "Virement bancaire", description: "Coordonnées à confirmer" }] as const).filter(option => allowedMethods.includes(option.value)).map(option => <label key={option.value} className="flex cursor-pointer gap-3 rounded-xl border border-[var(--border)] p-3"><input type="radio" name="paymentMethod" checked={paymentMethod === option.value} onChange={() => setPaymentMethod(option.value)} /><span><strong className="block">{option.label}</strong><span className="text-sm text-[var(--muted-foreground)]">{option.description}</span></span></label>)}</div>{paymentMethod === "bank_transfer" && <BankDetails />}</Card>}</section><Summary paymentMethod={paymentMethod} lines={lines} subtotal={subtotal} total={total} discount={discount} promo={{ input: promoInput, setInput: setPromoInput, code: promoCode, result: promo, apply: () => setPromoCode(promoInput.trim().toUpperCase()), clear: () => { setPromoCode(""); setPromoInput(""); try { localStorage.removeItem(PROMO_STORAGE_KEY); } catch { /* stockage indisponible */ } } }} transferNeeded={transferNeeded} fulfillment={form.fulfillment} loading={loading} valid={valid} error={error} onRemove={cart.remove} onSubmit={() => void submit()} /></div></main>;
}

function PickupChooser({ lines, address, onPickupChange, coordinates, onAddressChange, onAddressSelect, transferNeeded }: {
  lines: Array<{ material: { _id: import("../../../convex/_generated/dataModel").Id<"btMaterials">; title: string; depot?: string; unit: string }; quantity: number; pickupLocation?: PickupLocationId }>;
  address: string;
  onPickupChange: (id: import("../../../convex/_generated/dataModel").Id<"btMaterials">, location: PickupLocationId) => void;
  coordinates: { latitude: number; longitude: number } | null;
  onAddressChange: (address: string) => void;
  onAddressSelect: (address: AddressSuggestion) => void;
  transferNeeded: boolean;
}) {
  return <div className="mt-5 space-y-5">
    <div><p className="text-sm font-semibold">Votre adresse — pour afficher les distances</p><AddressAutocomplete value={address} onValueChange={onAddressChange} onSelect={onAddressSelect} placeholder="Saisissez votre adresse" /></div>
    <p className="text-sm text-[var(--muted-foreground)]">Choisissez le lieu de retrait de chaque matériau. Tous vos retraits seront suivis séparément sous un seul numéro de commande.</p>
    {lines.map(({ material, quantity, pickupLocation }) => {
      const source = storageLocationId(material.depot);
      return <fieldset key={material._id} className="rounded-xl border border-[var(--border)] p-4">
        <legend className="px-1 font-semibold">{quantity} {material.unit} · {material.title}</legend>
        <p className="mb-3 text-sm text-[var(--muted-foreground)]">Stockage : {material.depot || "À confirmer avec l’équipe"}</p>
        <div className="space-y-2">{PICKUP_LOCATIONS.map(location => <label key={location.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${pickupLocation === location.id ? "border-brand-600 bg-brand-50" : "border-[var(--border)]"}`}>
          <input type="radio" name={`pickup-${material._id}`} checked={pickupLocation === location.id} onChange={() => onPickupChange(material._id, location.id)} className="mt-1 accent-brand-600" />
          <span><strong className="block text-sm">{location.name}</strong><span className="block text-xs text-[var(--muted-foreground)]">{location.address}{coordinates ? ` · ${distanceInKm(coordinates, location).toFixed(1)} km à vol d’oiseau` : ""}</span><span className={`mt-1 block text-xs font-semibold ${source === location.id ? "text-emerald-700" : "text-amber-800"}`}>{!source ? "Dépôt de stockage à confirmer avant paiement" : source === location.id ? "Déjà sur place · Retrait gratuit après préparation" : "Transfert nécessaire · Forfait de 9,90 € par commande"}</span></span>
        </label>)}</div>
      </fieldset>;
    })}
    {transferNeeded && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><strong>Transfert inter-site : +9,90 € une seule fois par commande</strong>, quel que soit le nombre de retraits concernés.</p>}
  </div>;
}
function BankDetails() { return <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Coordonnées bancaires provisoires</strong><p className="mt-2">Titulaire : [À RENSEIGNER]<br />IBAN : [À RENSEIGNER]<br />BIC : [À RENSEIGNER]</p><p className="mt-2">Ne faites pas de virement avant réception des coordonnées définitives. Votre référence de commande sera à indiquer.</p></div>; }
function Summary({ lines, subtotal, total, discount, promo, transferNeeded, fulfillment, paymentMethod, loading, valid, error, onRemove, onSubmit }: any) { return <aside className="lg:sticky lg:top-24"><div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-xl shadow-black/5"><div className="border-b border-[var(--border)] px-5 py-4"><h2 className="font-bold">Récapitulatif</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">{lines.length} article{lines.length > 1 ? "s" : ""}</p></div><div className="max-h-80 space-y-4 overflow-y-auto p-5">{lines.map(({ material, quantity }: any) => <div className="flex gap-3" key={material._id}><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--muted)]">{material.photoUrls[0] ? <img className="h-full w-full object-cover" src={material.photoUrls[0]} alt="" /> : <PackageOpen className="m-5 h-6 w-6" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold">{material.title}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{quantity} {material.unit} · {material.depot ?? "Lieu à confirmer"}</p><div className="mt-2 flex justify-between"><strong className="text-sm text-brand-700">{formatPrice(material.price * quantity)}</strong><button onClick={() => onRemove(material._id)} className="text-[var(--muted-foreground)] hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div><div className="space-y-2 border-t border-[var(--border)] px-5 py-4 text-sm"><div className="flex justify-between"><span>Sous-total</span><span>{formatPrice(subtotal)}</span></div>{fulfillment === "pickup" && <PromoField promo={promo} />}{fulfillment === "pickup" && discount > 0 && <div className="flex justify-between text-emerald-700"><span>Code {promo.result?.code}</span><span>− {formatPrice(discount)}</span></div>}{fulfillment === "pickup" && transferNeeded && <div className="flex justify-between text-amber-800"><span>Transfert inter-site</span><span>+ {formatPrice(TRANSFER_FEE)}</span></div>}<div className="mt-3 flex justify-between border-t border-[var(--border)] pt-3"><strong>{fulfillment === "pickup" ? "Total" : "Montant"}</strong><strong className="text-2xl text-brand-700">{fulfillment === "pickup" ? formatPrice(total) : "Sur devis"}</strong></div></div><div className="bg-[var(--muted)] p-5">{error && <p className="mb-3 text-sm text-red-600">{error}</p>}<button disabled={loading || !valid} onClick={onSubmit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 font-bold text-white disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{fulfillment === "pickup" ? paymentMethod === "card" ? `Payer ${formatPrice(total)}` : "Envoyer la demande" : <><Home className="h-4 w-4" /> Demander un devis</>}</button></div></div></aside>; }
function PromoField({ promo }: { promo: { input: string; setInput: (value: string) => void; code: string; result?: { ok: true; code: string; kind: "amount" | "percent"; value: number } | { ok: false; message: string }; apply: () => void; clear: () => void } }) {
  if (promo.code && promo.result?.ok) return <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800"><span className="flex items-center gap-2 font-semibold"><Tag className="h-4 w-4" />{promo.result.code} · {promo.result.kind === "percent" ? `${promo.result.value} %` : formatPrice(promo.result.value / 100)}</span><button type="button" onClick={promo.clear} aria-label="Retirer le code promo" className="rounded-lg p-1 hover:bg-emerald-100"><X className="h-4 w-4" /></button></div>;
  return <div className="pt-1"><form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (promo.input.trim()) promo.apply(); }}><input value={promo.input} onChange={event => promo.setInput(event.target.value.toUpperCase())} placeholder="Code promo" aria-label="Code promo" maxLength={40} className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm outline-none focus:border-brand-500" /><button type="submit" disabled={!promo.input.trim() || (Boolean(promo.code) && promo.result === undefined)} className="shrink-0 rounded-xl border border-brand-600 px-3 py-2 text-sm font-semibold text-brand-700 disabled:opacity-50">Appliquer</button></form>{promo.code && promo.result && !promo.result.ok && <p className="mt-1.5 text-xs text-red-600">{promo.result.message}</p>}</div>;
}
function Card({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{number}</span><h2 className="text-lg font-bold">{title}</h2></div>{children}</section>; }
function Choice({ icon, title, detail, selected, onClick }: any) { return <button type="button" onClick={onClick} className={`flex gap-3 rounded-2xl border p-4 text-left ${selected ? "border-brand-600 bg-brand-50" : "border-[var(--border)]"}`}><span className="text-brand-700">{icon}</span><span><strong className="block">{title}</strong><span className="text-sm text-[var(--muted-foreground)]">{detail}</span></span></button>; }
function EmptyCart() { return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><ShoppingCart className="mx-auto h-10 w-10 text-[var(--muted-foreground)]" /><h1 className="mt-4 text-2xl font-bold">Votre panier est vide</h1><Link className="mt-5 inline-block font-semibold text-brand-700" to="/">Voir le catalogue</Link></div>; }
export function CartReturn() { const [params] = useSearchParams(); const confirm = useAction(api.batire.confirmCartCheckout); const { remove } = useCart(); const navigate = useNavigate(); const [error, setError] = useState(""); const sessionId = params.get("session_id"); const provider = params.get("provider") as "recycapp" | "bennespro" | null; useEffect(() => { if (!sessionId || !provider) return; void confirm({ sessionId, provider }).then((result) => { result.materialIds.forEach(remove); const remaining = JSON.parse(sessionStorage.getItem("batire-cart-followups") ?? "[]") as Array<{ checkoutUrl: string }>; const next = remaining.shift(); sessionStorage.setItem("batire-cart-followups", JSON.stringify(remaining)); if (next) window.location.assign(next.checkoutUrl); else navigate("/mon-compte?onglet=commandes", { replace: true }); }).catch((caught) => setError(caught instanceof Error ? caught.message : "Confirmation impossible.")); }, [confirm, navigate, provider, remove, sessionId]); return !sessionId || !provider ? <CartPage /> : error ? <div className="p-10 text-center text-red-600">{error}</div> : <FullSpinner label="Confirmation du paiement…" />; }
