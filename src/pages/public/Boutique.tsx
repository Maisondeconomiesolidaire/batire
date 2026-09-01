import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "convex/react";
import { ChevronRight, PackageOpen, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { MaterialCard, type PublicMaterial } from "../../components/public/MaterialCard";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Dropdown } from "../../components/ui/Dropdown";
import { PAGE_X, CONDITIONS, UNITS, type Condition, type Unit } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import { cn } from "../../lib/cn";

export function Boutique({
  kiosk = false,
  search = "",
}: {
  kiosk?: boolean;
  search?: string;
}) {
  // L'arborescence vit dans l'URL : le méga-menu y renvoie, et un lien vers
  // une famille se partage tel quel.
  const [params, setParams] = useSearchParams();
  const category = params.get("categorie") ?? "";
  const family = params.get("famille") ?? "";
  const subcategory = params.get("sousfamille") ?? "";
  /** Vue dépliée d'une section d'accueil : « nouveautes » ou « bientot ». */
  const view = params.get("vue") ?? "";
  const setView = (value: string) => {
    const updated = new URLSearchParams(params);
    if (value) updated.set("vue", value);
    else updated.delete("vue");
    setParams(updated, { replace: true });
  };

  const setBranch = useCallback(
    (next: { category?: string; family?: string; subcategory?: string }) => {
      const updated = new URLSearchParams(params);
      for (const [key, value] of [
        ["categorie", next.category],
        ["famille", next.family],
        ["sousfamille", next.subcategory],
      ] as const) {
        if (value) updated.set(key, value);
        else updated.delete(key);
      }
      setParams(updated, { replace: true });
    },
    [params, setParams],
  );

  const setCategory = (value: string) => setBranch({ category: value });
  const setFamily = (value: string) => setBranch({ category, family: value });
  const [unit, setUnit] = useState<"" | Unit>("");
  const [condition, setCondition] = useState<"" | Condition>("");
  const [depot, setDepot] = useState("");

  const facets = useQuery(api.batire.shopFacets, {});
  const materials = useQuery(api.batire.listPublicMaterials, {
    search: search.trim() || undefined,
    category: category || undefined,
    family: family || undefined,
    subcategory: subcategory || undefined,
    unit: unit || undefined,
    condition: condition || undefined,
    depot: depot || undefined,
  }) as PublicMaterial[] | undefined;

  const visible = materials ?? [];

  const filtersActive = Boolean(
    search.trim() || category || family || subcategory || unit || condition || depot || view,
  );

  // Un lot dont la date d'ouverture n'est pas passée n'est pas encore à vendre :
  // il a sa propre section, et sort des nouveautés comme des catégories.
  const now = Date.now();
  const isUpcoming = (material: PublicMaterial) =>
    typeof material.availableFrom === "number" && material.availableFrom > now;
  const upcoming = visible
    .filter(isUpcoming)
    .sort((a, b) => (a.availableFrom ?? 0) - (b.availableFrom ?? 0));
  const inStock = visible.filter((material) => !isUpcoming(material));
  const newest = [...inStock].sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  const categories = [...new Set(inStock.map((material) => material.category))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const viewTitle =
    view === "nouveautes" ? "Nouvelles arrivées" : view === "bientot" ? "Bientôt disponible" : "";
  const shown = view === "bientot" ? upcoming : view === "nouveautes" ? newest : visible;
  const cardLink = (material: PublicMaterial) =>
    `${kiosk ? "/kiosk" : ""}/materiau/${material._id}`;
  const upcomingNote = (material: PublicMaterial) =>
    material.availableFrom ? `Disponible le ${formatDate(material.availableFrom)}` : undefined;

  // Tout en une écriture d'URL : enchaîner les setters travaillerait sur des
  // paramètres périmés et laisserait traîner une partie des filtres.
  function reset() {
    const updated = new URLSearchParams(params);
    for (const key of ["vue", "categorie", "famille", "sousfamille"]) updated.delete(key);
    setParams(updated, { replace: true });
    setUnit("");
    setCondition("");
    setDepot("");
  }

  return (
    <div className={cn("w-full py-6", PAGE_X)}>
      {/* Fil d'Ariane : le seul repère de navigation depuis que le catalogue
          se parcourt par le menu. Chaque niveau remonte d'un cran. */}
      {view ? (
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
          <button type="button" onClick={() => setView("")} className="hover:text-brand-700">
            Catalogue
          </button>
          <span>›</span>
          <span className="font-medium text-[var(--foreground)]">{viewTitle}</span>
        </nav>
      ) : null}

      {category ? (
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
          <button type="button" onClick={() => setCategory("")} className="hover:text-brand-700">
            Catalogue
          </button>
          <span>›</span>
          <button
            type="button"
            onClick={() => setCategory(category)}
            className={cn(!family && "font-medium text-[var(--foreground)]", "hover:text-brand-700")}
          >
            {category}
          </button>
          {family ? (
            <>
              <span>›</span>
              <button
                type="button"
                onClick={() => setFamily(family)}
                className={cn(
                  !subcategory && "font-medium text-[var(--foreground)]",
                  "hover:text-brand-700",
                )}
              >
                {family}
              </button>
            </>
          ) : null}
          {subcategory ? (
            <>
              <span>›</span>
              <span className="font-medium text-[var(--foreground)]">{subcategory}</span>
            </>
          ) : null}
        </nav>
      ) : null}

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          {viewTitle || subcategory || family || category || (kiosk ? "Nos matériaux" : "Catalogue")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {materials === undefined
            ? "…"
            : `${shown.length} référence${shown.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Le dépôt vit des matériaux qu'on lui apporte : l'appel au don a sa
          place dans le catalogue, pas seulement dans l'en-tête. */}
      {!kiosk ? (
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Vous avez des matériaux à donner ?{" "}
          <Link
            to="/don/nouveau"
            className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 transition hover:decoration-brand-600"
          >
            Proposer un don
          </Link>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Dropdown
          className="w-44"
          value={unit}
          onChange={(value) => setUnit(value as Unit | "")}
          placeholder="Toutes les unités"
          options={[
            { value: "", label: "Toutes les unités" },
            ...UNITS.map((value) => ({ value, label: `Vendu au ${value}` })),
          ]}
        />
        <Dropdown
          className="w-40"
          value={condition}
          onChange={(value) => setCondition(value as Condition | "")}
          placeholder="Tous les états"
          options={[
            { value: "", label: "Tous les états" },
            ...CONDITIONS.map((value) => ({ value, label: value })),
          ]}
        />
        <Dropdown
          className="w-44"
          value={depot}
          onChange={setDepot}
          placeholder="Tous les dépôts"
          options={[
            { value: "", label: "Tous les dépôts" },
            ...(facets?.depots ?? []).map((value) => ({ value, label: value })),
          ]}
        />
        {filtersActive ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-2 text-sm font-medium text-brand-700"
          >
            <X className="h-3.5 w-3.5" /> Effacer
          </button>
        ) : null}
      </div>

      <div className="mt-5">
        {materials === undefined ? (
          <FullSpinner label="Chargement du catalogue…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<PackageOpen className="h-10 w-10" />}
            title={filtersActive ? "Aucun résultat" : "Catalogue vide"}
            description={filtersActive ? "Aucun matériau ne correspond à ces critères." : undefined}
          />
        ) : view ? (
          /* « Voir tout » d'une section d'accueil : la même sélection, à plat. */
          <Grid
            materials={view === "bientot" ? upcoming : newest}
            link={cardLink}
            note={view === "bientot" ? upcomingNote : undefined}
          />
        ) : filtersActive ? (
          <Grid materials={visible} link={cardLink} />
        ) : (
          /* Accueil : des rayons, du plus frais au plus large. Une section
             vide ne s'affiche pas — un rayon désert dessert la boutique. */
          <div className="space-y-10">
            {newest.length > 0 ? (
              <Shelf
                title="Nouvelles arrivées"
                onSeeAll={() => setView("nouveautes")}
                materials={newest}
                link={cardLink}
              />
            ) : null}

            {upcoming.length > 0 ? (
              <Shelf
                title="Bientôt disponible"
                onSeeAll={() => setView("bientot")}
                materials={upcoming}
                link={cardLink}
                note={upcomingNote}
              />
            ) : null}

            {categories.map((name) => (
              <Shelf
                key={name}
                title={name}
                onSeeAll={() => setCategory(name)}
                materials={inStock.filter((material) => material.category === name)}
                link={cardLink}
              />
            ))}

            <section>
              <h2 className="text-xl font-black tracking-tight">Tous nos produits</h2>
              <div className="mt-4">
                <Grid materials={visible} link={cardLink} note={upcomingNote} />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/** Rayon : une rangée qui défile, et un lien pour tout voir. */
function Shelf({
  title,
  materials,
  link,
  onSeeAll,
  note,
  max = 12,
}: {
  title: string;
  materials: PublicMaterial[];
  link: (material: PublicMaterial) => string;
  onSeeAll: () => void;
  note?: (material: PublicMaterial) => string | undefined;
  max?: number;
}) {
  if (materials.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
        >
          Voir tout <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {/* Une rangée, pas une grille : le rayon reste lisible d'un coup d'œil et
          les gouttières de page servent de repères au défilement. */}
      <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:gap-4 sm:px-6">
        {materials.slice(0, max).map((material) => (
          <div key={material._id} className="w-[190px] shrink-0 snap-start sm:w-[230px]">
            <MaterialCard
              material={material}
              to={link(material)}
              note={note?.(material)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function Grid({
  materials,
  link,
  note,
}: {
  materials: PublicMaterial[];
  link: (material: PublicMaterial) => string;
  note?: (material: PublicMaterial) => string | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {materials.map((material) => (
        <MaterialCard
          key={material._id}
          material={material}
          to={link(material)}
          note={note?.(material)}
        />
      ))}
    </div>
  );
}
