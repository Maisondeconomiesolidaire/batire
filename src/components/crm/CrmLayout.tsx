import { NavLink, Outlet } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Boxes, ClipboardList, QrCode, ShieldAlert } from "lucide-react";
import { useAccess, canAccess } from "../../lib/access";
import { FullSpinner } from "../ui/Spinner";
import { cn } from "../../lib/cn";

const NAV = [
  { to: "/crm", label: "Matériaux", icon: Boxes, page: "batire:materiaux", end: true },
  { to: "/crm/demandes", label: "Demandes", icon: ClipboardList, page: "batire:demandes" },
  { to: "/crm/qr", label: "QR codes", icon: QrCode, page: "batire:materiaux" },
];

/** Coquille du CRM : navigation, session Clerk et garde de permissions. */
export function CrmLayout() {
  const access = useAccess();

  return (
    <div className="dark min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/crm" className="text-lg font-black tracking-tight">
            Bâtire<span className="text-brand-500">.</span>
          </NavLink>
          <SignedIn>
            <nav className="ml-4 flex flex-1 items-center gap-1 overflow-x-auto">
              {NAV.filter((item) => canAccess(access, item.page)).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-brand-500/15 text-brand-300"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <div className="ml-auto">
              <SignInButton mode="modal">
                <button className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                  Se connecter
                </button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <SignedOut>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-brand-500" />
            <p className="mt-3 font-semibold">Espace réservé à l'équipe</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Connectez-vous avec votre compte habituel de l'écosystème.
            </p>
          </div>
        </SignedOut>
        <SignedIn>
          {access === undefined ? (
            <FullSpinner label="Vérification des droits…" />
          ) : !access.isStaff ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-amber-500" />
              <p className="mt-3 font-semibold">Accès refusé</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Votre compte n'a pas encore de droits sur Bâtire. Demandez-les depuis la page Admin
                de Mes Outils.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </SignedIn>
      </main>
    </div>
  );
}
