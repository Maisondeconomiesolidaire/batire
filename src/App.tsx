import { useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useOutletContext } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Menu, MessageSquare, Search } from "lucide-react";
import { Boutique } from "./pages/public/Boutique";
import { MaterialDetail } from "./pages/public/MaterialDetail";
import { QrLanding } from "./pages/public/QrLanding";
import { MegaMenu } from "./components/public/MegaMenu";
import { CrmLayout } from "./components/crm/CrmLayout";
import { Materiaux } from "./pages/crm/Materiaux";
import { MaterialForm } from "./components/crm/MaterialForm";
import { Ventes } from "./pages/crm/Ventes";
import { MessagerieCrm } from "./pages/crm/Messagerie";
import { Messagerie } from "./pages/public/Messagerie";
import { QrCodes } from "./pages/crm/QrCodes";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route path="/" element={<BoutiqueRoute />} />
        <Route path="/materiau/:id" element={<MaterialDetail />} />
        <Route path="/qr/:reference" element={<QrLanding />} />
        <Route path="/messagerie" element={<Messagerie />} />
      </Route>

      <Route element={<KioskShell />}>
        <Route path="/kiosk" element={<KioskBoutique />} />
        <Route path="/kiosk/materiau/:id" element={<MaterialDetail kiosk />} />
      </Route>

      <Route path="/crm" element={<CrmLayout />}>
        <Route index element={<Materiaux />} />
        <Route path="materiaux/nouveau" element={<MaterialForm />} />
        <Route path="materiaux/:id" element={<MaterialForm />} />
        <Route path="ventes" element={<Ventes />} />
        <Route path="messagerie" element={<MessagerieCrm />} />
        <Route path="qr" element={<QrCodes />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function PublicShell() {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="flex w-full items-center gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            <Menu className="h-5 w-5" />
            <span className="hidden sm:inline">Menu</span>
          </button>

          <Link to="/" className="shrink-0 text-xl font-black tracking-tight">
            Bâtire<span className="text-brand-600">.</span>
          </Link>

          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un matériau, une marque, une référence…"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <SignedIn>
              <Link
                to="/messagerie"
                className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] sm:inline-flex"
              >
                <MessageSquare className="h-4 w-4" /> Messagerie
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
                  Mon compte
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </header>

      <MegaMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <Outlet context={{ search }} />

      <footer className="mt-16 border-t border-[var(--border)] py-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 text-sm text-[var(--muted-foreground)] sm:px-6">
          <p>Bâtire</p>
          <Link to="/crm" className="hover:text-brand-700">
            Espace équipe
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** La recherche vit dans l'en-tête : le catalogue la lit par le contexte. */
function BoutiqueRoute() {
  const { search } = useOutletContext<{ search: string }>();
  return <Boutique search={search} />;
}

/**
 * Vitrine du dépôt. Même catalogue et même menu que la boutique, sans compte
 * ni messagerie : devant un écran posé à l'entrée, ils n'ont pas d'usage.
 */
function KioskShell() {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="flex w-full items-center gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            <Menu className="h-5 w-5" />
            <span className="hidden sm:inline">Menu</span>
          </button>

          <Link to="/kiosk" className="shrink-0 text-xl font-black tracking-tight">
            Bâtire<span className="text-brand-600">.</span>
          </Link>

          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un matériau…"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
      </header>

      <MegaMenu open={menuOpen} onClose={() => setMenuOpen(false)} basePath="/kiosk" />

      <Outlet context={{ search }} />
    </div>
  );
}

function KioskBoutique() {
  const { search } = useOutletContext<{ search: string }>();
  return <Boutique kiosk search={search} />;
}
