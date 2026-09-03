import { Link, NavLink, Outlet } from "react-router-dom";
import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/clerk-react";
import {
  Boxes,
  HeartHandshake,
  LogOut,
  MessageSquare,
  Moon,
  QrCode,
  Receipt,
  ShieldAlert,
  Store,
  Sun,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppSwitcher } from "../AppSwitcher";
import { useAccess, canAccess } from "../../lib/access";
import { FullSpinner } from "../ui/Spinner";
import { cn } from "../../lib/cn";
import { useTheme } from "../../lib/theme";

const NAV = [
  { to: "/crm", label: "Matériaux", icon: Boxes, page: "batire:materiaux", end: true },
  { to: "/crm/dons", label: "Dons", icon: HeartHandshake, page: "batire:dons", badge: true },
  { to: "/crm/ventes", label: "Ventes", icon: Receipt, page: "batire:demandes" },
  { to: "/crm/messagerie", label: "Messagerie", icon: MessageSquare, page: "batire:demandes" },
  { to: "/crm/qr", label: "QR codes", icon: QrCode, page: "batire:materiaux" },
];

export function CrmLayout() {
  const access = useAccess();
  // Les dons en attente se comptent dans la barre : un don oublié, c'est un
  // donateur sans réponse. La requête exige une session, d'où la garde : sans
  // elle, l'écran de connexion du CRM partirait en erreur serveur.
  const pendingDons = useQuery(
    api.batireDons.pendingDonationCount,
    access?.isStaff ? {} : "skip",
  ) as number | undefined;
  const { theme, toggle } = useTheme();
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className={cn(theme === "dark" && "dark", "min-h-screen bg-[var(--background)] text-[var(--foreground)]")}>
      <SignedOut>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-brand-500" />
          <p className="mt-3 text-lg font-semibold">Espace équipe</p>
          <div className="mt-5">
            <Link to="/connexion?redirect_url=/crm" className="inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Se connecter</Link>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {access === undefined ? (
          <FullSpinner label="Vérification des droits…" />
        ) : !access.isStaff ? (
          <div className="mx-auto max-w-lg px-4 py-24 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-amber-500" />
            <p className="mt-3 text-lg font-semibold">Accès refusé</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Votre compte n'a pas de droits sur Bâtire.
            </p>
          </div>
        ) : (
          <div className="flex min-h-screen">
            {/* Barre latérale : la navigation d'un back-office se lit d'un
                coup d'œil et ne bouge pas d'une page à l'autre. */}
            <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--card)] lg:flex">
              <div className="flex items-start justify-between gap-2 px-5 py-5">
                <div className="min-w-0">
                  <NavLink to="/crm" aria-label="BâtiRe CRM">
                    <img src="/logo-BATIRE.jpg" alt="BâtiRe" className="h-12 w-12 rounded-lg object-contain" />
                  </NavLink>
                </div>
                <AppSwitcher current="batire" />
              </div>
              <nav className="flex-1 space-y-1 px-3">
                {NAV.filter((item) => canAccess(access, item.page)).map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        isActive
                          ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && pendingDons ? (
                      <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                        {pendingDons}
                      </span>
                    ) : null}
                  </NavLink>
                ))}
              </nav>
              <div className="space-y-1 border-t border-[var(--border)] p-3">
                <a
                  href="/"
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--accent)]"
                >
                  <Store className="h-4 w-4" /> Voir la boutique
                </a>
                <button
                  type="button"
                  onClick={toggle}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--accent)]"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Thème clair" : "Thème sombre"}
                </button>
                <button
                  type="button"
                  onClick={() => void signOut(() => window.location.assign("/"))}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-red-500"
                >
                  <LogOut className="h-4 w-4" /> Déconnexion
                </button>
                <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Mon compte"}
                    </span>
                    <span className="block truncate text-xs text-[var(--muted-foreground)]">
                      {access.isAdmin ? "Administrateur" : "Équipe"}
                    </span>
                  </span>
                </div>
              </div>
            </aside>

            <div className="min-w-0 flex-1 lg:ml-60">
              <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:px-6 lg:hidden">
                <nav className="flex flex-1 items-center gap-1 overflow-x-auto lg:hidden">
                  {NAV.filter((item) => canAccess(access, item.page)).map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
                          isActive
                            ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
                            : "text-[var(--muted-foreground)]",
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {item.badge && pendingDons ? (
                        <span className="rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
                          {pendingDons}
                        </span>
                      ) : null}
                    </NavLink>
                  ))}
                </nav>
                <div className="ml-auto flex items-center gap-2">
                  <AppSwitcher current="batire" />
                  <button
                    type="button"
                    onClick={toggle}
                    className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                    aria-label="Changer de thème"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void signOut(() => window.location.assign("/"))}
                    className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-red-500"
                    aria-label="Déconnexion"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <main className="p-4 sm:p-6">
                <Outlet />
              </main>
            </div>
          </div>
        )}
      </SignedIn>
    </div>
  );
}
