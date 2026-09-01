import { useCallback, useEffect, useState } from "react";
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
export function MegaMenu({
  open,
  onClose,
  basePath = "/",
}: {
  open: boolean;
  onClose: () => void;
  /** Racine de navigation : la vitrine du dépôt reste sur ses propres routes. */
  basePath?: string;
}) {
  const navigate = useNavigate();
  // La première catégorie est ouverte d'emblée : le volet de droite ne doit
  // pas rester vide à l'ouverture du menu.
  const [active, setActive] = useState<string>(CATEGORIES[0]!);
  // Sur mobile, les deux volets ne tiennent pas côte à côte : `drilled` dit si
  // l'utilisateur est descendu dans une catégorie. Sur grand écran, il ne sert
  // à rien — les deux colonnes sont toujours affichées.
  const [drilled, setDrilled] = useState(false);
  // Le panneau doit rester monté le temps de refermer le tiroir : sans ce
  // sursis, il disparaîtrait d'un coup et l'animation de sortie ne se verrait
  // jamais.
  const [closing, setClosing] = useState(false);

  const requestClose = useCallback(() => {
    setClosing(true);
    // Fermeture et démontage tombent dans le même lot de rendu : le panneau ne
    // réapparaît pas une image de trop avant de disparaître.
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 240);
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setActive(CATEGORIES[0]!);
      setDrilled(false);
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, requestClose]);

  if (!open && !closing) return null;

  function go(category: string, family?: string, subFamily?: string) {
    const params = new URLSearchParams({ categorie: category });
    if (family) params.set("famille", family);
    if (subFamily) params.set("sousfamille", subFamily);
    navigate(`${basePath}?${params.toString()}`);
    requestClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="drawer-veil absolute inset-0 bg-black/40"
        data-closing={closing}
        onClick={requestClose}
        aria-hidden
      />

      <div
        className="drawer-panel relative flex h-full w-full max-w-6xl bg-[var(--background)] shadow-2xl"
        data-closing={closing}
      >
        {/* ── Catégories ─────────────────────────────────────────────────
            Sur mobile, cette colonne s'efface quand une catégorie est
            choisie : le second volet prend sa place, il ne s'y superpose pas. */}
        <div
          className={cn(
            "w-full shrink-0 flex-col border-[var(--border)] lg:flex lg:w-[340px] lg:border-r",
            drilled ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-lg p-1.5 transition hover:bg-[var(--muted)]"
              aria-label="Fermer le menu"
            >
              <X className="h-6 w-6" />
            </button>
            <span className="text-lg font-black tracking-tight">
              Bâtire<span className="text-brand-600">.</span>
            </span>
          </div>

          <div className="mx-5 border-t border-[var(--border)]" />

          <nav className="flex-1 overflow-y-auto px-2 py-1.5">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setActive(category);
                  setDrilled(true);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] leading-snug transition",
                  active === category ? "font-semibold text-brand-600" : "hover:bg-[var(--muted)]",
                )}
              >
                <span>{category}</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            ))}
          </nav>
        </div>

        {/* ── Familles et sous-familles ──────────────────────────────── */}
        <div
          className={cn(
            "min-w-0 flex-1 flex-col overflow-y-auto",
            drilled ? "flex" : "hidden lg:flex",
          )}
        >
          {/* Retour vers les catégories : mobile seulement, la colonne de
              gauche jouant ce rôle sur grand écran. */}
          {drilled ? (
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4 lg:hidden">
              <button
                type="button"
                onClick={() => setDrilled(false)}
                className="inline-flex items-center gap-2 text-[15px] font-medium"
              >
                <ArrowLeft className="h-4 w-4" /> Produits
              </button>
              <button
                type="button"
                onClick={requestClose}
                className="ml-auto rounded-lg p-1.5 hover:bg-[var(--muted)]"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : null}

          <div className="p-5 lg:p-8">
              <>
                <button
                  type="button"
                  onClick={() => go(active)}
                  className="text-[15px] font-semibold text-brand-600 hover:underline lg:font-normal lg:text-[var(--foreground)] lg:hover:text-brand-600"
                >
                  {active} — voir tout
                </button>

                <div className="mt-6 gap-x-10 lg:mt-8 lg:[column-count:2] xl:[column-count:3]">
                  {familiesOf(active).map((family) => (
                    <div key={family} className="mb-7 break-inside-avoid">
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
          </div>
        </div>
      </div>
    </div>
  );
}
