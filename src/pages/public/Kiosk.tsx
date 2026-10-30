import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { PackageOpen, Search, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { KioskUniverseNav } from "../../components/KioskUniverseNav";
import {
  KIOSK_CALL_MESSAGE,
  MaterialCard,
  type PublicMaterial,
} from "../../components/public/MaterialCard";

/**
 * Vitrine physique (mode kiosque).
 *
 * Calquée sur la vitrine de la Recyclerie — même mise en page, même barre
 * d'univers — avec le catalogue BâtiRe et la même carte que la boutique en
 * ligne, moins ce qui n'a pas de sens devant un écran posé à l'entrée : pas de
 * compte, pas de messagerie, pas de réservation. Le client appelle un vendeur.
 */
export function Kiosk() {
  const [search, setSearch] = useState("");
  // La catégorie vit dans l'URL : le fil d'Ariane de la fiche y renvoie.
  const [params, setParams] = useSearchParams();
  const category = params.get("categorie") ?? "";
  const setCategory = (value: string) => {
    const updated = new URLSearchParams();
    if (value) updated.set("categorie", value);
    setParams(updated, { replace: true });
  };
  const [depot, setDepot] = useState("");

  const facets = useQuery(api.batire.shopFacets, {});
  const materials = useQuery(api.batire.listPublicMaterials, {
    category: category || undefined,
    depot: depot || undefined,
  }) as PublicMaterial[] | undefined;

  const filteredMaterials = useMemo(() => {
    if (!materials) return materials;
    const query = search.trim().toLowerCase();
    if (!query) return materials;
    return materials.filter((material) =>
      [material.title, material.category, material.subcategory, material.material]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [materials, search]);

  return (
    <div className="relative min-h-screen bg-[var(--background)]">
      {/* Le décor de la vitrine : un voile aux couleurs du logo, à la place du
          fond animé de la Recyclerie. */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_10%,var(--color-brand-100),transparent_45%),radial-gradient(circle_at_85%_90%,var(--color-secondary-100),transparent_45%)]" />

      <div className="relative z-10">
      <KioskUniverseNav current="batiment" />
      <section className="border-b border-black/5">
        <div className="mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 sm:py-10 lg:px-8">
          <div className="flex flex-col items-center gap-6 overflow-hidden rounded-[36px] border border-white/35 bg-white/70 px-6 py-10 text-center shadow-[0_30px_90px_rgba(24,24,27,0.1)] backdrop-blur-[3px] sm:flex-row sm:px-10 sm:text-left">
            <img
              src="/logo-BATIRE.jpg"
              alt="BâtiRe"
              className="h-28 w-28 shrink-0 rounded-3xl object-contain sm:h-36 sm:w-36"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Univers Bâtiment
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-5xl">
                Matériaux du bâtiment de réemploi
              </h1>
              <p className="mt-3 text-base text-zinc-600 sm:text-lg">
                Des matériaux de seconde main, prêts pour un nouveau chantier.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Consigne d'achat : c'est la seule action possible ici. */}
      <section className="mx-auto w-full max-w-[92rem] px-5 sm:px-7 lg:px-8">
        <p className="rounded-[28px] bg-brand-700 px-6 py-5 text-center text-base font-bold text-white shadow-[0_18px_45px_rgba(30,113,138,0.24)] sm:text-lg">
          {KIOSK_CALL_MESSAGE}.
        </p>
      </section>

      {/* Catégories : les mêmes que dans le menu de la boutique. */}
      <nav className="mx-auto flex w-full max-w-[92rem] flex-wrap gap-2 px-5 pt-8 sm:px-7 lg:px-8">
        <CategoryChip label="Tout" active={!category} onClick={() => setCategory("")} />
        {(facets?.categories ?? []).map((item) => (
          <CategoryChip
            key={item}
            label={item}
            active={category === item}
            onClick={() => setCategory(item)}
          />
        ))}
      </nav>

      <section className="mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 lg:px-8">
        <div>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Catalogue
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                {category || "Tous les matériaux"}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {filteredMaterials?.length ?? 0} référence
                {(filteredMaterials?.length ?? 0) > 1 ? "s" : ""}
              </p>
            </div>
            {(facets?.depots.length ?? 0) > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Dépôt
                </span>
                <div className="inline-flex flex-wrap rounded-full border border-white/40 bg-white/60 p-1 shadow-sm">
                  {[{ value: "", label: "Tous" }, ...facets!.depots.map((value) => ({ value, label: value }))].map(
                    (option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDepot(option.value)}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                          depot === option.value
                            ? "bg-brand-600 text-white"
                            : "text-zinc-600 hover:text-zinc-900"
                        }`}
                      >
                        {option.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative mb-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un matériau…"
              className="h-14 w-full rounded-2xl border border-white/60 bg-white/80 pl-12 pr-12 text-base text-zinc-900 shadow-sm outline-none backdrop-blur transition focus:border-zinc-300"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-zinc-400 hover:bg-zinc-100"
                aria-label="Effacer la recherche"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {materials === undefined ? (
            <FullSpinner label="Chargement des matériaux…" />
          ) : !filteredMaterials || filteredMaterials.length === 0 ? (
            <div className="rounded-[32px] border border-white/35 bg-white/54 p-6 shadow-[0_18px_45px_rgba(24,24,27,0.08)] backdrop-blur-md">
              <EmptyState
                icon={<PackageOpen className="h-10 w-10" />}
                title="Aucun matériau ne correspond"
                description="Essayez une autre recherche ou un autre filtre."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredMaterials.map((material) => (
                <MaterialCard
                  key={material._id}
                  material={material}
                  to={`/kiosk/materiau/${material._id}`}
                  kiosk
                />
              ))}
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

/** Pastille de catégorie, reprise de la vitrine de la Recyclerie. */
function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white/84 text-zinc-950 shadow-sm"
          : "text-zinc-700 hover:bg-white/70 hover:text-zinc-950"
      }`}
    >
      {label}
    </button>
  );
}
