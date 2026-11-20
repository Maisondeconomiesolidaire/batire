import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { PickupLocationId } from "./pickupLocations";

export type CartVendor = "recyclerie" | "dechetlab";
/** `heldUntil` : fin du blocage du stock côté serveur (30 min après la dernière modification). */
export type CartItem = { materialId: Id<"btMaterials">; quantity: number; vendor?: CartVendor; pickupLocation?: PickupLocationId; heldUntil?: number };
const KEY = "batire-cart-v1";
const HOLDER_KEY = "batire-cart-holder";
export function vendorForCategory(category: string): CartVendor {
  return category.trim().toLocaleLowerCase("fr-FR").startsWith("mobilier") ? "recyclerie" : "dechetlab";
}

/** Identifiant aléatoire du panier de ce navigateur : il porte le blocage du stock côté serveur. */
let memoryHolder = "";
export function cartHolderKey() {
  try {
    let key = localStorage.getItem(HOLDER_KEY);
    if (!key || !/^[A-Za-z0-9_-]{16,80}$/.test(key)) {
      key = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, "").slice(0, 40).padEnd(20, "0");
      localStorage.setItem(HOLDER_KEY, key);
    }
    return key;
  } catch {
    memoryHolder ||= `${Date.now()}${Math.random()}`.replace(/[^0-9]/g, "").padEnd(20, "0");
    return memoryHolder;
  }
}

let cachedRaw: string | null = null;
let cachedItems: CartItem[] = [];
/**
 * useSyncExternalStore exige de retourner exactement le même objet tant que
 * localStorage n'a pas changé. JSON.parse à chaque rendu créait un nouveau
 * tableau et déclenchait une boucle de mises à jour React (#185).
 */
const read = (): CartItem[] => {
  let raw = "[]";
  try { raw = localStorage.getItem(KEY) ?? "[]"; } catch { return cachedItems; }
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  try { cachedItems = JSON.parse(raw) as CartItem[]; } catch { cachedItems = []; }
  return cachedItems;
};
const listeners = new Set<() => void>();
function notify() { listeners.forEach((listener) => listener()); }
function write(items: CartItem[]) {
  cachedRaw = JSON.stringify(items);
  cachedItems = items;
  try { localStorage.setItem(KEY, cachedRaw); } catch { /* stockage indisponible : panier en mémoire */ }
  notify();
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };

/** Message affiché quand des articles quittent le panier (expiration, stock épuisé). */
let notice = "";
const noticeListeners = new Set<() => void>();
function setNotice(message: string) { notice = message; noticeListeners.forEach((listener) => listener()); }
const subscribeNotice = (listener: () => void) => { noticeListeners.add(listener); return () => noticeListeners.delete(listener); };

const errorMessage = (caught: unknown) => {
  const data = (caught as { data?: unknown })?.data;
  if (typeof data === "string") return data;
  return caught instanceof Error ? caught.message.replace(/^.*Uncaught (?:Convex)?Error: /s, "").split("\n")[0]! : "Le panier n'a pas pu être mis à jour.";
};

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => cachedItems);
  const cartNotice = useSyncExternalStore(subscribeNotice, () => notice, () => notice);
  const setItem = useMutation(api.batireCart.setCartItem);
  const clearServer = useMutation(api.batireCart.clearCart);

  /** Toute modification renouvelle la validité de tout le panier. */
  const store = useCallback((next: CartItem[], expiresAt: number) => write(next.map((item) => ({ ...item, heldUntil: expiresAt }))), []);

  /** Ajoute au panier en bloquant le stock ; lève une erreur lisible si le stock ne suffit plus. */
  const add = useCallback(async (materialId: Id<"btMaterials">, quantity: number, vendor: CartVendor) => {
    const existing = read().find((item) => item.materialId === materialId);
    const target = Math.round(((existing?.quantity ?? 0) + quantity) * 1000) / 1000;
    try {
      const result = await setItem({ holderKey: cartHolderKey(), materialId, quantity: target });
      const current = read();
      store(current.some((item) => item.materialId === materialId)
        ? current.map((item) => item.materialId === materialId ? { ...item, quantity: target, vendor } : item)
        : [...current, { materialId, quantity: target, vendor }], result.expiresAt);
      setNotice("");
    } catch (caught) { throw new Error(errorMessage(caught)); }
  }, [setItem, store]);
  const hasOtherVendor = useCallback((vendor: CartVendor) => read().some((item) => item.vendor && item.vendor !== vendor), []);
  const activeVendor = items.find((item) => item.vendor)?.vendor;
  const remove = useCallback(async (materialId: Id<"btMaterials">) => {
    write(read().filter((item) => item.materialId !== materialId));
    try { await setItem({ holderKey: cartHolderKey(), materialId, quantity: 0 }); } catch { /* le blocage expirera de lui-même */ }
  }, [setItem]);
  const update = useCallback(async (materialId: Id<"btMaterials">, quantity: number) => {
    if (quantity <= 0) { await remove(materialId); return; }
    try {
      const result = await setItem({ holderKey: cartHolderKey(), materialId, quantity });
      store(read().map((item) => item.materialId === materialId ? { ...item, quantity } : item), result.expiresAt);
    } catch (caught) { setNotice(errorMessage(caught)); }
  }, [remove, setItem, store]);
  /** Vide le panier ; le stock encore bloqué redevient disponible. */
  const clear = useCallback(() => { write([]); void clearServer({ holderKey: cartHolderKey() }).catch(() => undefined); }, [clearServer]);
  const setPickupLocation = useCallback((materialId: Id<"btMaterials">, pickupLocation: PickupLocationId) => write(read().map(item => item.materialId === materialId ? { ...item, pickupLocation } : item)), []);
  const expiresAt = items.reduce<number | undefined>((min, item) => item.heldUntil && (!min || item.heldUntil < min) ? item.heldUntil : min, undefined);
  return { items, activeVendor, add, hasOtherVendor, remove, update, clear, setPickupLocation, expiresAt, notice: cartNotice, dismissNotice: () => setNotice("") };
}

/**
 * Aligne le panier du navigateur sur les blocages du serveur : un panier
 * expiré (30 min sans modification) perd ses articles, remis en vente ; un
 * ancien panier, d'avant le blocage du stock, est bloqué à son tour.
 * À monter une seule fois (en-tête des pages publiques).
 */
export function useCartHoldSync() {
  const holderKey = cartHolderKey();
  const holds = useQuery(api.batireCart.cartHolds, { holderKey });
  const setItem = useMutation(api.batireCart.setCartItem);
  const items = useSyncExternalStore(subscribe, read, () => cachedItems);
  const [now, setNow] = useState(() => Date.now());
  const pending = useRef(new Set<string>());
  useEffect(() => {
    if (!items.length) return;
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [items.length]);
  useEffect(() => {
    if (holds === undefined) return;
    const current = read();
    if (!current.length) return;
    let changed = false;
    const expired: CartItem[] = [];
    const next: CartItem[] = [];
    for (const item of current) {
      const hold = holds.find((row) => row.materialId === item.materialId);
      if (hold) {
        if (hold.expiresAt !== item.heldUntil || hold.quantity !== item.quantity) changed = true;
        next.push({ ...item, quantity: hold.quantity, heldUntil: hold.expiresAt });
      } else if (!item.heldUntil) {
        // Panier d'avant le blocage : on bloque son stock maintenant.
        next.push(item);
        if (!pending.current.has(item.materialId)) {
          pending.current.add(item.materialId);
          void setItem({ holderKey, materialId: item.materialId, quantity: item.quantity })
            .then((result) => write(read().map((row) => row.materialId === item.materialId ? { ...row, heldUntil: result.expiresAt } : row)))
            .catch((caught) => { write(read().filter((row) => row.materialId !== item.materialId)); setNotice(errorMessage(caught)); })
            .finally(() => pending.current.delete(item.materialId));
        }
      } else if (item.heldUntil <= now) {
        expired.push(item);
        changed = true;
      } else next.push(item);
    }
    if (changed) write(next);
    if (expired.length) setNotice(`Votre panier a expiré (30 minutes sans validation) : ${expired.length > 1 ? `${expired.length} articles ont été remis` : "l'article a été remis"} en vente. Ajoutez-les de nouveau s'ils sont toujours disponibles.`);
  }, [holds, holderKey, items, now, setItem]);
}

/** Demande à l'aperçu du panier de l'en-tête de s'ouvrir (après un ajout). */
export const OPEN_CART_EVENT = "batire:open-cart";
export function openCartPreview() {
  window.dispatchEvent(new Event(OPEN_CART_EVENT));
}
