import { useCallback, useSyncExternalStore } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export type CartVendor = "recyclerie" | "dechetlab";
export type CartItem = { materialId: Id<"btMaterials">; quantity: number; vendor?: CartVendor };
const KEY = "batire-cart-v1";
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = [];
/**
 * useSyncExternalStore exige de retourner exactement le même objet tant que
 * localStorage n'a pas changé. JSON.parse à chaque rendu créait un nouveau
 * tableau et déclenchait une boucle de mises à jour React (#185).
 */
const read = (): CartItem[] => {
  const raw = localStorage.getItem(KEY) ?? "[]";
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
  localStorage.setItem(KEY, cachedRaw);
  notify();
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => cachedItems);
  const add = useCallback((materialId: Id<"btMaterials">, quantity: number, vendor: CartVendor) => {
    const current = read(); const existing = current.find((item) => item.materialId === materialId);
    write(existing ? current.map((item) => item.materialId === materialId ? { ...item, quantity: item.quantity + quantity, vendor } : item) : [...current, { materialId, quantity, vendor }]);
  }, []);
  const hasOtherVendor = useCallback((vendor: CartVendor) => read().some((item) => item.vendor && item.vendor !== vendor), []);
  const remove = useCallback((materialId: Id<"btMaterials">) => write(read().filter((item) => item.materialId !== materialId)), []);
  const update = useCallback((materialId: Id<"btMaterials">, quantity: number) => write(read().map((item) => item.materialId === materialId ? { ...item, quantity } : item).filter((item) => item.quantity > 0)), []);
  const clear = useCallback(() => write([]), []);
  return { items, add, hasOtherVendor, remove, update, clear };
}
