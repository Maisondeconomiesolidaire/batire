import { useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useOutletContext } from "react-router-dom";
import { HeartHandshake, Menu, Radar, Search } from "lucide-react";
import { Boutique } from "./pages/public/Boutique";
import { MaterialDetail } from "./pages/public/MaterialDetail";
import { QrLanding } from "./pages/public/QrLanding";
import { MonCompte } from "./pages/public/MonCompte";
import { NouveauDon } from "./pages/public/NouveauDon";
import { JeRecherche } from "./pages/public/JeRecherche";
import { MegaMenu } from "./components/public/MegaMenu";
import { PAGE_X } from "./lib/constants";
import { cn } from "./lib/cn";
import { UpdateAvailableBanner } from "./components/UpdateAvailableBanner";
import { CrmLayout } from "./components/crm/CrmLayout";
import { Materiaux } from "./pages/crm/Materiaux";
import { MaterialForm } from "./components/crm/MaterialForm";
import { Ventes } from "./pages/crm/Ventes";
import { MessagerieCrm } from "./pages/crm/Messagerie";
import { Messagerie } from "./pages/public/Messagerie";
import { QrCodes } from "./pages/crm/QrCodes";
import { Dons } from "./pages/crm/Dons";
import { ProfileSync } from "./components/ProfileSync";
import { PortalButton } from "./components/PortalButton";
import { AccountMenu } from "./components/public/AccountMenu";
import { AuthSwitch } from "./components/ui/auth-switch";
import { ConditionsGenerales, PolitiqueConfidentialite } from "./pages/public/Legal";

export default function App() {
  return (
    <>
      {/* Hors de toute garde d'authentification : l'origine de l'inscription
          se constitue pendant la visite déconnectée. */}
      <ProfileSync app="batire" />
      <UpdateAvailableBanner appName="BâtiRe" />
      <Routes>
      <Route path="/connexion" element={<AuthSwitch />} />
      <Route path="/inscription" element={<AuthSwitch initialMode="signup" />} />
      <Route element={<PublicShell />}>
        <Route path="/" element={<BoutiqueRoute />} />
        <Route path="/conditions-generales" element={<ConditionsGenerales />} />
        <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
        <Route path="/materiau/:id" element={<MaterialDetail />} />
        <Route path="/qr/:reference" element={<QrLanding />} />
        <Route path="/messagerie" element={<Messagerie />} />
        <Route path="/mon-compte" element={<MonCompte />} />
        <Route path="/don/nouveau" element={<NouveauDon />} />
        <Route path="/je-recherche" element={<JeRecherche />} />
      </Route>

      <Route element={<KioskShell />}>
        <Route path="/kiosk" element={<KioskBoutique />} />
        <Route path="/kiosk/materiau/:id" element={<MaterialDetail kiosk />} />
      </Route>

      <Route path="/crm" element={<CrmLayout />}>
        <Route index element={<Materiaux />} />
        <Route path="materiaux/nouveau" element={<MaterialForm />} />
        <Route path="materiaux/:id" element={<MaterialForm />} />
        <Route path="dons" element={<Dons />} />
        <Route path="ventes" element={<Ventes />} />
        <Route path="messagerie" element={<MessagerieCrm />} />
        <Route path="qr" element={<QrCodes />} />
      </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

/** Le même champ, rendu deux fois : une par disposition de l'en-tête. */
function SearchField({
  value,
  onChange,
  placeholder = "Rechercher un matériau, une marque, une référence…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}

function PublicShell() {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className={cn("flex w-full items-center gap-3 py-3", PAGE_X)}>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-3 inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            <Menu className="h-5 w-5" />
            <span className="hidden sm:inline">Menu</span>
          </button>

          <Link to="/" className="shrink-0 text-xl font-black tracking-tight">
            BâtiRe<span className="text-brand-600">.</span>
          </Link>

          {/* La recherche ne tient pas sur la même ligne qu'un téléphone : elle
              descend d'un cran plutôt que de pousser les boutons hors de
              l'écran. */}
          <div className="relative hidden min-w-0 flex-1 sm:block">
            <SearchField value={search} onChange={setSearch} />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
            <PortalButton className="rounded-xl border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] hover:border-brand-300 hover:text-brand-700 xl:px-3" />
            <Link
              to="/don/nouveau"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-2.5 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-100 xl:px-3"
              title="Proposer un don"
            >
              <HeartHandshake className="h-4 w-4" />
              <span className="hidden xl:inline">Nouveau don</span>
            </Link>
            <Link
              to="/je-recherche"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-2.5 py-2 text-sm font-semibold transition hover:border-brand-300 hover:text-brand-700 xl:px-3"
              title="Je recherche"
            >
              <Radar className="h-4 w-4" />
              <span className="hidden xl:inline">Je recherche</span>
            </Link>
            <AccountMenu />
          </div>
        </div>

        <div className={cn("pb-3 sm:hidden", PAGE_X)}>
          <SearchField value={search} onChange={setSearch} />
        </div>
      </header>

      <MegaMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <Outlet context={{ search }} />

      <footer className="mt-16 border-t border-[var(--border)] py-8">
        <div className={cn("flex w-full flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted-foreground)]", PAGE_X)}>
          <p>BâtiRe</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/conditions-generales" className="hover:text-brand-700">Conditions générales d’utilisation</Link>
            <Link to="/politique-confidentialite" className="hover:text-brand-700">Politique de confidentialité</Link>
            <Link to="/crm" className="hover:text-brand-700">Espace équipe</Link>
          </div>
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
        <div className={cn("flex w-full items-center gap-4 py-3", PAGE_X)}>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-3 inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            <Menu className="h-5 w-5" />
            <span className="hidden sm:inline">Menu</span>
          </button>

          <Link to="/kiosk" className="shrink-0 text-xl font-black tracking-tight">
            BâtiRe<span className="text-brand-600">.</span>
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

          <PortalButton className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] hover:border-brand-300 hover:text-brand-700" />
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
