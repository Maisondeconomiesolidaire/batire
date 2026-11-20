import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** Temps restant avant que le stock bloqué par le panier ne soit remis en vente. */
export function CartTimer({ expiresAt, className }: { expiresAt?: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const left = Math.max(0, expiresAt - now);
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const urgent = left < 5 * 60_000;
  return <p className={`flex items-center gap-1.5 text-xs ${urgent ? "font-semibold text-amber-700" : "text-[var(--muted-foreground)]"} ${className ?? ""}`}>
    <Clock className="h-3.5 w-3.5 shrink-0" />
    Articles réservés pour vous encore {minutes} min {String(seconds).padStart(2, "0")} s
  </p>;
}
