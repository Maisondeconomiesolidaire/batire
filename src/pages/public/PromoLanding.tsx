import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, ShoppingCart, Tag } from "lucide-react";
import { PROMO_STORAGE_KEY } from "./CartPage";

/**
 * Ouverte depuis l'email « code promo » : copie le code en un clic et le
 * garde pour le panier, où il s'applique tout seul.
 */
export function PromoLanding() {
  const { code: raw = "" } = useParams();
  const code = raw.trim().toUpperCase();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(PROMO_STORAGE_KEY, code); } catch { /* stockage indisponible */ }
    // Copie tentée d'office ; certains navigateurs exigent un clic, d'où le bouton.
    void navigator.clipboard?.writeText(code).then(() => setCopied(true), () => undefined);
  }, [code]);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* presse-papiers indisponible */ }
  }
  return <main className="mx-auto max-w-xl px-4 py-16 text-center">
    <Tag className="mx-auto h-10 w-10 text-brand-600" />
    <h1 className="mt-4 text-2xl font-black">Votre code promo</h1>
    <button type="button" onClick={() => void copy()} className="group mt-6 w-full rounded-3xl border-4 border-dashed border-brand-500 bg-brand-50 px-4 py-6 transition hover:bg-brand-100">
      <span className="block select-all break-all font-mono text-4xl font-black tracking-wider text-zinc-900 sm:text-5xl">{code}</span>
      <span className={`mt-3 inline-flex items-center gap-2 text-sm font-bold ${copied ? "text-emerald-700" : "text-brand-700"}`}>{copied ? <><Check className="h-4 w-4" />Code copié</> : <><Copy className="h-4 w-4" />Cliquer pour copier</>}</span>
    </button>
    <p className="mt-5 text-sm text-[var(--muted-foreground)]">Le code est aussi enregistré : il s’appliquera automatiquement dans votre panier.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Link to="/panier" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-bold text-white transition hover:bg-brand-700"><ShoppingCart className="h-4 w-4" />Aller au panier</Link>
      <Link to="/" className="inline-flex items-center rounded-xl border border-[var(--border)] px-5 py-3 font-semibold">Voir le catalogue</Link>
    </div>
  </main>;
}
