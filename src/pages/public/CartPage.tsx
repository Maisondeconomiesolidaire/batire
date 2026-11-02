import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import { Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCart } from "../../lib/useCart";
import { formatPrice, formatStock } from "../../lib/format";
import { PICKUP_LOCATIONS, type PickupLocationId } from "../../lib/pickupLocations";
import { FullSpinner } from "../../components/ui/Spinner";

function CartLine({ item }: { item: { materialId: Id<"btMaterials">; quantity: number } }) {
  const material = useQuery(api.batire.getPublicMaterial, { id: item.materialId });
  const cart = useCart();
  if (!material) return null;
  return <div className="flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
    <img className="h-20 w-20 rounded-xl object-cover bg-[var(--muted)]" src={material.photoUrls[0]} alt="" />
    <div className="min-w-0 flex-1"><Link className="font-semibold hover:text-brand-700" to={`/materiau/${material._id}`}>{material.title}</Link><p className="mt-1 text-sm text-[var(--muted-foreground)]">{material.category} · {formatStock(material.quantity, material.unit)} disponibles</p><div className="mt-3 flex items-center gap-2"><input className="w-20 rounded-lg border border-[var(--border)] px-2 py-1" type="number" min="1" max={material.quantity} value={item.quantity} onChange={(event) => cart.update(item.materialId, Math.min(material.quantity, Number(event.target.value) || 0))} /><span className="text-sm text-[var(--muted-foreground)]">{material.unit}</span><strong className="ml-auto text-brand-700">{formatPrice(material.price * item.quantity)}</strong><button onClick={() => cart.remove(item.materialId)} className="p-2 text-red-500" aria-label="Retirer"><Trash2 className="h-4 w-4" /></button></div></div>
  </div>;
}

export function CartPage() {
  const cart = useCart(); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const start = useAction(api.batire.startCartCheckout);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", pickupLocation: "" as PickupLocationId | "" });
  async function checkout() { setLoading(true); setError(""); try { const result = await start({ items: cart.items, customer: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone || undefined }, pickupLocation: form.pickupLocation as PickupLocationId, returnUrl: `${window.location.origin}/panier/retour` }); sessionStorage.setItem("batire-cart-followups", JSON.stringify(result.checkouts.slice(1))); window.location.assign(result.checkouts[0]!.checkoutUrl); } catch (caught) { setError(caught instanceof Error ? caught.message : "Paiement impossible."); setLoading(false); } }
  if (!cart.items.length) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><ShoppingCart className="mx-auto h-10 w-10 text-[var(--muted-foreground)]" /><h1 className="mt-4 text-2xl font-bold">Votre panier est vide</h1><Link className="mt-5 inline-block font-semibold text-brand-700" to="/">Voir le catalogue</Link></div>;
  return <main className="mx-auto max-w-4xl px-4 py-8"><Link className="text-sm font-semibold text-brand-700" to="/">← Continuer mes achats</Link><h1 className="mt-5 text-3xl font-bold">Votre panier</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Les articles de mobilier de bureau sont encaissés par Recycapp ; les autres par Bennes & Pro.</p><div className="mt-6 space-y-3">{cart.items.map((item) => <CartLine key={item.materialId} item={item} />)}</div><section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><h2 className="text-lg font-bold">Finaliser la commande</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{([['firstName','Prénom'],['lastName','Nom'],['email','Email'],['phone','Téléphone']] as const).map(([key,label]) => <label key={key} className="text-sm font-medium">{label}<input className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2" type={key === 'email' ? 'email' : 'text'} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}</div><label className="mt-3 block text-sm font-medium">Lieu de retrait<select className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2" value={form.pickupLocation} onChange={(event) => setForm({ ...form, pickupLocation: event.target.value as PickupLocationId })}><option value="">Choisir un lieu</option>{PICKUP_LOCATIONS.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<button disabled={loading || !form.firstName || !form.lastName || !form.email || !form.pickupLocation} onClick={() => void checkout()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />}Payer ma commande</button></section></main>;
}

export function CartReturn() {
  const [params] = useSearchParams(); const confirm = useAction(api.batire.confirmCartCheckout); const { remove } = useCart(); const navigate = useNavigate(); const [error, setError] = useState("");
  const sessionId = params.get("session_id"); const provider = params.get("provider") as "recycapp" | "bennespro" | null;
  useEffect(() => { if (!sessionId || !provider) return; void (async () => { try { const result = await confirm({ sessionId, provider }); result.materialIds.forEach(remove); const followups = JSON.parse(sessionStorage.getItem("batire-cart-followups") ?? "[]") as Array<{ checkoutUrl: string }>; const next = followups.shift(); sessionStorage.setItem("batire-cart-followups", JSON.stringify(followups)); if (next) window.location.assign(next.checkoutUrl); else navigate("/", { replace: true }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Confirmation impossible."); } })(); }, [confirm, navigate, provider, remove, sessionId]);
  if (!sessionId || !provider) return <CartPage />;
  return error ? <div className="p-10 text-center text-red-600">{error}</div> : <FullSpinner label="Confirmation du paiement…" />;
}
