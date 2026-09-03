import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/clerk-react";
import { BellRing, ChevronDown, HeartHandshake, LogOut, MessageSquare, UserRound } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * Espace personnel du client, en un seul bouton.
 *
 * Le widget de Clerk apportait son propre menu, sa propre langue et sa propre
 * mise en page ; empilé avec nos liens, il faisait déborder l'en-tête sur
 * mobile. Ici, un bouton, un menu, et la déconnexion au même endroit que le
 * reste — comme dans les autres apps du groupe.
 */
const LINKS = [
  { to: "/mon-compte", icon: UserRound, label: "Mes informations" },
  { to: "/mon-compte?onglet=dons", icon: HeartHandshake, label: "Mes dons" },
  { to: "/mon-compte?onglet=recherches", icon: BellRing, label: "Mes recherches" },
  { to: "/messagerie", icon: MessageSquare, label: "Ma messagerie" },
];

export function AccountMenu() {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <SignedOut>
        <Link to="/connexion" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
            <UserRound className="h-4 w-4" />
            <span className="hidden sm:inline">Mon compte</span>
        </Link>
      </SignedOut>

      <SignedIn>
        <div ref={ref} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold transition hover:border-brand-300 hover:text-brand-700"
          >
            <UserRound className="h-4 w-4" />
            <span className="hidden sm:inline">Espace perso</span>
            <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
          </button>

          {open ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <p className="truncate text-sm font-semibold">
                  {user?.fullName ?? "Mon espace"}
                </p>
                <p className="truncate text-xs text-[var(--muted-foreground)]">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <div className="p-1.5">
                {LINKS.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-[var(--muted)]"
                  >
                    <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                    {label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-[var(--border)] p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut(() => navigate("/"));
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </SignedIn>
    </>
  );
}
