import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { Minus, PackageOpen, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { formatPrice } from "../../lib/format";
import { useCart } from "../../lib/useCart";
import type { Id } from "../../../convex/_generated/dataModel";
import type { PublicMaterial } from "./MaterialCard";

/** Aperçu rapide du panier, accessible depuis chaque page publique. */
export function CartPopover() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const cart = useCart();
  // Le catalogue n'est demandé que lorsque l'aperçu est ouvert : le compteur
  // du panier reste instantané sans ajouter une souscription sur chaque page.
  const materials = useQuery(api.batire.listPublicMaterials, open ? {} : "skip") as PublicMaterial[] | undefined;
  const lines = (materials ?? []).flatMap((material) => {
    const item = cart.items.find((cartItem) => cartItem.materialId === (material._id as Id<"btMaterials">));
    return item ? [{ material, quantity: item.quantity }] : [];
  });
  const subtotal = lines.reduce((total, { material, quantity }) => total + material.price * quantity, 0);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-xl border border-[var(--border)] p-2.5 text-[var(--foreground)] transition hover:border-brand-300 hover:text-brand-700"
        aria-label="Ouvrir le panier"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <ShoppingCart className="h-4 w-4" />
        {cart.items.length > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{cart.items.length}</span> : null}
      </button>

      {open ? (
        <section
          className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl shadow-black/15"
          role="dialog"
          aria-label="Aperçu du panier"
        >
          <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3.5">
            <div>
              <h2 className="font-bold">Votre panier</h2>
              <p className="text-xs text-[var(--muted-foreground)]">{cart.items.length} article{cart.items.length > 1 ? "s" : ""}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]" aria-label="Fermer le panier">
              <X className="h-4 w-4" />
            </button>
          </header>

          {!cart.items.length ? (
            <div className="px-4 py-8 text-center">
              <PackageOpen className="mx-auto h-7 w-7 text-[var(--muted-foreground)]" />
              <p className="mt-2 text-sm font-medium">Votre panier est vide</p>
            </div>
          ) : materials === undefined ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">Chargement du panier…</p>
          ) : (
            <div className="max-h-80 divide-y divide-[var(--border)] overflow-y-auto">
              {lines.map(({ material, quantity }) => (
                <article className="flex gap-3 px-4 py-3" key={material._id}>
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--muted)]">
                    {material.photoUrls[0] ? <img className="h-full w-full object-cover" src={material.thumbUrl ?? material.photoUrls[0]} alt="" /> : <PackageOpen className="m-4 h-6 w-6 text-[var(--muted-foreground)]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{material.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{formatPrice(material.price)} / {material.unit}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg border border-[var(--border)]">
                        <button type="button" onClick={() => cart.update(material._id as Id<"btMaterials">, quantity - 1)} className="p-1.5 hover:bg-[var(--muted)]" aria-label={`Retirer une unité de ${material.title}`}><Minus className="h-3.5 w-3.5" /></button>
                        <span className="min-w-7 text-center text-xs font-bold">{quantity}</span>
                        <button type="button" onClick={() => cart.update(material._id as Id<"btMaterials">, Math.min(quantity + 1, material.quantity))} disabled={quantity >= material.quantity} className="p-1.5 hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Ajouter une unité de ${material.title}`}><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-brand-700">{formatPrice(material.price * quantity)}</strong>
                        <button type="button" onClick={() => cart.remove(material._id as Id<"btMaterials">)} className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600" aria-label={`Retirer ${material.title} du panier`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <footer className="border-t border-[var(--border)] bg-[var(--muted)] p-4">
            {cart.items.length > 0 && materials !== undefined ? <div className="mb-3 flex items-center justify-between text-sm"><span>Sous-total</span><strong>{formatPrice(subtotal)}</strong></div> : null}
            <Link to="/panier" onClick={() => setOpen(false)} className="flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700">
              Voir le panier
            </Link>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
