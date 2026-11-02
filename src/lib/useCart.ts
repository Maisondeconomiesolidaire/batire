import { useCallback, useSyncExternalStore } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export type CartItem = { materialId: Id<"btMaterials">; quantity: number };
const KEY = "batire-cart-v1";
const read = (): CartItem[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartItem[]; } catch { return []; }
};
const listeners = new Set<() => void>();
function notify() { listeners.forEach((listener) => listener()); }
function write(items: CartItem[]) { localStorage.setItem(KEY, JSON.stringify(items)); notify(); }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => []);
  const add = useCallback((materialId: Id<"btMaterials">, quantity: number) => {
    const current = read(); const existing = current.find((item) => item.materialId === materialId);
    write(existing ? current.map((item) => item.materialId === materialId ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { materialId, quantity }]);
  }, []);
  const remove = useCallback((materialId: Id<"btMaterials">) => write(read().filter((item) => item.materialId !== materialId)), []);
  const update = useCallback((materialId: Id<"btMaterials">, quantity: number) => write(read().map((item) => item.materialId === materialId ? { ...item, quantity } : item).filter((item) => item.quantity > 0)), []);
  const clear = useCallback(() => write([]), []);
  return { items, add, remove, update, clear };
}
