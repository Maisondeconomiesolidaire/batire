import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { CATEGORIES, familiesOf, subFamiliesOf } from "../../lib/taxonomy";
import { cn } from "../../lib/cn";

/**
 * Menu du catalogue, à la manière des négoces de matériaux : une colonne de
 * catégories à gauche, le détail de celle qui est survolée à droite — familles
 * en gras, sous-familles dessous.
 *
 * Le survol suffit à changer de panneau, le clic sert à naviguer : parcourir
 * quinze catégories au clic serait pénible.
 */
export function MegaMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setActive(null);
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  function go(category: string, family?: string, subFamily?: string) {
    const params = new URLSearchParams({ categorie: category });
    if (family) params.set("famille", family);
    if (subFamily) params.set("sousfamille", subFamily);
    navigate(`/?${params.toString()}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />

      <div className="relative flex h-full w-full max-w-6xl bg-[var(--background)] shadow-2xl">
        {/* ── Colonne des catégories ─────────────────────────────────── */}
        <div className="flex w-[340px] shrink-0 flex-col border-r border-[var(--border)]">
          <div className="flex items-center gap-4 px-5 py-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 transition hover:bg-[var(--muted)]"
              aria-label="Fermer le menu"
            >
              <X className="h-6 w-6" />
            </button>
            <span className="text-lg font-black tracking-tight">
              Bâtire<span className="text-brand-600">.</span>
            </span>
          </div>

          <div className="flex items-center gap-2 px-5 pb-3 text-[15px] font-medium">
            {active ? (
              <button
                type="button"
                onClick={() => setActive(null)}
                className="inline-flex items-center gap-2 lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" /> Produits
              </button>
            ) : (
              <span className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 opacity-0" /> Produits
              </span>
            )}
          </div>

          <div className="mx-5 border-t border-[var(--border)]" />

          <nav className="flex-1 overflow-y-auto px-2 py-2">
            {CATEGORIES.map((category) => {
              const isActive = active === category;
              return (
                <button
                  key={category}
                  type="button"
                  onMouseEnter={() => setActive(category)}
                  onFocus={() => setActive(category)}
                  onClick={() => setActive(category)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-[15px] transition",
                    isActive
                      ? "font-semibold text-brand-600"
                      : "hover:bg-[var(--muted)]",
                  )}
                >
                  <span>{category}</span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Détail de la catégorie ─────────────────────────────────── */}
        <div className="hidden flex-1 overflow-y-auto p-8 lg:block">
          {active ? (
            <>
              <button
                type="button"
                onClick={() => go(active)}
                className="text-[15px] hover:text-brand-600 hover:underline"
              >
                {active} — voir tout
              </button>

              <div className="mt-8 gap-x-10 [column-count:2] xl:[column-count:3]">
                {familiesOf(active).map((family) => (
                  <div key={family} className="mb-8 break-inside-avoid">
                    <button
                      type="button"
                      onClick={() => go(active, family)}
                      className="text-left text-[15px] font-bold leading-snug hover:text-brand-600"
                    >
                      {family}
                    </button>
                    <ul className="mt-2 space-y-1.5">
                      {subFamiliesOf(active, family).map((subFamily) => (
                        <li key={subFamily}>
                          <button
                            type="button"
                            onClick={() => go(active, family, subFamily)}
                            className="text-left text-[15px] leading-snug text-[var(--muted-foreground)] hover:text-brand-600"
                          >
                            {subFamily}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[15px] text-[var(--muted-foreground)]">
              Survolez une catégorie pour voir ses familles.
            </p>
          )}
        </div>

        {/* Petit écran : les familles remplacent la liste des catégories. */}
        {active ? (
          <div className="absolute inset-0 flex flex-col bg-[var(--background)] lg:hidden">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
              <button
                type="button"
                onClick={() => setActive(null)}
                className="inline-flex items-center gap-2 text-[15px] font-medium"
              >
                <ArrowLeft className="h-4 w-4" /> Produits
              </button>
              <button
                type="button"
                onClick={onClose}
                className="ml-auto rounded-lg p-1.5 hover:bg-[var(--muted)]"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <button
                type="button"
                onClick={() => go(active)}
                className="text-[15px] font-semibold text-brand-600"
              >
                {active} — voir tout
              </button>
              {familiesOf(active).map((family) => (
                <div key={family} className="mt-6">
                  <button
                    type="button"
                    onClick={() => go(active, family)}
                    className="text-left text-[15px] font-bold"
                  >
                    {family}
                  </button>
                  <ul className="mt-2 space-y-1.5">
                    {subFamiliesOf(active, family).map((subFamily) => (
                      <li key={subFamily}>
                        <button
                          type="button"
                          onClick={() => go(active, family, subFamily)}
                          className="text-left text-[15px] text-[var(--muted-foreground)]"
                        >
                          {subFamily}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
