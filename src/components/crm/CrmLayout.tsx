import { NavLink, Outlet } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Boxes, MessageSquare, QrCode, Receipt, ShieldAlert } from "lucide-react";
import { useAccess, canAccess } from "../../lib/access";
import { FullSpinner } from "../ui/Spinner";
import { cn } from "../../lib/cn";

const NAV = [
  { to: "/crm", label: "Matériaux", icon: Boxes, page: "batire:materiaux", end: true },
  { to: "/crm/ventes", label: "Ventes", icon: Receipt, page: "batire:demandes" },
  { to: "/crm/messagerie", label: "Messagerie", icon: MessageSquare, page: "batire:demandes" },
  { to: "/crm/qr", label: "QR codes", icon: QrCode, page: "batire:materiaux" },
];

export function CrmLayout() {
  const access = useAccess();

  return (
    <div className="dark min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <SignedOut>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-brand-500" />
          <p className="mt-3 text-lg font-semibold">Espace équipe</p>
          <div className="mt-5">
            <SignInButton mode="modal">
              <button className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">
                Se connecter
              </button>
            </SignInButton>
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
            <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] lg:flex">
              <div className="px-5 py-5">
                <NavLink to="/crm" className="text-lg font-black tracking-tight">
                  Bâtire<span className="text-brand-500">.</span>
                </NavLink>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Espace équipe</p>
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
                          ? "bg-brand-500/15 text-brand-300"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-[var(--border)] p-3">
                <a
                  href="/"
                  className="block rounded-xl px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                >
                  Voir la boutique
                </a>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:px-6">
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
                            ? "bg-brand-500/15 text-brand-300"
                            : "text-[var(--muted-foreground)]",
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="ml-auto">
                  <UserButton afterSignOutUrl="/" />
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
