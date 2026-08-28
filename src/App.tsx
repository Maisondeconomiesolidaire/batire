import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Boutique } from "./pages/public/Boutique";
import { MaterialDetail } from "./pages/public/MaterialDetail";
import { QrLanding } from "./pages/public/QrLanding";
import { CrmLayout } from "./components/crm/CrmLayout";
import { Materiaux } from "./pages/crm/Materiaux";
import { Demandes } from "./pages/crm/Demandes";
import { QrCodes } from "./pages/crm/QrCodes";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route path="/" element={<Boutique />} />
        <Route path="/materiau/:id" element={<MaterialDetail />} />
        <Route path="/qr/:reference" element={<QrLanding />} />
      </Route>

      <Route path="/kiosk" element={<Boutique kiosk />} />
      <Route path="/kiosk/materiau/:id" element={<MaterialDetail kiosk />} />

      <Route path="/crm" element={<CrmLayout />}>
        <Route index element={<Materiaux />} />
        <Route path="demandes" element={<Demandes />} />
        <Route path="qr" element={<QrCodes />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function PublicShell() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="text-xl font-black tracking-tight">
            Bâtire<span className="text-brand-600">.</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/" className="text-[var(--muted-foreground)] hover:text-brand-700">
              Catalogue
            </Link>
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="mt-16 border-t border-[var(--border)] py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-[var(--muted-foreground)] sm:px-6 lg:px-8">
          <p>Bâtire</p>
          <Link to="/crm" className="hover:text-brand-700">
            Espace équipe
          </Link>
        </div>
      </footer>
    </div>
  );
}
